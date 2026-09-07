---
description: Playwright Page Objects, per-spec page object instantiation, fixtures, auth setup, and test organization patterns
paths: [tests/**,playwright-utils/**,playwright.config.ts]
---

# Playwright Architecture

## When to Use What

| Pattern | When | Location |
|---------|------|----------|
| **Page Object** | A page or major component with multi-step user flows | `playwright-utils/pages/` |
| **Custom Fixture** | Resources needing setup/teardown (auth, DB, API) | `playwright-utils/fixtures/` |
| **Helper Function** | Stateless utility, no cleanup needed | `playwright-utils/helpers/` |
| **Named timeout** | A wait that cannot use the configured default | `playwright-utils/timeouts/` |

## Page Object Conventions

- One TypeScript class per page or major component
- File name: kebab-case (`login-page.ts`, `course-detail-page.ts`)
- Class name: PascalCase + `Page` (or component-appropriate) suffix (`LoginPage`, `HeaderComponent`)
- **Locators are `public readonly` properties assigned in the constructor** — declare each one on the class, build it in the constructor body, and name it after the element (`nameInput`, `menu`, `showAllPagerLink`). `page.locator(...)` builds a descriptor and never touches the DOM, so constructing eagerly costs nothing and resolution still happens at use time
- **No inline locators in methods** — a method uses the properties, it never builds a selector. `await this.nameInput.fill(name)`, never `await this.page.locator('input[name$=".Name"]').fill(name)`. One definition per element means one place to fix when the DOM moves
- **The spec asserts on the properties directly** — `await expect(loginPage.errorMessage).toHaveText(...)`. Property access, no call parentheses, and the assertion auto-waits exactly as it would on an inline locator
- **No assertions** — a page object never contains `expect()`. Every assertion lives in the spec file (see [Assertions Live in the Spec File](./playwright-scripting.md#assertions-live-in-the-spec-file))
- **A save confirmation belongs to the form that submitted it** — the banner a save
  produces is exposed by the *create form's* page object, parametrized by the count
  it reports: `newBuildingPage.buildingsAddedMessage(1)`,
  `newUnitTypePage.unitTypesAddedMessage(1)`, `newUnitPage.unitsAddedMessage(2)`.
  This holds whether the app keeps the form on screen or returns to the list — the
  banner reports the outcome of *that submit*, so it is named and owned by the form
  regardless of which route renders it. The list page owns what the list shows: a
  row locator identified by the value the module lists on — `buildingRow(name)`
  keyed by building name, `unitRow(number)` by unit number. Same shape everywhere:
  the form owns `<thing>AddedMessage(count)`, the list owns `<thing>Row(identifier)`
- **The count in a confirmation is asserted from what the form created, never as a
  literal.** A method that fills `n` rows returns the `n` values it generated, and the
  spec asserts `thingsAddedMessage(created.length)`. A hardcoded
  `thingsAddedMessage(1)` passes whether the form saved the one row it was asked for
  or silently saved one of three, and it goes stale the moment the count is driven
  from data. The returned array is also what identifies the records afterwards

```typescript
// GOOD: the number asserted is the number of rows actually filled
const createdBuildingNames = await newBuildingPage.addBuildings(
  testData['QA-01'].building,
  testData['QA-01'].buildingCount,
)
await expect(newBuildingPage.buildingsAddedMessage(createdBuildingNames.length)).toBeVisible()

// BAD: a literal that cannot tell "saved one" from "saved one of three"
await newBuildingPage.addBuildings(testData['QA-01'].building, testData['QA-01'].buildingCount)
await expect(newBuildingPage.buildingsAddedMessage(1)).toBeVisible()
```

- **Locators parametrized by runtime data stay methods** — when the selector depends on a value known only during the run (`buildingRow(name)`, `buildingsAddedMessage(count)`) there is nothing to build at construction time. Derive it from a stored property rather than a raw selector string, and never prefix the method with `expect`
- **Compose from the stored parent, except inside `filter({ has })`** — a `has` locator's selector chain is applied *relative to the outer element*, so it must be rooted at `page`. `rows.filter({ has: this.table.getByRole('link', { name }) })` looks for the table *inside* a row and silently matches nothing
- **No tiny methods** — an action method covers a meaningful user task with multiple steps; never a single click or fill. Navigation between two pages is the exception: it is one click by nature and marks a page boundary
- **Strict page boundaries** — a method only interacts with its own page; navigation marks the end of one method and the start of another on the next page
- **Guards use `waitFor`, not `expect`** — actions (`click`, `fill`, `check`) auto-wait, so most methods need no guard at all. Before non-auto-waiting code (`textContent`, `count`, `all`, `inputValue`, `allTextContents`), gate with `await locator.waitFor(...)`. Confirming the outcome is the spec's job, in the `test.step()` that called the method
- **Naming** — camelCase, descriptive verb phrases, no abbreviations or acronyms
- **Reuse first** — before adding a new method, scan the relevant class. Reuse if a method covers the flow; parametrize an existing method if it nearly does. Never write two methods that differ only in a hardcoded value

```typescript
// playwright-utils/pages/login-page.ts
import { type Locator, type Page } from '@playwright/test'

export class LoginPage {
  public readonly emailInput: Locator
  public readonly passwordInput: Locator
  public readonly loginButton: Locator
  // Exposed so the spec can assert on it without reaching into the DOM itself
  public readonly errorMessage: Locator

  constructor(private page: Page) {
    this.emailInput = this.page.getByRole('textbox', { name: 'Email' })
    this.passwordInput = this.page.getByLabel('Password')
    this.loginButton = this.page.getByRole('button', { name: 'Login', exact: true })
    this.errorMessage = this.page.getByRole('alert')
  }

  async loginWithCredentials(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }
}
```

Note there is no `expect` import: the class acts and exposes, nothing more.

The spec drives the steps and owns every assertion:

```typescript
import { expect, test } from '@playwright/test'
import { HomePage } from '../../playwright-utils/pages/home-page'
import { LoginPage } from '../../playwright-utils/pages/login-page'

const TEST_CASE_ID = 'QA-02'

test(`${TEST_CASE_ID} | User sees error for invalid password`, async ({ page }) => {
  const homePage = new HomePage(page)
  const loginPage = new LoginPage(page)

  await test.step('Open the login form', async () => {
    await homePage.openLogin()
    await expect(page).toHaveURL(/\/login$/)
  })

  await test.step('Submit an invalid password', async () => {
    await loginPage.loginWithCredentials('user@example.com', 'wrong-password')
    await expect(loginPage.errorMessage).toHaveText('Invalid email or password')
  })
})
```

### Component-Level Page Objects

For widgets reused across pages (header, cart drawer, modals), create a separate class. Components follow the same rules as pages.

```typescript
export class HeaderComponent {
  public readonly cartBadge: Locator
  public readonly loginLink: Locator

  constructor(private page: Page) {
    this.cartBadge = this.page.getByRole('navigation').getByTestId('cart-count-badge')
    this.loginLink = this.page.getByRole('link', { name: 'Log In' })
  }

  async openLogin() {
    await this.loginLink.click()
  }
}
```

## Instantiating Page Objects in Specs

There is no aggregator class and no `pom` fixture. Each page class is imported directly into the spec that needs it and instantiated with `page` inside the test.

```typescript
// tests/student/dashboard.spec.ts
import { expect, test } from '@playwright/test'
import { LoginPage } from '../../playwright-utils/pages/login-page'
import { DashboardPage } from '../../playwright-utils/pages/dashboard-page'
import { AccountsPage } from '../../playwright-utils/pages/accounts-page'
import { testData } from '../../playwright-utils/test-data/accounts.data'

const TEST_CASE_ID = 'QA-05'

test(`${TEST_CASE_ID} | User can select a property and open its accounts`, async ({ page }) => {
  const loginPage = new LoginPage(page)
  const dashboardPage = new DashboardPage(page)
  const accountsPage = new AccountsPage(page)

  await test.step('Log in', async () => {
    await loginPage.login(process.env.TEST_USERNAME!, process.env.TEST_PASSWORD!)
    await expect(dashboardPage.propertySelector).toBeVisible()
  })

  await test.step(`Open accounts for "${testData['QA-05'].property}"`, async () => {
    await dashboardPage.selectProperty(testData['QA-05'].property)
    await expect(accountsPage.accountsList).toBeVisible()
  })
})
```

- **Variable name = camelCase of the class name** (`AdminPage` → `adminPage`), so calls read `await adminPage.createUser(...)`
- **Instantiate at the top of the test body**, before the first action — one `const` per page the test uses
- **Import only the pages the spec actually uses** — an unused page object in a spec is dead weight
- **Never instantiate at module scope** — `page` is per-test, so a page object built outside the test body leaks state across tests
- **Values captured during the run are declared above the `describe`, not the page objects** — a name a form generates (`buildingName`, `unitTypeName`) is produced in one step and consumed in a later one, so it is declared as a `let` at module scope and assigned inside the step that creates it. This is the one thing that lives outside the test body; it holds a string, not per-test browser state
- **Give it an empty-string initializer, never a bare type annotation.** These values are read back through a locator method, and Playwright drops an option that is `undefined`: `buildingRow(undefined)` builds `getByRole('link')` with no name filter, so a row that should not match matches anyway and the test passes for the wrong reason. `''` keeps the filter and fails loudly instead. The compiler will not choose for you — the assignment happens inside a `test.step()` callback, where definite-assignment analysis gives up

```typescript
// GOOD: an unassigned read still filters, so it fails
let buildingName = ''

// BAD: an unassigned read drops the filter and matches the first row it sees
let buildingName: string
```

- When every test in a `describe` uses the same pages, declare the variables in the `describe` scope and assign them in `beforeEach` (see [Test Suite Hooks](#test-suite-hooks))

```typescript
let buildingName = ''
let unitTypeName = ''

test.describe('Units', () => {
  test('QA-03 | User can create a new unit for the selected property', async ({ page }) => {
    const newBuildingPage = new NewBuildingPage(page)   // page objects stay in the body
    // ...
    buildingName = await newBuildingPage.addBuilding(testData['QA-03'].building)
  })
})
```

When adding a new page class: create `playwright-utils/pages/<area>/<page-name>.ts`
and import it in the specs that need it. There is no central registration step.

**Page objects are grouped by domain area, never left flat.** `pages/` holds
folders, not classes: `auth/`, `boardroom/`, `navigation/` for components shared
across modules, and `property/<module>/` for the application's own modules — one
folder per module (`property/building/`, `property/unit-type/`, `property/unit/`),
holding that module's list page and its create form. A new module means a new
folder; a page that belongs to no existing area gets one of its own rather than a
home at the root.

## Auth Setup with storageState

Save authenticated sessions to avoid logging in every test:

```typescript
// tests/auth.setup.ts
import { test as setup } from '@playwright/test'

const studentFile = 'playwright-utils/.auth/student.json'
const adminFile = 'playwright-utils/.auth/admin.json'

setup('authenticate as student', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Log In' }).click()
  await page.getByRole('textbox', { name: 'Email' }).fill(process.env.STUDENT_EMAIL!)
  await page.getByLabel('Password').fill(process.env.STUDENT_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await page.waitForURL('**/dashboard')
  await page.context().storageState({ path: studentFile })
})

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Log In' }).click()
  await page.getByRole('textbox', { name: 'Email' }).fill(process.env.ADMIN_EMAIL!)
  await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await page.waitForURL('**/admin')
  await page.context().storageState({ path: adminFile })
})
```

Auth setup intentionally bypasses the page objects — `setup()` blocks run before any test and drive the login form directly.

### Config with Auth Projects

```typescript
// playwright.config.ts pattern
projects: [
  { name: 'auth-setup', testMatch: 'auth.setup.ts' },
  {
    name: 'student-tests',
    testMatch: 'student/**/*.spec.ts',
    use: { storageState: 'playwright-utils/.auth/student.json' },
    dependencies: ['auth-setup'],
  },
  {
    name: 'admin-tests',
    testMatch: 'admin/**/*.spec.ts',
    use: { storageState: 'playwright-utils/.auth/admin.json' },
    dependencies: ['auth-setup'],
  },
  {
    name: 'guest-tests',
    testMatch: 'guest/**/*.spec.ts',
    // No storageState — unauthenticated
  },
]
```

## Directory Structure

`tests/` is for spec files and setup files only — everything executable by the test runner. All support code lives in `playwright-utils/`.

```
tests/
  auth.setup.ts              # Auth state persistence (setup project)
  student/                   # Authenticated student tests
    login.spec.ts
    courses.spec.ts
    dashboard.spec.ts
  admin/                     # Authenticated admin tests
    courses.spec.ts
    users.spec.ts
  guest/                     # Unauthenticated tests
    catalog.spec.ts
    blog.spec.ts

