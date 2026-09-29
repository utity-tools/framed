// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const HOOK = path.resolve(".claude/hooks/guard-git.sh");

let featureRepo: string;
let mainRepo: string;

/** A throwaway repo with one commit, checked out on `branch`. */
function makeRepo(branch: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "guard-git-"));
  const git = (...args: string[]) => execFileSync("git", ["-C", dir, ...args], { stdio: "ignore" });
  git("init", "-q", "-b", branch);
  git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "init");
  return dir;
}

function run(command: string, cwd: string) {
  const result = spawnSync("bash", [HOOK], {
    input: JSON.stringify({ tool_input: { command }, cwd }),
    encoding: "utf8",
  });
  return { status: result.status, stderr: result.stderr };
}

beforeAll(() => {
  featureRepo = makeRepo("feat/x");
  mainRepo = makeRepo("main");
});

afterAll(() => {
  rmSync(featureRepo, { recursive: true, force: true });
  rmSync(mainRepo, { recursive: true, force: true });
});

describe("guard-git hook on a feature branch", () => {
  it.each([
    "git status",
    "git commit -m x",
    'git commit -m "mention --no-verify and -n in the message"',
    "git log -n 3; git commit -m x",
    "git push -u origin HEAD",
    "git push --force-with-lease",
    "git push -n origin HEAD",
    "cp .env.example /tmp/example",
    "gh pr create --title x",
    "gh pr view 3",
    "echo process.env.NEXT_PUBLIC_APP_URL",
    "git commit -F - <<'EOF'\nfix: x\n\nnever use --no-verify, cat .env or gh pr merge\nEOF",
  ])("allows %s", (command) => {
    expect(run(command, featureRepo).status).toBe(0);
  });

  it.each([
    "git commit --no-verify -m x",
    "git commit -nm x",
    "git commit -an -m x",
    "git -C . commit --no-verify -m x",
    "HUSKY=0 git commit -m x",
    "env HUSKY=0 git commit -m x",
    "git push -f origin feat/x",
    "git push -uf origin feat/x",
    "git push origin +feat/x",
    "git push --force-with-lease --force",
    "git push origin main",
    "git push origin +main",
    "git push origin HEAD:main",
    "git push origin HEAD:refs/heads/main",
    "git -c k=v push origin main",
    "git diff --output=/tmp/x",
    "gh pr merge 3 --rebase",
    "gh -R utity-tools/framed pr merge 3",
    "gh api -X PUT repos/utity-tools/framed/pulls/3/merge",
    "cat .env",
    "cat .env.local",
    "cp .env.example .env.local",
    "source .env.production",
  ])("blocks %s", (command) => {
    expect(run(command, featureRepo).status).toBe(2);
  });
});

describe("guard-git hook on main", () => {
  it("blocks commits and pushes", () => {
    expect(run("git commit -m x", mainRepo).status).toBe(2);
    expect(run("git push -u origin HEAD", mainRepo).status).toBe(2);
  });

  it("allows switching away", () => {
    expect(run("git switch -c feat/y", mainRepo).status).toBe(0);
  });
});

describe("guard-git hook without a first commit", () => {
  it("allows the bootstrap commit on main", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "guard-git-"));
    execFileSync("git", ["-C", dir, "init", "-q", "-b", "main"]);
    expect(run("git commit -m init", dir).status).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  });
});
