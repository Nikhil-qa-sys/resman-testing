import { type Locator, type Page } from '@playwright/test'

export class UnitDetailPage {
  // "Delete" under Actions, pinned to that section rather than to the page.
  //
  // Checked against the live page: the control is an <a class="confirm-delete"> with
  // no href, so getByRole('link', { name: 'Delete' }) matches nothing — the
  // accessibility tree shows the surrounding listitem carrying the bare text. There is
  // an <li> around it, but a listitem filtered by text is not scoped to Actions and
  // would start matching the wrong control the day another section of this page grows
  // a Delete. What identifies it is the relationship: the anchor lives in the list
  // following the "Actions" heading.
  public readonly deleteLink: Locator
  // Matched by title, because this application raises refusals through the same role —
  // a dialog whose only button is OK — and an unfiltered dialog locator would match one
  // of those, then fail on a missing Yes rather than saying what happened. Confirmed in
  // the shared Scripts/ConfirmDelete.js: one jQuery UI dialog is built for every
  // confirm-delete control from its data-dialog-title / data-dialog-message, with Yes
  // and No buttons, and a failed delete check swaps in a message dialog instead. The
  // aria-labelledby points at an id that does not resolve, so there is no accessible
  // name to match on; `has` is rooted at page, as filter() requires.
  public readonly confirmDeleteDialog: Locator
  public readonly confirmDeleteMessage: Locator
  public readonly confirmDeleteYesButton: Locator
  public readonly confirmDeleteNoButton: Locator
  // Deleting returns to the list, so this banner renders there — but it reports the
  // outcome of this page's action, so this page owns it.
  public readonly unitDeletedMessage: Locator

  constructor(private page: Page) {
    this.deleteLink = this.page.locator(
      'xpath=//h4[normalize-space()="Actions"]/following-sibling::ul[1]//a[normalize-space()="Delete"]',
    )
    this.confirmDeleteDialog = this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByText('Confirm Delete', { exact: true }) })
    this.confirmDeleteMessage = this.confirmDeleteDialog.getByText('Are you sure you want to delete this unit?')
    this.confirmDeleteYesButton = this.confirmDeleteDialog.getByRole('button', { name: 'Yes', exact: true })
    this.confirmDeleteNoButton = this.confirmDeleteDialog.getByRole('button', { name: 'No', exact: true })
    this.unitDeletedMessage = this.page.getByRole('cell', { name: 'Unit deleted successfully!' })
  }

  // The detail table puts a caption and its value in the same cell — the cell reads
  // "Number qaU1a2b3c" — so a field is matched whole rather than by pairing two
  // elements. Parametrized by values known only at run time, so these are methods.
  unitNumberField(number: string): Locator {
    return this.page.getByRole('cell', { name: `Number ${number}`, exact: true })
  }

  // Bld-Flr renders the two together as "<building> - <floor>", which is what proves
  // the unit was filed against the building this run created rather than some other.
  buildingAndFloorField(buildingName: string, floor: string): Locator {
    return this.page.getByRole('cell', { name: `Bld-Flr ${buildingName} - ${floor}`, exact: true })
  }

  // The three below are each a single click, which an action method normally is not.
  // They are the dialog's boundaries, and a boundary is the exception a navigation
  // click already gets: the test has to see the dialog open, dismiss it, and open it
  // again before confirming, so folding them together would hide the states it
  // verifies.
  //
  // Unlike the building and unit type forms, this control carries a
  // data-delete-check-url, so the click asks /Units/CanDeleteUnit whether the record
  // may go before the dialog is built. Nothing is waited on for it here — the caller's
  // assertion on confirmDeleteDialog is the outcome, and it auto-waits.
  async openDeleteConfirmation() {
    await this.deleteLink.click()
  }

  async cancelDelete() {
    await this.confirmDeleteNoButton.click()
  }

  // Confirming deletes the record and returns to the list, so this ends the detail
  // page and the list page takes over. The delete request is the signal: the overlay
  // clears before the list has rendered, so waiting on it returns too early — the
  // banner the caller asserts on is not there yet — and costs the appearance bound
  // when the swap has already finished. "Units/Delete" does not match the
  // "Units/CanDeleteUnit" check the open above fires.
  async confirmDelete() {
    const deleted = this.page.waitForResponse(
      (response) => response.url().includes('Units/Delete') && response.status() === 200,
    )
    await this.confirmDeleteYesButton.click()
    await deleted
  }
}
