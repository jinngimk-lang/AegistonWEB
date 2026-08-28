# AegistonWEB Project Operating Baseline

> This file is the durable cross-context memory for ongoing work on AegistonWEB. Read it before making any change. If chat context becomes too long, is cleared, or another agent takes over, recover from this file, `AGENTS.md`, `STATUS.md`, `CLAUDE.md`, the relevant spec, and Git history.

## 1. Repositories and canonical roles

- Production website: https://aegiston.com/
- Upstream / production repository: `xdrshjr/AegistonWEB`
- Working fork: `jinngimk-lang/AegistonWEB`
- Default upstream target for accepted website/product changes: `xdrshjr/AegistonWEB:main`
- Fork `main` is allowed to contain fork-local governance/tooling that must not hitchhike into upstream product delivery.
- The canonical product recovery point is the latest accepted commit on `xdrshjr/AegistonWEB:main`.

## 2. Durable owner collaboration workflow

The project owner has explicitly chosen the following workflow as the default for normal website/product work. This rule is intended to survive chat/context loss and agent handoff. Do not revert to a PR-first workflow unless the owner explicitly changes this preference later.

1. Read/fetch the exact current SHA of `xdrshjr/AegistonWEB:main`.
2. Create one clean, focused branch in `jinngimk-lang/AegistonWEB` from that exact upstream product baseline.
3. Make exactly one scoped change and keep the diff minimal and independently reversible.
4. Run the smallest meaningful automated validation that can falsify the change.
5. For visible or behavioral UI changes, guide the owner to run the branch locally on Windows and inspect the real result in the browser.
6. **Do not modify upstream before explicit local approval from the owner.** Approval can be phrased as “可以提交”, “没问题”, “直接同步到主体”, or an equivalent clear confirmation.
7. After approval, immediately re-read/fetch `xdrshjr/AegistonWEB:main` in case someone else pushed new work.
8. Confirm the approved branch is still a valid descendant of current upstream `main` and that the final diff contains only the approved task.
9. Deliver the approved change directly to `xdrshjr/AegistonWEB:main` with a normal fast-forward update/push when permissions allow. **Do not open a PR by default.**
10. Never force-push upstream `main`, never discard newly arrived upstream commits, and never rewrite accepted upstream history.
11. If the connected agent integration cannot write upstream, preserve the approved branch and guide the owner through the minimal local path:
    - add/fetch `upstream` if needed;
    - verify `git merge-base --is-ancestor upstream/main HEAD` returns exit code `0`;
    - then use `git push upstream HEAD:main`.
12. After delivery, verify from GitHub that upstream `main` points at the expected commit and that the intended files/content are present.

This direct-upstream step happens only **after** owner local verification. Local verification first, upstream synchronization second.

## 3. Governance/tooling versus product code

Governance/tooling changes are normally fork-local unless the owner explicitly asks to upstream them.

For fork-local governance/tooling work:

1. Make one focused governance/tooling change.
2. Validate that no unintended product behavior changed.
3. Commit it as an independently reversible checkpoint.
4. Keep it in `jinngimk-lang/AegistonWEB` unless otherwise directed.

For real product work, never base the branch on fork governance `main` if that would carry fork-only files into upstream. Use the exact current upstream product baseline instead.

Historically `jinngimk-lang/AegistonWEB:upstream-main` has been used as a mirror of upstream product state. It may still be used, but the true authority is always the current SHA of `xdrshjr/AegistonWEB:main`.

## 4. Recovery order after context loss or agent replacement

Before continuing any work, recover context in this order:

1. Read `AGENTS.md`.
2. Read `PROJECT.md`.
3. Read `STATUS.md` to determine current state and allowed next work.
4. Read `CLAUDE.md` completely and obey it as repository hard constraints.
5. Read the relevant design/spec under `docs/plans/**` for the requested area.
6. Inspect the latest `xdrshjr/AegistonWEB:main` commit.
7. Inspect the latest fork branch/commit relevant to the current task.
8. Inspect the local/current worktree status before changing anything.
9. Only then continue the next single scoped task.

Never rely on chat memory alone when repository state can be checked directly.

## 5. Single-task and scope-isolation rule

Every work item must be atomic.

- Do not clean up nearby code while completing another request.
- Do not update unrelated docs, dependencies, formatting, tests, generated assets, configs, or comments unless strictly required by the scoped task.
- If a second issue is discovered, record or defer it and handle it separately.
- Tooling/agent integration changes must never hitchhike on a product-code change.
- Product-code changes must never be mixed with unrelated refactors.
- Before local verification and before upstream delivery, inspect the diff and confirm only the requested task is present.

A task is complete only when its own validation is adequate, the owner has approved visible behavior when applicable, and the final diff contains no unrelated change.

## 6. Commit, fast-forward, and rollback discipline

Each completed task gets its own focused commit whenever technically possible.

- Commit messages describe the actual change, not a vague session summary.
- Never bundle unrelated work into one commit merely because it happened in one chat session.
- Never force-push upstream `main`.
- Never rewrite accepted upstream history.
- If upstream advanced after local verification, stop and reconcile safely instead of overwriting it.
- The latest accepted upstream `main` commit is the canonical product rollback/recovery point.

