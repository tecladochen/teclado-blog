#!/usr/bin/env bash
# Vercel Ignored Build Step.
# Exit 0 => skip build, Exit 1 => proceed with build.
# Runs from the project Root Directory on Vercel.

set -euo pipefail

# Without a previous commit (e.g. first deploy / shallow clone), always build.
if ! git rev-parse HEAD^ >/dev/null 2>&1; then
  echo "No previous commit found; proceeding with build."
  exit 1
fi

CHANGED="$(git diff --name-only HEAD^ HEAD)"

if [ -z "$CHANGED" ]; then
  echo "No file changes detected; skipping build."
  exit 0
fi

# Files that should NOT trigger a rebuild when they are the only thing changed.
while IFS= read -r file; do
  [ -z "$file" ] && continue
  case "$file" in
    README.md | LICENSE | .gitignore | .editorconfig | CHANGELOG.md)
      ;;
    .vscode/* | .github/* | docs/*)
      ;;
    *)
      echo "Relevant change detected ($file); proceeding with build."
      exit 1
      ;;
  esac
done <<< "$CHANGED"

echo "Only non-build files changed; skipping build."
exit 0
