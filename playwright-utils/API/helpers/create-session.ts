import { request as playwrightRequest, type APIRequestContext } from '@playwright/test'
import { AuthApi } from '../clients/auth/auth-api'

// Session acquisition, outside the fixture body and outside any beforeAll — the same
// shape as a token helper, with one difference the application forces: ResMan's
// credential is not a token it hands back, it is the session cookie jar the context
// accumulates during the OIDC round trip. So this returns the signed-in context itself,
// and the worker fixture holds it.
//
// That also means it cannot dispose in `finally` the way a token helper does: the context
// is the return value. It disposes on the failure path only, and the fixture owns it
// afterwards.
//
// It takes the credentials as parameters even though only one caller passes them today —
// a second role is a second call, not a second helper.
export async function createSession(
  baseUrl: string,
  username: string,
  password: string,
): Promise<APIRequestContext> {
  const context = await playwrightRequest.newContext({ baseURL: baseUrl })

  try {
    const sessionResponse = await new AuthApi(context).signIn(username, password)

    // Rejected credentials also answer 200 — on the identity provider's login form, not
    // the application — so the host is what says the session was established. Checked
    // here rather than in a spec because every test in the worker depends on it: a helper
    // that returned a signed-out context would fail each of them somewhere further on,
    // with a message about a missing property rather than a bad password.
    if (new URL(sessionResponse.url()).host !== new URL(baseUrl).host) {
      throw new Error(
        `Sign-in did not reach the application. Expected host ${new URL(baseUrl).host}, ` +
          `landed on ${sessionResponse.url()}`,
      )
    }

    return context
  } catch (error) {
    await context.dispose()
    Error.captureStackTrace(error as Error, createSession)
    throw error
  }
}
