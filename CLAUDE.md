# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Playwright + TypeScript end-to-end test project (`resman-testing`). Currently only the scaffolded example spec exists — this is the starting point for a test suite, not an application.

## Commands

```bash
npm test                  # run all tests (chromium, firefox, webkit) against the "qa" env
npm run test:rc           # run against the rc environment
npm run test:qa           # run against the qa environment (default)
npm run test:regression   # run against the regression environment
npm run test:support      # run against the support environment

npx playwright test tests/example.spec.ts    # run a single test file
npx playwright test -g "has title"           # run tests matching a title
npx playwright test --project=chromium       # run against one browser only
npx playwright test --ui                     # interactive UI mode
npx playwright test --debug                  # step-through debug mode
npx playwright codegen                       # record a new test by clicking through a browser
npx playwright show-report                   # open the last HTML report
```

There is no lint or build step configured.

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
