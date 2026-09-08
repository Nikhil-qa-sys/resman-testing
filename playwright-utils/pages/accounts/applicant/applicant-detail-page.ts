import { type Locator, type Page } from '@playwright/test'

export class ApplicantDetailPage {
  constructor(private page: Page) {}

  // The header table puts a caption and its value in the same cell — the cell reads
  // "Unit qaUz48icg" — so the field is matched whole rather than by pairing two
  // elements, the same shape the Unit and Building detail pages use. This is what
  // ties the applicant to the unit this run created rather than to the one the
  // fill-with-test-data shortcut picked for itself.
  unitField(unitNumber: string): Locator {
    return this.page.getByRole('cell', { name: `Unit ${unitNumber}`, exact: true })
  }

  // The household member control in the header, which renders the applicant's name
  // followed by the primary-contact marker the application appends. "(P)" holds here
  // because the New Applicant form checks "Main contact in unit" by default and this
  // case never clears it — a household member added later would carry a different
  // marker, so this locator is for the applicant the form created, not for any member.
  applicantNameButton(applicantName: string): Locator {
    return this.page.getByRole('button', { name: `${applicantName} (P)`, exact: true })
  }
}