playwright-utils/
  pages/                     # One folder per domain area — never a flat pile of classes
    auth/
      login-page.ts
    boardroom/
      board-room-page.ts
    navigation/
      side-nav-component.ts  # Components shared across modules
    property/                # One sub-folder per module under the area
      building/
        buildings-page.ts    # The module's list page
        new-building-page.ts # The module's create form
      unit-type/
        unit-types-page.ts
        new-unit-type-page.ts
      unit/
        units-page.ts
        new-unit-page.ts
  fixtures/                  # Only for resources needing setup/teardown (DB, API clients)
  test-data/                 # Data only — no functions, no types, no barrel file
    buildings.data.ts        # Buildings cases for qa / rc / regression
    accounts.data.ts         # Accounts cases for qa / rc / regression
  helpers/                   # Stateless utilities with no test data in them
    loading-overlay.ts       # The app-wide #Loading overlay, waited on from anywhere
  timeouts/                  # Every wait the suite cannot leave to the config default
    timeouts.ts              # TIMEOUTS.loader.default / .slow / .appearance
```

## Environment-Specific Test Data

Every value a test needs that is not a credential lives under
`playwright-utils/test-data/`, organised as **one object per environment**, each
holding its test case ids and their data.

**A test data file holds data and nothing else** — no functions, no type
declarations, no helpers. Types belong to the page object that consumes the data;
behaviour belongs to the page object that acts on it. A reader opening a data file
should see only values.

**One file per spec area, not one file for the suite.** A single store holding
every case for every environment grows into thousands of lines and turns every new
case into a merge conflict. `buildings.data.ts` holds the Buildings cases and is
imported directly by `buildings.spec.ts`; each file stays the size of the spec it
serves. No barrel file — a spec imports the one data file it needs.

The first environment object is written plainly; the others are annotated
`typeof <first>TestData`. That single annotation forces every environment to
declare the same cases with the same fields — a missing case or a dropped field is
a compile error, with no type alias in the file to maintain.

```typescript
// playwright-utils/test-data/buildings.data.ts

