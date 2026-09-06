import { type Locator, type Page } from '@playwright/test'

export class UnitsPage {
  // The module's own property box, fed by the BoardRoom selection. Same authored
  // id the Unit Types list uses, since both are the standard module property
  // autocomplete over a hidden <select>.
  public readonly propertySelector: Locator
  // Lives in the module's own sub-menu above the list, not in the side nav.
  public readonly newUnitLink: Locator

  constructor(private page: Page) {
    this.propertySelector = this.page.locator('#PropertyIDInput')
    this.newUnitLink = this.page.getByRole('link', { name: 'New Unit', exact: true })
  }

  async openNewUnitForm() {
    await this.newUnitLink.click()
  }
}
