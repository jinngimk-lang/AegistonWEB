# AegistonWEB Agent Entry Point

This file is the first stop for any coding agent working in this repository.

## Read before changing anything

Recover project context in this order:

1. `PROJECT.md` — durable project operating baseline and scope/commit rules.
2. `STATUS.md` — current phase, completed groundwork, and what work is currently allowed.
3. `CLAUDE.md` — repository hard technical constraints. Despite the filename, these rules apply to every agent.
4. The relevant approved spec under `docs/plans/**` for the area being changed.
5. Git history — inspect the latest fork/upstream commits and the current branch before editing.

Do not rely on chat context alone.

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
- Clean product baseline: `jinngimk-lang/AegistonWEB:upstream-main`.
- Normal product delivery after the groundwork phase: `upstream-main` → one focused product branch → validation → commit → focused PR to upstream `main`.

`upstream-main` exists specifically because fork `main` intentionally contains fork-local governance files, agent tooling, and submodules that must **not** hitchhike on upstream product PRs.

Before every product task:

1. read the current SHA of `xdrshjr/AegistonWEB:main`;
2. make sure fork `upstream-main` points to that exact upstream product baseline (fast-forward/update it when upstream has advanced);
3. create the product branch from `upstream-main`, **never from fork `main`**;
4. before opening the PR, compare the product branch against upstream `main` and confirm that only the current product task is present.

After an upstream PR is merged, advance `upstream-main` to the accepted upstream commit before starting the next product task.

During the initial groundwork phase, governance and tooling changes are intentionally kept in the working fork until the foundation is declared complete in `STATUS.md`.

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

When `STATUS.md` permits Phase 1 website work, every visible or behavioral website change must be handled as its own scoped task:

1. identify the governing source/spec and exact affected area;
2. inspect the latest upstream `main` and align fork `upstream-main` to that exact product baseline;
3. create a focused product branch from `upstream-main`, never from fork `main`;
4. inspect current code and current behavior;
5. change only what the request requires;
6. run targeted automated validation;
7. run browser/visual verification for UI/interactions when applicable;
8. inspect the final diff against upstream `main` and confirm no fork-local governance/tooling is included;
9. commit;
10. open a focused PR from the fork product branch to upstream `main`;
11. after merge, advance `upstream-main` to the accepted upstream commit and use that as the next product recovery baseline.

No unrelated improvement is allowed to hitchhike on that PR.

## Conflict order

When instructions appear to conflict, use this precedence:

1. security, privacy, legal, and safety requirements;
2. `CLAUDE.md` for implementation hard constraints;
3. the approved feature/design spec under `docs/plans/**`;
4. `PROJECT.md` for project workflow and continuity;
5. `STATUS.md` for the current phase and allowed next work;
6. `.agents/README.md` for external tooling governance.

If a new approach would require breaking a higher-priority constraint, make that a separate explicit decision rather than silently changing the rule.
