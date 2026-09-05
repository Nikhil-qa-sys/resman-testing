import { type Locator, type Page } from '@playwright/test'

export class BoardRoomPage {
  // Authored id on the jQuery UI autocomplete fronting a hidden <select>; the
  // input has no accessible name and its "Property" caption is not a <label for>.
  public readonly propertySelector: Locator
  // The briefing overlay intercepts pointer events; its close control is an
  // empty span with no text, role, or accessible name.
  public readonly closeAdvisorButton: Locator
  public readonly propertySuggestions: Locator
  public readonly goButton: Locator

  constructor(private page: Page) {
    this.propertySelector = this.page.locator('#PropertyOrGroupIDInput')
    this.closeAdvisorButton = this.page.locator('#CloseAdvisor')
    this.propertySuggestions = this.page.getByRole('menuitem')
    this.goButton = this.page.getByText('Go', { exact: true })
  }

  async selectProperty(propertyName: string) {
    await this.closeAdvisorButton.click()
    await this.propertySelector.fill('')
    // fill() sets the value without keystrokes, which never opens the suggestions.
    await this.propertySelector.pressSequentially(propertyName)
    await this.propertySuggestions.filter({ hasText: propertyName }).click()
    // The property reaches the rest of the app only once "Go" is applied.
    await this.goButton.click()
  }
}
