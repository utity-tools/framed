---
name: handoff
description: Close the session - write the handoff for the next session and check nothing is left behind.
disable-model-invocation: true
---

Close the current session.

1. Run `git status` and `git log --branches --not --remotes --oneline`. Uncommitted changes or
   unpushed commits must be committed and pushed, or listed in the handoff with the reason.
2. Create `docs/sessions/NNNN.md` (0001, 0002…), numbered after the latest one, from
   `docs/sessions/TEMPLATE.md`:
   - goal of the session and whether it was met,
   - what was done (PRs and branches, not code),
   - decisions taken (link ADRs),
   - pending work and blockers,
   - the single next step for the next session.
3. Keep it under 40 lines: the next session reads it at start, every line costs tokens.
4. End the file with the seal line `— end of handoff NNNN —`.
5. Commit it on the current branch as `docs(sessions): handoff NNNN` and push.
