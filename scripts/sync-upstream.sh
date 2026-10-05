#!/usr/bin/env bash
# Merge okfde/datacenters-map into main, then push main to GitLab (origin) and
# to the GitHub fork (github).
#
# Upstream and our GitLab pipeline both commit a fresh data export every
# night, so the two generated files conflict on almost every merge. Those are
# resolved to upstream's version; the next daily run regenerates them anyway.
# Any other conflict stops the script for a manual resolve.
#
# Remotes (see README):
#   origin    GitLab, deployed by Coolify
#   github    git@github.com:maxschulze/datacenters-map.git (fork, for PRs)
#   upstream  https://github.com/okfde/datacenters-map.git (fetch only)
set -euo pipefail

data_files=(public/data/datacenters.geojson public/data/datacenters.csv)

if [ "$(git rev-parse --abbrev-ref HEAD)" != main ]; then
  echo "Run this on main." >&2
  exit 1
fi
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree is not clean." >&2
  exit 1
fi

git fetch origin
git fetch upstream
git merge --ff-only origin/main

if ! git merge --no-edit upstream/main; then
  conflicted=$(git diff --name-only --diff-filter=U)
  for f in "${data_files[@]}"; do
    conflicted=$(printf '%s\n' "$conflicted" | grep -vxF "$f" || true)
  done
  if [ -n "$conflicted" ]; then
    echo "Conflicts outside the generated data files; resolve, commit, then push:" >&2
    printf '  %s\n' $conflicted >&2
    exit 1
  fi
  git checkout --theirs -- "${data_files[@]}"
  git add -- "${data_files[@]}"
  git commit --no-edit
fi

git push origin main
git push github main
