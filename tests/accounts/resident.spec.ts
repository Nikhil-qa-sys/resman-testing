import { expect, test } from '@playwright/test'
import { LoginPage } from '../../playwright-utils/pages/auth/login-page'
import { BoardRoomPage } from '../../playwright-utils/pages/boardroom/board-room-page'
import { SideNavComponent } from '../../playwright-utils/pages/navigation/side-nav-component'
import { BuildingsPage } from '../../playwright-utils/pages/property/building/buildings-page'
import { NewBuildingPage } from '../../playwright-utils/pages/property/building/new-building-page'
import { UnitTypesPage } from '../../playwright-utils/pages/property/unit-type/unit-types-page'
import { NewUnitTypePage } from '../../playwright-utils/pages/property/unit-type/new-unit-type-page'
import { UnitsPage } from '../../playwright-utils/pages/property/unit/units-page'
import { NewUnitPage } from '../../playwright-utils/pages/property/unit/new-unit-page'
import { ApplicantsPage } from '../../playwright-utils/pages/accounts/applicant/applicants-page'
import { NewApplicantPage } from '../../playwright-utils/pages/accounts/applicant/new-applicant-page'
import { ApplicantDetailPage } from '../../playwright-utils/pages/accounts/applicant/applicant-detail-page'
import { testData } from '../../playwright-utils/test-data/residents.data'

let residentBuildingName = ''
let residentUnitTypeName = ''
let residentUnitNumber = ''
let residentName = ''

