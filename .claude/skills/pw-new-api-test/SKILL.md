---
name: pw-new-api-test
description: Write a new Playwright API test from user-provided steps, on the RequestHandler framework — fluent builder, injected auth, expected-status-as-argument, log-attaching matchers and Ajv schema validation. Establishes the endpoint contract by observation (no app source in this repo), scaffolds any missing framework piece, then writes, runs and debugs the spec.
---

Write a new API test case for `tests/API/` on this project's API framework.

Test steps: $ARGUMENTS

**Never skip `AskUserQuestion` steps in this skill, even if told to work autonomously.**

## When to use this skill

Use this when the case is driven through HTTP rather than a browser: creating, reading,
updating or deleting a record through the application's endpoints, validating a response
contract, or proving a negative (a rejected payload, an unauthenticated call). For a case
that has to go through the UI, use `pw-new-test-cli` instead — nothing in this skill
applies to `tests/UI/`.

The two halves do not share code. An API spec never imports a page object, and this skill
never edits anything under `playwright-utils/UI/`.

## What this framework buys, and why the rules are shaped the way they are

Two failure modes drive every rule below. Keep them in mind while writing — they are what
the user asked for:

1. **A failure has to be diagnosable from the report alone.** That is why the expected
   status is an argument to the terminal method and never an `expect()`, and why
   assertions use the `should*` matchers: both paths attach the recent request/response
   log to the failure message. A spec that asserts with `toEqual` fails with
   `expected 10, received 0` and nothing about which call produced the 0.
2. **A test must not leak into the next one.** Three places leak, and all three are
   covered: the builder's state (`cleanUpFields()` resets it after every call), an imported
   JSON payload (module state — clone before touching it), and a created record (the test
   that creates it deletes it before it ends). `fullyParallel: false` is a fourth: these
   tests hit a shared environment.

## Prerequisites

### 1. The framework files

`.claude/rules/playwright-api-framework.md` is the authority for the API half — read it in
full before writing anything, and prefer it over both this skill's wording and whatever the
existing code happens to do. It describes this layout:

| File | Responsibility |
|------|----------------|
| `core/request-handler.ts` | the fluent builder — the only transport a client uses |
| `core/logger.ts` | `APILogger` — the per-test request/response buffer |
| `core/custom-expect.ts` | the extended `expect`: `shouldEqual`, `shouldMatch`, `shouldBeLessThanOrEqual`, `shouldMatchSchema` |
| `core/schema-validator.ts` | Ajv wrapper reading `response-schemas/` |
| `fixtures/api-fixtures.ts` | the extended `test`: `api`, `config`, worker-scoped `authContext` |
| `clients/<area>/<module>-api.ts` | one class per endpoint group — the domain layer |
| `helpers/create-session.ts` | session acquisition, outside the fixture chain |
| `helpers/data-generator.ts` | payload builders that clone a template and randomize it |
| `helpers/html-form.ts` | reads forms, options and cells out of served HTML |
| `api-config.ts` | non-secret, non-per-case environment values |
| `test-data/<area>.api.data.ts` | one object per environment, keyed by case id |

All of it sits under `playwright-utils/API/`, mirroring `playwright-utils/UI/`.

Check what is actually present before step 1:

```bash
ls playwright-utils/API playwright-utils/API/core playwright-utils/API/fixtures 2>&1
```

If a piece is missing, **stop and ask** with `AskUserQuestion` before writing a spec that
cannot run:

- Question: "The API framework is not fully scaffolded (`<list the missing files>`). How should I proceed?"
- Header: "Scaffold"
- Option 1: label "Scaffold it" (Recommended), description "Create the missing framework files per .claude/rules/playwright-api-framework.md, then write the test"
- Option 2: label "Test only", description "Write the spec against the existing shape and leave the framework alone"

Build any missing piece from the rules file, not from memory. Two details are load-bearing
and easy to drop:

- Every terminal method calls `Error.captureStackTrace(error, callingFunction)` so the
  failure points at the spec line, not at `request-handler.ts`.
- Every builder field is reset in `cleanUpFields()`. A field added without that line leaks
  into the next request in the same test.

### 2. Dependencies

```bash
npm ls ajv @faker-js/faker 2>&1 | head
```

`ajv` (schema validation) and `@faker-js/faker` (unique-per-run values) are required. If
either is absent, ask the user to install it — do not install it yourself:

```bash
npm install --save-dev @faker-js/faker && npm install ajv
```