// Get environment from process.env — TEST_ENV is the variable playwright.config.ts
// selects .env/.env.<env> with, and it defaults to qa in both places.
const ENV = process.env.TEST_ENV || 'qa'

// QA environment test data
const qaTestData = {
  'QA-01': {
    property: 'Beta Tree - Automation',
    building: { namePrefix: 'qaBld', floors: '4', /* ... */ },
  },
}

// RC environment test data
const rcTestData: typeof qaTestData = {
  'QA-01': { property: 'Beta Tree - Automation', building: { namePrefix: 'rcBld', /* ... */ } },
}

// Regression environment test data
const regressionTestData: typeof qaTestData = {
  'QA-01': { property: 'Beta Tree - Automation', building: { namePrefix: 'regBld', /* ... */ } },
}

// Export test data based on environment
let testData = qaTestData
if (ENV === 'qa') {
  testData = qaTestData
}
if (ENV === 'rc') {
  testData = rcTestData
}
if (ENV === 'regression') {
  testData = regressionTestData
}

export { testData }
```

The spec imports `testData` and passes values straight into page object methods.
A hyphenated id needs bracket access — `testData.QA-01` is a syntax error, since
`-` parses as subtraction:

```typescript
import { testData } from '../../playwright-utils/test-data/buildings.data'