A direct push is allowed only when it is a safe normal fast-forward of the already approved change.

## 7. Validation policy

Use the smallest validation set that can falsify the change, then expand when risk requires it.

Typical checks may include the repository's existing Python, TypeScript, lint, unit, build, Playwright, content, asset, privacy/redaction, performance, or CI gates. Follow the commands and constraints already documented in the repository instead of inventing parallel tooling.

For visible changes, local browser verification by the owner is part of the delivery workflow. Do not claim a visual change is accepted until the owner actually confirms it.

For docs-only governance changes, verify the diff and repository state; do not modify or rebuild product code just to create activity.

## 8. Existing repository constraints remain authoritative

`PROJECT.md` governs durable workflow and continuity. It does not replace technical rules defined elsewhere.

In case of conflict:

1. Legal/security/privacy/safety requirements win.
2. Explicit current owner instruction wins for workflow choices that do not violate higher-level constraints.
3. `CLAUDE.md` hard implementation constraints win.
4. The relevant approved spec under `docs/plans/**` governs feature/design behavior.
5. `PROJECT.md` governs workflow, recovery, scope isolation, commits, local verification, and upstream delivery.
6. `STATUS.md` records current state and allowed next work.
7. `.agents/README.md` governs third-party agent tooling.

Do not silently weaken a higher-priority constraint to make a task easier.

## 9. External tools, MCPs, skills, and agent utilities

External capabilities may be used or added only when they materially improve work on this repository.

Candidate categories include:

- Browser automation / visual verification for live and local builds.
- Web crawling / structured extraction for public-site QA and evidence.
- Frontend/TypeScript/React expert skills.
- Accessibility, performance, SEO, security, testing, and code-review helpers.
- Research/reach tools for gathering public technical evidence.

Approved/pinned repository-local tooling lives under `.agents/`; read `.agents/README.md` before using or changing it. Large external repositories should remain isolated from production runtime unless production use is explicitly required.

Before adding a new external repository/tool:

1. Confirm a real need that existing capabilities do not already satisfy.
2. Check license and redistribution implications.
3. Check maintenance activity and compatibility.
4. Check security posture and supply-chain risk.
5. Check required credentials, network access, paid services, or elevated permissions.
6. Prefer pinned, reproducible versions.
7. Keep tooling isolated from production runtime unless explicitly required.
8. Document install/use/remove instructions and purpose.
9. Add it as its own scoped change.
10. Validate it does not unexpectedly alter production behavior.

Never commit secrets, tokens, cookies, private keys, production credentials, or private customer/user data.

## 10. Website-change workflow

For a visible or behavioral website change:

1. Identify the exact page/component/content source and governing spec.
2. Establish current behavior from code and, when useful, the live site.
3. Start from exact current upstream `main` product state.
4. Change only the required implementation.
5. Run targeted automated validation.
6. Have the owner run and visually inspect the local branch when UI/interaction is affected.
7. Keep iterating in the working fork until the owner explicitly approves the result.
8. Re-fetch/re-read upstream `main`.
9. Re-check ancestry and the exact final diff.
10. Direct fast-forward the approved change to upstream `main` when safe; no PR by default.
11. Verify upstream after delivery.

Do not use a visual change as an excuse to refactor unrelated code.

## 11. Direct-upstream policy

The previous PR-by-default product workflow is retired for this project unless the owner explicitly asks for a PR in a specific case.

Default behavior after local approval:

- no PR;
- no merge commit solely for ceremony;
- no force push;
- no overwrite of concurrent upstream work;
- one focused approved commit whenever possible;
- normal fast-forward to `xdrshjr/AegistonWEB:main`;
- GitHub-side verification afterward.

If permissions prevent the agent from directly updating upstream, the agent should guide the owner through the minimum safe local commands instead of automatically creating a PR.

## 12. Persistent project principles

- Repository evidence beats conversational assumptions.
- Owner local verification precedes upstream delivery for visible changes.
- Reversible changes beat clever but hard-to-undo changes.
- Existing implementation contracts are preserved unless the task explicitly changes them.
- No speculative content, credentials, private data, or unverified claims are added to the public site.
- External tools are means, not product requirements; every integration must justify maintenance and risk cost.
- When a better direction is discovered, evaluate it separately before changing the project baseline or architecture.

## 13. Durable operating checkpoint

The durable operating model is now:

- Working repository: `jinngimk-lang/AegistonWEB`.
- Upstream/production repository: `xdrshjr/AegistonWEB`.
- Product branches start from the exact current upstream `main` product baseline.
- Agent makes one focused change in the working fork.
- Owner verifies visible changes locally before upstream is touched.
- After explicit approval, the agent re-checks current upstream state and the final diff.
- Approved changes are delivered directly to upstream `main` by safe fast-forward; PRs are not the default.
- If agent write permission is unavailable, guide the owner through the verified local fast-forward push.
- After delivery, verify upstream state from GitHub.
- `STATUS.md` records current project state; Git history is the detailed activity and rollback log.

Update this file when the durable operating model itself changes. Ordinary feature work should not edit it merely to log activity.