## Instructions

### 1. Read the rules and the existing API suite

Read in full, in this order:

- `.claude/rules/playwright-api-framework.md` — the API half's conventions; it wins over
  everything else here
- `CLAUDE.md` — commands, the `.env/` layout, CI
- every existing `tests/API/**/*.api.spec.ts` — what is already covered, which file and
  `test.describe` the new case belongs in, which case ids are taken

Then read the support code the new case will touch: the existing `request-objects/`
templates, `response-schemas/` directories, and `utils/data-generator.ts`. Reuse a template
or a builder that already fits rather than adding a near-duplicate.

### 2. Establish the endpoint contract by observation

There is no application source in this repo, so an endpoint is discovered the same way a
locator is — against the running application (Mode B, `.claude/rules/playwright-scripting.md`).
Never invent a path, a payload shape or a status code.

Drive the equivalent flow in a browser with the network log open and read off what the
application's own client sent:

```bash
npx playwright codegen $BASE_URL          # record the flow
npx playwright-cli open $BASE_URL         # or drive it stepwise
npx playwright-cli snapshot
npx playwright-cli close
```

A throwaway probe spec is also fine — one that performs the flow and dumps
`request.url()`, the payload and `await response.json()`. Delete it afterwards; probes are
never committed.

Record, for every call the case will make:

- method and path, and which segments are ids captured from an earlier response
- query parameters
- request payload shape (this becomes the `request-objects/` template)
- the **actual** status code (`201` vs `200`, `204` vs `200` — the terminal method's
  argument must match what the application really answers)
- the response body shape (this becomes the schema file)

If the application is unreachable in this session, say so and stop rather than guessing the
contract.

### 3. Confirm the case id and the data

Use `AskUserQuestion` to settle what cannot be derived:

- Question: "What case id should this test carry?"
- Header: "Case id"
- Options: the next free id in the `QA-1xx` range (Recommended), plus "Something else"

Every title is `<CASE-ID> | <behavior>`, with the id written as a **literal** in both the
title and any data lookup — a module-level `TEST_CASE_ID` const breaks `-g` selection and
is a finding in review. A hyphenated id needs bracket access: `testData['QA-102']`.

Per-case values — a property name, a record's fields — go in
`playwright-utils/API/test-data/<area>.api.data.ts`, keyed by the case id, declared in
**every** environment object. The non-first objects are annotated `typeof <first>TestData`,
so a case or field missing from one environment is a compile error rather than a runtime
surprise.

`playwright-utils/API/api-config.ts` holds only what is neither per-case nor secret.
`BASE_URL` is already selected by dotenv, so there is no per-environment branch to write
there. Credentials never go in either file; they come from `.env/.env.<env>` through
`process.env`, read in the fixture.

### 4. Add the supporting artifacts before the spec

In the same change as the spec, not after it:

**A case entry in `test-data/<area>.api.data.ts`** — in *every* environment object, with
the non-first ones annotated `typeof <first>TestData` so a dropped field is a compile
error. Data only: no functions, no exported types.

**A request payload template**, if the case POSTs or PUTs —
`request-objects/<METHOD>-<resource>.json`, the wire shape with empty placeholder values.

**A builder in `helpers/data-generator.ts`** that joins the two: it clones the template,
fills it from the case's data plus whatever must be unique per run, and returns it. The
spec then reads the generated value off the returned object rather than re-deriving it:

```typescript
export function getNewRandomBuilding(building: BuildingCaseData): BuildingPayload {
  const buildingRequest: BuildingPayload = structuredClone(buildingRequestPayload)

  // The app caps the name at 15 characters, so data declares a prefix and the unique
  // half is generated here, beside the constraint.
  buildingRequest.building.name = `${building.namePrefix}${faker.string.alphanumeric(6)}`
  buildingRequest.building.floors = building.floors
  return buildingRequest
}
```

**A client method** for any endpoint the case touches that no client covers yet, in
`clients/<area>/<module>-api.ts`. It takes the `RequestHandler`, it returns what the
application answered, and it never asserts. Paths, form keys and HTML parsing live here —
if any of them is about to appear in your spec, it belongs in the client instead.

**A response schema** for every newly covered **JSON** endpoint —
`response-schemas/<resource>/<METHOD>_<resource>_schema.json`. Generate it from the body observed
in step 2; the spec reaches it as
`expect(response).shouldMatchSchema('<resource>', '<METHOD>_<resource>')`.

