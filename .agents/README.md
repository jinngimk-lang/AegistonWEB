# AegistonWEB Agent Tooling Zone

> `.agents/` is reserved for development-time agent skills, browser automation, crawling, research helpers, and their provenance. Nothing under this directory is part of the production website runtime unless a later, explicit product decision says otherwise.

## 1. Why this directory exists

AegistonWEB is expected to be maintained across long-running AI-assisted sessions. The project therefore needs a stable place for development capabilities without contaminating `frontend/`, `backend/`, `nginx/`, or production dependency graphs.

Rules:

- Agent tooling lives under `.agents/`.
- Third-party tooling must be pinned to an exact commit or release.
- Every new tool is added in its own branch and commit.
- Tooling changes never share a commit with website/product changes.
- Production code must not import from `.agents/**`.
- Production Docker/build files must not depend on `.agents/**` unless explicitly approved as a separate architecture change.
- Credentials, browser cookies, auth sessions, API keys, tokens, private SSH keys, and production secrets must never be committed here.
- A tool may be present in the repository while remaining disabled by default.

## 2. Prefer existing capabilities before adding duplicates

Before introducing a new external repository, check whether the current environment already provides the capability.

Capabilities already available to the project operator include, depending on the active ChatGPT/Codex environment:

- GitHub repository/branch/commit/PR operations;
- browser automation and browser verification skills;
- Next.js and React implementation guidance;
- React best-practice review;
- systematic debugging / TDD / verification workflows;
- web search and public-source research.

An external tool is justified only when it adds a materially different capability, improves reproducibility, or gives the repository a durable tool that can be used outside the current chat environment.

## 3. Approved external candidates

Evaluation date: **2026-08-26**.

### 3.1 Matt Pocock skills

- Source: `https://github.com/mattpocock/skills`
- Purpose: reusable engineering-agent skills and workflow patterns.
- License: MIT.
- Evaluated pin: `6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`.
- Status: **approved for isolated repository inclusion**.
- Intended location: `.agents/vendor/mattpocock-skills`.
- Runtime impact: none.
- Update policy: review upstream changes first; update the pin in a dedicated tooling commit only.

Reason for approval: directly relevant to long-running engineering-agent workflows and small enough conceptually to be useful as a durable skill reference without becoming a production dependency.

### 3.2 Crawl4AI

- Source: `https://github.com/unclecode/crawl4ai`
- Purpose: structured crawling / extraction for public-site QA, content research, link inspection, and evidence gathering.
- License: Apache License 2.0 text plus an additional explicit attribution requirement in the upstream `LICENSE`.
- Evaluated stable pin: `7e801521428ee12509994d39151006f64055ebe3` (v0.9.2).
- Status: **approved for isolated, optional tooling inclusion with attribution preserved**.
- Intended location: `.agents/vendor/crawl4ai`.
- Runtime impact: none by default.
- Special rule: if Crawl4AI is actually distributed, publicly used, or incorporated into a derived tool, preserve the upstream attribution requirement and NOTICE/credits obligations.
- Update policy: prefer stable releases; do not float on `main`.

Reason for approval: useful for future site-wide QA and structured public-web research. It must remain isolated because it brings a substantial Python/browser dependency surface and licensing/attribution obligations.

### 3.3 Agent Reach

- Source: `https://github.com/Panniantong/Agent-Reach`
- Purpose: optional research/reach layer across public internet platforms.
- License: MIT.
- Evaluated pin: `06c202b03400a7d31886bf4399213706da1a0324`.
- Status: **approved for isolated, disabled-by-default inclusion**.
- Intended location: `.agents/vendor/agent-reach`.
- Runtime impact: none.
- Security rule: never commit cookies, login state, platform tokens, or private account credentials.
- Network rule: only invoke channels relevant to a concrete task; do not perform broad collection by default.
- Update policy: review channel/back-end changes before updating because the project can change third-party integrations rapidly.

