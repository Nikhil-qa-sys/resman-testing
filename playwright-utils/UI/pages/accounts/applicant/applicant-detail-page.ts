import { type Locator, type Page } from '@playwright/test'
import { waitForLoadingToFinish } from '../../../helpers/loading-overlay'

// The applicant's detail page and the three leasing-workflow pages it leads to —
// Approve, Sign Lease and Move-In. They are kept together because they are one
// journey over one record and because the three action pages are the same form:
// a ul#Residents selection list, a date, notes, and a submit that lands back here.
// Each page's methods stay separate, so a method still only touches the page it
// belongs to and every navigation ends one and starts the next.
export class ApplicantDetailPage {
  // --- The detail page's header -------------------------------------------------
  //
  // The heading above the Leasing Workflow names what the record currently is, and
  // the move-in is what flips it from Applicant to Resident. Two locators rather
  // than one asserted for text: the element carries no id and nothing but a styling
  // class, so its accessible name is the only handle — and a name is what getByRole
  // matches on.
  public readonly applicantHeading: Locator
  public readonly residentHeading: Locator

  // --- Leasing Workflow links ----------------------------------------------------
  //
  // The workflow renders every state and action as a list item and shows the ones
  // that apply, hiding the rest with display:none. Hidden items are out of the
  // accessibility tree, so a role locator matches only what the record is actually
  // offering — which is why these need no scoping to the workflow list, and why the
  // status locators below cannot collide with the hidden variants that carry the
  // same words.
  public readonly approveLink: Locator
  public readonly signLeaseLink: Locator
  public readonly moveInLink: Locator

  // --- Leasing Workflow status items ---------------------------------------------
  public readonly approvedStatus: Locator
  public readonly leaseSignedStatus: Locator
  public readonly movedInStatus: Locator
  // The "(Change)" control the approval item gains once the applicant is approved.
  // An anchor with no href, so it has no link role and no accessible name — the
  // authored id is the locator.
  public readonly changeApprovalLink: Locator
  // The tick the workflow puts beside "Lease Signed". Anchored on the authored data
  // attribute rather than the Font Awesome class next to it, and composed from the
  // item so it cannot resolve a tick belonging to another state.
  public readonly leaseSignedCheckmark: Locator

  // --- Move-In prerequisites -----------------------------------------------------
  //
  // The Move-In page lists the conditions the move-in has to clear, each with its own
  // Override. The section is rendered only where the property has prerequisites
  // configured: rc shows one ("Has zero balance"), qa renders no section at all — so
  // an absent section is a normal page, not a missing one, and the count of override
  // buttons is what the caller acts on.
  //
  // The section's authored id is the anchor: its heading is the only other handle and
  // it reads "Move In Prerequisites" here against "Move-In Prerequisites" in the
  // workflow tooltip, which is too close to tell apart safely.
  public readonly moveInPrerequisitesSection: Locator
  // Plural: one per outstanding prerequisite, and they are consumed one at a time.
  public readonly moveInPrerequisiteOverrideButtons: Locator
  public readonly overrideDialog: Locator
  // The dialog's caption sits in a sibling table cell rather than a <label for>, so
  // the textarea has no accessible name and the authored id is the locator.
  public readonly overrideReasonInput: Locator
  public readonly overrideConfirmButton: Locator

  // --- The Approve / Sign Lease / Move-In pages ----------------------------------
  //
  // All three share one selection widget, ul#Residents, holding an li per household
  // member. Only the heading above it differs: "Applicants (Screening Results)" when
  // approving, "Residents" when signing the lease and when moving in.
  public readonly screeningResultsHeading: Locator
  public readonly residentsHeading: Locator
  public readonly approveButton: Locator
  public readonly signLeaseButton: Locator
  // Exact, so it cannot resolve the "Move In & Post Transaction" button beside it.
  public readonly moveInButton: Locator
  public readonly prorateChargesConfirmButton: Locator

  constructor(private page: Page) {
    this.applicantHeading = this.page.getByRole('heading', { name: 'Applicant', exact: true })
    this.residentHeading = this.page.getByRole('heading', { name: 'Resident', exact: true })

    this.approveLink = this.page.getByRole('link', { name: 'Approve', exact: true })
    this.signLeaseLink = this.page.getByRole('link', { name: 'Sign Lease', exact: true })
    this.moveInLink = this.page.getByRole('link', { name: 'Move-In', exact: true })

    this.approvedStatus = this.page.getByRole('listitem').filter({ hasText: 'Approved' })
    this.leaseSignedStatus = this.page.getByRole('listitem').filter({ hasText: 'Lease Signed' })
    this.movedInStatus = this.page.getByRole('listitem').filter({ hasText: 'Moved In' })
    this.changeApprovalLink = this.page.locator('#ActionChangeApprovalLink')
    this.leaseSignedCheckmark = this.leaseSignedStatus.locator('[data-prerequisite-type]')

    this.moveInPrerequisitesSection = this.page.locator('#ActionPrerequisitesReview')
    this.moveInPrerequisiteOverrideButtons = this.moveInPrerequisitesSection.getByRole('button', {
      name: 'Override',
      exact: true,
    })
    this.overrideDialog = this.page.getByRole('dialog', { name: 'Override' })
    this.overrideReasonInput = this.page.locator('#ReasonForOverride')
    this.overrideConfirmButton = this.overrideDialog.getByRole('button', { name: 'OK', exact: true })

    this.screeningResultsHeading = this.page.getByRole('heading', { name: 'Applicants (Screening Results)' })
    this.residentsHeading = this.page.getByRole('heading', { name: 'Residents', exact: true })
    this.approveButton = this.page.getByRole('button', { name: 'Approve', exact: true })
    this.signLeaseButton = this.page.getByRole('button', { name: 'Sign Lease', exact: true })
    this.moveInButton = this.page.getByRole('button', { name: 'Move-In', exact: true })
    this.prorateChargesConfirmButton = this.page
      .getByRole('dialog', { name: 'Prorate Charges' })
      .getByRole('button', { name: 'Yes', exact: true })
  }

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

