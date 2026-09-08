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
import { UnitDetailPage } from '../../playwright-utils/pages/property/unit/unit-detail-page'
import { testData } from '../../playwright-utils/test-data/units.data'

let buildingName = ''
let unitTypeName = ''
let unitToDeleteBuildingName = ''
let unitToDeleteTypeName = ''
let unitToDeleteNumber = ''

test.describe('Units', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('QA-03 | User can create a new unit for the selected property', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const boardRoomPage = new BoardRoomPage(page)
    const sideNavComponent = new SideNavComponent(page)
    const buildingsPage = new BuildingsPage(page)
    const newBuildingPage = new NewBuildingPage(page)
    const unitTypesPage = new UnitTypesPage(page)
    const newUnitTypePage = new NewUnitTypePage(page)
    const unitsPage = new UnitsPage(page)
    const newUnitPage = new NewUnitPage(page)
    
    await test.step('Log in to ResMan', async () => {
      await loginPage.signIn(process.env.TEST_USERNAME!, process.env.TEST_PASSWORD!)
      await expect(sideNavComponent.menu).toBeVisible()
    })
    await test.step(`Select the "${testData['QA-03'].property}" property on the BoardRoom`, async () => {
      await boardRoomPage.selectProperty(testData['QA-03'].property)
      await expect(boardRoomPage.propertySelector).toHaveValue(testData['QA-03'].property)
    })
    await test.step('Create the building the new unit will belong to', async () => {
      await sideNavComponent.openBuildings()
      await buildingsPage.openNewBuildingForm()
      await expect(page).toHaveURL(/#\/Buildings\/New$/)
      const createdBuildingNames = await newBuildingPage.addBuildings(
        testData['QA-03'].building,
        testData['QA-03'].buildingCount,
      )
      buildingName = createdBuildingNames[0]
      await expect(newBuildingPage.buildingsAddedMessage(createdBuildingNames.length)).toBeVisible()
    })
    await test.step('Create the unit type the new unit will use', async () => {
      await sideNavComponent.openUnitTypes()
      await unitTypesPage.openNewUnitTypeForm()
      await expect(page).toHaveURL(/#\/UnitTypes\/New$/)
      const createdUnitTypeNames = await newUnitTypePage.addUnitTypes(
        testData['QA-03'].unitType,
        testData['QA-03'].unitTypeCount,
      )
      unitTypeName = createdUnitTypeNames[0]
      await expect(newUnitTypePage.unitTypesAddedMessage(createdUnitTypeNames.length)).toBeVisible()
    })
    await test.step('Navigate to Property > Units', async () => {
      await sideNavComponent.openUnits()
      await expect(page).toHaveURL(/#\/Units$/)
      await expect(unitsPage.propertySelector).toHaveValue(testData['QA-03'].property)
    })
    await test.step('Open the New Unit form', async () => {
      await unitsPage.openNewUnitForm()
      await expect(page).toHaveURL(/#\/Units\/New$/)
      await expect(newUnitPage.propertySelector).toHaveValue(testData['QA-03'].property)
    })
    await test.step(`Create ${testData['QA-03'].unitCount} unit(s) for the new building and unit type`, async () => {
      const createdUnitNumbers = await newUnitPage.addUnits(
        testData['QA-03'].unit,
        buildingName,
        unitTypeName,
        testData['QA-03'].unitCount,
      )
      await expect(newUnitPage.unitsAddedMessage(createdUnitNumbers.length)).toBeVisible()
    })
  })

  test('QA-06 | User can delete a unit from its detail page', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const boardRoomPage = new BoardRoomPage(page)
    const sideNavComponent = new SideNavComponent(page)
    const buildingsPage = new BuildingsPage(page)
    const newBuildingPage = new NewBuildingPage(page)
    const unitTypesPage = new UnitTypesPage(page)
    const newUnitTypePage = new NewUnitTypePage(page)
    const unitsPage = new UnitsPage(page)
    const newUnitPage = new NewUnitPage(page)
    const unitDetailPage = new UnitDetailPage(page)

    await test.step('Log in to ResMan', async () => {
      await loginPage.signIn(process.env.TEST_USERNAME!, process.env.TEST_PASSWORD!)
      await expect(sideNavComponent.menu).toBeVisible()
    })

    await test.step(`Select the "${testData['QA-06'].property}" property on the BoardRoom`, async () => {
      await boardRoomPage.selectProperty(testData['QA-06'].property)
      await expect(boardRoomPage.propertySelector).toHaveValue(testData['QA-06'].property)
    })

    await test.step('Create the building the unit will belong to', async () => {
      await sideNavComponent.openBuildings()
      await buildingsPage.openNewBuildingForm()
      await expect(page).toHaveURL(/#\/Buildings\/New$/)
      const createdBuildingNames = await newBuildingPage.addBuildings(
        testData['QA-06'].building,
        testData['QA-06'].buildingCount,
      )
      unitToDeleteBuildingName = createdBuildingNames[0]
      await expect(newBuildingPage.buildingsAddedMessage(createdBuildingNames.length)).toBeVisible()
    })

    await test.step('Create the unit type the unit will use', async () => {
      await sideNavComponent.openUnitTypes()
      await unitTypesPage.openNewUnitTypeForm()
      await expect(page).toHaveURL(/#\/UnitTypes\/New$/)
      const createdUnitTypeNames = await newUnitTypePage.addUnitTypes(
        testData['QA-06'].unitType,
        testData['QA-06'].unitTypeCount,
      )
      unitToDeleteTypeName = createdUnitTypeNames[0]
      await expect(newUnitTypePage.unitTypesAddedMessage(createdUnitTypeNames.length)).toBeVisible()
    })

    await test.step('Navigate to Property > Units', async () => {
      await sideNavComponent.openUnits()
      await expect(page).toHaveURL(/#\/Units$/)
      // The list table is asserted before the property box, and both are needed. The
      // hash updates on the click, before the module has swapped, and #PropertyIDInput
      // is the same id the Unit Types module uses — so on their own those two pass
      // while the previous module is still on screen. #UnitList is what only the Units
      // dashboard has.
      await expect(unitsPage.unitListTable).toBeVisible()
      await expect(unitsPage.propertySelector).toHaveValue(testData['QA-06'].property)
    })

    await test.step('Open the New Unit form', async () => {
      await unitsPage.openNewUnitForm()
      await expect(page).toHaveURL(/#\/Units\/New$/)
      await expect(newUnitPage.addButton).toBeVisible()
    })

    await test.step('Create the unit this test will delete', async () => {
      const createdUnitNumbers = await newUnitPage.addUnits(
        testData['QA-06'].unit,
        unitToDeleteBuildingName,
        unitToDeleteTypeName,
        testData['QA-06'].unitCount,
      )
      unitToDeleteNumber = createdUnitNumbers[0]
      await expect(newUnitPage.unitsAddedMessage(createdUnitNumbers.length)).toBeVisible()
    })

    await test.step('Find the new unit by paging through the list', async () => {
      await sideNavComponent.openUnits()
      const pageWithUnit = await unitsPage.openPageWithUnit(unitToDeleteNumber)
      expect(pageWithUnit).toBeGreaterThan(0)
      await expect(unitsPage.unitRow(unitToDeleteNumber)).toBeVisible()
    })

    await test.step('Open the unit to confirm its detail page', async () => {
      await unitsPage.openUnit(unitToDeleteNumber)
      await expect(page).toHaveURL(/#\/Units\/Detail\//)
      await expect(unitDetailPage.unitNumberField(unitToDeleteNumber)).toBeVisible()
      await expect(unitDetailPage.buildingAndFloorField(unitToDeleteBuildingName, testData['QA-06'].unit.floor)).toBeVisible()
    })

    await test.step('Open the delete confirmation and dismiss it with No', async () => {
      await unitDetailPage.openDeleteConfirmation()
      await expect(unitDetailPage.confirmDeleteMessage).toBeVisible()
      await expect(unitDetailPage.confirmDeleteYesButton).toBeVisible()
      await expect(unitDetailPage.confirmDeleteNoButton).toBeVisible()
      await unitDetailPage.cancelDelete()
      await expect(unitDetailPage.confirmDeleteDialog).toBeHidden()
    })

    await test.step('Delete the unit by confirming with Yes', async () => {
      await unitDetailPage.openDeleteConfirmation()
      await expect(unitDetailPage.confirmDeleteDialog).toBeVisible()
      await unitDetailPage.confirmDelete()
      await expect(unitDetailPage.unitDeletedMessage).toBeVisible()
      await expect(page).toHaveURL(/#\/Units$/)
    })
  })
})
