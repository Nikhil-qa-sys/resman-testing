import { expect, test } from '@playwright/test'
import { LoginPage } from '../../playwright-utils/pages/auth/login-page'
import { BoardRoomPage } from '../../playwright-utils/pages/boardroom/board-room-page'
import { SideNavComponent } from '../../playwright-utils/pages/navigation/side-nav-component'
import { BuildingsPage } from '../../playwright-utils/pages/property/building/buildings-page'
import { NewBuildingPage } from '../../playwright-utils/pages/property/building/new-building-page'
import { testData } from '../../playwright-utils/test-data/buildings.data'

let buildingName = ''

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
      buildingName = await newBuildingPage.addBuilding(testData['QA-01'].building)
      await expect(newBuildingPage.buildingsAddedMessage(1)).toBeVisible()
    })

    await test.step('Confirm the new building is listed for the property', async () => {
      await sideNavComponent.openBuildings()
      await buildingsPage.showAllBuildings()
      await expect(buildingsPage.buildingRow(buildingName)).toBeVisible()
    })
  })
})
