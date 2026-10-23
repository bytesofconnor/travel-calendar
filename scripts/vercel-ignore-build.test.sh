#!/usr/bin/env bash
set -euo pipefail

script=$(cd "$(dirname "$0")" && pwd)/vercel-ignore-build.sh
fail=0
root=$(mktemp -d)
trap 'rm -rf "$root"' EXIT

init_repo() {
  local repo=$1
  mkdir -p "$repo"
  git -C "$repo" init -q -b main
  git -C "$repo" config user.email test@example.com
  git -C "$repo" config user.name test
}

commit_all() {
  local repo=$1
  local msg=$2
  git -C "$repo" add -A
  git -C "$repo" commit -q -m "$msg"
}

check() {
  local name=$1
  local dir=$2
  local want=$3
  shift 3
  local code=0
  local out
  out=$(
    cd "$dir" && env -i PATH="$PATH" HOME="$HOME" "$@" "$script" 2>&1
  ) || code=$?
  if [[ "$code" -ne "$want" ]]; then
    echo "FAIL ${name}: exit ${code}, expected ${want}" >&2
    printf '%s\n' "$out" >&2
    fail=1
    return
  fi
  echo "PASS ${name}"
}

app_change="$root/app-change"
init_repo "$app_change"
echo base > "$app_change/app.txt"
commit_all "$app_change" base
echo next > "$app_change/app.txt"
commit_all "$app_change" "change app"

check production-push-builds "$app_change" 1 \
  VERCEL_ENV=production \
  VERCEL_GIT_COMMIT_REF=main

check dependabot-preview-skips "$app_change" 0 \
  VERCEL_ENV=preview \
  VERCEL_GIT_COMMIT_REF=dependabot/npm_and_yarn/example

check cursor-preview-skips "$app_change" 0 \
  VERCEL_ENV=preview \
  VERCEL_GIT_COMMIT_REF=cursor/example-03b8

check production-dependabot-builds "$app_change" 1 \
  VERCEL_ENV=production \
  VERCEL_GIT_COMMIT_REF=dependabot/npm_and_yarn/example

unchanged="$root/unchanged"
init_repo "$unchanged"
echo app > "$unchanged/app.txt"
commit_all "$unchanged" base
git -C "$unchanged" commit -q --allow-empty -m "no app change"

check unchanged-app-root-skips "$unchanged" 0 \
  VERCEL_ENV=production \
  VERCEL_GIT_COMMIT_REF=main

missing_parent="$root/missing-parent"
init_repo "$missing_parent"
echo only > "$missing_parent/app.txt"
commit_all "$missing_parent" only

check missing-parent-builds "$missing_parent" 1 \
  VERCEL_ENV=production \
  VERCEL_GIT_COMMIT_REF=main

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi
