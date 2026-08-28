# AegistonWEB Agent Entry Point

This file is the first stop for any coding agent working in this repository.

## Read before changing anything

Recover project context in this order:

1. `PROJECT.md` — durable project operating baseline and scope/commit/delivery rules.
2. `STATUS.md` — current phase, completed groundwork, and what work is currently allowed.
3. `CLAUDE.md` — repository hard technical constraints. Despite the filename, these rules apply to every agent.
4. The relevant approved spec under `docs/plans/**` for the area being changed.
5. Git history — inspect the latest fork/upstream commits and the current branch before editing.

Do not rely on chat context alone.

## Default owner collaboration workflow

This workflow is a durable user preference and is the default for normal AegistonWEB product changes unless the owner explicitly changes it later.

1. Work first in `jinngimk-lang/AegistonWEB` on one clean, focused branch created from the exact current upstream product baseline.
2. Make only the requested change and keep the diff minimal and independently reversible.
3. Run the smallest meaningful automated validation that can falsify the change.
4. For visible/UI behavior, guide the owner to run the branch locally on Windows and visually inspect the actual result.
5. **Do not update `xdrshjr/AegistonWEB` before the owner explicitly says the local result is approved** (for example, “可以提交”, “没问题”, or equivalent).
6. After owner approval, re-read/fetch `xdrshjr/AegistonWEB:main` immediately before delivery.
7. Confirm the approved branch is based on the current upstream `main` and that the final diff contains only the approved task.
8. Deliver directly to `xdrshjr/AegistonWEB:main` with a normal fast-forward push/update when permission allows. **Do not open a PR by default.**
9. Never force-push upstream `main`, never overwrite new upstream work, and never rewrite accepted upstream history.
10. If the connected agent integration cannot write upstream, keep the approved branch intact and guide the owner through the minimal local `git push upstream HEAD:main` path after verifying `git merge-base --is-ancestor upstream/main HEAD` succeeds.
11. After delivery, verify from GitHub that upstream `main` points to the expected commit and that the intended files are present.

The owner has explicitly chosen this workflow because they want to personally verify website changes locally before they reach the upstream repository, while avoiding unnecessary PR overhead after approval.

## Atomic work is mandatory

- One task at a time.
- One focused branch per task.
- Do not clean up or refactor nearby code unless the current task explicitly requires it.
- Do not mix tooling changes with product changes.
- Validate the current task before starting another one.
- Every completed task must end in an independently reversible commit.
- Before accepting a task, inspect the diff and confirm that no unrelated path changed.

If you discover another issue, leave it for a later task instead of fixing it opportunistically.

## Repository roles

- Production website: `https://aegiston.com/`
- Working fork: `jinngimk-lang/AegistonWEB`
- Upstream repository: `xdrshjr/AegistonWEB`
- Fork governance/tooling baseline: `jinngimk-lang/AegistonWEB:main`.
- Clean product baseline: the exact current commit of `xdrshjr/AegistonWEB:main` (historically mirrored as `jinngimk-lang/AegistonWEB:upstream-main`).

Fork `main` may intentionally contain fork-local governance files, agent tooling, and submodules that must **not** hitchhike into upstream product delivery. Product branches must therefore be based on the clean upstream product baseline, never on fork governance `main` unless the trees are proven equivalent for the requested task.

Before every product task:

1. read the current SHA of `xdrshjr/AegistonWEB:main`;
2. align/use a clean local or fork baseline at that exact upstream product commit;
3. create the focused product branch from that clean baseline;
4. before local verification and again before upstream delivery, compare against upstream `main` and confirm that only the current task is present.

After a direct upstream delivery, treat the accepted upstream commit as the next canonical product recovery point.

During governance/tooling work, fork-local governance remains isolated from upstream product code unless the owner explicitly asks to upstream it.

## Third-party agent tooling

Repository-local development tools live under `.agents/`.

Read `.agents/README.md` before using or updating any external tool.

Pinned external repositories are stored as Git submodules under `.agents/vendor/`. After cloning the working fork, initialize them only when needed:

```bash
git submodule update --init --recursive
```

Their presence is not permission to run them automatically. They are development-time tools, not production dependencies.

Never commit:

- API keys or tokens;
- browser cookies or authenticated profiles;
- passwords or private keys;
- production credentials;
- private customer/user data gathered by a research tool.

## Website-change rule

For every visible or behavioral website change:

1. identify the governing source/spec and exact affected area;
2. inspect the latest upstream `main` and use that exact product baseline;
3. create a focused product branch in the working fork;
4. inspect current code and current behavior;
5. change only what the request requires;
6. run targeted automated validation;
7. run local browser/visual verification with the owner when applicable;
8. inspect the final diff against upstream `main` and confirm no fork-local governance/tooling is included;
9. commit;
10. wait for explicit owner approval of the local result;
11. re-check upstream `main` immediately before delivery;
12. direct fast-forward the approved commit to upstream `main` when safe and permitted, without a PR by default;
13. verify the resulting upstream commit and files.

No unrelated improvement is allowed to hitchhike on that delivery.

## Conflict order

When instructions appear to conflict, use this precedence:

1. security, privacy, legal, and safety requirements;
2. explicit current owner instruction;
3. `CLAUDE.md` for implementation hard constraints;
4. the approved feature/design spec under `docs/plans/**`;
5. `PROJECT.md` for durable project workflow and continuity;
6. `STATUS.md` for the current phase and allowed next work;
7. `.agents/README.md` for external tooling governance.

If a new approach would require breaking a higher-priority constraint, make that a separate explicit decision rather than silently changing the rule.
