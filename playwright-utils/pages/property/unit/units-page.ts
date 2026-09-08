import { type Locator, type Page } from '@playwright/test'

export class UnitsPage {
  // The module's own property box, fed by the BoardRoom selection. Same authored
  // id the Unit Types list uses, since both are the standard module property
  // autocomplete over a hidden <select>.
  public readonly propertySelector: Locator
  // Lives in the module's own sub-menu above the list, not in the side nav.
  public readonly newUnitLink: Locator
  // The list table carries no id of its own; the element wrapping it does, so the
  // rows are reached through that.
  public readonly unitListTable: Locator
  public readonly unitRows: Locator
  // Same pager the Buildings and Unit Types lists use: a sliding window of five page
  // numbers, so the link for the page after this one exists only once the current one
  // has loaded and nothing can be cached across a swap. It renders in the list table's
  // own <tfoot> here, but its authored id is page-unique, so it is rooted at page like
  // the others rather than through unitListTable.
  public readonly pager: Locator

  constructor(private page: Page) {
    this.propertySelector = this.page.locator('#PropertyIDInput')
    this.newUnitLink = this.page.getByRole('link', { name: 'New Unit', exact: true })
    this.unitListTable = this.page.locator('#UnitList')
    this.unitRows = this.unitListTable.getByRole('row')
    this.pager = this.page.locator('#PageLinks')
  }

  // Parametrized by a number generated at run time. Matches on the number-cell link
  // rather than the row's text, so a value landing in Bld-Flr or Unit type cannot
  // satisfy it. The `has` locator is rooted at page: filter() applies its chain
  // relative to the row, so one starting from unitListTable would never match inside
  // one.
  unitRow(number: string): Locator {
    return this.unitRows.filter({ has: this.page.getByRole('link', { name: number, exact: true }) })
  }

  // Parametrized by a page number that exists only while the window shows it.
  pagerPageLink(pageNumber: number): Locator {
    return this.pager.getByText(String(pageNumber), { exact: true })
  }

  async openNewUnitForm() {
    await this.newUnitLink.click()
  }

  // Walks the list a page at a time until the row for `number` is on screen, and
  // returns the page it was found on — 0 when the pager runs out first, which the
  // caller's assertion on unitRow(number) then reports.
  //
  // The signal is the request the pager fires, not the loading overlay: the swap
  // finishes inside the click, so waiting on the overlay never catches it going up
  // and costs the appearance bound per page instead. "Units/UnitList" and not
  // "UnitList" — the module also pulls /Scripts/UnitList.js, which the looser
  // substring would match.
  async openPageWithUnit(number: string): Promise<number> {
    let pageNumber = 1

    await this.unitListTable.waitFor()

    while (await this.unitRow(number).count() === 0) {
      const nextPageLink = this.pagerPageLink(pageNumber + 1)

      if (await nextPageLink.count() === 0) {
        return 0
      }

      const pageLoaded = this.page.waitForResponse(
        (response) => response.url().includes('Units/UnitList') && response.status() === 200,
      )
      await nextPageLink.click()
      await pageLoaded
      await this.unitListTable.waitFor()
      pageNumber++
    }

    return pageNumber
  }

  // Navigation, so it ends here and the detail page takes over. Waits on the request
  // the click fires rather than on the overlay it also raises: the response is exact
  // and costs what the request costs, where the overlay costs the appearance bound to
  // discover the swap is already over.
  async openUnit(number: string) {
    const detailLoaded = this.page.waitForResponse(
      (response) => response.url().includes('Units/Detail') && response.status() === 200,
    )
    await this.unitRow(number).getByRole('link', { name: number, exact: true }).click()
    await detailLoaded
  }
}
