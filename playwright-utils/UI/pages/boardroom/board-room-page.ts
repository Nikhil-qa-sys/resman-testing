import { type Locator, type Page } from '@playwright/test'
import { loadingOverlay, waitForShellToBeUsable } from '../../helpers/loading-overlay'

export class BoardRoomPage {
  // Authored id on the jQuery UI autocomplete fronting a hidden <select>; the
  // input has no accessible name and its "Property" caption is not a <label for>.
  public readonly propertySelector: Locator
  // The briefing overlay intercepts pointer events; its close control is an
  // empty span with no text, role, or accessible name. Both are always in the DOM,
  // so presence proves nothing — the overlay renders on some sessions only, and
  // visibility is what says whether it is there this run.
  public readonly advisorOverlay: Locator
  public readonly closeAdvisorButton: Locator
  // The shell loads behind the application-wide overlay, which swallows clicks
  // anywhere in it — including the side nav — until it clears. The selector lives in
  // the loading-overlay helper, since every module raises the same one.
  public readonly loadingOverlay: Locator
  public readonly propertySuggestions: Locator
  public readonly goButton: Locator

  constructor(private page: Page) {
    this.propertySelector = this.page.locator('#PropertyOrGroupIDInput')
    this.advisorOverlay = this.page.locator('#Advisor')
    this.closeAdvisorButton = this.page.locator('#CloseAdvisor')
    this.loadingOverlay = loadingOverlay(this.page)
    this.propertySuggestions = this.page.getByRole('menuitem')
    this.goButton = this.page.getByText('Go', { exact: true })
  }

  async selectProperty(propertyName: string) {
    await this.dismissBriefingIfShown()
    await this.propertySelector.fill('')
    // fill() sets the value without keystrokes, which never opens the suggestions.
    await this.propertySelector.pressSequentially(propertyName)
    await this.propertySuggestions.filter({ hasText: propertyName }).click()
    // The property reaches the rest of the app only once "Go" is applied. Measured
    // on qa and rc: applying it does not raise the loading overlay — that overlay
    // belongs to the initial shell load, which is waited out below before anything
    // is clicked — so there is nothing to wait for here.
    await this.goButton.click()
  }

  // The briefing shows on some sessions and not others, so an unconditional click
  // fails the run where it never appeared, and an immediate visibility check fails
  // the run where it appears a moment later — both were observed on qa. It renders
  // only after the shell has loaded, so the overlay clearing is the gate, and the
  // briefing is then given a bounded chance to draw itself.
  //
  // The timeout is the one in this suite: measured over five runs, the briefing
  // appears 2.4-6.6s after the overlay clears (qa, rc, regression), so 30s is roughly
  // five times the slowest observed. Only a session that never shows a briefing waits
  // it out, and it pays that once instead of failing on the action timeout.
  private async dismissBriefingIfShown() {
    await waitForShellToBeUsable(this.page)
    await this.advisorOverlay.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {})

    if (await this.advisorOverlay.isVisible()) {
      await this.closeAdvisorButton.click()
      await this.advisorOverlay.waitFor({ state: 'hidden' })
    }
  }
}
