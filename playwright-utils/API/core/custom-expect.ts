import { expect as baseExpect } from '@playwright/test'
import { APILogger } from './logger'
import { validateSchema } from './schema-validator'

// The matchers do what their built-in counterparts do, plus append the calls that
// produced the value to the failure message. `toEqual` fails with "expected 10, received
// 0" and says nothing about which request answered 0; `shouldEqual` says both.
//
// API specs only — the logger these read is registered by the `api` fixture, so they have
// no meaning in a UI spec.
let apiLogger: APILogger

export const setCustomExpectLogger = (logger: APILogger) => {
  apiLogger = logger
}

declare global {
  namespace PlaywrightTest {
    interface Matchers<R, T> {
      shouldEqual(expected: T): R
      shouldMatch(expected: RegExp): R
      shouldBeLessThanOrEqual(expected: T): R
      shouldMatchSchema(dirName: string, fileName: string): Promise<R>
    }
  }
}

export const expect = baseExpect.extend({
  async shouldMatchSchema(received: object, dirName: string, fileName: string) {
    try {
      await validateSchema(dirName, fileName, received)
      return { pass: true, message: () => 'Schema validation passed' }
    } catch (error) {
      const message = `${(error as Error).message}\n\nRecent API Activity:\n${apiLogger.getRecentLogs()}`
      return { pass: false, message: () => message }
    }
  },

  shouldEqual(received: unknown, expected: unknown) {
    return compare.call(this, 'shouldEqual', received, expected, () => baseExpect(received).toEqual(expected))
  },

  // No built-in counterpart is being replaced here — this exists because QA-101 has to
  // assert the shape of an id, and reaching past the extension to `toMatch` would drop
  // the log from the failure.
  shouldMatch(received: string, expected: RegExp) {
    return compare.call(this, 'shouldMatch', received, expected, () => baseExpect(received).toMatch(expected))
  },

  shouldBeLessThanOrEqual(received: number, expected: number) {
    return compare.call(this, 'shouldBeLessThanOrEqual', received, expected, () =>
      baseExpect(received).toBeLessThanOrEqual(expected),
    )
  },
})

// Every matcher above differs only in the assertion it runs and the name it reports, so
// the pass/fail bookkeeping and the log-appending message live here once.
function compare(
  this: any,
  matcherName: string,
  received: unknown,
  expected: unknown,
  assertion: () => void,
) {
  let pass: boolean
  let logs = ''

  try {
    assertion()
    pass = true
    // Under `.not` a pass is the interesting case, so the log is attached there too.
    if (this.isNot) {
      logs = apiLogger.getRecentLogs()
    }
  } catch {
    pass = false
    logs = apiLogger.getRecentLogs()
  }

  const hint = this.isNot ? 'not' : ''
  const message =
    this.utils.matcherHint(matcherName, undefined, undefined, { isNot: this.isNot }) +
    '\n\n' +
    `Expected: ${hint} ${this.utils.printExpected(expected)}\n` +
    `Received: ${this.utils.printReceived(received)}\n\n` +
    `Recent API Activity Logs:\n${logs}`

  return { pass, message: () => message }
}
