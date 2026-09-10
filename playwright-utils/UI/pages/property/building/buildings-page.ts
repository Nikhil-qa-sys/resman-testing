import { type Locator, type Page } from '@playwright/test'
import { waitForLoadingToFinish } from '../../../helpers/loading-overlay'

export class BuildingsPage {
  public readonly newBuildingLink: Locator
  public readonly buildingListTable: Locator
  public readonly buildingRows: Locator
  // The list pages at 25 rows sorted by name, so a newly created building is
  // usually not on the first page. The pager's "All" control is a <span> with an
  // href rather than an anchor, so it has no link role and is reached by its text
  // within the pager's authored id.
  public readonly showAllPagerLink: Locator
  // The pager itself. Its page numbers are a sliding window of five: page 1 opens on
  // "1 2 3 4 5 >> All", and each step forward drops the lowest and reveals one more,
  // so the number for the page after this one only exists once the current page has
  // loaded. Nothing here may be cached across a page change.
  public readonly pager: Locator

  constructor(private page: Page) {
    this.newBuildingLink = this.page.getByRole('link', { name: 'New Building' })
    this.buildingListTable = this.page.locator('#BuildingListTable')
    this.buildingRows = this.buildingListTable.getByRole('row')
    this.showAllPagerLink = this.page.locator('#PageLinks').getByText('All', { exact: true })
    this.pager = this.page.locator('#PageLinks')
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

  // Parametrized by a page number that only exists while the window shows it, so it
  // cannot be a constructor property. The pager renders each number once — as the
  // current page or as a link — so matching on exact text is unambiguous.
  pagerPageLink(pageNumber: number): Locator {
    return this.pager.getByText(String(pageNumber), { exact: true })
  }

  async openNewBuildingForm() {
    await this.newBuildingLink.click()
  }

  // Walks the list a page at a time until the row for `name` is on screen, and
  // returns the page it was found on — 0 when the pager runs out first, which the
  // caller's assertion on buildingRow(name) then reports.
  //
  // The list is paged at 25 rows and sorted by name, so a generated name can sit
  // deep in it: 72 pages in on rc at the time of writing. Every page is checked
  // rather than jumping to the last one, because where a name lands depends on what
  // else the environment holds — the same prefix landed on page 2 on qa and page 72
  // on rc during development.
  //
  // Each page is only read once the swap that produced it has finished; without that
  // the walk reads the outgoing page, decides the row is absent, and clicks into an
  // overlay that is still coming up.
  //
  // The signal is the paging request, not the overlay. Measured, a page swap finishes
  // inside the click itself, so waiting on the overlay never catches it going up and
  // costs the full appearance bound per page instead — 71s of a 76s walk, spent
  // discovering there was nothing to wait for. Waiting on the response the pager
  // fires is exact, and costs only what the request costs.
  async openPageWithBuilding(name: string): Promise<number> {
    let pageNumber = 1

    await this.buildingListTable.waitFor()

    while (await this.buildingRow(name).count() === 0) {
      const nextPageLink = this.pagerPageLink(pageNumber + 1)

      if (await nextPageLink.count() === 0) {
        return 0
      }

      const pageLoaded = this.page.waitForResponse(
        (response) => response.url().includes('IndexPageBuildingList') && response.status() === 200,
      )
      await nextPageLink.click()
      await pageLoaded
      await this.buildingListTable.waitFor()
      pageNumber++
    }

    return pageNumber
  }

  // Navigation, so it ends here and the detail page takes over.
  //
  // Deliberately the default and not TIMEOUTS.loader.slow: measured, this route
  // renders in under 5s on qa, and on rc and regression it does not render slowly —
  // it stalls, overlay up and no request in flight, for as long as anything waits.
  // Slow patience buys nothing against a stall; it only delays the failure. Switch it
  // to slow when a run is seen finishing late, not because it once hung.
  async openBuilding(name: string) {
    await this.buildingRow(name).getByRole('link', { name, exact: true }).click()
    await waitForLoadingToFinish(this.page)
  }

  // The table re-renders asynchronously; the caller's locator assertion polls,
  // so no guard is needed here.
  async showAllBuildings() {
    await this.showAllPagerLink.click()
  }
}
