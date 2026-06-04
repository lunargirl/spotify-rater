#!/usr/bin/env bash
# Creates https://github.com/lunargirl/spotify-rater (public) and pushes main.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: brew install gh"
  echo "Then: gh auth login"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Run: gh auth login"
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin https://github.com/lunargirl/spotify-rater.git
else
  git remote add origin https://github.com/lunargirl/spotify-rater.git
fi

gh repo create lunargirl/spotify-rater --public --source=. --remote=origin --push --description "Rate Spotify tracks with precision analytics"

echo "Done: https://github.com/lunargirl/spotify-rater"
