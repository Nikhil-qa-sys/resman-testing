import { type Locator, type Page } from '@playwright/test'

export class NewApplicantPage {
  public readonly heading: Locator
  // The Unit autocomplete has no accessible name — its "Unit*" caption sits in a
  // sibling table cell, not a <label for> — so the authored id is the locator. The
  // getBy* ladder was checked first: no role+name, no label, and the only text near
  // it is the caption cell, which is not the input.
  public readonly unitInput: Locator
  // Read back rather than filled: the fields below are populated by the application
  // shortcut, and their values are what identify the applicant it generated.
  public readonly firstNameInput: Locator
  public readonly lastNameInput: Locator
  public readonly saveButton: Locator
  // The application's dirty-form guard. Saving routes to the new applicant's detail
  // page, and on some environments that route is intercepted by this confirmation
  // even though the save itself succeeded — see save() below.
  public readonly unsavedChangesDialog: Locator
  public readonly leavePageButton: Locator

  constructor(private page: Page) {
    this.heading = this.page.getByRole('heading', { name: 'New Applicant', exact: true })
    this.unitInput = this.page.locator('#Lease_UnitNumber')
    this.firstNameInput = this.page.getByRole('textbox', { name: 'First name' })
    this.lastNameInput = this.page.getByRole('textbox', { name: 'Last name' })
    this.saveButton = this.page.getByRole('button', { name: 'Save', exact: true })
    this.unsavedChangesDialog = this.page.getByRole('dialog', { name: 'Unsaved Changes' })
    this.leavePageButton = this.unsavedChangesDialog.getByRole('button', { name: 'Leave page', exact: true })
  }

  // The unit autocomplete is the same jQuery UI widget the New Unit form uses, so a
  // suggestion is a menuitem named by the unit number alone.
  unitSuggestion(unitNumber: string): Locator {
    return this.page.getByRole('menuitem', { name: unitNumber, exact: true })
  }

  // Ctrl+Alt+0 is the application's own fill-with-test-data shortcut: it completes
  // every required field on this form — name, prospect and lease information — and
  // then picks an available unit of its own. Returns the applicant name it generated,
  // which is what identifies the record afterwards.
  //
  // Measured on qa: the personal fields are set inside the keypress itself, but the
  // unit is not. The shortcut fires /Reports/GetAvailableUnitsJson, and only once that
  // answers does it write a unit into the box and run the same cascade a manual pick
  // does. The response is waited on here so the name is read from a form the shortcut
  // has actually filled rather than from one it never touched — a keypress that did
  // not register would otherwise return two empty strings.
  //
  // It is deliberately not the signal that the shortcut has *finished*: the unit lands
  // later still, and the caller replaces it, so the caller waits for that pick to
  // appear before overwriting it. Waiting on the tail of the cascade instead does not
  // work — the post it ends with also fires earlier in the run, so a wait armed here
  // resolves on the wrong one and the shortcut's own unit then overwrites what the
  // next step types.
  async generateApplicantDetails(): Promise<string> {
    const availableUnitsLoaded = this.page.waitForResponse(
      (response) => response.url().includes('Reports/GetAvailableUnitsJson') && response.status() === 200,
    )
    await this.page.keyboard.press('Control+Alt+0')
    await availableUnitsLoaded

    // inputValue() does not auto-wait, so the reads are gated. The two fields render
    // together with the rest of the form, so the first being present says both are.
    await this.firstNameInput.waitFor()

    const firstName = await this.firstNameInput.inputValue()
    const lastName = await this.lastNameInput.inputValue()

    return `${firstName} ${lastName}`
  }

