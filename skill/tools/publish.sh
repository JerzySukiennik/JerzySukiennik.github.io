#!/usr/bin/env bash
# Publish whatever is currently in the site repo.
#   publish.sh "Add Gzowo Builders"
# Pulls first (two people share this repo), commits everything, pushes.
# Push goes out without waiting for the Pages build — that is the deal we made.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(node -e "console.log(require('$HERE/../config.json').repo)")"
MSG="${1:-Update projects}"

cd "$REPO"

git pull --rebase --autostash origin main >/dev/null 2>&1 || {
  echo "Pull failed. Someone else may have pushed a conflicting change; fix the repo at $REPO first." >&2
  exit 1
}

if [ -z "$(git status --porcelain)" ]; then
  echo "Nothing to publish — the site already matches."
  exit 0
fi

git add -A
git commit -q -m "$MSG"
git push -q origin main

echo "Published: $MSG"
echo "Live in a minute or two at $(node -e "console.log(require('$HERE/../config.json').site)")"
