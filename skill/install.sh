#!/usr/bin/env bash
# Install the /projects skill for Gzowo Labs.
#
#   bash install.sh "Ryszard Sukiennik"
#
# Puts the skill in ~/.claude/skills/projects, clones the site into
# ~/.gzowo-labs/site-repo, and writes the one thing that differs between the two
# of us: the name every project published from this machine gets signed with.

set -euo pipefail

AUTHOR="${1:-}"
if [ -z "$AUTHOR" ]; then
  echo "Who is this machine? Run: bash install.sh \"Your Name\"" >&2
  exit 1
fi

REMOTE="https://github.com/JerzySukiennik/JerzySukiennik.github.io.git"
SITE="https://jerzysukiennik.github.io/"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/.claude/skills/projects"
REPO="$HOME/.gzowo-labs/site-repo"

command -v node >/dev/null || { echo "Node is required. Install it and run this again." >&2; exit 1; }
command -v git  >/dev/null || { echo "Git is required. Install it and run this again." >&2; exit 1; }

echo "Installing the skill for $AUTHOR"

mkdir -p "$DEST"
cp "$SRC/SKILL.md" "$DEST/SKILL.md"
mkdir -p "$DEST/tools"
cp "$SRC/tools/capture.js" "$SRC/tools/projects.js" "$SRC/tools/publish.sh" "$SRC/tools/package.json" "$DEST/tools/"
chmod +x "$DEST/tools/publish.sh"

cat > "$DEST/config.json" <<EOF
{
  "author": "$AUTHOR",
  "repo": "$REPO",
  "site": "$SITE",
  "remote": "$REMOTE"
}
EOF

if [ ! -d "$REPO/.git" ]; then
  echo "Cloning the site into $REPO"
  mkdir -p "$(dirname "$REPO")"
  git clone --quiet "$REMOTE" "$REPO"
else
  echo "Site clone already at $REPO — pulling"
  git -C "$REPO" pull --quiet --rebase --autostash origin main || true
fi

echo "Installing the screenshot tools (this downloads a browser the first time)"
( cd "$DEST/tools" && npm install --silent --no-audit --no-fund >/dev/null 2>&1 )
( cd "$DEST/tools" && npx --yes playwright install chromium >/dev/null 2>&1 ) || \
  echo "  (Chromium download failed — run 'npx playwright install chromium' in $DEST/tools later)"

echo
echo "Done. In Claude Code, run /projects inside a project folder."
echo "Everything you publish will be signed: $AUTHOR"
