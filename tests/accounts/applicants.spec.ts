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
import { testData } from '../../playwright-utils/test-data/applicants.data'

let applicantBuildingName = ''
let applicantUnitTypeName = ''
let applicantUnitNumber = ''
let applicantName = ''

test.describe('Applicants', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('QA-07 | User can create an applicant for a newly created unit', async ({ page }) => {
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

    await test.step(`Select the "${testData['QA-07'].property}" property on the BoardRoom`, async () => {
      await boardRoomPage.selectProperty(testData['QA-07'].property)
      await expect(boardRoomPage.propertySelector).toHaveValue(testData['QA-07'].property)
    })

    await test.step('Create the building the applicant\'s unit will belong to', async () => {
      await sideNavComponent.openBuildings()
      await buildingsPage.openNewBuildingForm()
      await expect(page).toHaveURL(/#\/Buildings\/New$/)
      const createdBuildingNames = await newBuildingPage.addBuildings(
        testData['QA-07'].building,
        testData['QA-07'].buildingCount,
      )
      applicantBuildingName = createdBuildingNames[0]
      await expect(newBuildingPage.buildingsAddedMessage(createdBuildingNames.length)).toBeVisible()
    })

    await test.step('Create the unit type the applicant\'s unit will use', async () => {
      await sideNavComponent.openUnitTypes()
      await unitTypesPage.openNewUnitTypeForm()
      await expect(page).toHaveURL(/#\/UnitTypes\/New$/)
      const createdUnitTypeNames = await newUnitTypePage.addUnitTypes(
        testData['QA-07'].unitType,
        testData['QA-07'].unitTypeCount,
      )
      applicantUnitTypeName = createdUnitTypeNames[0]
      await expect(newUnitTypePage.unitTypesAddedMessage(createdUnitTypeNames.length)).toBeVisible()
    })

    await test.step('Create the unit the applicant will be assigned to', async () => {
      await sideNavComponent.openUnits()
      await expect(unitsPage.unitListTable).toBeVisible()
      await unitsPage.openNewUnitForm()
      await expect(page).toHaveURL(/#\/Units\/New$/)
      const createdUnitNumbers = await newUnitPage.addUnits(
        testData['QA-07'].unit,
        applicantBuildingName,
        applicantUnitTypeName,
        testData['QA-07'].unitCount,
      )
      applicantUnitNumber = createdUnitNumbers[0]
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
      await expect(applicantsPage.propertySelector).toHaveValue(testData['QA-07'].property)
    })

    await test.step('Open the New Applicant form', async () => {
      await applicantsPage.openNewApplicantForm()
      await expect(page).toHaveURL(/#\/Residents\/New$/)
      await expect(newApplicantPage.heading).toBeVisible()
    })

    await test.step('Fill the form with the Ctrl+Alt+0 shortcut', async () => {
      applicantName = await newApplicantPage.generateApplicantDetails()
      await expect(newApplicantPage.firstNameInput).not.toHaveValue('')
      // The shortcut picks an available unit of its own, and it does so last and
      // asynchronously. The next step replaces that pick, so the form is only settled
      // once it has landed — typing into the box before then has the shortcut's own
      // choice overwrite what was typed, and the suggestion never appears.
      await expect(newApplicantPage.unitInput).not.toHaveValue('')
    })

    await test.step('Assign the newly created unit to the applicant', async () => {
      await newApplicantPage.assignUnit(applicantUnitNumber)
      await expect(newApplicantPage.unitInput).toHaveValue(applicantUnitNumber)
    })

    await test.step('Save the applicant and confirm its detail page', async () => {
      await newApplicantPage.save()
      await expect(page).toHaveURL(/#\/Residents\/Detail\//)
      await expect(applicantDetailPage.applicantNameButton(applicantName)).toBeVisible()
      await expect(applicantDetailPage.unitField(applicantUnitNumber)).toBeVisible()
    })
  })
})
