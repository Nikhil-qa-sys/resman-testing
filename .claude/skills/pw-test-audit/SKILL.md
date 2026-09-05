---
name: pw-test-audit
description: Audit a recently written Playwright test as a fresh pair of eyes. Reviews the most recent test changes via git diff, re-derives every locator from the live application (Mode B — no app source in this repo), checks compliance with .claude/rules/playwright-scripting.md and .claude/rules/playwright-architecture.md, and reports findings before optionally applying fixes.
---

Audit the most recent Playwright test changes against this project's rules. You are running in a fresh agent session — bring a clean, independent perspective. Do not assume the previous agent's choices were correct.

**Never skip `AskUserQuestion` steps in this skill, even if told to work autonomously.**

## Instructions

### 1. Identify the recent changes

Find the changes under audit:

```bash
git status --short
git diff HEAD
```

The uncommitted diff is the preferred scope. If it is empty, the test was most likely already committed (`pw-new-test-cli` offers to commit as its last step), so check what the last commit touched:

```bash
git show --stat HEAD
```

If `HEAD` touches `tests/` or `playwright-utils/`, use `AskUserQuestion` to confirm the scope before auditing:

- Question: "No uncommitted changes. Audit the last commit instead?"
- Header: "Scope"
- Option 1: label "Audit HEAD", description "Review `<subject of HEAD>` — the most recent committed test change"
- Option 2: label "Stop", description "Nothing to audit right now"

If neither the working tree nor `HEAD` touches `tests/` or `playwright-utils/`, stop and tell the user there is no recent test change to review. Do not walk further back through history, and do not audit unchanged files.

Otherwise, limit the audit to the diff hunks you see — do not review untouched specs, untouched page objects, or unrelated files.

### 2. Establish the project context

Read these in full before judging anything:

- `.claude/rules/playwright-scripting.md` — DOM discovery mode, locators, assertions, waiting, test structure, naming, code style, actions
- `.claude/rules/playwright-architecture.md` — page object conventions, per-spec instantiation, environment-keyed test data, directory structure, anti-patterns
- `CLAUDE.md` — commands, environment configuration, CI

Then read the files the diff touches plus their neighbours: the spec under `tests/`, the page objects under `playwright-utils/pages/`, and the data file under `playwright-utils/test-data/`.

This project's shape is fixed and is **not** open to re-litigation during an audit:

- **Page Object Model is always in use.** Every spec instantiates the page classes it needs in the test body — `const loginPage = new LoginPage(page)`.
- **There is no `PageManager`, no aggregator class, and no `pom` fixture.** A spec importing `test` and `expect` straight from `@playwright/test` is correct. Never flag its absence, and never propose introducing one.
- **Locators are `public readonly` properties assigned in the constructor.** Inline locators inside methods are the violation, not the convention.
- **Page objects contain no `expect()`.** Assertions live in the spec, on the page object's exposed locator properties.

If the rules files contradict anything in the checklists below, the rules files win. Cite the rule you are applying; never invent one.

### 3. Re-derive the DOM — Mode B

There is no application source in this repo (see `.claude/rules/playwright-scripting.md` § Mode B). You cannot read a component to confirm a locator, and you cannot add a `data-testid`. Verify against the **running application** instead.

Credentials and `BASE_URL` come from `.env/.env.<TEST_ENV>`; `TEST_ENV` defaults to `qa`.

```bash
npx playwright codegen $BASE_URL                 # record the flow and read what it suggests
npx playwright-cli open $BASE_URL                # or drive it stepwise
npx playwright-cli snapshot                      # accessibility tree with element refs
npx playwright-cli generate-locator e15          # a locator proposal for one ref
npx playwright-cli close
```

A throwaway probe spec is also fine for `page.accessibility.snapshot()`, `innerHTML()`, `allTextContents()` and `await locator.count()` — delete it and its screenshots afterwards; probes are never committed.

For each locator in the diff, judge whether it is **correct, unique at the test viewport, and the most semantic option the live DOM actually offers**. Where the DOM offers nothing semantic, the Mode B fallback ladder applies: semantic ancestor scoping → stable non-styling attribute or authored id → `.nth()`/`.first()` with a comment. A locator built on an authored id (`#BuildingListTable`, `#PropertyOrGroupIDInput`) or a stable `name` suffix (`input[name$=".Name"]`) is a legitimate Mode B choice, not a finding — provided the comment explaining why is there.

If the app is unreachable in this session, say so in the report and mark the affected locator findings as **unverified** rather than guessing. Never flag a locator as wrong without evidence from the live DOM.

### 4. Audit the changes

Walk every changed line against the checklists below. Flag each violation with `file:line` and cite the rule.