Reason for approval: can materially improve public research when a normal web search is insufficient, but its broad network and authentication surface means it must never become an automatic production dependency.

### 3.4 browser-use

- Source: `https://github.com/browser-use/browser-use`
- Purpose: optional browser-agent automation and reproducible agent/browser experiments.
- License: MIT.
- Evaluated pin: `fac707cccf7d7c2ccf743944499baeed916bf827`.
- Upstream package version observed during evaluation: `0.13.7`.
- Status: **approved as optional, disabled-by-default tooling**.
- Intended location: `.agents/vendor/browser-use`.
- Runtime impact: none.
- Duplication rule: the repository already has Playwright tests and the operator may have browser automation skills available. Use those first for normal website verification; use browser-use only when its agent-oriented browser layer provides a concrete benefit.
- Update policy: pin exact commits/releases because the CLI/API surface changes quickly.

Reason for approval: useful as a durable fallback / experimental browser-agent layer, but not necessary for ordinary AegistonWEB UI verification.

## 4. Integration format

Preferred format for large third-party repositories is a **Git submodule pinned to an exact commit**, not copied source code.

Why:

- keeps provenance obvious;
- avoids silently forking third-party code;
- keeps production history smaller;
- makes rollback one Git pointer change;
- allows licenses and upstream history to remain attached to the original project.

Each submodule entry must live under `.agents/vendor/<name>` and be accompanied by its entry in this file.

Do not vendor a full external repository by copy/paste unless submodule use is technically impossible and a separate review approves the redistribution implications.

## 5. Installation is not activation

Adding a pinned submodule to `.agents/vendor/` means the source is available to developers/agents. It does **not** mean:

- its dependencies are installed in production;
- it runs in CI;
- it runs during `npm build` / `next build`;
- it is allowed network or credential access;
- it is approved to alter website content automatically.

Activation must happen per concrete task and with the minimum permissions needed.

## 6. Browser verification hierarchy

For normal AegistonWEB UI work use this order:

1. existing repository tests and Playwright coverage;
2. available browser/agent-browser tooling in the active development environment;
3. browser-use only when the previous two cannot adequately exercise the workflow;
4. manual browser verification as a final fallback or visual sanity check.

Do not add a second browser framework to production dependencies merely because it exists under `.agents/`.

## 7. Crawler/research hierarchy

For public research use this order:

1. normal web search / direct public-source inspection;
2. Crawl4AI when structured crawling, site traversal, or extraction is needed;
3. Agent Reach when a task genuinely requires its supported platform/channel layer;
4. authenticated/private-source access only when explicitly authorized for that task.

Respect robots.txt, site terms, rate limits, copyright, privacy, and applicable access restrictions.

## 8. Update procedure

Every external tooling update is its own task:

1. read this file and `PROJECT.md`;
2. identify the existing pin;
3. inspect upstream release notes / changes / license changes;
4. assess dependency and security impact;
5. update exactly one tool pin;
6. verify no production files changed;
7. commit;
8. fast-forward/merge into fork `main` during the foundation stage, or use the normal PR workflow if tooling has already become shared upstream infrastructure.

Never bulk-update all agent tools without reviewing them individually.

## 9. Removal / rollback

A tool must be removable without touching website code.

Normal rollback:

1. revert the dedicated tooling commit that added or updated the tool;
2. remove its submodule entry and matching `.gitmodules` section if applicable;
3. remove only tooling-specific local caches/dependencies outside Git history;
4. verify `frontend/`, `backend/`, `nginx/`, tests, and production builds are unchanged.

## 10. Foundation-stage decisions

During Phase 0, the approved plan is:

1. establish `PROJECT.md` and `STATUS.md`;
2. establish this `.agents/` policy;
3. add approved external repositories one at a time as pinned, isolated submodules;
4. confirm fork `main` still has no website/product behavior changes;
5. then transition to Phase 1 website work.

The presence of an approved candidate here does not authorize unrelated product changes. Each actual submodule addition remains a separate commit and verification point.
