import { expect, test } from '@playwright/test'
import { LoginPage } from '../../playwright-utils/pages/auth/login-page'
import { BoardRoomPage } from '../../playwright-utils/pages/boardroom/board-room-page'
import { SideNavComponent } from '../../playwright-utils/pages/navigation/side-nav-component'
import { BuildingsPage } from '../../playwright-utils/pages/property/building/buildings-page'
import { NewBuildingPage } from '../../playwright-utils/pages/property/building/new-building-page'
import { BuildingDetailPage } from '../../playwright-utils/pages/property/building/building-detail-page'
import { testData } from '../../playwright-utils/test-data/buildings.data'

let buildingName = ''
let buildingToDeleteName = ''

test.describe('Buildings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('QA-01 | User can create a new building for the selected property', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const boardRoomPage = new BoardRoomPage(page)
    const sideNavComponent = new SideNavComponent(page)
    const buildingsPage = new BuildingsPage(page)
    const newBuildingPage = new NewBuildingPage(page)

    await test.step('Log in to ResMan', async () => {
      await loginPage.signIn(process.env.TEST_USERNAME!, process.env.TEST_PASSWORD!)
      await expect(sideNavComponent.menu).toBeVisible()
    })

    await test.step(`Select the "${testData['QA-01'].property}" property on the BoardRoom`, async () => {
      await boardRoomPage.selectProperty(testData['QA-01'].property)
      await expect(boardRoomPage.propertySelector).toHaveValue(testData['QA-01'].property)
    })

    await test.step('Navigate to Property > Buildings', async () => {
      await sideNavComponent.openBuildings()
      await expect(page).toHaveURL(/#\/Buildings$/)
    })


    await test.step('Create a new building', async () => {
      await buildingsPage.openNewBuildingForm()
      await expect(page).toHaveURL(/#\/Buildings\/New$/)
      const createdBuildingNames = await newBuildingPage.addBuildings(
        testData['QA-01'].building,
        testData['QA-01'].buildingCount,
      )
      buildingName = createdBuildingNames[0]
      await expect(newBuildingPage.buildingsAddedMessage(createdBuildingNames.length)).toBeVisible()
    })

    await test.step('Confirm the new building is listed for the property', async () => {
      await sideNavComponent.openBuildings()
      await buildingsPage.showAllBuildings()
      await expect(buildingsPage.buildingRow(buildingName)).toBeVisible()
    })
  })

  test('QA-04 | User can delete a building from its detail page', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const boardRoomPage = new BoardRoomPage(page)
    const sideNavComponent = new SideNavComponent(page)
    const buildingsPage = new BuildingsPage(page)
    const newBuildingPage = new NewBuildingPage(page)
    const buildingDetailPage = new BuildingDetailPage(page)

    await test.step('Log in to ResMan', async () => {
      await loginPage.signIn(process.env.TEST_USERNAME!, process.env.TEST_PASSWORD!)
      await expect(sideNavComponent.menu).toBeVisible()
    })

    await test.step(`Select the "${testData['QA-04'].property}" property on the BoardRoom`, async () => {
      await boardRoomPage.selectProperty(testData['QA-04'].property)
      await expect(boardRoomPage.propertySelector).toHaveValue(testData['QA-04'].property)
    })

    await test.step('Navigate to Property > Buildings', async () => {
      await sideNavComponent.openBuildings()
      await expect(page).toHaveURL(/#\/Buildings$/)
      await expect(buildingsPage.buildingListTable).toBeVisible()
    })

    await test.step('Open the New Building form', async () => {
      await buildingsPage.openNewBuildingForm()
      await expect(page).toHaveURL(/#\/Buildings\/New$/)
      await expect(newBuildingPage.addButton).toBeVisible()
    })

    await test.step('Create the building this test will delete', async () => {
      const createdBuildingNames = await newBuildingPage.addBuildings(
        testData['QA-04'].building,
        testData['QA-04'].buildingCount,
      )
      buildingToDeleteName = createdBuildingNames[0]
      await expect(newBuildingPage.buildingsAddedMessage(createdBuildingNames.length)).toBeVisible()
    })

    await test.step('Find the new building by paging through the list', async () => {
      await sideNavComponent.openBuildings()
      const pageWithBuilding = await buildingsPage.openPageWithBuilding(buildingToDeleteName)
      expect(pageWithBuilding).toBeGreaterThan(0)
      await expect(buildingsPage.buildingRow(buildingToDeleteName)).toBeVisible()
    })

    await test.step('Open the building to confirm its detail page', async () => {
      await buildingsPage.openBuilding(buildingToDeleteName)
      await expect(page).toHaveURL(/#\/Buildings\/Detail\//)
      await expect(buildingDetailPage.buildingNameField(buildingToDeleteName)).toBeVisible()
      await expect(buildingDetailPage.propertyField(testData['QA-04'].property)).toBeVisible()
    })

    await test.step('Open the delete confirmation and dismiss it with No', async () => {
      await buildingDetailPage.openDeleteConfirmation()
      await expect(buildingDetailPage.confirmDeleteMessage).toBeVisible()
      await expect(buildingDetailPage.confirmDeleteYesButton).toBeVisible()
      await expect(buildingDetailPage.confirmDeleteNoButton).toBeVisible()
      await buildingDetailPage.cancelDelete()
      await expect(buildingDetailPage.confirmDeleteDialog).toBeHidden()
    })

    await test.step('Delete the building by confirming with Yes', async () => {
      await buildingDetailPage.openDeleteConfirmation()
      await expect(buildingDetailPage.confirmDeleteDialog).toBeVisible()
      await buildingDetailPage.confirmDelete()
      await expect(buildingDetailPage.buildingDeletedMessage).toBeVisible()
      await expect(page).toHaveURL(/#\/Buildings$/)
    })
  })
})