await boardRoomPage.selectProperty(testData['QA-01'].property)
await newBuildingPage.addBuilding(testData['QA-01'].building)
```

Rules for the store:

- **One object per environment**, named `<env>TestData`, each keyed by test case
  id. A new test case is added to all three objects in the same edit
- **Data only** — a function or an exported type in a data file means logic has
  leaked out of the page object it belongs to
- **Later environment objects are annotated `typeof <first>TestData`**, so the
  compiler enforces that every environment declares every case and every field
- **Resolution reads `process.env.TEST_ENV`** once, at module level, and defaults
  to the same environment `playwright.config.ts` does. A spec never reads
  `TEST_ENV` itself
- **Values the application constrains are completed by the page object.** Where a
  field must be unique per run, the data declares a *prefix* and the page object
  that submits the form generates the rest, so the rule lives with the form that
  imposes it. That method returns what it created
- **Credentials stay in `.env/.env.<env>`** and reach the spec through
  `process.env.TEST_USERNAME` / `TEST_PASSWORD` — never in the data store
- **Run `npm run typecheck`.** Playwright strips types without checking them, so a
  test run will not catch environment drift — only the type-check will

## Named Timeouts

`playwright.config.ts` still owns the defaults every ordinary step runs on. What it
cannot express is a wait that differs *per page*: this application answers some
clicks in under a second and others in minutes, behind the same overlay. Those
numbers live in `playwright-utils/timeouts/timeouts.ts`, so tuning the suite as the
application changes is one edit in one file.

```typescript
export const TIMEOUTS = {
  loader: {
    default: 120_000,     // a page that behaves
    slow: 300_000,        // a route observed to crawl
    appearance: 1_000,    // NOT patience — see below
  },
} as const
```

- **A named timeout is patience, not a target.** It is how long a step may take
  before the suite calls it broken. It never encodes how long something *should*
  take
- **Callers pick per call, and only from measurement.** `TIMEOUTS.loader.slow` is
  for a route seen finishing late — not for one that once hung. Slow patience buys
  nothing against a stall; it only delays the failure and hides it behind five
  minutes of waiting
- **Not every number in the file is patience.** `appearance` bounds *optional* UI —
  "did this click load anything at all?" — and is paid in full every time the overlay
  is missed. Raising it to be safe is how a 70-page walk went from 76s to 355s. Keep
  the two kinds separate, and say which is which in a comment
- **A named timeout never replaces an assertion's default.** Specs still assert with
  the configured `expect` timeout; these numbers belong to explicit `waitFor` calls
  in helpers and page objects, and to the specs that call those helpers directly
- **Keep the slow value under the test timeout.** A wait that outlives its test just
  turns one clear failure into a confusing one

## Configuration Best Practices

```typescript
// playwright.config.ts
use: {
  baseURL: 'http://localhost:3000',
  trace: 'on-first-retry',          // Trace for debugging failures
  screenshot: 'only-on-failure',    // Screenshot on failure
  video: 'retain-on-failure',       // Video for CI debugging
}
```

The config is also where a slow application is absorbed. When a measured boot or
overlay genuinely exceeds Playwright's defaults, raise them here — once, with a
comment recording the measurement — so no spec carries a timeout of its own:

```typescript
timeout: 180_000,                   // Measured: qa shell renders ~60s after sign-in
expect: { timeout: 90_000 },
use: { actionTimeout: 90_000 },
```

### CI webServer Config

```typescript
// Auto-start dev server in CI
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
}
```

## Test Suite Hooks

When all tests in a `test.describe` block share the same setup steps (e.g., starting at the home page), extract them into `test.beforeEach`.

```typescript
// GOOD: shared setup in beforeEach
import { expect, test } from '@playwright/test'
import { HomePage } from '../../playwright-utils/pages/home-page'
import { BlogPage } from '../../playwright-utils/pages/blog-page'

