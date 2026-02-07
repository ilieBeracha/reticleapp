#!/usr/bin/env bash
# detect-commit.sh — PostToolUse hook for Bash
# Checks if the Bash command was a successful git commit.
# If so, extracts the diff and signals that context should be updated.
#
# Input: JSON on stdin from Claude Code hook system
# Output: JSON on stdout with additionalContext if commit detected

set -uo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only care about git commit commands
if [[ "$COMMAND" != *"git commit"* ]]; then
  exit 0
fi

# Check if the commit actually succeeded by looking at tool output
TOOL_OUTPUT=$(echo "$INPUT" | jq -r '.tool_output // empty')
if [[ "$TOOL_OUTPUT" == *"nothing to commit"* ]] || [[ "$TOOL_OUTPUT" == *"no changes added"* ]]; then
  exit 0
fi

ROOT=$(echo "$INPUT" | jq -r '.cwd // empty')
[ -z "$ROOT" ] && ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -z "$ROOT" ] && exit 0

cd "$ROOT" || exit 0

# Get the diff from the last commit
DIFF=$(git diff HEAD~1..HEAD --stat 2>/dev/null || echo "")
DIFF_FULL=$(git diff HEAD~1..HEAD --no-color 2>/dev/null | head -500 || echo "")
COMMIT_MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "")
COMMIT_SHA=$(git log -1 --pretty=format:"%h" 2>/dev/null || echo "")
FILES_CHANGED=$(git diff HEAD~1..HEAD --name-only 2>/dev/null || echo "")

if [ -z "$DIFF" ]; then
  exit 0
fi

# Save diff context to a temp file for the agent hook to read
DIFF_FILE="$ROOT/.claude/hooks/.last-commit-diff"
cat > "$DIFF_FILE" << EOF
Commit: $COMMIT_SHA
Message: $COMMIT_MSG

Files changed:
$FILES_CHANGED

Stat:
$DIFF

Diff (truncated):
$DIFF_FULL
EOF

# Signal to Claude that context update is needed
cat << RESPONSE
{
  "additionalContext": "A git commit just succeeded ($COMMIT_SHA: $COMMIT_MSG). The .context/ documentation files may need updating. Run: scripts/update-context.sh to update .context/ files based on the changes in this commit. The diff is saved at .claude/hooks/.last-commit-diff"
}
RESPONSE
