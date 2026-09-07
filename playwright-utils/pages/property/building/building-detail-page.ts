import { type Locator, type Page } from '@playwright/test'
import { waitForLoadingToFinish } from '../../../helpers/loading-overlay'

export class BuildingDetailPage {
  // "Delete" under Actions is an anchor with no href, so it carries no link role and
  // is reached by its text.
  public readonly deleteLink: Locator
  // jQuery UI dialog: a real role="dialog" with a title and two real buttons.
  public readonly confirmDeleteDialog: Locator
  public readonly confirmDeleteMessage: Locator
  public readonly confirmDeleteYesButton: Locator
  public readonly confirmDeleteNoButton: Locator
  // Deleting returns to the list, so this banner renders there — but it reports the
  // outcome of this page's action, so this page owns it.
  public readonly buildingDeletedMessage: Locator

  constructor(private page: Page) {
    this.deleteLink = this.page.getByText('Delete', { exact: true })
    this.confirmDeleteDialog = this.page.getByRole('dialog')
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
