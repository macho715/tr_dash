#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "usage: $0 <path-to-env-file>"
  exit 1
fi

echo "== DRY RUN (prints commands only) =="
echo "git rm --cached \"$TARGET\""
echo "echo \"# env hygiene\" >> .gitignore"
echo "echo \".env\" >> .gitignore"
echo "echo \".env.*\" >> .gitignore"
echo "echo \"env.vercel.*\" >> .gitignore"
echo "git add .gitignore"
echo "git commit -m \"security: stop tracking env file\""
echo
echo "If secrets may have been exposed, rotate keys per org process."
