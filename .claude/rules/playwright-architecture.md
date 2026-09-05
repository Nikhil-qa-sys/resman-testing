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

## Page Object Conventions

- One TypeScript class per page or major component
- File name: kebab-case (`login-page.ts`, `course-detail-page.ts`)
- Class name: PascalCase + `Page` (or component-appropriate) suffix (`LoginPage`, `HeaderComponent`)
- Constructor takes `Page` only — **no locator properties, no eager locator construction**
- **Locators inline in methods** — locators are self-descriptive and lazy; duplicating across methods is fine
- **No assertions** — a page object never contains `expect()`. Every assertion lives in the spec file (see [Assertions Live in the Spec File](./playwright-scripting.md#assertions-live-in-the-spec-file))
- **Locator getter methods** — to let the spec assert on an element the page owns, expose it as a method returning a `Locator`. The locator is still built lazily inside a method, so this is not a locator property. Name it after the element (`propertySelector()`, `menu()`), parametrize when the accessible name varies (`buildingsAddedMessage(count)`), and never prefix it with `expect`
- **No tiny methods** — an action method covers a meaningful user task with multiple steps; never a single click or fill. Navigation between two pages is the exception: it is one click by nature and marks a page boundary
- **Strict page boundaries** — a method only interacts with its own page; navigation marks the end of one method and the start of another on the next page
- **Guards use `waitFor`, not `expect`** — actions (`click`, `fill`, `check`) auto-wait, so most methods need no guard at all. Before non-auto-waiting code (`textContent`, `count`, `all`, `inputValue`, `allTextContents`), gate with `await locator.waitFor(...)`. Confirming the outcome is the spec's job, in the `test.step()` that called the method
- **Naming** — camelCase, descriptive verb phrases, no abbreviations or acronyms
- **Reuse first** — before adding a new method, scan the relevant class. Reuse if a method covers the flow; parametrize an existing method if it nearly does. Never write two methods that differ only in a hardcoded value

```typescript
// playwright-utils/pages/login-page.ts
import { type Locator, type Page } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  // Locator getter — lets the spec assert without reaching into the DOM itself
  errorMessage(): Locator {
    return this.page.getByRole('alert')
  }

  async loginWithCredentials(email: string, password: string) {
    await this.page.getByRole('textbox', { name: 'Email' }).fill(email)
    await this.page.getByLabel('Password').fill(password)
    await this.page.getByRole('button', { name: 'Login', exact: true }).click()
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
    await expect(loginPage.errorMessage()).toHaveText('Invalid email or password')
  })
})
```

### Component-Level Page Objects

For widgets reused across pages (header, cart drawer, modals), create a separate class. Components follow the same rules as pages.

```typescript
export class HeaderComponent {
  constructor(private page: Page) {}

  cartBadge(): Locator {
    return this.page.getByRole('navigation').getByTestId('cart-count-badge')
  }

  async openLogin() {
    await this.page.getByRole('link', { name: 'Log In' }).click()
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
    await expect(dashboardPage.propertySelector()).toBeVisible()
  })

  await test.step(`Open accounts for "${testData['QA-05'].property}"`, async () => {
    await dashboardPage.selectProperty(testData['QA-05'].property)
    await expect(accountsPage.accountsList()).toBeVisible()
  })
})
```

- **Variable name = camelCase of the class name** (`AdminPage` → `adminPage`), so calls read `await adminPage.createUser(...)`
- **Instantiate at the top of the test body**, before the first action — one `const` per page the test uses
- **Import only the pages the spec actually uses** — an unused page object in a spec is dead weight
- **Never instantiate at module scope** — `page` is per-test, so a page object built outside the test body leaks state across tests
- When every test in a `describe` uses the same pages, declare the variables in the `describe` scope and assign them in `beforeEach` (see [Test Suite Hooks](#test-suite-hooks))

When adding a new page class: create `playwright-utils/pages/<page-name>.ts` and import it in the specs that need it. There is no central registration step.

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
  pages/
    home-page.ts
    login-page.ts
    dashboard-page.ts
    admin-page.ts
    accounts-page.ts
  fixtures/                  # Only for resources needing setup/teardown (DB, API clients)
  test-data/                 # Data only — no functions, no types, no barrel file
    buildings.data.ts        # Buildings cases for qa / rc / regression
    accounts.data.ts         # Accounts cases for qa / rc / regression
  helpers/                   # Stateless utilities with no test data in them
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
      await expect(homePage.hero()).toBeVisible()
    })
  })

  test('QA-11 | User can navigate to blog', async () => {
    await test.step('Open the blog from the home page', async () => {
      await homePage.openBlog()
      await expect(blogPage.articlesList()).toBeVisible()
    })
  })
})
```

## Anti-Patterns

- **Locator constants on the class** (constructor or properties, e.g. `this.submitButton = page.getByRole(...)`) — locators are built lazily inside methods. A getter method that *returns* a `Locator` is not a locator constant and is the sanctioned way to expose one to the spec
- **`expect()` anywhere in `playwright-utils/`** — assertions belong to the spec. A page object that imports `expect` is a bug
- **`expect*`-prefixed page object methods** (`expectErrorMessage`, `expectAccountsListVisible`) — replace with a locator getter the spec asserts on
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

