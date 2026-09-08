import { type Locator, type Page } from '@playwright/test'

export class ApplicantsPage {
  // The module's own property box, fed by the BoardRoom selection. Unlike the
  // Property modules — which use #PropertyIDInput — this one carries the same
  // authored id as the BoardRoom's own selector, so it proves nothing on its own
  // about which module is on screen. applicantListTable is what does.
  public readonly propertySelector: Locator
  // Lives in the module's own sub-menu above the list, not in the side nav.
  public readonly newApplicantLink: Locator
  // The list table carries no id of its own; the element wrapping it does. It is
  // rendered only by this module, so it is the marker that the Applicants
  // dashboard — and not the module the click navigated away from — is on screen.
  public readonly applicantListTable: Locator

  constructor(private page: Page) {
    this.propertySelector = this.page.locator('#PropertyOrGroupIDInput')
    this.newApplicantLink = this.page.getByRole('link', { name: 'New Applicant', exact: true })
    this.applicantListTable = this.page.locator('#ResidentsTableContainer')
  }

  async openNewApplicantForm() {
    await this.newApplicantLink.click()
  }
}