  // Replaces the unit the shortcut chose with the one this run created. fill('') is
  // what clears it — pressSequentially appends, and the keystrokes are what open the
  // suggestions, which fill() alone never does.
  //
  // Two waits, because one of them cannot be trusted alone. The availability check
  // carries the unit number in its query string — encoded, since that is how it appears
  // there — so it is unambiguously the answer to
  // *this* selection and nothing else; it is what proves the pick was accepted. The
  // misc-charges post is the tail of the cascade the pick sets off — rent and deposits
  // are recalculated from the unit's type — and saving before it lands submits the
  // previous unit's figures, but on its own it cannot be told apart from the same post
  // fired earlier in the run. Both are armed before the click, since the first of them
  // answers within the click on a fast route.
  //
  // The #Loading overlay is raised by all of this too, so waitForLoadingToFinish works
  // here — but it clears while the tail of the cascade is still in flight, and it costs
  // the appearance bound whenever the swap is already over. The responses are the exact
  // end of the work being waited on.
  async assignUnit(unitNumber: string) {
    await this.unitInput.fill('')
    await this.unitInput.pressSequentially(unitNumber)

    const unitAccepted = this.page.waitForResponse(
      (response) =>
        response.url().includes('Residents/CheckUnitAvailability') &&
        response.url().includes(`unitNumber=${encodeURIComponent(unitNumber)}`) &&
        response.status() === 200,
    )
    const chargesRecalculated = this.page.waitForResponse(
      (response) => response.url().includes('Residents/GetNewResidentMiscCharges') && response.status() === 200,
    )
    await this.unitSuggestion(unitNumber).click()
    await unitAccepted
    await chargesRecalculated
  }

  // Saving creates the applicant and lands on its detail page, so this ends the form
  // and the detail page takes over — the navigation boundary an action method is
  // otherwise not allowed to be a single click for.
  //
  // The detail response is waited on because nothing else here is a real gate. Measured
  // on qa: the click returns in 1ms, the POST to Residents/New answers at 2.8s, the
  // detail page is then fetched and answers at 4.6s, and it renders at 6.3s. The hash
  // is rewritten to the detail route as soon as the POST returns, while the form is
  // still on screen, so a spec asserting toHaveURL(/Residents\/Detail/) passes against
  // the form it just submitted and leaves the following assertion to carry the whole
  // wait alone. That is what failed on rc under three parallel workers.
  //
  // Residents/Detail is the detail page's own load and cannot be confused with the
  // Residents/New POST that precedes it.
  //
  // The guard below is the second thing that can happen to that route. Measured on rc:
  // the POST to Residents/New answers 200 and the applicant is created, and the app
  // then raises its "Unsaved Changes" confirmation on the way to the detail page —
  // the form still counts as dirty — so the detail page is never fetched and the wait
  // above times out on a save that in fact worked. qa never raises it. This is the
  // rare genuinely optional dialog, so it is raced against the detail load rather than
  // waited for: whichever happens first decides, and the environment that does not
  // raise it pays nothing.
  //
  // Its button is dispatched rather than clicked because it cannot be clicked at all:
  // the application leaves its loading spinner up while the route is paused, and
  // #LoadingImage is a 151px box at z-index 1011 sitting over the middle of the
  // dialog's button row, above the dialog's own 1002 — measured on rc. A real click,
  // forced or not, lands on the spinner, so the event is sent straight to the button.
  // Dismissing it clears the spinner and the detail page renders.
  async save() {
    const detailLoaded = this.page.waitForResponse(
      (response) => response.url().includes('Residents/Detail') && response.status() === 200,
    )
    // Rejects on the environments that never raise the guard, which is the answer
    // "no dialog" rather than a failure — the detail load is what decides there.
    const guardShown = this.unsavedChangesDialog
      .waitFor({ state: 'visible' })
      .then(() => 'guard' as const)
      .catch(() => 'no-guard' as const)

    await this.saveButton.click()

    const firstOutcome = await Promise.race([detailLoaded.then(() => 'detail' as const), guardShown])
    if (firstOutcome === 'guard') {
      await this.leavePageButton.dispatchEvent('click')
    }

    await detailLoaded
  }
}
