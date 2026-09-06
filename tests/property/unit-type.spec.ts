import { expect, test } from '@playwright/test'
import { LoginPage } from '../../playwright-utils/pages/auth/login-page'
import { BoardRoomPage } from '../../playwright-utils/pages/boardroom/board-room-page'
import { SideNavComponent } from '../../playwright-utils/pages/navigation/side-nav-component'
import { UnitTypesPage } from '../../playwright-utils/pages/property/unit-type/unit-types-page'
import { NewUnitTypePage } from '../../playwright-utils/pages/property/unit-type/new-unit-type-page'
import { testData } from '../../playwright-utils/test-data/unit-types.data'

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
})
