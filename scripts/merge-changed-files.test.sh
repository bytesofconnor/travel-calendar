#!/usr/bin/env bash
set -euo pipefail

script=$(cd "$(dirname "$0")" && pwd)/merge-changed-files.sh
root=$(mktemp -d)
trap 'rm -rf "$root"' EXIT

git -C "$root" init -q -b main origin.git
git -C "$root/origin.git" config user.email test@example.com
git -C "$root/origin.git" config user.name test
echo "base" > "$root/origin.git/README.md"
git -C "$root/origin.git" add README.md
git -C "$root/origin.git" commit -q -m base
mkdir -p "$root/origin.git/convex"
echo "schema" > "$root/origin.git/convex/schema.ts"
git -C "$root/origin.git" add convex/schema.ts
git -C "$root/origin.git" commit -q -m "add convex schema"
sha=$(git -C "$root/origin.git" rev-parse HEAD)

git clone -q --depth 1 "file://$root/origin.git" "$root/shallow"
cd "$root/shallow"
empty=$(git diff-tree --no-commit-id --name-only -r "$sha" || true)
if [ -n "$empty" ]; then
  echo "expected a depth-1 diff-tree to be empty" >&2
  exit 1
fi

files=$("$script" "$sha")
printf '%s\n' "$files" | grep -qx 'convex/schema.ts'
echo "PASS shallow parent is fetched before diff-tree"
