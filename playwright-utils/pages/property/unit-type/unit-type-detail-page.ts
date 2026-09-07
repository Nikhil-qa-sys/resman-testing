import { type Locator, type Page } from '@playwright/test'
import { waitForLoadingToFinish } from '../../../helpers/loading-overlay'

export class UnitTypeDetailPage {
  // "Delete" under Actions, pinned to that section rather than to the page.
  //
  // Checked against the live page: the control is an anchor with no href, so
  // getByRole('link', { name: 'Delete' }) matches nothing. There is an <li> around
  // it here — unlike the building detail page — but a listitem filtered by text is
  // not scoped to Actions either, and would start matching the wrong control the day
  // another section of this page grows a Delete. What identifies it is the
  // relationship: the anchor lives in the list following the "Actions" heading.
  public readonly deleteLink: Locator
  // Matched by title, because this application raises refusals through the same
  // role — a dialog whose only button is OK — and an unfiltered dialog locator would
  // match one of those, then fail on a missing Yes rather than saying what happened.
  // The aria-labelledby points at an id that does not resolve, so there is no
  // accessible name to match on; `has` is rooted at page, as filter() requires.
  public readonly confirmDeleteDialog: Locator
  public readonly confirmDeleteMessage: Locator
  public readonly confirmDeleteYesButton: Locator
  public readonly confirmDeleteNoButton: Locator
  // Deleting returns to the list, so this banner renders there — but it reports the
  // outcome of this page's action, so this page owns it.
  public readonly unitTypeDeletedMessage: Locator

  constructor(private page: Page) {
    this.deleteLink = this.page.locator(
      'xpath=//h4[normalize-space()="Actions"]/following-sibling::ul[1]//a[normalize-space()="Delete"]',
    )
    this.confirmDeleteDialog = this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByText('Confirm Delete', { exact: true }) })
    this.confirmDeleteMessage = this.confirmDeleteDialog.getByText(
      'Are you sure you want to delete this unit type?',
    )
    this.confirmDeleteYesButton = this.confirmDeleteDialog.getByRole('button', { name: 'Yes', exact: true })
    this.confirmDeleteNoButton = this.confirmDeleteDialog.getByRole('button', { name: 'No', exact: true })
    this.unitTypeDeletedMessage = this.page.getByRole('cell', { name: 'Unit type deleted successfully!' })
  }

  // The page announces which record it is showing in its own heading — "Unit Type -
  // qaUT1a2b3c" — which is what proves the right unit type opened rather than some
  // other detail page. Parametrized by a name known only at run time.
  unitTypeHeading(name: string): Locator {
    return this.page.getByRole('heading', { name: `Unit Type - ${name}`, exact: true })
  }

  // The three below are each a single click, which an action method normally is not.
  // They are the dialog's boundaries, and a boundary is the exception a navigation
  // click already gets: the test has to see the dialog open, dismiss it, and open it
  // again before confirming, so folding them together would hide the states it
  // verifies.
  async openDeleteConfirmation() {
    await this.deleteLink.click()
  }

  async cancelDelete() {
    await this.confirmDeleteNoButton.click()
  }

  // Confirming deletes the record and returns to the list, so this ends the detail
  // page and the list page takes over.
  async confirmDelete() {
    await this.confirmDeleteYesButton.click()
    await waitForLoadingToFinish(this.page)
  }
}
