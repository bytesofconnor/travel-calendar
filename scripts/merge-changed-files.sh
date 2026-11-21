#!/usr/bin/env bash
# Print the files in one commit, one path per line.
# actions/checkout is depth 1. git diff-tree then exits 0 with no output,
# because the parent object is missing, and a squash that touches convex/
# looks like an empty change.
set -euo pipefail

sha=${1:?commit}

if ! git rev-parse --verify --quiet "${sha}^{commit}" >/dev/null; then
  git fetch --no-tags --depth=2 origin "$sha"
fi

if ! git rev-parse --verify --quiet "${sha}^" >/dev/null; then
  git fetch --no-tags --deepen=1 origin "$sha" || git fetch --no-tags --depth=2 origin "$sha"
fi

if ! git rev-parse --verify --quiet "${sha}^" >/dev/null; then
  echo "parent of ${sha} is missing; refusing an empty file list" >&2
  exit 1
fi

git diff-tree --no-commit-id --name-only -r "$sha"
