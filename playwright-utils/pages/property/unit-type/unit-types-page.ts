import { type Locator, type Page } from '@playwright/test'

export class UnitTypesPage {
  // The module keeps its own property box, fed by the BoardRoom selection. It is
  // a jQuery UI autocomplete over a hidden <select>, so it carries an authored id
  // rather than an accessible name, and it is a different id from the BoardRoom's
  // (#PropertyOrGroupIDInput) even though both render under a "Property" caption.
  public readonly propertySelector: Locator
  // Lives in the module's own sub-menu above the list, not in the side nav.
  public readonly newUnitTypeLink: Locator

  constructor(private page: Page) {
    this.propertySelector = this.page.locator('#PropertyIDInput')
    this.newUnitTypeLink = this.page.getByRole('link', { name: 'New Unit Type', exact: true })
  }

  async openNewUnitTypeForm() {
    await this.newUnitTypeLink.click()
  }
}
