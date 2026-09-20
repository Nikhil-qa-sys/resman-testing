# Playwright API Framework

These rules govern the **API half of the suite only** — `tests/API/**` and
`playwright-utils/API/**`. The UI half keeps its own conventions
(`playwright-architecture.md`, `playwright-scripting.md`); nothing here crosses the split.

## Three Layers, and What Belongs in Each

The framework is a stack. Every rule below follows from which layer a thing belongs to.

| Layer | Where | Job | Never |
|-------|-------|-----|-------|
| **Transport** | `core/` | Send the request, log it, compare the status, emit the report step | Know what a building is |
| **Domain** | `clients/`, `helpers/` | Know the paths, the form keys, how to read the app's HTML | Assert |
| **Spec** | `tests/API/` | Drive the journey and decide whether the answer is right | Build a URL or a payload |

A spec never touches the `request` fixture, never builds a URL, never sets a header,
never asserts a status code by hand. A client never calls `expect()`. The transport never
knows a domain noun.

```
tests/API/
  <area>/<module>.api.spec.ts     # specs only — nothing else executable lives here

playwright-utils/API/
  api-config.ts                   # non-secret, non-per-case environment values
  core/                           # the framework — no application knowledge
    request-handler.ts            # the fluent HTTP builder
    logger.ts                     # APILogger — the per-test request/response buffer
    custom-expect.ts              # the extended `expect` — matchers that attach API logs
    schema-validator.ts           # Ajv wrapper, reads response-schemas/
  fixtures/
    api-fixtures.ts               # the extended `test` — every API spec imports this
  clients/<area>/<module>-api.ts  # one class per endpoint group
  helpers/
    html-form.ts                  # reads forms and options out of served HTML
    create-session.ts             # session acquisition, outside the fixture chain
    data-generator.ts             # payload builders that clone a template and randomize
  request-objects/
    <METHOD>-<resource>.json      # request payload templates
  response-schemas/<resource>/
    <METHOD>_<resource>_schema.json
  test-data/<area>.api.data.ts    # one object per environment, keyed by case id
```

Two imports open every API spec, and neither is from `@playwright/test`:

```typescript
import { test } from '../../../playwright-utils/API/fixtures/api-fixtures'
import { expect } from '../../../playwright-utils/API/core/custom-expect'
```

Importing `test` or `expect` from `@playwright/test` in an API spec is a bug: the spec
loses the `api` fixture, and every failure loses the request/response log attached to it.

## The Transport Layer: RequestHandler

`RequestHandler` wraps `APIRequestContext` in a fluent builder. A call is described, then
ended with the verb plus the **expected status code**:

```typescript
const response = await this.api.path('/Buildings/New').getRequest(200)
```

Builder methods, each returning `this`:

| Method | Purpose | Default when omitted |
|--------|---------|----------------------|
| `.url(url)` | Override the base URL for this one call | `apiConfig.baseUrl` |
| `.path(path)` | Path appended to the base URL | `''` |
| `.params(obj)` | Query string, appended via `URLSearchParams` | none |
| `.headers(obj)` | Request headers | the injected defaults |
| `.body(obj)` | JSON request body | none |
| `.form(obj)` | Form-encoded request body | none |
| `.clearAuth()` | Suppress the injected auth token for this call | auth is injected |

Terminal methods, each taking the expected status: `getRequest`, `postRequest`,
`putRequest`, `deleteRequest`. The first three return the response body; DELETE returns
nothing.

Rules that hold for every call:

- **The expected status is an argument, never an assertion.** The handler compares it and
  throws with the recent API log attached. `expect(response.status()).toBe(200)` has
  bypassed the framework and lost the log.
- **The body is read by content type.** ResMan is an ASP.NET MVC application: some
  endpoints answer JSON, most answer HTML. An unconditional `.json()` throws *before* the
  status is compared, turning every failure into a parse error.
- **`.form()` and `.body()` are never both sent.** Which one is given decides the content
  type — form-encoded or JSON.
- **Infrastructure headers are injected, not passed.** `X-Requested-With: XMLHttpRequest`
  goes on every call, because the controllers answer a request without it with the whole
  application shell instead of the partial. A spec or client never writes it.