test.describe('Residents', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('QA-08 | User can turn an applicant into a resident by approving, signing the lease and moving in', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page)
    const boardRoomPage = new BoardRoomPage(page)
    const sideNavComponent = new SideNavComponent(page)
    const buildingsPage = new BuildingsPage(page)
    const newBuildingPage = new NewBuildingPage(page)
    const unitTypesPage = new UnitTypesPage(page)
    const newUnitTypePage = new NewUnitTypePage(page)
    const unitsPage = new UnitsPage(page)
    const newUnitPage = new NewUnitPage(page)
    const applicantsPage = new ApplicantsPage(page)
    const newApplicantPage = new NewApplicantPage(page)
    const applicantDetailPage = new ApplicantDetailPage(page)

    await test.step('Log in to ResMan', async () => {
      await loginPage.signIn(process.env.TEST_USERNAME!, process.env.TEST_PASSWORD!)
      await expect(sideNavComponent.menu).toBeVisible()
    })

    await test.step(`Select the "${testData['QA-08'].property}" property on the BoardRoom`, async () => {
      await boardRoomPage.selectProperty(testData['QA-08'].property)
      await expect(boardRoomPage.propertySelector).toHaveValue(testData['QA-08'].property)
    })

    await test.step("Create the building the resident's unit will belong to", async () => {
      await sideNavComponent.openBuildings()
      await buildingsPage.openNewBuildingForm()
      await expect(page).toHaveURL(/#\/Buildings\/New$/)
      const createdBuildingNames = await newBuildingPage.addBuildings(
        testData['QA-08'].building,
        testData['QA-08'].buildingCount,
      )
      residentBuildingName = createdBuildingNames[0]
      await expect(newBuildingPage.buildingsAddedMessage(createdBuildingNames.length)).toBeVisible()
    })

    await test.step("Create the unit type the resident's unit will use", async () => {
      await sideNavComponent.openUnitTypes()
      await unitTypesPage.openNewUnitTypeForm()
      await expect(page).toHaveURL(/#\/UnitTypes\/New$/)
      const createdUnitTypeNames = await newUnitTypePage.addUnitTypes(
        testData['QA-08'].unitType,
        testData['QA-08'].unitTypeCount,
      )
      residentUnitTypeName = createdUnitTypeNames[0]
      await expect(newUnitTypePage.unitTypesAddedMessage(createdUnitTypeNames.length)).toBeVisible()
    })

    await test.step('Create the unit the resident will move into', async () => {
      await sideNavComponent.openUnits()
      await expect(unitsPage.unitListTable).toBeVisible()
      await unitsPage.openNewUnitForm()
      await expect(page).toHaveURL(/#\/Units\/New$/)
      const createdUnitNumbers = await newUnitPage.addUnits(
        testData['QA-08'].unit,
        residentBuildingName,
        residentUnitTypeName,
        testData['QA-08'].unitCount,
      )
      residentUnitNumber = createdUnitNumbers[0]
      await expect(newUnitPage.unitsAddedMessage(createdUnitNumbers.length)).toBeVisible()
    })

    await test.step('Navigate to Accounts > Applicants', async () => {
      await sideNavComponent.openApplicants()
      await expect(page).toHaveURL(/#\/Applicants$/)
      // The list table is asserted before the property box, and both are needed. The
      // hash updates on the click, before the module has swapped, and this module's
      // property box is #PropertyOrGroupIDInput — the same id the BoardRoom uses — so
      // on their own those two pass while the previous module is still on screen.
      // #ResidentsTableContainer is what only the Applicants dashboard has.
      await expect(applicantsPage.applicantListTable).toBeVisible()
      await expect(applicantsPage.propertySelector).toHaveValue(testData['QA-08'].property)
    })

    await test.step('Open the New Applicant form', async () => {
      await applicantsPage.openNewApplicantForm()
      await expect(page).toHaveURL(/#\/Residents\/New$/)
      await expect(newApplicantPage.heading).toBeVisible()
    })

    await test.step('Fill the form with the Ctrl+Alt+0 shortcut', async () => {
      residentName = await newApplicantPage.generateApplicantDetails()
      await expect(newApplicantPage.firstNameInput).not.toHaveValue('')
      // The shortcut picks an available unit of its own, and it does so last and
      // asynchronously. The next step replaces that pick, so the form is only settled
      // once it has landed — typing into the box before then has the shortcut's own
      // choice overwrite what was typed, and the suggestion never appears.
      await expect(newApplicantPage.unitInput).not.toHaveValue('')
    })

    await test.step('Assign the newly created unit to the applicant', async () => {
      await newApplicantPage.assignUnit(residentUnitNumber)
      await expect(newApplicantPage.unitInput).toHaveValue(residentUnitNumber)
    })

    await test.step('Save the applicant and confirm its detail page', async () => {
      await newApplicantPage.save()
      await expect(page).toHaveURL(/#\/Residents\/Detail\//)
      await expect(applicantDetailPage.applicantNameButton(residentName)).toBeVisible()
      await expect(applicantDetailPage.unitField(residentUnitNumber)).toBeVisible()
      await expect(applicantDetailPage.applicantHeading).toBeVisible()
    })

    await test.step('Open the Approve Applicant page and select the applicant', async () => {
      await applicantDetailPage.openApprove()
      await expect(page).toHaveURL(/#\/Residents\/Approve/)
      await expect(applicantDetailPage.screeningResultsHeading).toBeVisible()
      await applicantDetailPage.selectApplicant(residentName)
      await expect(applicantDetailPage.selectedApplicantOption(residentName)).toBeVisible()
    })

    await test.step('Approve the applicant', async () => {
      await applicantDetailPage.approve()
      await expect(page).toHaveURL(/#\/Residents\/Detail\//)
      await expect(applicantDetailPage.approvedStatus).toBeVisible()
      await expect(applicantDetailPage.changeApprovalLink).toBeVisible()
      await expect(applicantDetailPage.approveLink).toBeHidden()
    })

    await test.step('Open the Sign Lease page and select the resident', async () => {
      await applicantDetailPage.openSignLease()
      await expect(page).toHaveURL(/#\/Residents\/SignLease/)
      await expect(applicantDetailPage.residentsHeading).toBeVisible()
      await applicantDetailPage.selectApplicant(residentName)
      await expect(applicantDetailPage.selectedApplicantOption(residentName)).toBeVisible()
    })

    await test.step('Sign the lease', async () => {
      await applicantDetailPage.signLease()
      await expect(page).toHaveURL(/#\/Residents\/Detail\//)
      await expect(applicantDetailPage.leaseSignedStatus).toBeVisible()
      await expect(applicantDetailPage.leaseSignedCheckmark).toBeVisible()
    })

    await test.step('Open the Move-In page and select the resident', async () => {
      await applicantDetailPage.openMoveIn()
      await expect(page).toHaveURL(/#\/Residents\/MoveIn/)
      await expect(applicantDetailPage.residentsHeading).toBeVisible()
      await applicantDetailPage.selectApplicant(residentName)
      await expect(applicantDetailPage.selectedApplicantOption(residentName)).toBeVisible()
    })

    await test.step('Clear any outstanding move-in prerequisite', async () => {
      // Whether there is anything to clear is a property setting, not a step the user
      // can skip: rc configures one prerequisite and renders an Override beside it,
      // qa configures none and renders no section at all. Either way the move-in is
      // only offered once nothing is outstanding, which is what both assertions say.
      await applicantDetailPage.overrideMoveInPrerequisites(testData['QA-08'].moveInOverrideReason)
      await expect(applicantDetailPage.moveInPrerequisiteOverrideButtons).toHaveCount(0)
      await expect(applicantDetailPage.moveInButton).toBeEnabled()
    })

    await test.step('Move the resident in', async () => {
      await applicantDetailPage.moveIn()
      await expect(page).toHaveURL(/#\/Residents\/Detail\//)
      await expect(applicantDetailPage.movedInStatus).toBeVisible()
      // The record is a resident from here: the heading over the Leasing Workflow is
      // what the application flips, so both directions are asserted.
      await expect(applicantDetailPage.residentHeading).toBeVisible()
      await expect(applicantDetailPage.applicantHeading).toBeHidden()
    })
  })
})
