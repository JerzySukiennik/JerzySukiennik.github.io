#!/usr/bin/env bash
# Build, lint, commit and push the site, then check the live URL.
#   bash tools/publish.sh "commit message" [slug-to-verify]
# Only stages the publishable paths, never `git add -A`, so a stray file in the working
# tree cannot go live by accident. Run it only when Jurek has said to put something on the site.
set -euo pipefail
cd "$(dirname "$0")/.."

msg="${1:?commit message required}"
slug="${2:-}"

node tools/build.mjs

git add index.html p rockets printing games software data assets project-images tools islands win CNAME sitemap.xml robots.txt .gitignore README.md 2>/dev/null || true
guide=0
git diff --cached --name-only | grep -q '^tools/chat-worker/src/knowledge.mjs$' && guide=1
if git diff --cached --quiet; then
  echo "Nothing to publish."
  exit 0
fi

git commit -q -m "$msg

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git pull --rebase -q
git push -q
echo "Pushed $(git rev-parse --short HEAD)."

# The Gzowo Guide only knows what its Worker was deployed with, so refresh it when the site knowledge changed.
if [ "$guide" = "1" ]; then
  (cd tools/chat-worker && npx --yes wrangler deploy 2>&1 | grep -E "Deployed|rror") || echo "Guide Worker NOT redeployed, run: cd tools/chat-worker && npx wrangler deploy" >&2
fi

# Pages needs a minute or two. Poll the live page for the change instead of guessing.
tmp=$(mktemp); url="https://gzowo.fun/"
[ -n "$slug" ] && url="https://gzowo.fun/p/$slug/"
for i in $(seq 1 30); do
  code=$(curl -s -o "$tmp" -w '%{http_code}' -L "$url?cb=$RANDOM" || true)
  if [ "$code" = "200" ] && { [ -z "$slug" ] || grep -q "$slug" "$tmp"; }; then
    echo "LIVE: $url (HTTP 200)"
    exit 0
  fi
  sleep 10
done
echo "NOT CONFIRMED LIVE after 5 minutes: $url (last HTTP $code). Check the Pages build." >&2
exit 1