- **Logged bodies are capped and the cut is marked.** An HTML body is tens of kilobytes;
  logged whole it buries the request that produced it and defeats the point of logging.
- **`Error.captureStackTrace(error, callingFunction)`** trims the handler's frames off the
  throw, so the failure points at the line that made the call. Any new terminal method
  must do the same.
- **Every call wraps itself in `test.step()`** naming the verb and the resolved URL, so
  the report reads as a list of requests without anyone writing a step.
- **State is cleared after every call** (`cleanUpFields()`): body, form, headers, params,
  path, the one-off base URL *and the `clearAuth` flag*. This is what makes one `api`
  fixture safe to chain repeatedly. A new builder field must be added to `cleanUpFields()`
  in the same edit, or it leaks into the next request.

## The Domain Layer: API Clients

An API client is the page object of the API half: it acts and it returns, the spec
verifies. **It takes a `RequestHandler`, not an `APIRequestContext`** — that is what gives
every call inside it the logging, the status check and the report step for free.

- **One class per endpoint group**, filed under `clients/<area>/`, named for the area plus
  an `Api` suffix (`BuildingsApi`), file kebab-case (`buildings-api.ts`)
- **No assertions.** `expect()` never appears under `playwright-utils/`, on either side of
  the split. A method returns what the application answered; the spec decides whether that
  is right
- **Return the application's answer, not a reading of it.** `getBuildingExists` returns
  the body so the spec can assert its contract *and* its meaning; a boolean would quietly
  reduce an error payload to `false`. A lookup returns `''` or `undefined` when the
  application has nothing — never a thrown error, never a default pointing elsewhere
- **A validated status is not proof the application accepted the request.** ResMan answers
  200 to a rejected save and re-renders the form with no validation message in it, so a
  save returns the application-level outcome (`BuildingSaveResult`) and the spec asserts
  on that. Where the status genuinely is the whole answer, return `void` — inventing a
  return value to look thorough is noise
- **Where the outcome is only visible as a transport detail, name it in the client.**
  "Accepted answers JSON, rejected answers HTML" is exactly the knowledge a client exists
  to hold; a spec that reads `typeof response === 'object'` has had it leak
- **A method covers one endpoint's job**, not one HTTP call for its own sake:
  `getPropertyId(name)` fetches the form and reads the id out of it, because that is what
  "look up a property" costs in this application
- **Serializing a payload and parsing the app's HTML belong here or in a helper** — never
  in a spec, and never duplicated across clients. Anything read out of markup is scoped to
  the element it belongs to first, or a lazy match runs across the row boundary and reads
  the next record's values
- **No two methods differing only in what they return.** One endpoint, one method
- **Every endpoint, header and payload shape is established by observation**, the same way
  a locator is in Mode B: drive the flow in a browser with a request log, then replicate
  what the application's own client sent

## Fixtures

`fixtures/api-fixtures.ts` extends the base `test`. It wires objects together; it contains
no test logic.

- **`authContext` is worker-scoped.** Signing in is one round trip per worker, not one per
  test. ResMan's credential is a **cookie jar, not a token** — it lives on the context that
  collected it, and the built-in `request` fixture is test-scoped, so the signed-in context
  itself is the worker fixture. It holds nothing a test mutates, which is the rule for
  worker scope.
- **`api` is test-scoped** and built fresh per test: a new `APILogger`, that logger
  registered via `setCustomExpectLogger(logger)`, then a `RequestHandler` over the
  worker's context. Fresh per test keeps one test's calls out of another's failure message.
- **`config` is exposed as a fixture** so a spec reads environment values as
  `async ({ api, config })` rather than importing the config module.
- Code before `await use(...)` is setup; code after it is teardown.

### Authentication

`helpers/create-session.ts` creates its own context, drives `AuthApi` through the OIDC
round trip, and returns the signed-in context.

- It **disposes on the failure path only** — the context is the return value, so it cannot
  dispose in `finally` the way a token helper does. The fixture owns it afterwards and
  disposes it in teardown.
