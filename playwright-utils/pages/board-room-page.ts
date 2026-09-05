import { type Locator, type Page } from '@playwright/test'

export class BoardRoomPage {
  constructor(private page: Page) {}

  // Authored id on the jQuery UI autocomplete fronting a hidden <select>; the
  // input has no accessible name and its "Property" caption is not a <label for>.
  propertySelector(): Locator {
    return this.page.locator('#PropertyOrGroupIDInput')
  }

  async selectProperty(propertyName: string) {
    // The briefing overlay intercepts pointer events; its close control is an
    // empty span with no text, role, or accessible name.
    await this.page.locator('#CloseAdvisor').click()
    await this.propertySelector().fill('')
    // fill() sets the value without keystrokes, which never opens the suggestions.
    await this.propertySelector().pressSequentially(propertyName)
    await this.page.getByRole('menuitem', { name: propertyName }).click()
    // The property reaches the rest of the app only once "Go" is applied.
    await this.page.getByText('Go', { exact: true }).click()
  }
}
