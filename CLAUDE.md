# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Playwright + TypeScript end-to-end test project (`resman-testing`) that drives the ResMan web application. It is a test suite, not an application — there is no app source in this repo, so locators are written against the live DOM (Mode B in `.claude/rules/playwright-scripting.md`).

## Conventions and skills

How tests in this repo are written is defined in two rules files. Read both before
writing or reviewing a test; they win over habit and over any skill's own wording:

- `.claude/rules/playwright-scripting.md` — Mode B DOM discovery, locator priority
  and uniqueness, inline-grid rows (`nth(index)`, never `.last()`), assertions in the
  spec, waiting, test titles (`<CASE-ID> | behavior`), `test.step()` structure, naming
- `.claude/rules/playwright-architecture.md` — page objects with constructor-assigned
  `public readonly` locators and no `expect()`, page classes filed under
  `playwright-utils/pages/<area>/`, save-confirmation and row-locator ownership,
  environment-keyed test data, anti-patterns

Two skills drive the workflow:

- `pw-new-test-cli` — write a new test from user-supplied steps, exploring the live
  app with `@playwright/cli` (there is no app source here)
- `pw-test-audit` — audit the most recent test change against the rules with fresh eyes

## Commands

```bash
npm test                  # run all tests (chromium, firefox, webkit) against the "qa" env
npm run test:rc           # run against the rc environment
npm run test:qa           # run against the qa environment (default)
npm run test:regression   # run against the regression environment
npm run test:support      # run against the support environment

npx playwright test tests/property/buildings.spec.ts   # run a single test file
npx playwright test -g "QA-01"                         # run tests matching a title or case id
npx playwright test --project=chromium       # run against one browser only
npx playwright test --ui                     # interactive UI mode
npx playwright test --debug                  # step-through debug mode
npx playwright codegen                       # record a new test by clicking through a browser
npx playwright show-report                   # open the last HTML report
```

`npm run typecheck` (`tsc --noEmit`) is the only static check. It matters more than it
looks: Playwright strips types without checking them, so a test run never catches
drift in the environment-keyed test-data store — a case or field missing from one
environment object is a compile error only. There is no lint or build step.

## CI

`.github/workflows/ci.yml` gates PRs into `main` and pushes to `main`: a `Typecheck`
job, then an `E2E (qa, chromium)` job that runs the suite against qa. The `.env/`
files are gitignored and absent in CI — `dotenv` no-ops on a missing path, so the
config falls through to the `QA_BASE_URL`, `QA_TEST_USERNAME` and `QA_TEST_PASSWORD`
repository secrets. Each e2e run creates a real building on the shared qa
environment; there is no teardown.

## Environment configuration

Environment variables (`BASE_URL`, `TEST_USERNAME`, `TEST_PASSWORD`, etc.) are loaded from files in `.env/`, not the project root. `playwright.config.ts` loads `.env/.env` (shared defaults) first, then `.env/.env.<TEST_ENV>` (override), where `TEST_ENV` is one of `rc`, `qa`, `regression`, `support` and defaults to `qa` if unset.

- `.env/.env.example` is the only tracked file in that directory — it documents the expected keys.
- `.env/.env.rc`, `.env/.env.qa`, `.env/.env.regression`, `.env/.env.support` hold real per-environment values and are gitignored; they must exist locally (copy from the example) before tests that rely on `BASE_URL` or credentials will work.
- Read config values in tests via `process.env.BASE_URL` etc. — `baseURL` is already wired into Playwright's `use` block, so relative `page.goto('/path')` calls resolve against whichever environment is active.

When adding a new environment, create `.env/.env.<name>` and a corresponding `test:<name>` script in `package.json`.

## Architecture notes

- `playwright.config.ts` is the single source of truth for run behavior: it dotenv-loads the environment (see above), then defines the three-browser (`chromium`, `firefox`, `webkit`) test matrix and shared settings (trace on first retry, HTML reporter).
- Tests live under `tests/` and are picked up by `testDir: './tests'` — any `*.spec.ts` file there is auto-discovered, no manual registration needed.
- CI-specific behavior is driven off `process.env.CI` in the config (retries, worker count, `forbidOnly`) rather than a separate config file.
