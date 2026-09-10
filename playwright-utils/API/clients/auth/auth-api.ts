import { type APIRequestContext, type APIResponse } from '@playwright/test'
import { formAction, formFields } from '../../helpers/html-form'

// Signing in without a browser.
//
// ResMan delegates authentication to an OpenID Connect provider on a separate host, and
// the round trip is three requests rather than one credential post:
//
//   1. GET / on the application, which redirects (unauthenticated) to the provider's
//      login form. An APIRequestContext follows redirects, so this request ends on the
//      form, and its final URL is where the credentials must go.
//   2. POST the form back with the username and password filled in. The provider answers
//      302 -> its authorize callback, which renders a form holding the signed id_token.
//      Everything else in that form — state, nonce, session_state — is opaque to the test.
//   3. POST that form to the application's /signin-oidc. A browser submits it on load
//      through the form's own onload script; nothing here does, so it is posted
//      explicitly. The application answers with the session cookies, which the request
//      context keeps for every later call.
//
// Nothing in the chain is constructed by the test: each step posts back exactly what the
// previous response served, with only the credentials filled in. That is what lets the
// same code sign in to qa, rc and regression, whose providers issue different tokens from
// different hosts.
export class AuthApi {
  constructor(private request: APIRequestContext) {}

  // Returns the application's response to the final hand-off, so the spec can assert the
  // session landed on the application rather than back on the provider's login form —
  // which is what a rejected credential looks like: an ordinary 200, on the wrong host.
  async signIn(username: string, password: string): Promise<APIResponse> {
    const loginPageResponse = await this.request.get('/')
    const loginHtml = await loginPageResponse.text()

    const credentialsResponse = await this.request.post(loginPageResponse.url(), {
      form: { ...formFields(loginHtml), Username: username, Password: password },
    })
    const callbackHtml = await credentialsResponse.text()

    return this.request.post(formAction(callbackHtml), { form: formFields(callbackHtml) })
  }
}
