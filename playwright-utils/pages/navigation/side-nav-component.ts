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
  // The "switch_account" icon ligature is part of this link's accessible name for
  // the same reason "apartment" is part of Property's — it is rendered as text
  // inside the anchor.
  public readonly accountsMenuLink: Locator
  public readonly applicantsLink: Locator
  public readonly buildingsLink: Locator
  public readonly unitTypesLink: Locator
  public readonly unitsLink: Locator

  constructor(private page: Page) {
    this.menu = this.page.getByRole('navigation').filter({ has: this.page.locator('#SideNavCollapse') })
    this.propertyMenuLink = this.menu.getByRole('link', { name: 'apartment Property' })
    this.accountsMenuLink = this.menu.getByRole('link', { name: 'switch_account Accounts' })
    // Exact and side-nav scoped, like Units and Unit Types below: the Applicants
    // module renders its own sub-menu link of the same name above the list, so an
    // unscoped locator matches two elements once that module is on screen.
    this.applicantsLink = this.menu.getByRole('link', { name: 'Applicants', exact: true })
    this.buildingsLink = this.menu.getByRole('link', { name: 'Buildings', exact: true })
    // Exact, so the Property menu's "Units" entry cannot satisfy it, and scoped to
    // the side nav, which keeps it clear of the Unit Types module's own sub-menu
    // link of the same name.
    this.unitTypesLink = this.menu.getByRole('link', { name: 'Unit Types', exact: true })
    // Exact and side-nav scoped for the same two reasons as Unit Types above: it
    // keeps "Units" clear of "Unit Types", and of the Units module's own sub-menu
    // link of the same name, which sits outside this nav.
    this.unitsLink = this.menu.getByRole('link', { name: 'Units', exact: true })
  }

  async openApplicants() {
    await this.accountsMenuLink.click()
    await this.applicantsLink.click()
  }

  async openBuildings() {
    await this.propertyMenuLink.click()
    await this.buildingsLink.click()
  }

  async openUnitTypes() {
    await this.propertyMenuLink.click()
    await this.unitTypesLink.click()
  }

  async openUnits() {
    await this.propertyMenuLink.click()
    await this.unitsLink.click()
  }
}
