import { test as base, type APIRequestContext } from '@playwright/test'
import { apiConfig } from '../api-config'
import { createSession } from '../helpers/create-session'
import { APILogger } from '../core/logger'
import { RequestHandler } from '../core/request-handler'
import { setCustomExpectLogger } from '../core/custom-expect'

// The extended `test` every API spec imports. It wires objects together and contains no
// test logic of its own.
export type TestOptions = {
  api: RequestHandler
  config: typeof apiConfig
}

export type WorkerFixture = {
  authContext: APIRequestContext
}

export const test = base.extend<TestOptions, WorkerFixture>({
  // Worker-scoped: the OIDC round trip runs once per worker, not once per test.
  //
  // This is where a cookie session differs from a token. A token can be handed to the
  // built-in `request` fixture, but a cookie jar lives on the context that collected it —
  // and `request` is test-scoped, so using it would mean signing in again for every test.
  // The signed-in context is therefore the worker fixture. It holds nothing a test
  // mutates, which is the rule for worker scope.
  //
  // Code before `use` is the setup hook; code after it is teardown.
  authContext: [
    async ({}, use) => {
      // Credentials are secrets, so they are not fields on the config module — they come
      // from .env/.env.<env> and are read here rather than in a spec.
      const context = await createSession(
        apiConfig.baseUrl,
        process.env.TEST_USERNAME!.trim(),
        process.env.TEST_PASSWORD!.trim(),
      )

      await use(context)

      await context.dispose()
    },
    { scope: 'worker' },
  ],

  // Test-scoped and built fresh per test: a new logger, that logger registered with the
  // custom matchers, then a handler over the worker's signed-in context. Fresh per test
  // is what keeps one test's calls out of another test's failure message.
  api: async ({ authContext }, use) => {
    const logger = new APILogger()
    setCustomExpectLogger(logger)

    await use(new RequestHandler(authContext, apiConfig.baseUrl, logger))
  },

  // Exposed as a fixture so a spec reads environment values as `async ({ api, config })`
  // rather than importing the config module directly.
  config: async ({}, use) => {
    await use(apiConfig)
  },
})
