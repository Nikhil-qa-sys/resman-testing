import { expect, test } from '@playwright/test'
import { LoginPage } from '../../playwright-utils/pages/login-page'
import { BoardRoomPage } from '../../playwright-utils/pages/board-room-page'
import { SideNavComponent } from '../../playwright-utils/pages/side-nav-component'
import { BuildingsPage } from '../../playwright-utils/pages/buildings-page'
import { NewBuildingPage } from '../../playwright-utils/pages/new-building-page'
import { getBuildingTestData } from '../../playwright-utils/helpers/test-data'

const TEST_CASE_ID = 'QA-01'

test.describe('Buildings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test(`${TEST_CASE_ID} | User can create a new building for the selected property`, async ({ page }) => {
    const loginPage = new LoginPage(page)
    const boardRoomPage = new BoardRoomPage(page)
    const sideNavComponent = new SideNavComponent(page)
    const buildingsPage = new BuildingsPage(page)
    const newBuildingPage = new NewBuildingPage(page)
    const testData = getBuildingTestData(TEST_CASE_ID)

    await test.step('Log in to ResMan', async () => {
      await loginPage.signIn(process.env.TEST_USERNAME!, process.env.TEST_PASSWORD!)
      await expect(sideNavComponent.menu()).toBeVisible()
    })

    await test.step(`Select the "${testData.property}" property on the BoardRoom`, async () => {
      await boardRoomPage.selectProperty(testData.property)
      await expect(boardRoomPage.propertySelector()).toHaveValue(testData.property)
    })

    await test.step('Navigate to Property > Buildings', async () => {
      await sideNavComponent.openBuildings()
      await expect(page).toHaveURL(/#\/Buildings$/)
    })

    await test.step('Create a new building', async () => {
      await buildingsPage.openNewBuildingForm()
      await expect(page).toHaveURL(/#\/Buildings\/New$/)
      await newBuildingPage.addBuilding(testData.building)
      await expect(newBuildingPage.buildingsAddedMessage(1)).toBeVisible()
    })
  })
})
