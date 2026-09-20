// The per-test request/response buffer. Every failure message the framework produces —
// a status mismatch from the handler, a `should*` mismatch from the custom matchers —
// ends with the calls that led up to it, so a red run is diagnosable from the report
// without re-running anything.
export class APILogger {
  private recentLogs: { type: string; data: object }[] = []

  logRequest(method: string, url: string, headers: Record<string, string>, body?: unknown) {
    this.recentLogs.push({ type: 'Request Details', data: { method, url, headers, body } })
  }

  logResponse(statusCode: number, body?: unknown) {
    this.recentLogs.push({ type: 'Response Details', data: { statusCode, body } })
  }

  getRecentLogs() {
    return this.recentLogs
      .map((log) => `=== ${log.type} ===\n${JSON.stringify(log.data, null, 4)}\n`)
      .join('\n\n')
  }
}
