import { type Locator, type Page } from '@playwright/test'
import { waitForLoadingToFinish } from '../../../helpers/loading-overlay'

export class BuildingDetailPage {
  // "Delete" under Actions, pinned to that section rather than to the page.
  //
  // The ladder runs out here, verified against the live page: the control is an
  // anchor with no href, so getByRole('link', { name: 'Delete' }) matches nothing;
  // it sits directly inside a <ul> with no <li>, so there is no listitem to scope to;
  // and the only element wrapping both it and its heading is a styling class. What
  // does exist is the relationship — the anchor lives in the list following the
  // "Actions" heading — and that is what XPath expresses. Page-wide text would work
  // today (one match) and quietly pick the wrong control the day a tab or panel on
  // this page grows a Delete of its own.
  public readonly deleteLink: Locator
  // jQuery UI dialog: a real role="dialog" with two real buttons. Matched by its
  // title, because the same role is used for the refusal this page can raise instead
  // — "Cannot delete building", with a single OK — and an unfiltered dialog locator
  // matches that one just as happily, then fails on a missing Yes button rather than
  // saying what actually happened. Its aria-labelledby points at an id that does not
  // resolve, so the dialog has no accessible name to match on; the title text is
  // matched instead, and `has` is rooted at page as filter() requires.
  public readonly confirmDeleteDialog: Locator
  public readonly confirmDeleteMessage: Locator
  public readonly confirmDeleteYesButton: Locator
  public readonly confirmDeleteNoButton: Locator
  // Deleting returns to the list, so this banner renders there — but it reports the
  // outcome of this page's action, so this page owns it.
  public readonly buildingDeletedMessage: Locator

  constructor(private page: Page) {
    this.deleteLink = this.page.locator(
      'xpath=//h4[normalize-space()="Actions"]/following-sibling::ul[1]//a[normalize-space()="Delete"]',
    )
    this.confirmDeleteDialog = this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByText('Confirm Delete', { exact: true }) })
    this.confirmDeleteMessage = this.confirmDeleteDialog.getByText('Are you sure you want to delete this building?')
    this.confirmDeleteYesButton = this.confirmDeleteDialog.getByRole('button', { name: 'Yes', exact: true })
    this.confirmDeleteNoButton = this.confirmDeleteDialog.getByRole('button', { name: 'No', exact: true })
    this.buildingDeletedMessage = this.page.getByRole('cell', { name: 'Building deleted successfully!' })
  }

  // The detail table puts a caption and its value in the same cell — the cell reads
  // "Name qaBld1a2b3c" — so a field is matched whole rather than by pairing two
  // elements. Parametrized by values known only at run time, so these are methods.
  buildingNameField(name: string): Locator {
    return this.page.getByRole('cell', { name: `Name ${name}`, exact: true })
  }

  propertyField(propertyName: string): Locator {
    return this.page.getByRole('cell', { name: `Property ${propertyName}`, exact: true })
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
    // Deleting rebuilds the list behind the overlay; measured in seconds on qa, so
    // the default stands until a run is seen taking minutes.
    await waitForLoadingToFinish(this.page)
  }
}