Schema asserts shape, a matcher asserts value. Use both: `shouldMatchSchema` to prove the
contract holds, `shouldEqual` for the specific values the case is about.

### 5. Write the spec

The file goes at `tests/API/<area>/<module>.api.spec.ts` — the directory routes it to the
`api` project, the suffix makes it unmistakable. Two imports open it, and neither is from
`@playwright/test`:

```typescript
import { test } from '../../../playwright-utils/API/fixtures/api-fixtures'
import { expect } from '../../../playwright-utils/API/core/custom-expect'
import { BuildingsApi } from '../../../playwright-utils/API/clients/property/buildings-api'
import { getNewRandomBuilding } from '../../../playwright-utils/API/helpers/data-generator'
import { testData } from '../../../playwright-utils/API/test-data/buildings.api.data'

test.describe('Buildings API', () => {
  test('QA-102 | User can create and delete a building through the API', async ({ api }) => {
    const buildingsApi = new BuildingsApi(api)
    const buildingRequest = getNewRandomBuilding(testData['QA-102'].building)

    // Produced in one step and read back in the next, so it is declared above them with
    // an empty-string initializer — never a bare annotation.
    let propertyId = ''

    await test.step(`Look up the "${testData['QA-102'].property}" property`, async () => {
      propertyId = await buildingsApi.getPropertyId(testData['QA-102'].property)

      expect(propertyId).shouldMatch(PROPERTY_ID)
    })

    await test.step(`Create the building "${buildingRequest.building.name}"`, async () => {
      // No assertion of its own: the handler compared the status inside addBuilding and
      // would have thrown here with the request and response attached.
      await buildingsApi.addBuilding(propertyId, testData['QA-102'].property, buildingRequest)
    })

    await test.step('Confirm the application reports the new building', async () => {
      const existsResponse = await buildingsApi.getBuildingExists(
        propertyId,
        buildingRequest.building.name,
      )

      await expect(existsResponse).shouldMatchSchema('buildings', 'GET_BuildingExists')
      expect(existsResponse.message).shouldEqual('This building already exists')
    })
  })
})
```

Hold to all of this:

- **The spec never touches the `request` fixture, never builds a URL, never writes a path
  or a form key.** Those are the client's knowledge. If a path string is about to appear
  in your spec, stop and add a client method.
- **`test.step()` marks a phase, not a request.** The handler already emits a step per
  call, and they nest inside. A step whose only act is a save needs no assertion of its
  own — a bad status threw inside it.
- **The expected status is the terminal method's argument.** No `expect(response.status())`
  anywhere — that bypasses the handler and loses the log.
- **Prefer `should*` over the built-in matcher.** If the matcher you need has no `should*`
  counterpart, add one to `utils/custom-expect.ts` — declared in the global
  `PlaywrightTest.Matchers` interface in the same file, or TypeScript will not see it —
  rather than reaching past the extension.
- **Capture every id the API returns; never reconstruct one.** An update may return a *new*
  identifier, and the delete must use the updated value.
- **One journey per test, and a test that creates a record deletes it before it ends —
  where the application offers a delete path.** There is no teardown fixture doing it for
  you. Where no delete endpoint exists, say so in the spec rather than pretending the rule
  is met.
- **Verify a deletion by absence** — re-list and assert with `not.shouldEqual`, not by the
  delete call's status alone.
- **Never mutate an imported JSON template.** Clone first (`structuredClone`, or
  `JSON.parse(JSON.stringify(...))` when you want it normalized as the wire sees it).
- **`shouldMatchSchema` is async — `await` it.** Unawaited it never fails the test, which
  is worse than not writing it.
- Comment out nothing. A commented-out block is deleted, not shipped.

For a behaviour proven by a table of inputs, put the table at module scope and generate a
test per row, with the case id and the row interpolated into the title so each case stays
individually selectable:

```typescript
[
  { username: 'dd', errorMessage: 'is too short (minimum is 3 characters)' },
  { username: 'd'.repeat(21), errorMessage: 'is too long (maximum is 20 characters)' },
].forEach(({ username, errorMessage }) => {
  test(`QA-110 | Username "${username}" is rejected on sign-up`, async ({ api }) => {
    // ...
  })
})
```

### 6. Ask the user to run or adjust

`AskUserQuestion`:

- Question: "Test is ready. What would you like to do next?"
- Header: "Next step"
- Option 1: label "Run the test", description "Execute it against qa and debug if it fails"
- Option 2: label "Something else", description "Tell me what you'd like to change"

### 7. Run it

```bash
npm run typecheck
npx playwright test -g "<CASE-ID>" --project=api --retries 0 --reporter=list
```

Run the typecheck first and treat it as part of the run. Playwright strips types without
checking them, so a case declared in one environment branch and missing from another is a
compile error and nothing else — a green test run will not catch it.

Pass → step 9. Fail → step 8.

### 8. Debug from the API activity log

This framework is built so the terminal output is usually enough. Read it before opening
anything else:

- A **status mismatch** prints `Expected status <n> but got <m>` followed by
  `Recent API Activity` — the full request (method, resolved URL, headers, body) and the
  full response. Compare the URL and payload against what step 2 observed. The stack trace
  points at the spec line that made the call, not into `request-handler.ts`.
- A **`should*` failure** prints expected/received plus the same log. If the received value
  is `undefined`, the response shape differs from what the spec assumed — the logged body
  says how.
- A **parse or shape surprise** on an HTML endpoint: the handler reads by content type, so
  a body logged as a string means the app answered HTML where JSON was expected.
- A **schema failure** lists every violation (Ajv runs with `allErrors: true`) and the
  actual body. Decide which is wrong: a schema written from a stale observation, or a real
  contract change worth reporting.

Then, if needed:

```bash
npx playwright show-report
```

Common causes, in the order they actually occur:

| Symptom | Cause |
|---------|-------|
| The app shell comes back instead of a partial | the injected `X-Requested-With` was overridden by a `.headers()` call |
| Sign-in fails for every test in the worker | `createSession` threw — the message names the host it landed on |
| A field from the previous call reappears | a builder field absent from `cleanUpFields()` |
| A value from a previous test appears | an imported template mutated instead of cloned |
| `404` on delete | the id was reconstructed rather than captured, or an update returned a new one |
| Passes alone, fails in the suite | shared-environment state; confirm `fullyParallel: false` and that each test cleans up |

Report what went wrong, the evidence from the log, and the failing line, then fix and
re-run. If the fault is in the application rather than the test, say so — that is a finding,
not something to paper over with a changed expected status.

### 9. Self-check before finalizing

Walk the change against this list; every line here is a review finding if violated:

- [ ] `test` and `expect` imported from `playwright-utils/API/`, never from `@playwright/test`
- [ ] no `request.get/post/put/delete` called directly in the spec or a client
- [ ] no path, form key or HTML regex in the spec — that is the client's knowledge
- [ ] the client takes a `RequestHandler`, not an `APIRequestContext`
- [ ] no status code asserted with `expect`
- [ ] `shouldMatchSchema` is awaited
- [ ] every imported JSON template cloned before mutation
- [ ] any new builder field added to `cleanUpFields()` in the same edit
- [ ] no `expect()` anywhere under `playwright-utils/`
- [ ] no URL, account or record id as a literal in the spec — config field or test-data entry
- [ ] the case is declared in **every** environment object in the test-data file
- [ ] title is `<CASE-ID> | <behavior>`, id written as a literal
- [ ] file lives under `tests/API/<area>/` and is named `*.api.spec.ts`
- [ ] every newly covered JSON endpoint has its schema file
- [ ] the worker-scoped `authContext` holds no per-test state
- [ ] a record the test creates is deleted before it ends, or the missing delete path is noted
- [ ] `npm run typecheck` passes

Then `AskUserQuestion`:

- Question: "Test passed. Does it meet your expectations?"
- Header: "Finalize"
- Option 1: label "Looks good", description "Tidy the comments and finalize"
- Option 2: label "Needs changes", description "Tell me what should be adjusted"

On "Looks good", tidy: remove comments that narrate what a line does; **keep** comments
that explain a non-obvious why — an observed status code that looks wrong but is right, a
contract quirk, why a negative assertion is the proof of a deletion. Keep one blank line
between logical phases. Never remove titles, `test.describe` labels or code.

### 10. Offer to commit

`AskUserQuestion`:

- Question: "Should I commit the new test?"
- Header: "Commit"
- Option 1: label "Yes, commit", description "Stage the changes and create a commit"
- Option 2: label "No", description "Skip the commit"

On yes: review `git status` and `git diff`, draft a message in the style of `git log`
describing the case the test covers, stage the spec together with its schema, template and
any config change, and commit.
