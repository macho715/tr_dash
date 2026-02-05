#!/usr/bin/env bash
set -euo pipefail

echo "== find tracked env-like files (read-only) =="

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "not a git repository"
  exit 1
}

echo
echo "## tracked env files (git index)"
git ls-files | grep -E '(^|/)(\.env(\.|$)|env\.vercel\.)' || echo "(none)"
