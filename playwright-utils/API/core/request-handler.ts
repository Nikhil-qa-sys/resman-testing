import { test, type APIRequestContext, type APIResponse } from '@playwright/test'
import { APILogger } from './logger'

// The only way a spec calls the application. It wraps APIRequestContext in a fluent
// builder so a spec describes a call and ends the chain with the verb plus the status it
// expects — the comparison is the handler's job, and it throws with the recent API
// activity attached rather than leaving the spec to assert a bare number.
//
// Three things here are ResMan-specific rather than inherited from the framework this is
// modelled on, and each is here because the application is an ASP.NET MVC app rather
// than a JSON API:
//
//   - `.form()` alongside `.body()`. The module endpoints take
//     application/x-www-form-urlencoded, not JSON.
//   - Responses are read by content type. /Buildings/BuildingExists answers JSON;
//     /Buildings/New and /Buildings/IndexPageBuildingList answer HTML. Calling .json()
//     on either of the latter throws before the status has even been compared, which
//     would turn every failure into a parse error.
//   - X-Requested-With is injected on every call. The controllers answer a request
//     without it with the whole application shell instead of the partial, so it is
//     infrastructure the spec should not have to remember — the same reasoning that
//     makes auth injected rather than passed.
const AJAX_HEADERS = { 'X-Requested-With': 'XMLHttpRequest' }

// An HTML body is hundreds of kilobytes. Logged whole it buries the request that
// produced it and makes the failure message unreadable, which defeats the point of
// logging at all — so bodies are capped and the cut is marked.
const MAX_LOGGED_BODY = 2_000

function forLog(body: unknown) {
  if (typeof body !== 'string' || body.length <= MAX_LOGGED_BODY) {
    return body
  }

  return `${body.slice(0, MAX_LOGGED_BODY)}\n... [${body.length - MAX_LOGGED_BODY} more characters]`
}

export class RequestHandler {
  private baseUrl: string | undefined
  private apiPath = ''
  private queryParams: Record<string, string | number> = {}
  private apiHeaders: Record<string, string> = {}
  private apiBody: object | undefined
  private apiForm: Record<string, string> | undefined
  private clearAuthFlag = false

  constructor(
    private request: APIRequestContext,
    private defaultBaseUrl: string,
    private logger: APILogger,
    // ResMan's credential is the session cookie jar the APIRequestContext carries, not a
    // header, so this is empty for every call the suite makes today. It stays because the
    // builder's contract includes it, and a token-bearing endpoint would need no change.
    private defaultAuthToken: string = '',
  ) {}

  url(url: string) {
    this.baseUrl = url
    return this
  }

  path(path: string) {
    this.apiPath = path
    return this
  }

  params(params: Record<string, string | number>) {
    this.queryParams = params
    return this
  }

  headers(headers: Record<string, string>) {
    this.apiHeaders = headers
    return this
  }

  body(body: object) {
    this.apiBody = body
    return this
  }

  // A form-encoded request body. ResMan's module endpoints take this rather than JSON.
  form(form: Record<string, string>) {
    this.apiForm = form
    return this
  }

  clearAuth() {
    this.clearAuthFlag = true
    return this
  }

  async getRequest(statusCode: number) {
    let responseBody: unknown

    const url = this.getUrl()
    await test.step(`GET Request to ${url}`, async () => {
      this.logger.logRequest('GET', url, this.getHeaders())
      const response = await this.request.get(url, { headers: this.getHeaders() })
      this.cleanUpFields()

      responseBody = await this.readBody(response)
      this.logger.logResponse(response.status(), forLog(responseBody))
      this.statusCodeValidator(response.status(), statusCode, this.getRequest)
    })

    return responseBody as any
  }

  async postRequest(statusCode: number) {
    let responseBody: unknown

    const url = this.getUrl()
    await test.step(`POST Request to ${url}`, async () => {
      this.logger.logRequest('POST', url, this.getHeaders(), this.apiForm ?? this.apiBody)
      const response = await this.request.post(url, {
        headers: this.getHeaders(),
        ...this.getPayload(),
      })
      this.cleanUpFields()

      responseBody = await this.readBody(response)
      this.logger.logResponse(response.status(), forLog(responseBody))
      this.statusCodeValidator(response.status(), statusCode, this.postRequest)
    })

    return responseBody as any
  }

  async putRequest(statusCode: number) {
    let responseBody: unknown

    const url = this.getUrl()
    await test.step(`PUT Request to ${url}`, async () => {
      this.logger.logRequest('PUT', url, this.getHeaders(), this.apiForm ?? this.apiBody)
      const response = await this.request.put(url, {
        headers: this.getHeaders(),
        ...this.getPayload(),
      })
      this.cleanUpFields()

      responseBody = await this.readBody(response)
      this.logger.logResponse(response.status(), forLog(responseBody))
      this.statusCodeValidator(response.status(), statusCode, this.putRequest)
    })

    return responseBody as any
  }

  async deleteRequest(statusCode: number) {
    const url = this.getUrl()
    await test.step(`DELETE Request to ${url}`, async () => {
      this.logger.logRequest('DELETE', url, this.getHeaders())
      const response = await this.request.delete(url, { headers: this.getHeaders() })
      this.cleanUpFields()

      this.logger.logResponse(response.status())
      this.statusCodeValidator(response.status(), statusCode, this.deleteRequest)
    })
  }

  private getUrl() {
    const url = new URL(`${this.baseUrl ?? this.defaultBaseUrl}${this.apiPath}`)
    for (const [key, value] of Object.entries(this.queryParams)) {
      url.searchParams.append(key, String(value))
    }

    return url.toString()
  }

  // Which key Playwright is given decides the content type, so the two are never both
  // sent: `form` is urlencoded, `data` is JSON.
  private getPayload() {
    return this.apiForm ? { form: this.apiForm } : { data: this.apiBody ?? {} }
  }

  // Read by what the response says it is. An HTML body parsed as JSON throws inside the
  // handler before the status is compared, and the spec would see a parse error instead
  // of the mismatch that actually failed.
  private async readBody(response: APIResponse) {
    const contentType = response.headers()['content-type'] ?? ''

    return contentType.includes('json') ? await response.json() : await response.text()
  }

  private statusCodeValidator(actualStatus: number, expectedStatus: number, callingFunction: Function) {
    if (actualStatus === expectedStatus) {
      return
    }

    const error = new Error(
      `Expected status ${expectedStatus} but got ${actualStatus}.\n\nRecent API Activity:\n${this.logger.getRecentLogs()}`,
    )
    // Trims the handler's own frames off the throw, so the failure points at the spec
    // line that made the call rather than at this file.
    Error.captureStackTrace(error, callingFunction)
    throw error
  }

  private getHeaders() {
    const headers: Record<string, string> = { ...AJAX_HEADERS, ...this.apiHeaders }

    if (!this.clearAuthFlag && this.defaultAuthToken) {
      headers['Authorization'] = headers['Authorization'] || this.defaultAuthToken
    }

    return headers
  }

  // Runs after every call, which is what makes one `api` fixture safe to chain four
  // times in a single test. A new builder field that is not reset here leaks into the
  // next request.
  private cleanUpFields() {
    this.apiBody = undefined
    this.apiForm = undefined
    this.apiHeaders = {}
    this.queryParams = {}
    this.apiPath = ''
    this.baseUrl = undefined
    this.clearAuthFlag = false
  }
}
