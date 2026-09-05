import { type Locator, type Page } from '@playwright/test'

export class BuildingsPage {
  public readonly newBuildingLink: Locator
  public readonly buildingListTable: Locator
  public readonly buildingRows: Locator
  // The list pages at 25 rows sorted by name, so a newly created building is
  // usually not on the first page. The pager's "All" control is a <span> with an
  // href rather than an anchor, so it has no link role and is reached by its text
  // within the pager's authored id.
  public readonly showAllPagerLink: Locator

  constructor(private page: Page) {
    this.newBuildingLink = this.page.getByRole('link', { name: 'New Building' })
    this.buildingListTable = this.page.locator('#BuildingListTable')
    this.buildingRows = this.buildingListTable.getByRole('row')
    this.showAllPagerLink = this.page.locator('#PageLinks').getByText('All', { exact: true })
  }

  // Parametrized by a name generated at run time, so it cannot be a constructor
  // property. It derives from the stored row locator and matches on the name-cell
  // link rather than the row's text, so a value landing in Description or another
  // building's row cannot satisfy the assertion. The `has` locator must be rooted
  // at `page`: filter() applies its selector chain relative to the row, so a chain
  // starting from buildingListTable would never match inside one.
  buildingRow(name: string): Locator {
    return this.buildingRows.filter({ has: this.page.getByRole('link', { name, exact: true }) })
  }

  async openNewBuildingForm() {
    await this.newBuildingLink.click()
  }

  // The table re-renders asynchronously; the caller's locator assertion polls,
  // so no guard is needed here.
  async showAllBuildings() {
    await this.showAllPagerLink.click()
  }
}
