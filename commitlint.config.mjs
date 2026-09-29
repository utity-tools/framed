/** @type {import("@commitlint/types").UserConfig} */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // PRs are rebase-merged, so every commit lands on main: keep headers short and readable.
    "header-max-length": [2, "always", 100],
    // Dependabot capitalises its subjects ("Bump x from…") and cannot be configured otherwise.
    "subject-case": [0],
  },
};

export default config;