#### Locators
- Priority order followed: `getByRole` > `getByLabel` > `getByText` > `getByPlaceholder` > `getByTestId` > CSS (structural tags and authored attributes only)
- No styling class names, and no framework-generated ids (`#\:r3\:`, hashed CSS-module classes) — those are as unstable as classes
- Existing app test ids are consumed as they ship; no invented ids, no renames — Mode B cannot add them
- Every locator used with `click` / `fill` / `check` / `selectOption` resolves to exactly one element — verified by `count()` against the live app
- Repeated UI patterns (rows, cards) are scoped to their container; `.first()` / `.nth()` only as a last resort and carrying a comment saying why
- `filter({ has })` locators are rooted at `page`, never at a stored parent property — the chain is applied relative to the outer element and silently matches nothing
- Cross-page navigation captures a value from the source page and asserts it on the destination
- `name` / `hasText` constructor options preferred over `.filter()`; `.filter()` reserved for second-level filtration
- Locator text matches what the app renders at the test viewport, character for character
- Assertions on a value belonging to a section are scoped to that section

#### Assertions
- Every `expect()` is in the spec file — **no `expect` import anywhere under `playwright-utils/`**
- Locator (auto-retrying) assertions preferred over generic `expect(value).toBe(...)`
- No `expect.soft(...)`
- Negative assertions wait for the DOM mutation first (`waitForResponse`, `waitFor({ state: 'hidden' })`, or `toBeHidden`)
- `toHaveText` / `toContainText` on a unique locator preferred over `getByText(...).toBeVisible()`

#### Waiting
- No `page.waitForTimeout(...)`
- No redundant `waitFor()` or `waitForURL` before an action or an auto-waiting locator assertion
- Explicit waits appear only before non-auto-waiting calls (`all`, `count`, `textContent`, `inputValue`, `allTextContents`)
- Guards inside page objects use `waitFor()`, never `expect()`
- No custom timeouts anywhere in the diff — no `{ timeout: ... }`, no `test.setTimeout(...)`. A genuinely slow application is absorbed by raising `timeout` / `expect.timeout` / `actionTimeout` in `playwright.config.ts`, once, with the measurement recorded in a comment

#### Test structure and data
- Title reads `<CASE-ID> | <user behavior>`, with the id written as a literal — no module-level `TEST_CASE_ID` const
- The test starts from the home page (`await page.goto('/')`, typically in `beforeEach`); no direct navigation to an inner route
- Body is divided into `test.step()` blocks, one per phase of the journey, each named in the user's language
- **Each step verifies its own outcome** — assertions are not pooled into a trailing "verify everything" step
- Page objects are instantiated in the test body (or `beforeEach`) before the first step, never at module scope; variable name is the camelCase of the class name
- Only the page objects the spec actually uses are imported
- Each test covers one logical user flow
- No environment-specific value hardcoded in the spec or a page object — property names, accounts, addresses all arrive from `playwright-utils/test-data/<area>.data.ts` via the case id (`testData['QA-01']`); credentials arrive from `process.env`
- The data file is **data only** — a function or an exported type in it means logic leaked out of the page object that owns it
- A new or edited case is declared in **every** environment object, and the non-first objects stay annotated `typeof qaTestData`
- Values the application constrains (a unique name, a length cap) are declared as a *prefix* in data and completed by the page object that submits the form, which returns what it created

#### Code style
- One statement per line — no vertically stacked locator chains or `expect(...)` wraps
- The spec asserts on the page object's properties (`newBuildingPage.saveButton`) and never rebuilds a locator the page object already exposes
- Locator constants in a spec only when the rules justify them (repeated 3+ times, or opaque and used 2+ times); no intermediate-only constants
- No re-declaration of the same locator under variant names (`*AfterUpdate`, `*AfterRevert`) — locators are lazy and re-resolve
- Variables holding `allTextContents()` / `textContent()` results end in `Values` / `Texts`; element-type names (`Links`, `Rows`) are reserved for locators
- Descriptive names, no abbreviations or acronyms
- Consecutive clicks on the exact same element use `click({ clickCount: N })`
- Comments explain the non-obvious *why* (a Mode B locator choice, an app constraint); they do not narrate what the line does

#### Page objects
- Every element the class touches is a `public readonly` locator property assigned in the constructor — no inline `this.page.locator(...)` inside a method
- No zero-argument method that only returns a locator — that is a property
- Methods returning a locator exist only for selectors parametrized by runtime data (`buildingRow(name)`, `buildingsAddedMessage(count)`), are derived from a stored property where possible, and are **not** prefixed `expect`
- No `expect*`-prefixed methods and no assertions of any kind — the spec verifies
- No tiny single-action methods (`clickSaveButton`, `fillName`); cross-page navigation is the one legitimate one-click method
- No method spans two pages — navigation ends one method and starts another on the next page object
- Method names are camelCase descriptive verb phrases, no abbreviations
- No two methods differing only in a hardcoded value — parametrize the existing one
- Reuse first: the relevant class was scanned for existing coverage before a new method was added
- A new page class is a file under `playwright-utils/pages/` in kebab-case with a PascalCase `Page`/`Component` class name — there is no central registration step

#### Architecture
- The spec sits under `tests/<area>/` matching its actor or feature area; `tests/` holds specs and setup files only
- Stateless utilities live in `playwright-utils/helpers/`, not inlined into a page method or spec
- Fixtures are reserved for resources needing setup/teardown; a page object is not a fixture
- No probe or scratch spec, screenshot, trace or report artifact left in the diff
- Auth setup files untouched unless the change intentionally targets them

