# AegistonWEB Project Operating Baseline

> This file is the durable cross-context memory for ongoing work on AegistonWEB. Read it before making any change. If chat context becomes too long or is cleared, recover from this file, `CLAUDE.md`, the relevant spec, and the latest accepted commit/PR.

## 1. Repositories and delivery path

- Production website: https://aegiston.com/
- Upstream repository: `xdrshjr/AegistonWEB`
- Working fork: `jinngimk-lang/AegistonWEB`
- Default upstream target: `xdrshjr/AegistonWEB:main`
- Normal delivery path:
  1. Sync/read upstream state.
  2. Create one focused branch in `jinngimk-lang/AegistonWEB`.
  3. Make exactly one scoped change.
  4. Validate that change.
  5. Commit it as an independently reversible checkpoint.
  6. Open a PR from the fork branch to `xdrshjr/AegistonWEB:main`.
  7. After merge, record the accepted PR/commit as the next recovery point.

## 2. Recovery order after context loss

Before continuing any work, recover context in this order:

1. Read `PROJECT.md`.
2. Read `CLAUDE.md` completely and obey it as repository hard constraints.
3. Read the relevant design/spec document under `docs/plans/**` for the requested area.
4. Inspect the latest upstream `main` commit and the latest merged PR relevant to the current task.
5. Inspect the fork branch/worktree status before changing anything.
6. Only then start the next single scoped task.

Never rely on chat memory alone when repository state can be checked directly.

## 3. Single-task rule

Every work item must be atomic.

- Do not "clean up" nearby code while completing another request.
- Do not update unrelated docs, dependencies, formatting, tests, generated assets, configs, or comments unless they are strictly required by the one scoped task.
- If a second issue is discovered, record it separately and handle it in a later branch/commit.
- Tooling/agent integration changes must never be mixed into a product-code change.
- Product-code changes must never be mixed with unrelated refactors.

A task is complete only when its own validation passes and its diff contains no unrelated changes.

## 4. Commit and rollback discipline

Each completed task gets its own commit.

- One task -> one focused commit whenever technically possible.
- Commit messages must describe the actual change, not a vague session summary.
- Never bundle unrelated completed tasks into one commit.
- Never proceed to a new task before the current task has a durable commit checkpoint.
- Before opening a PR, inspect the final diff and confirm only intended paths changed.
- Never rewrite or force-push accepted history unless explicitly required and justified.

The latest accepted commit/PR is the canonical rollback point for the next session.

## 5. Existing repository constraints remain authoritative

`PROJECT.md` governs process and continuity. It does not replace technical rules already defined elsewhere.

In case of conflict:

1. Legal/security/privacy requirements win.
2. `CLAUDE.md` hard constraints win for repository implementation rules.
3. The relevant approved spec under `docs/plans/**` wins for feature/design behavior.
4. `PROJECT.md` governs workflow, recovery, scope isolation, commits, and external tooling.

Do not silently weaken existing constraints to make a task easier.

## 6. Validation policy

Use the smallest validation set that can falsify the change, then expand when risk requires it.

Typical checks may include the repository's existing Python, TypeScript, lint, unit, build, Playwright, content, asset, privacy/redaction, performance, or CI gates. Follow the commands and constraints already documented in the repository instead of inventing parallel tooling.

For a docs-only governance change, verify the diff and repository state; do not modify or rebuild product code just to create activity.

## 7. External tools, MCPs, skills, and agent utilities

External capabilities may be added only when they materially improve work on this repository.

Candidate categories include:

- Browser automation / visual verification for the live site and local builds.
- Web crawling / structured extraction for public-site QA and competitive/research evidence.
- Frontend/TypeScript/React expert skills.
- Accessibility, performance, SEO, security, testing, and code-review helpers.
- Research/reach tools for gathering public technical evidence.

Examples the project owner has asked to evaluate include:

- Matt Pocock skills (`mattpocock/skills`)
- Crawl4AI (`unclecode/crawl4ai`)
- Agent Reach (`Panniantong/Agent-Reach`)
- Chrome/browser-use style browser automation capabilities

These names are evaluation candidates, not automatic dependencies.

Before adding any external repository/tool to this repo:

1. Confirm a real project need that existing connected/built-in capabilities do not already satisfy.
2. Check license and redistribution implications.
3. Check maintenance activity and compatibility.
4. Check security posture and dependency/supply-chain risk.
5. Check whether credentials, network access, paid services, or elevated permissions are required.
6. Prefer pinned, reproducible versions over floating installs.
7. Keep agent/tooling material isolated from production runtime code unless production use is explicitly required.
8. Document install/use/remove instructions and why the tool exists.
9. Add it in its own branch and commit.
10. Validate that adding it does not alter production behavior unexpectedly.

Do not vendor large third-party repositories blindly. Prefer references, submodules/subtrees only when justified, package-manager dependencies where appropriate, or a dedicated tooling directory with explicit provenance and update policy.

## 8. Tooling directory convention

If repository-local agent/tooling assets are approved, place them under a clearly separated path such as `.agents/`, `tools/agent/`, or another existing repository convention after checking current structure.

Each integrated tool should have at minimum:

- source/provenance,
- pinned version or commit,
- license note,
- purpose,
- usage instructions,
- required permissions/secrets,
- update procedure,
- removal/rollback procedure.

Never put secrets, tokens, cookies, private keys, or production credentials in the repository.

## 9. Website-change workflow

For a visible website change:

1. Identify the exact page/component/content source and governing spec.
2. Establish current behavior from code and, when useful, the live site.
3. Change only the required implementation.
4. Run targeted automated validation.
5. Perform browser/visual verification when the change affects UI, navigation, responsive behavior, accessibility, or interaction.
6. Compare the diff against the request and repository constraints.
7. Commit.
8. Open a focused PR to upstream.

Do not use a visual change as an excuse to refactor unrelated code.

## 10. PR policy

Each PR should be reviewable as one coherent change.

PR description should state:

- what changed,
- why it changed,
- exact files/areas affected,
- validation performed,
- known limitations or follow-up items,
- rollback point when relevant.

Do not mix independent tasks into one PR merely because they were done in the same chat session.

## 11. Persistent project principles

- Repository evidence beats conversational assumptions.
- Reversible changes beat clever but hard-to-undo changes.
- Existing implementation contracts are preserved unless the task explicitly changes them.
- No speculative content, credentials, private data, or unverified claims are added to the public site.
- External tools are means, not product requirements; every integration must justify its maintenance and risk cost.
- When a better direction is discovered, evaluate it separately before changing the project baseline or product architecture.

## 12. Current recovery checkpoint

Baseline established for the fork-to-upstream workflow.

- Working repository: `jinngimk-lang/AegistonWEB`
- Upstream: `xdrshjr/AegistonWEB`
- First governance branch: `chore/project-governance`
- First governance task: add this `PROJECT.md` only.

After this PR is merged, update this section in a separate scoped governance change only when the durable operating model itself changes. Ordinary feature work should not edit this file merely to log activity; Git history and PRs are the activity log.
