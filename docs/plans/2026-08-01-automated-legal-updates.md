# Automated Legal Updates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Centralize every variable legal calculation value and add a fail-closed, source-grounded scheduled workflow that updates, verifies, publishes, and releases the calculator.

**Architecture:** `app/legal-data.json` is the sole machine-readable legal-state manifest. Existing calculation, UI, metadata, tests, and release tooling consume it; repository documentation defines the official-source and publication gates; two Hermes jobs execute that runbook in the relevant seasonal windows.

**Tech Stack:** Node.js 22, JavaScript/TypeScript, React, Vite/Vinext, Node test runner, GitHub Actions, Hermes Cron.

---

### Task 1: Specify and validate the legal-state manifest

**Files:**
- Create: `app/legal-data.json`
- Modify: `tests/rendered-html.test.mjs`

**Step 1: Write the failing tests**

Add tests that import `legal-data.json` and require schema version 1, an ISO `effectiveFrom` whose year equals `calculationYear`, HTTPS primary-source URLs on approved official hosts, all four location records with the six required integer allowances, and the five required monthly-rate parameters. Pin the current 2026 citation and values so an update must deliberately change the test fixture.

**Step 2: Run the focused test and verify RED**

Run: `node --test tests/rendered-html.test.mjs`  
Expected: FAIL because `app/legal-data.json` does not exist.

**Step 3: Add the minimal manifest**

Create a JSON manifest containing the current PKHB 2026 metadata, official PKHB/§115 ZPO/§82 SGB XII URLs, current Bund/FFB/München/Landkreis-München allowances, and current §115(2) rate parameters (600 threshold, 300 threshold rate, divisor 2, minimum 10, maximum 48).

**Step 4: Verify GREEN**

Run: `node --test tests/rendered-html.test.mjs`  
Expected: all manifest and pre-existing tests pass.

### Task 2: Make calculation and presentation consume the manifest

**Files:**
- Modify: `app/pkh-law.mjs`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `standalone/main.tsx`
- Modify: `standalone/index.html`
- Modify: `tests/rendered-html.test.mjs`

**Step 1: Write failing consistency tests**

Require `LEGAL_DATA` and `ALLOWANCE_SETS` to be exported from the law module, rate calculations to use manifest parameters, rendered metadata/UI/legal links to contain manifest values, and implementation files other than the manifest/current-value fixture not to hard-code `2026`, `600`, `300`, or `48` as legal state.

**Step 2: Verify RED**

Run: `npm test`  
Expected: FAIL because the existing production files still hard-code legal values.

**Step 3: Implement minimal manifest consumption**

Import the JSON manifest with a Node-compatible JSON import attribute. Export it as `LEGAL_DATA`; derive `ALLOWANCE_SETS` and the rate formula from it. Replace year, legal label, citation, source URLs, threshold/rate explanation, and maximum installments in the UI. Build Next metadata and the standalone document title from the manifest; keep the HTML shell year-neutral.

**Step 4: Verify GREEN**

Run: `npm test`  
Expected: all tests pass and the server-rendered page displays the current manifest legal state.

### Task 3: Make release artifacts follow the manifest

**Files:**
- Modify: `scripts/build-single-html.mjs`
- Modify: `.github/workflows/release.yml`
- Modify: `tests/rendered-html.test.mjs`
- Modify: `README.md`

**Step 1: Write failing release tests**

Require the build script to derive the year-specific asset name from the manifest and expose exact HTML/checksum paths through `$GITHUB_OUTPUT`. Require the release workflow to consume those outputs rather than a hard-coded yearly path. Require README links/text to remain valid across a year change.

**Step 2: Verify RED**

Run: `node --test tests/rendered-html.test.mjs`  
Expected: FAIL on current hard-coded `PKH-VKH-Rechner-2026.html` paths.

**Step 3: Implement dynamic artifact outputs**

Import the manifest in the build script, construct the asset name from `calculationYear`, append relative artifact paths to `$GITHUB_OUTPUT` when present, and reference those outputs in the release workflow. Link README to the latest release page and describe the manifest-driven current legal state without duplicated annual numbers.

**Step 4: Verify GREEN**

Run: `npm run build:single && node --test tests/rendered-html.test.mjs`  
Expected: a correctly named HTML/checksum pair and passing release tests.

### Task 4: Document the fail-closed operational procedure

**Files:**
- Create: `docs/legal-update-runbook.md`
- Modify: `README.md`

**Step 1: Document authoritative inputs and gates**

List official source classes, the January annual PKHB path, the June general amendment scan, prohibited reliance on snippets/secondary sources, full-value completeness checks, allowed diff scope, exact validation commands, git race handling, package version/tag sequence, CI/Pages/release/live probes, rollback/reporting rules, and silent no-op behavior.

**Step 2: Cross-link the runbook**

Add a short maintenance section to README pointing to the manifest and runbook.

**Step 3: Verify documentation references**

Run: `node --test tests/rendered-html.test.mjs`  
Expected: documentation/manifest consistency tests pass.

### Task 5: Full verification, independent review, and publication

**Files:** all changed files

**Step 1: Run all local gates**

Run: `npm ci && npm test && npm run lint && npm run build:pages && npm run build:single`  
Expected: exit 0 for every command.

**Step 2: Review the complete diff and run an independent reviewer**

Check `git diff --check`, secret patterns, changed-file scope, and independent logic/security review. Fix only confirmed issues and rerun all gates.

**Step 3: Commit and verify an immutable candidate**

Create conventional, issue-scoped commits. Verify the exact candidate SHA in a clean detached worktree with the full gates.

**Step 4: Push direct to main and verify remote/CI**

Push the exact candidate SHA to `refs/heads/main` only if remote `main` still equals the recorded base. Verify `git ls-remote`; wait for Pages CI and probe the published app.

### Task 6: Configure and verify Hermes schedules

**Files:** Hermes profile cron state (outside Git)

**Step 1: Create the pre-publication job**

Schedule checks on 15, 22, and 29 May/December at 07:00 UTC. Attach GitHub/verification skills, restrict to web/terminal/file/skills, set this repository as `workdir`, deliver to this conversation, and make results continuable.

**Step 2: Create the effective-date follow-up job**

Use the same self-contained prompt on 1, 3, 6, and 10 January/June at 07:00 UTC.

**Step 3: Verify configuration without test delivery**

List jobs and verify prompt, schedule, delivery, skills, toolsets, workdir, and enabled state. Do not manually run a publishing job merely to test scheduling.
