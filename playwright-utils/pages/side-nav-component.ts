import { type Locator, type Page } from '@playwright/test'

export class SideNavComponent {
  // The side-nav links live inside the top navbar, which is the only navigation
  // landmark today. Anchored to the authored id of the side-nav toggle it owns,
  // so a second <nav> (breadcrumbs, footer) cannot make this ambiguous later.
  // Renders only once authenticated, so it doubles as the signed-in signal.
  public readonly menu: Locator
  // The "apartment" icon ligature is part of the link's accessible name and is
  // needed because "Property" alone also matches "GL Property Permissions".
  public readonly propertyMenuLink: Locator
  public readonly buildingsLink: Locator

  constructor(private page: Page) {
    this.menu = this.page.getByRole('navigation').filter({ has: this.page.locator('#SideNavCollapse') })
    this.propertyMenuLink = this.menu.getByRole('link', { name: 'apartment Property' })
    this.buildingsLink = this.menu.getByRole('link', { name: 'Buildings', exact: true })
  }

  async openBuildings() {
    await this.propertyMenuLink.click()
    await this.buildingsLink.click()
  }
}