### 5. Compose the audit report

Output a single structured report directly to the user using markdown tables, one table per severity. Number every finding sequentially across all tables (1, 2, 3, …) so the user can reference them by ID when choosing which to apply.

```
## Audit summary
<one-sentence verdict: passes cleanly / minor issues / multiple violations>

## Findings — Must-fix

| #  | Location              | Issue                                    | Fix                                          |
|----|-----------------------|------------------------------------------|----------------------------------------------|
| 1  | `<file>:<line>`       | <rule violated + one-line evidence>      | <one-line suggested fix>                     |

## Findings — Should-fix

| #  | Location              | Issue                                    | Fix                                          |
|----|-----------------------|------------------------------------------|----------------------------------------------|
| 2  | `<file>:<line>`       | <rule violated + one-line evidence>      | <one-line suggested fix>                     |

## Suggestions

| #  | Location              | Improvement                              | Suggested change                             |
|----|-----------------------|------------------------------------------|----------------------------------------------|
| 3  | `<file>:<line>`       | <stylistic / readability nudge>          | <one-line suggested change>                  |

## What looks good
- <brief callouts of well-applied conventions so positive choices are reinforced>
```

Formatting rules:
- Omit any section with no entries.
- Keep cell content to a single line each. If the rule citation and the evidence are both essential, combine them as `<rule>: <evidence>` in the **Issue** column rather than spilling onto a second line.
- Use backticks around code identifiers, file paths, and selectors inside cells (e.g. `` `#PageLinks` ``, `` `getByRole` ``, `` `buildings-page.ts:14` ``).
- Strip directory prefixes from the **Location** column to keep the table narrow — show only the filename and line (e.g. `buildings-page.ts:14`, not the full path).
- Cite the specific rule from `.claude/rules/` inside the **Issue** column.
- Mark any locator finding you could not confirm against the live app as `(unverified)`.
- The "What looks good" section stays as bullets — it's praise, not actionable items.

**Severity guide:**
- **Must-fix** — direct violation of a documented rule in `.claude/rules/`
- **Should-fix** — patterns the rules call out as preferred but where the current code still works
- **Suggestions** — stylistic or readability nudges not codified in the rules

### 6. Offer next step

Use `AskUserQuestion`:

- Question: "Audit complete. What would you like to do?"
- Header: "Next step"
- Option 1: label "Apply must-fix", description "Edit the test to resolve the must-fix findings only"
- Option 2: label "Apply all", description "Edit the test to resolve must-fix and should-fix findings"
- Option 3: label "Discuss", description "Talk through specific findings before changing anything"

The user may also select "Other" to ask for a custom subset by number (e.g. "apply 1, 3, 5") since the table assigns a stable ID to every finding. Honor those references precisely.

If the user picks **Apply must-fix** or **Apply all** (or names specific finding numbers), edit the spec, the page objects and the data file as needed, then verify:

```bash
npm run typecheck
npx playwright test -g "<CASE-ID>" --project=chromium --retries 0
```

`npm run typecheck` is not optional after touching the data store: Playwright strips types without checking them, so a missing case or dropped field in one environment object is a compile error only.

If the fixes touched the data store or anything environment-dependent, re-run the case against each environment its data covers:

```bash
TEST_ENV=qa npx playwright test -g "<CASE-ID>" --project=chromium
TEST_ENV=rc npx playwright test -g "<CASE-ID>" --project=chromium
TEST_ENV=regression npx playwright test -g "<CASE-ID>" --project=chromium
```

If the test fails after the fixes, debug with the trace CLI — `npx playwright trace open <path>`, then `trace actions`, `trace action <n>`, `trace snapshot <n> --name after`, `trace close`. Use `npx playwright trace` (CLI), **not** `npx playwright show-trace` (GUI — it blocks). Re-inspect the live DOM when a locator fails; never "fix" a failure by dropping to `.first()`, a class selector, or a longer timeout.

If the user picks **Discuss**: answer their questions and only edit code on explicit request.

## Operating principles

- **Fresh-eyes posture** — you are NOT the agent that wrote this code. Re-derive every locator from the live application. Question every choice. The previous agent's intent is irrelevant; only the rules and the real DOM matter.
- **Recent changes only** — the confirmed diff is the entire audit scope. Never review untouched files or propose rewrites of tests outside it.
- **Cite rules, not opinions** — every must-fix finding maps to a rule in `.claude/rules/`. Opinion-only feedback goes under Suggestions.
- **Verify locators against the live DOM** — never flag a locator without evidence. In Mode B a locator that looks weak (an authored id, a `name$=` suffix) may be the only reliable option; the comment beside it is what makes it acceptable, not its prettiness.
- **Do not re-litigate the architecture** — constructor-assigned locator properties, per-spec page object instantiation, assertion-free page objects and the absence of a `PageManager` or `pom` fixture are settled decisions. Proposing the opposite is a bug in the audit, not a finding.
- **No guessing about test intent** — if a finding depends on what the test was supposed to do, ask rather than assume.