  // One name in the selection list the Approve, Sign Lease and Move-In pages share.
  // The li carries the name as its own text and the person's ids as hidden inputs,
  // which contribute nothing to it, so the name is all there is to match on.
  //
  // Anchored rather than matched as a substring, because a household holds more than
  // one member — observed on qa — and a plain hasText would resolve two rows for a
  // name that is the start of another ("Ann Lee" against "Ann Leeson"), which fails
  // the click on strict mode. The names this form generates are alphanumeric, so they
  // carry no regex metacharacters, the same assumption NewUnitPage.unitTypeSuggestion
  // makes.
  applicantOption(applicantName: string): Locator {
    return this.page.locator('#Residents li', { hasText: this.wholeName(applicantName) })
  }

  // The same option, narrowed to the selected state. ui-selected is the jQuery UI
  // selectable widget's own state class, not styling: the li carries no
  // aria-selected, no authored attribute and no text that changes with the state, so
  // this class is the only thing in the DOM that says whether the name is picked.
  selectedApplicantOption(applicantName: string): Locator {
    return this.page.locator('#Residents li.ui-selected', { hasText: this.wholeName(applicantName) })
  }

  // The li's text is the name on its own, so it is matched end to end. The optional
  // surrounding whitespace covers the markup's own indentation around the name.
  private wholeName(applicantName: string): RegExp {
    return new RegExp(`^\\s*${applicantName}\\s*$`)
  }

  async openApprove() {
    await this.approveLink.click()
    await waitForLoadingToFinish(this.page)
  }

  async openSignLease() {
    await this.signLeaseLink.click()
    await waitForLoadingToFinish(this.page)
  }

  async openMoveIn() {
    await this.moveInLink.click()
    await waitForLoadingToFinish(this.page)
  }

  // Picking the name the action applies to, on whichever of the three pages is on
  // screen. It is driven from the state rather than clicked blindly, because the
  // selection is a toggle: a list holding one applicant arrives with that applicant
  // already selected, and clicking there deselects the only name, leaving the form
  // with nothing to submit. Measured on qa — the single applicant renders as
  // "ui-selectee ui-selected" and one click drops the ui-selected. A household with
  // more than one member arrives with none selected, and this clicks the one it was
  // asked for.
  async selectApplicant(applicantName: string) {
    // count() does not auto-wait, so the option is waited for before it is read.
    await this.applicantOption(applicantName).waitFor()

    if ((await this.selectedApplicantOption(applicantName).count()) === 0) {
      await this.applicantOption(applicantName).click()
    }
  }

  // Clears every outstanding move-in prerequisite by overriding it with the reason
  // given, and leaves a page with none of them alone. The count is read without a
  // guard on purpose: no section is a real answer here, not a page that has yet to
  // render — the caller has already waited for the Move-In form itself — and the
  // count is re-read as a locator on each pass, since overriding one removes its
  // button and the next outstanding one becomes the first.
  //
  // The reason is cleared and then typed, not filled. Typed, because the dialog's OK
  // button ships disabled and is enabled by the keystrokes, so a value set without
  // them leaves nothing to click. Cleared first, because pressSequentially appends and
  // the dialog reuses one textarea across prerequisites — without this the second
  // override would carry the first one's reason as well.
  async overrideMoveInPrerequisites(reason: string) {
    const outstandingPrerequisites = await this.moveInPrerequisiteOverrideButtons.count()

    for (let index = 0; index < outstandingPrerequisites; index++) {
      await this.moveInPrerequisiteOverrideButtons.first().click()
      await this.overrideReasonInput.fill('')
      await this.overrideReasonInput.pressSequentially(reason)
      await this.overrideConfirmButton.click()
      await this.overrideDialog.waitFor({ state: 'hidden' })
    }
  }

  // The three submits below each end their page and land back on the detail page,
  // which is the navigation boundary a method is allowed to be a single click for —
  // the same shape as NewApplicantPage.save().

  async approve() {
    await this.approveButton.click()
    await waitForLoadingToFinish(this.page)
  }

  async signLease() {
    await this.signLeaseButton.click()
    await waitForLoadingToFinish(this.page)
  }

  // The move-in always raises the Prorate Charges confirmation for a unit this suite
  // has just created: the unit type's recurring charges start after the move-in date
  // the form is restricted to, and that mismatch is what the dialog reports. Observed
  // on every run of this flow on all three environments, so it is confirmed
  // unconditionally rather than branched on — a branch here would pass a run where the
  // move-in silently did not happen.
  async moveIn() {
    await this.moveInButton.click()
    await this.prorateChargesConfirmButton.click()
    await waitForLoadingToFinish(this.page)
  }
}
