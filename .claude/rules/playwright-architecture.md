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
import { getAccountsTestData } from '../../playwright-utils/helpers/test-data'

const TEST_CASE_ID = 'QA-05'

test(`${TEST_CASE_ID} | User can select a property and open its accounts`, async ({ page }) => {
  const loginPage = new LoginPage(page)
  const dashboardPage = new DashboardPage(page)
  const accountsPage = new AccountsPage(page)
  const testData = getAccountsTestData(TEST_CASE_ID)

  await test.step('Log in', async () => {
    await loginPage.login(process.env.TEST_USERNAME!, process.env.TEST_PASSWORD!)
    await expect(dashboardPage.propertySelector()).toBeVisible()
  })

  await test.step(`Open accounts for "${testData.property}"`, async () => {
    await dashboardPage.selectProperty(testData.property)
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
  helpers/
    test-data.ts             # Environment-keyed test data, keyed by test case ID
```

## Environment-Specific Test Data

Every value a test needs that is not a credential lives in
`playwright-utils/helpers/test-data.ts`, keyed **first by test case ID, then by
environment**. The suite runs against `qa`, `rc` and `regression`, and the same
spec must pass on all of them — so a test case declares a full record for each.

Typing the store as `Record<string, Record<TestEnv, ...>>` makes that a compile
error rather than a convention: a test case that forgets an environment does not
build.

```typescript
// playwright-utils/helpers/test-data.ts
export type TestEnv = 'qa' | 'rc' | 'regression'

const TEST_DATA: Record<string, Record<TestEnv, DeclaredBuildingTestData>> = {
  'QA-01': {
    qa: { property: 'Beta Tree - Automation', building: { namePrefix: 'qaBld', floors: '4', /* ... */ } },
    rc: { property: 'Beta Tree - Automation', building: { namePrefix: 'rcBld', floors: '4', /* ... */ } },
    regression: { property: 'Beta Tree - Automation', building: { namePrefix: 'regBld', floors: '4', /* ... */ } },
  },
}

// Mirrors the TEST_ENV default in playwright.config.ts
export function currentEnv(): TestEnv {
  return (process.env.TEST_ENV || 'qa') as TestEnv
}

export function getBuildingTestData(testCaseId: string): BuildingTestData {
  const environment = currentEnv()
  const testCase = TEST_DATA[testCaseId]
  if (!testCase) {
    throw new Error(`No test data declared for test case "${testCaseId}"`)
  }
  const declared = testCase[environment]
  if (!declared) {
    throw new Error(`Test case "${testCaseId}" declares no data for TEST_ENV="${environment}"`)
  }
  // ...
}
```

Rules for the store:

- **Resolution reads `process.env.TEST_ENV`** and defaults to the same environment
  `playwright.config.ts` does. A spec never reads `TEST_ENV` itself
- **Throw a named error** when a test case or one of its environments is missing.
  A clear "declares no data for TEST_ENV=…" beats a test failing on `undefined`
- **Declare every field per environment**, even where the values happen to match
  today. That is what lets one environment's value change without touching the spec
- **Credentials stay in `.env/.env.<env>`** and reach the spec through
  `process.env.TEST_USERNAME` / `TEST_PASSWORD` — never in the data store
- **Generate values the application requires to be unique.** Where a field must be
  distinct per run, declare a *prefix* in the store and append the unique suffix at
  resolution time, so the declared data stays readable. Respect any length limit
  the application enforces
- **Adding an environment** means adding it to `TestEnv` and to every test case —
  the compiler lists the ones still missing

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

