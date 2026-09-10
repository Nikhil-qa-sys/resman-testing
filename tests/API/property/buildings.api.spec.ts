import { expect, test } from '@playwright/test'
import { AuthApi } from '../../../playwright-utils/API/clients/auth/auth-api'
import { BuildingsApi } from '../../../playwright-utils/API/clients/property/buildings-api'
import { testData } from '../../../playwright-utils/API/test-data/buildings.api.data'

// Produced in one step and read back in the next, so they live outside the test body.
// Both are initialised to '' rather than declared bare: an unassigned id would be posted
// as an empty parameter and the application would answer about some other property.
let propertyId = ''
let buildingName = ''

test.describe('Buildings API', () => {
  test('QA-101 | User can create a building for a property through the API', async ({ request }) => {
    const authApi = new AuthApi(request)
    const buildingsApi = new BuildingsApi(request)

    await test.step('Sign in to ResMan through the API', async () => {
      const signInResponse = await authApi.signIn(
        process.env.TEST_USERNAME!.trim(),
        process.env.TEST_PASSWORD!.trim(),
      )

      await expect(signInResponse).toBeOK()
      // Rejected credentials also answer 200 — on the identity provider's login form,
      // not the application — so the host is what says the session was established.
      expect(new URL(signInResponse.url()).host).toBe(new URL(process.env.BASE_URL!).host)
    })

    await test.step(`Look up the "${testData['QA-101'].property}" property`, async () => {
      propertyId = await buildingsApi.getPropertyId(testData['QA-101'].property)

      expect(propertyId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })

    await test.step('Create a new building through the API', async () => {
      const createdBuilding = await buildingsApi.addBuilding(
        propertyId,
        testData['QA-101'].property,
        testData['QA-101'].building,
      )
      buildingName = createdBuilding.name

      await expect(createdBuilding.saveResponse).toBeOK()
      console.log(`Created building: ${buildingName}`)
    })

    await test.step('Confirm the application reports the new building', async () => {
      // The duplicate check the New Building form runs: the name was free before this
      // run generated it, so the application reporting it taken is the save landing.
      expect(await buildingsApi.isBuildingNameTaken(propertyId, buildingName)).toBe(true)

      // And the property lists it back with the values that were posted, so the record
      // is confirmed rather than just the name.
      expect(await buildingsApi.getBuildingFromList(propertyId, buildingName)).toEqual({
        name: buildingName,
        floors: testData['QA-101'].building.floors,
        description: testData['QA-101'].building.description,
      })
    })
  })
})
