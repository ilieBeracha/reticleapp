#!/usr/bin/env bash
# update-context.sh — Extracts recent commit diff info for AI context updates.
# Called by Claude Code after a commit is detected.
# Outputs a structured summary that Claude uses to update .context/ files.

set -uo pipefail

ROOT="$(git rev-parse --show-toplevel)"

COMMIT_SHA=$(git -C "$ROOT" log -1 --pretty=format:"%h" 2>/dev/null)
COMMIT_MSG=$(git -C "$ROOT" log -1 --pretty=format:"%s" 2>/dev/null)
COMMIT_DATE=$(git -C "$ROOT" log -1 --pretty=format:"%Y-%m-%d" 2>/dev/null)
BRANCH=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null)
FILES_CHANGED=$(git -C "$ROOT" diff HEAD~1..HEAD --name-only 2>/dev/null || echo "(first commit)")
DIFF_STAT=$(git -C "$ROOT" diff HEAD~1..HEAD --stat 2>/dev/null || echo "")
DIFF_FULL=$(git -C "$ROOT" diff HEAD~1..HEAD --no-color 2>/dev/null | head -800 || echo "")

echo "=== COMMIT CONTEXT ==="
echo "SHA: $COMMIT_SHA"
echo "Branch: $BRANCH"
echo "Date: $COMMIT_DATE"
echo "Message: $COMMIT_MSG"
echo ""
echo "=== FILES CHANGED ==="
echo "$FILES_CHANGED"
echo ""
echo "=== DIFF STAT ==="
echo "$DIFF_STAT"
echo ""
echo "=== DIFF (first 800 lines) ==="
echo "$DIFF_FULL"
