#!/usr/bin/env bash
# PreToolUse hook (Bash): enforces the branch workflow for Claude Code.
# Exit code 2 blocks the command and sends stderr back to Claude.
set -euo pipefail

input="$(cat)"
cmd="$(jq -r '.tool_input.command // ""' <<<"$input")"
cwd="$(jq -r '.cwd // "."' <<<"$input")"

block() {
  echo "Blocked: $1" >&2
  exit 2
}

# Humans merge: the preview and the review are theirs to approve.
if grep -Eq '(^|[;&|[:space:]])gh[[:space:]]+pr[[:space:]]+merge' <<<"$cmd"; then
  block "agents never merge PRs. Report the PR link; the human merges after CI and the preview."
fi

# The rest only concerns git commit / push.
grep -Eq '(^|[;&|[:space:]])git[[:space:]]+(commit|push)' <<<"$cmd" || exit 0

if grep -Eq -- '--no-verify|(^|[[:space:]])-n([[:space:]]|$)' <<<"$cmd"; then
  block "skipping git hooks (--no-verify) is not allowed. Fix the failing check instead."
fi

if grep -Eq -- 'push.*(--force|-f([[:space:]]|$))' <<<"$cmd" && ! grep -q -- '--force-with-lease' <<<"$cmd"; then
  block "force push is not allowed. Use --force-with-lease on your own feature branch if really needed."
fi

# Bootstrap exception: the very first commit of the repo can go on main.
git -C "$cwd" rev-parse --verify -q HEAD >/dev/null || exit 0

branch="$(git -C "$cwd" branch --show-current)"
if [[ "$branch" == "main" ]] || grep -Eq 'push[^;&|]*[[:space:]](HEAD:)?main([[:space:]]|$)' <<<"$cmd"; then
  block "never commit or push to main. Create a branch with /feature and open a PR with /ship."
fi

exit 0
