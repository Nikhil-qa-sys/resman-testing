import { type Locator, type Page } from '@playwright/test'

export class UnitTypesPage {
  // The module keeps its own property box, fed by the BoardRoom selection. It is
  // a jQuery UI autocomplete over a hidden <select>, so it carries an authored id
  // rather than an accessible name, and it is a different id from the BoardRoom's
  // (#PropertyOrGroupIDInput) even though both render under a "Property" caption.
  public readonly propertySelector: Locator
  // Lives in the module's own sub-menu above the list, not in the side nav.
  public readonly newUnitTypeLink: Locator
  // The list table carries no id of its own; the element wrapping it does, so the
  // rows are reached through that.
  public readonly unitTypeListTable: Locator
  public readonly unitTypeRows: Locator
  // Same pager the Buildings list uses: a sliding window of five page numbers, so
  // the link for the page after this one exists only once the current one has
  // loaded and nothing can be cached across a swap.
  public readonly pager: Locator

  constructor(private page: Page) {
    this.propertySelector = this.page.locator('#PropertyIDInput')
    this.newUnitTypeLink = this.page.getByRole('link', { name: 'New Unit Type', exact: true })
    this.unitTypeListTable = this.page.locator('#UnitTypeList')
    this.unitTypeRows = this.unitTypeListTable.getByRole('row')
    this.pager = this.page.locator('#PageLinks')
  }

  // Parametrized by a name generated at run time. Matches on the name-cell link
  // rather than the row's text, so a value landing in Description cannot satisfy it.
  // The `has` locator is rooted at page: filter() applies its chain relative to the
  // row, so one starting from unitTypeListTable would never match inside one.
  unitTypeRow(name: string): Locator {
    return this.unitTypeRows.filter({ has: this.page.getByRole('link', { name, exact: true }) })
  }

  // Parametrized by a page number that exists only while the window shows it.
  pagerPageLink(pageNumber: number): Locator {
    return this.pager.getByText(String(pageNumber), { exact: true })
  }

  async openNewUnitTypeForm() {
    await this.newUnitTypeLink.click()
  }

  // Walks the list a page at a time until the row for `name` is on screen, and
  // returns the page it was found on — 0 when the pager runs out first, which the
  // caller's assertion on unitTypeRow(name) then reports.
  //
  // The signal is the request the pager fires, not the loading overlay: the swap
  // finishes inside the click, so waiting on the overlay never catches it going up
  // and costs the appearance bound per page instead.
  async openPageWithUnitType(name: string): Promise<number> {
    let pageNumber = 1

    await this.unitTypeListTable.waitFor()

    while (await this.unitTypeRow(name).count() === 0) {
      const nextPageLink = this.pagerPageLink(pageNumber + 1)

      if (await nextPageLink.count() === 0) {
        return 0
      }

      const pageLoaded = this.page.waitForResponse(
        (response) => response.url().includes('UnitTypes/UnitTypeList') && response.status() === 200,
      )
      await nextPageLink.click()
      await pageLoaded
      await this.unitTypeListTable.waitFor()
      pageNumber++
    }

    return pageNumber
  }

  // Navigation, so it ends here and the detail page takes over. Waits on the request
  // the click fires rather than on the overlay it also raises: the response is exact
  // and costs what the request costs, where the overlay costs the appearance bound to
  // discover the swap is already over.
  async openUnitType(name: string) {
    const detailLoaded = this.page.waitForResponse(
      (response) => response.url().includes('UnitTypes/Detail') && response.status() === 200,
    )
    await this.unitTypeRow(name).getByRole('link', { name, exact: true }).click()
    await detailLoaded
  }
}
