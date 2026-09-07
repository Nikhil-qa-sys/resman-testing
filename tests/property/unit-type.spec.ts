import { expect, test } from '@playwright/test'
import { LoginPage } from '../../playwright-utils/pages/auth/login-page'
import { BoardRoomPage } from '../../playwright-utils/pages/boardroom/board-room-page'
import { SideNavComponent } from '../../playwright-utils/pages/navigation/side-nav-component'
import { UnitTypesPage } from '../../playwright-utils/pages/property/unit-type/unit-types-page'
import { NewUnitTypePage } from '../../playwright-utils/pages/property/unit-type/new-unit-type-page'
import { UnitTypeDetailPage } from '../../playwright-utils/pages/property/unit-type/unit-type-detail-page'
import { testData } from '../../playwright-utils/test-data/unit-types.data'

let unitTypeToDeleteName = ''

test.describe('Unit Types', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('QA-02 | User can create a new unit type for the selected property', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const boardRoomPage = new BoardRoomPage(page)
    const sideNavComponent = new SideNavComponent(page)
    const unitTypesPage = new UnitTypesPage(page)
    const newUnitTypePage = new NewUnitTypePage(page)

    await test.step('Log in to ResMan', async () => {
      await loginPage.signIn(process.env.TEST_USERNAME!, process.env.TEST_PASSWORD!)
      await expect(sideNavComponent.menu).toBeVisible()
    })

    await test.step(`Select the "${testData['QA-02'].property}" property on the BoardRoom`, async () => {
      await boardRoomPage.selectProperty(testData['QA-02'].property)
      await expect(boardRoomPage.propertySelector).toHaveValue(testData['QA-02'].property)
    })

    await test.step('Navigate to Property > Unit Types', async () => {
      await sideNavComponent.openUnitTypes()
      await expect(page).toHaveURL(/#\/UnitTypes$/)
      await expect(unitTypesPage.propertySelector).toHaveValue(testData['QA-02'].property)
    })

    await test.step('Open the New Unit Type form', async () => {
      await unitTypesPage.openNewUnitTypeForm()
      await expect(page).toHaveURL(/#\/UnitTypes\/New$/)
      await expect(newUnitTypePage.propertySelector).toHaveValue(testData['QA-02'].property)
    })

    await test.step('Create a new unit type', async () => {
      const createdUnitTypeNames = await newUnitTypePage.addUnitTypes(
        testData['QA-02'].unitType,
        testData['QA-02'].unitTypeCount,
      )
      await expect(newUnitTypePage.unitTypesAddedMessage(createdUnitTypeNames.length)).toBeVisible()
    })
  })

  test('QA-05 | User can delete a unit type from its detail page', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const boardRoomPage = new BoardRoomPage(page)
    const sideNavComponent = new SideNavComponent(page)
    const unitTypesPage = new UnitTypesPage(page)
    const newUnitTypePage = new NewUnitTypePage(page)
    const unitTypeDetailPage = new UnitTypeDetailPage(page)

    await test.step('Log in to ResMan', async () => {
      await loginPage.signIn(process.env.TEST_USERNAME!, process.env.TEST_PASSWORD!)
      await expect(sideNavComponent.menu).toBeVisible()
    })

    await test.step(`Select the "${testData['QA-05'].property}" property on the BoardRoom`, async () => {
      await boardRoomPage.selectProperty(testData['QA-05'].property)
      await expect(boardRoomPage.propertySelector).toHaveValue(testData['QA-05'].property)
    })

    await test.step('Navigate to Property > Unit Types', async () => {
      await sideNavComponent.openUnitTypes()
      await expect(page).toHaveURL(/#\/UnitTypes$/)
      await expect(unitTypesPage.unitTypeListTable).toBeVisible()
    })

    await test.step('Open the New Unit Type form', async () => {
      await unitTypesPage.openNewUnitTypeForm()
      await expect(page).toHaveURL(/#\/UnitTypes\/New$/)
      await expect(newUnitTypePage.addButton).toBeVisible()
    })

    await test.step('Create the unit type this test will delete', async () => {
      const createdUnitTypeNames = await newUnitTypePage.addUnitTypes(
        testData['QA-05'].unitType,
        testData['QA-05'].unitTypeCount,
      )
      unitTypeToDeleteName = createdUnitTypeNames[0]
      await expect(newUnitTypePage.unitTypesAddedMessage(createdUnitTypeNames.length)).toBeVisible()
    })

    await test.step('Find the new unit type by paging through the list', async () => {
      await sideNavComponent.openUnitTypes()
      const pageWithUnitType = await unitTypesPage.openPageWithUnitType(unitTypeToDeleteName)
      expect(pageWithUnitType).toBeGreaterThan(0)
      await expect(unitTypesPage.unitTypeRow(unitTypeToDeleteName)).toBeVisible()
    })

    await test.step('Open the unit type to confirm its detail page', async () => {
      await unitTypesPage.openUnitType(unitTypeToDeleteName)
      await expect(page).toHaveURL(/#\/UnitTypes\/Detail\//)
      await expect(unitTypeDetailPage.unitTypeHeading(unitTypeToDeleteName)).toBeVisible()
    })

    await test.step('Open the delete confirmation and dismiss it with No', async () => {
      await unitTypeDetailPage.openDeleteConfirmation()
      await expect(unitTypeDetailPage.confirmDeleteMessage).toBeVisible()
      await expect(unitTypeDetailPage.confirmDeleteYesButton).toBeVisible()
      await expect(unitTypeDetailPage.confirmDeleteNoButton).toBeVisible()
      await unitTypeDetailPage.cancelDelete()
      await expect(unitTypeDetailPage.confirmDeleteDialog).toBeHidden()
    })

    await test.step('Delete the unit type by confirming with Yes', async () => {
      await unitTypeDetailPage.openDeleteConfirmation()
      await expect(unitTypeDetailPage.confirmDeleteDialog).toBeVisible()
      await unitTypeDetailPage.confirmDelete()
      await expect(unitTypeDetailPage.unitTypeDeletedMessage).toBeVisible()
      await expect(page).toHaveURL(/#\/UnitTypes$/)
    })
  })
})