test.describe('Guest Smoke', () => {
  let homePage: HomePage
  let blogPage: BlogPage

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page)
    blogPage = new BlogPage(page)
    await homePage.open()
  })

  test('QA-10 | Home page displays key sections', async () => {
    await test.step('Open the home page', async () => {
      await expect(homePage.hero).toBeVisible()
    })
  })

  test('QA-11 | User can navigate to blog', async () => {
    await test.step('Open the blog from the home page', async () => {
      await homePage.openBlog()
      await expect(blogPage.articlesList).toBeVisible()
    })
  })
})
```

## Anti-Patterns

- **Inline locators inside methods** (`await this.page.getByRole('button', { name: 'Save' }).click()`) — every element the class touches is a constructor-assigned property; the method uses it
- **A zero-argument method that only returns a locator** (`menu()`, `propertySelector()`) — make it a `public readonly` property instead. Methods are for locators parametrized by runtime data
- **A `filter({ has })` locator rooted at a stored parent** — the chain is applied relative to the outer element, so it matches nothing and fails as "element(s) not found" rather than as an error. Root `has` locators at `page`
- **`expect()` anywhere in `playwright-utils/`** — assertions belong to the spec. A page object that imports `expect` is a bug
- **`expect*`-prefixed page object methods** (`expectErrorMessage`, `expectAccountsListVisible`) — replace with a locator property the spec asserts on
- **Single-action methods** (`clickLoginButton`, `fillEmail`) — fold them into a multi-step flow. A cross-page navigation method is the one exception
- **Methods spanning two pages** — every navigation marks a method boundary on a different page object
- **Environment values hardcoded in a page object or spec** — they belong in the environment-keyed test data store
- **Duplicate methods differing only in a hardcoded value** — parametrize the existing method instead
- **A central aggregator** (`PageManager`, or a fixture exposing every page object) — import and instantiate only the pages a spec uses
- **Page objects constructed at module scope** — build them in the test body or `beforeEach`, where `page` belongs to the current test
- **Fat page objects** with every possible method — only add what tests actually use
- **Shared mutable state** between tests — each test must be independent
- **Global variables** for test data — use fixtures with proper setup/teardown
- **Skipping cleanup** — fixtures guarantee teardown even on failure