- It **verifies the session landed** before returning. Rejected credentials answer 200 on
  the identity provider's form, so the host is what proves sign-in worked. Checked in the
  helper because every test in the worker depends on it.
- It re-throws with `Error.captureStackTrace(error, createSession)`.
- It takes the credentials as parameters — a second role is a second call, not a second
  helper.
- **`AuthApi` is the one client that takes a raw `APIRequestContext`.** It runs before the
  handler exists; it is what produces the context the handler wraps.

## Assertions: the Custom Matchers

`core/custom-expect.ts` extends `expect` with matchers that do what the built-ins do
**plus** append the recent API activity to the failure message. **API specs only** — they
read a logger the `api` fixture registers, so they mean nothing in a UI spec.

| Matcher | Replaces | Notes |
|---------|----------|-------|
| `shouldEqual(expected)` | `toEqual` | works under `.not`, and logs in that case too |
| `shouldMatch(regexp)` | `toMatch` | |
| `shouldBeLessThanOrEqual(expected)` | `toBeLessThanOrEqual` | |
| `shouldMatchSchema(dir, file)` | — | **async — must be awaited**; validates via Ajv |

- **Prefer the custom matcher over the built-in equivalent.** `toEqual` fails with
  "expected 10, received 0" and says nothing about which call answered 0.
- **If a needed matcher has no `should*` counterpart, add one** rather than reaching past
  the extension. Declare it in the global `PlaywrightTest.Matchers` interface in the same
  file, or TypeScript will not see it.
- **A matcher never calls the API.** It compares what it was given and formats the failure.

## Schema Validation

A response's *shape* is asserted with a JSON Schema file, not a chain of property
assertions.

- Schemas live at `response-schemas/<resource>/<METHOD>_<resource>_schema.json`; the spec
  passes the two halves: `shouldMatchSchema('buildings', 'GET_BuildingExists')`.
- Ajv runs with `allErrors: true`, so a failure reports every violation and the actual body.
- **Schema asserts shape; a matcher asserts value.** Validate the contract first, then
  assert the specific values the case is about — a changed contract should read as a
  contract failure, not as a missing record.
- Only endpoints that answer JSON can be schema-checked. An HTML endpoint is verified by
  what the client parses out of it.
- A newly covered JSON endpoint gets its schema file in the same change as its first spec.

## Test Data and Payloads

Two stores, with a clean split:

- **`test-data/<area>.api.data.ts` owns the values** — one object per environment, keyed by
  case id, exactly as the UI half does. The first object is written plainly; the others are
  annotated `typeof <first>TestData`, so a case or field missing from one environment is a
  **compile error**. Data only: no functions, no exported types.
- **`request-objects/<METHOD>-<resource>.json` owns the wire shape** — the structure the
  API expects, with empty placeholder values.
- **`helpers/data-generator.ts` joins them.** A builder clones the template, fills it from
  the case's data plus the fields that must be unique per run, and returns it. The spec
  reads the generated value off the returned object rather than re-deriving it.

```typescript
// GOOD: one builder owns the clone and the randomization
const buildingRequest = getNewRandomBuilding(testData['QA-101'].building)
await buildingsApi.addBuilding(propertyId, testData['QA-101'].property, buildingRequest)
expect(listed.name).shouldEqual(buildingRequest.building.name)

// BAD: template mutated in place — the next test in this worker inherits the name
buildingRequestPayload.building.name = faker.company.name()
```

- **Never mutate an imported JSON template.** It is module state shared by every test in
  the worker. Clone first — `structuredClone`, or `JSON.parse(JSON.stringify(...))` when
  you want it normalized as the wire will see it.
- **Values unique per run come from `@faker-js/faker`** (the v9 line — v10 is ESM-only and
  this repo is CommonJS), not a hand-incremented counter or a `Date.now()` string.
- **A constraint the application imposes is completed beside the constraint.** A name the
  app caps at 15 characters is declared as a *prefix* in data; the generator appends the
  unique half.
