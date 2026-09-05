import { type Locator, type Page } from '@playwright/test'

export class SideNavComponent {
  constructor(private page: Page) {}

  // Renders only once authenticated, so it doubles as the signed-in signal.
  menu(): Locator {
    return this.page.getByRole('navigation')
  }

  async openBuildings() {
    // The "apartment" icon ligature is part of the link's accessible name and is
    // needed because "Property" alone also matches "GL Property Permissions".
    await this.menu().getByRole('link', { name: 'apartment Property' }).click()
    await this.menu().getByRole('link', { name: 'Buildings', exact: true }).click()
  }
}
