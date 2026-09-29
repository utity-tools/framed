#!/usr/bin/env bash
# PreToolUse hook (Bash): enforces the branch workflow and keeps env files out of reach.
# Exit code 2 blocks the command and sends stderr back to Claude.
#
# Best effort: it parses each command segment instead of matching raw text, so a commit message
# that mentions a flag is not blocked, but a determined shell can always find another spelling.
# The real enforcement is server side (branch rules on GitHub) plus the git hooks.
set -o pipefail

block() {
  echo "Blocked: $1" >&2
  exit 2
}

# Fail closed: without jq the command cannot be inspected.
command -v jq >/dev/null || block "jq is required by .claude/hooks/guard-git.sh (brew install jq)."

input="$(cat)"
cmd="$(jq -r '.tool_input.command // ""' <<<"$input")"
cwd="$(jq -r '.cwd // "."' <<<"$input")"

# Heredoc bodies are data (commit messages, file contents), not commands: drop them.
cmd="$(awk '
  inbody { if ($0 == term) inbody = 0; next }
  {
    print
    if (match($0, /<<-?[[:space:]]*["\047]?[A-Za-z_][A-Za-z0-9_]*["\047]?/)) {
      term = substr($0, RSTART, RLENGTH)
      sub(/^<<-?[[:space:]]*/, "", term)
      gsub(/["\047]/, "", term)
      inbody = 1
    }
  }' <<<"$cmd")"

# Quoted strings are arguments (messages, patterns), never flags: blank them out.
cmd="$(sed -E "s/'[^']*'/''/g; s/\"([^\"\\\\]|\\\\.)*\"/\"\"/g" <<<"$cmd")"

# Env files hold secrets. .env.example is the only one that can be read.
while IFS= read -r envfile; do
  [[ "$envfile" == ".env.example" ]] ||
    block "env files hold secrets and must not be read or written by agents. Use .env.example."
done < <(grep -oE '(^|[^[:alnum:]_.])\.env(\.[[:alnum:]_-]+)*' <<<"$cmd" | sed -E 's/^[^.]//')

current_branch() { git -C "$cwd" branch --show-current 2>/dev/null; }
has_commits() { git -C "$cwd" rev-parse --verify -q HEAD >/dev/null 2>&1; }

check_git() {
  local -a args=("$@")
  local i=0 sub=""
  # Skip global options between `git` and the subcommand (-C <dir>, -c <k=v>, --git-dir=…).
  while ((i < ${#args[@]})); do
    case "${args[i]}" in
      -C | -c | --git-dir | --work-tree | --namespace) i=$((i + 2)) ;;
      -*) i=$((i + 1)) ;;
      *) sub="${args[i]}"; break ;;
    esac
  done
  local -a rest=("${args[@]:i+1}")

  local arg
  for arg in "${rest[@]}"; do
    [[ "$arg" == --output* ]] && block "git --output writes arbitrary files."
  done

  case "$sub" in
    commit)
      for arg in "${rest[@]}"; do
        [[ "$arg" == "--no-verify" ]] && block "skipping git hooks (--no-verify) is not allowed. Fix the failing check instead."
        [[ "$arg" =~ ^-[[:alpha:]]*n[[:alpha:]]*$ ]] && block "skipping git hooks (-n) is not allowed. Fix the failing check instead."
      done
      if has_commits && [[ "$(current_branch)" == "main" ]]; then
        block "never commit to main. Create a branch with /feature and open a PR with /ship."
      fi
      ;;
    push)
      local lease=0 force=0
      for arg in "${rest[@]}"; do
        case "$arg" in
          --no-verify) block "skipping git hooks (--no-verify) is not allowed." ;;
          --force-with-lease*) lease=1 ;;
          --force | --force-if-includes=*) force=1 ;;
          --*) ;;
          -*) [[ "$arg" =~ ^-[[:alpha:]]*f[[:alpha:]]*$ ]] && force=1 ;;
          +*) force=1 ;;
        esac
        # Any refspec whose destination is main: main, +main, x:main, HEAD:refs/heads/main.
        [[ "$arg" =~ ^\+?([^:]*:)?(refs/heads/)?main$ ]] && block "never push to main. Push your branch and open a PR with /ship."
      done
      ((force)) && block "force push is not allowed. Use --force-with-lease on your own feature branch if really needed."
      : "$lease"
      if has_commits && [[ "$(current_branch)" == "main" ]]; then
        block "never push from main. Create a branch with /feature."
      fi
      ;;
  esac
}

check_gh() {
  local joined=" $* "
  # Humans merge: the preview and the review are theirs to approve.
  if [[ "$joined" =~ [[:space:]]pr[[:space:]].*merge[[:space:]] ]] ||
    [[ "$joined" =~ [[:space:]]api[[:space:]].*/pulls/[^[:space:]]*/merge ]]; then
    block "agents never merge PRs. Report the PR link; the human merges after CI and the preview."
  fi
}

# One segment per command: split on newlines, ;, &&, || and pipes.
while IFS= read -r segment; do
  read -ra words <<<"$segment"
  ((${#words[@]})) || continue

  # Leading VAR=value assignments and wrappers: HUSKY=0 turns the git hooks off.
  j=0
  while ((j < ${#words[@]})); do
    w="${words[j]}"
    if [[ "$w" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      [[ "$w" =~ ^HUSKY=0*$ ]] && block "HUSKY=0 turns the git hooks off. Fix the failing check instead."
      j=$((j + 1))
    elif [[ "$w" == "env" || "$w" == "command" || "$w" == "exec" ]]; then
      j=$((j + 1))
    else
      break
    fi
  done
  words=("${words[@]:j}")
  ((${#words[@]})) || continue

  case "${words[0]##*/}" in
    git) check_git "${words[@]:1}" ;;
    gh) check_gh "${words[@]:1}" ;;
  esac
done < <(sed -E 's/(\&\&|\|\||;|\||&)/\n/g' <<<"$cmd")

exit 0