- **`api-config.ts` holds only what is neither per-case nor secret.** `BASE_URL` is already
  selected by dotenv, so there is no per-environment branch to write there. Credentials
  stay in `.env/.env.<env>` and reach the fixture through `process.env`.
- **`npm run typecheck` is the only static check**, and it is what catches environment
  drift. Run it before handing work off.

## Test Titles and Structure

- **Every test title is `<CASE-ID> | <behavior>`**: `test('QA-101 | User can create a
  building for a property through the API', ...)`. The id makes the case selectable
  (`npx playwright test -g "QA-101" --project=api`) and is the key its data is stored
  under. Write it as a literal in both the title and the lookup — a hyphenated key needs
  bracket access (`testData['QA-101']`). No module-level `TEST_CASE_ID` const.
- **An API spec file is named `<module>.api.spec.ts` under `tests/API/<area>/`.** The
  directory routes it to the `api` project; the suffix makes it unmistakable.
- **`test.step()` marks a phase of the journey, not a request.** The handler already emits
  a step per call, and they nest inside. Name a step in the user's language ("Look up the
  property"), and let a step hold the one or two client calls that phase costs.
- **Each step verifies its own outcome**, except where the handler already did: a step
  whose only act is a save needs no assertion, because a bad status threw inside it.
- **One journey per test.** A test that creates a record deletes it before it ends —
  *where the application offers a delete path.* ResMan currently exposes none for
  buildings, so QA-101 knowingly leaves its record behind; say so in the spec rather than
  pretending the rule is met.
- **Verify a deletion by its absence**, not by the delete call's status alone.
- **Capture the id the API returns**, never reconstruct it. An update may return a *new*
  one, and the delete must use the updated value.
- **Values produced in one step and read in the next** are declared above the steps with an
  empty-string initializer (`let propertyId = ''`), never a bare annotation — an unassigned
  id is sent as an empty parameter and the application answers about something else.
- Comment out nothing. A commented-out block is deleted, not shipped.

### Data-Driven Cases

Where one behaviour is proven by a table of inputs, iterate the table and generate a test
per row:

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

The table sits at module scope above the `forEach`, and the title carries the case id and
interpolates the row — never a bare index.

## playwright.config.ts

- **The `api` project matches the API half by directory** — `testMatch: /API\/.*\.spec\.ts/`.
  No browser is launched.
- **The browser projects match `/UI\/.*\.spec\.ts/`.** The split is load-bearing: without
  it every API spec would run once per browser, creating duplicate records on a shared
  environment.
- CI-driven `retries`, `workers` and `forbidOnly` off `process.env.CI`.
- **`fullyParallel: false` is set on the `api` project only**, not suite-wide. These tests
  create real records on a shared property and are not isolated from one another, and
  fully parallel they also split a single file across workers — paying one OIDC round trip
  per worker to run a handful of requests. The browser projects keep the suite-wide
  `fullyParallel: true`, where a fresh context per test is the isolation. Note that files
  still run in parallel: a second API spec file gets its own worker, and its own sign-in.

## Anti-Patterns

- **`import { test } from '@playwright/test'` in an API spec** — loses the `api` fixture
- **`import { expect } from '@playwright/test'` in an API spec** — loses the log-attaching matchers
- **Calling `request.get/post/...` directly in a spec or a client** — bypasses logging,
  status validation and step reporting. Clients take a `RequestHandler`
- **Asserting a status code with `expect`** — it is the terminal method's argument
- **A path, a form key or an HTML regex in a spec** — that is the client's knowledge
- **`expect()` anywhere under `playwright-utils/`** — the handler throws, the spec asserts
- **`shouldMatchSchema` without `await`** — it is async; unawaited it never fails the test
- **Mutating an imported JSON request object** — clone it first
- **A new builder field not added to `cleanUpFields()`** — it leaks into the next request
- **A hardcoded URL, account or record id in a spec** — config field or test-data entry
- **A test title without a case id** — it cannot be selected on the command line
- **A worker-scoped fixture holding per-test state** — worker scope is for the sign-in
  round trip and things like it
- **Skipping the schema file** for a newly covered JSON endpoint
- **Hand-written `test.step()` around a single request** — the handler emits it
