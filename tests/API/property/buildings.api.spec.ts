import { faker } from '@faker-js/faker'
import { test } from '../../../playwright-utils/API/fixtures/api-fixtures'
import { expect } from '../../../playwright-utils/API/core/custom-expect'
import { BuildingsApi } from '../../../playwright-utils/API/clients/property/buildings-api'
import {
  BuildingPayload,
  getNewRandomBuilding,
} from '../../../playwright-utils/API/helpers/data-generator'
import { testData } from '../../../playwright-utils/API/test-data/property.api.data'

const PROPERTY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// The boundaries of the Name field, established by observation against qa: lengths 1
// through 15 are saved, 0 and 16 upward are not. Nothing in the served markup declares
// this — the New Building document carries no maxlength and no validation metadata, so
// the rule is server-side only and the table below is the record of it.
//
// 50 is not a boundary. It is there because "rejected" has no upper bound, and a case
// that only checked 16 could not tell a cap from a single bad length.
const NAME_LENGTH_CASES = [
  { length: 0, accepted: false, boundary: 'empty, below the minimum' },
  { length: 1, accepted: true, boundary: 'the shortest accepted' },
  { length: 15, accepted: true, boundary: 'the longest accepted' },
  { length: 16, accepted: false, boundary: 'the first over the cap' },
  { length: 50, accepted: false, boundary: 'well over the cap' },
]

// Produced in one step and read back in the next. Initialised to '' rather than
// declared bare: an unassigned id would be sent as an empty parameter and the
// application would answer about some other property.
let propertyId = ''

// The building a case posts, read back by name in the steps that verify it. Declared
// here but assigned inside the test body: the generated name has to be new on every
// attempt, and a retry handed a name its own first attempt already took would read the
// application's duplicate rejection as a failure.
let buildingRequest: BuildingPayload

test.describe('Buildings API', () => {
  // Every case in this file drives the same client. It cannot be built at module scope —
  // `api` is a test-scoped fixture, so the handler it wraps belongs to one test.
  let buildingsApi: BuildingsApi

  test.beforeEach(({ api }) => {
    buildingsApi = new BuildingsApi(api)
  })

  test('QA-101 | User can create a building for a property through the API', async () => {
    buildingRequest = getNewRandomBuilding(testData['QA-101'].building)

    await test.step(`Look up the "${testData['QA-101'].property}" property`, async () => {
      propertyId = await buildingsApi.getPropertyId(testData['QA-101'].property)

      expect(propertyId).shouldMatch(PROPERTY_ID)
    })

    await test.step(`Create the building "${buildingRequest.building.name}"`, async () => {
      const saveResult = await buildingsApi.addBuilding(
        propertyId,
        testData['QA-101'].property,
        buildingRequest,
      )

      // A rejected save also answers 200, so the status the handler checked is not proof
      // the record landed — only the redirect payload is.
      expect(saveResult.accepted).shouldEqual(true)
    })

    await test.step('Confirm the application reports the new building', async () => {
      // The duplicate check the New Building form runs before it saves. The name was free
      // before this run generated it, so the application reporting it taken is the save
      // landing — asserted against the schema first, so a changed contract reads as a
      // contract failure rather than as a missing building.
      const existsResponse = await buildingsApi.getBuildingExists(
        propertyId,
        buildingRequest.building.name,
      )

      await expect(existsResponse).shouldMatchSchema('buildings', 'GET_BuildingExists')
      expect(existsResponse.message).shouldEqual('This building already exists')

      // And the property lists it back with the values that were posted, so the record is
      // confirmed rather than only its name.
      expect(await buildingsApi.getBuildingFromList(propertyId, buildingRequest.building.name))
        .shouldEqual({
          name: buildingRequest.building.name,
          floors: buildingRequest.building.floors,
          description: buildingRequest.building.description,
        })
    })
  })

  NAME_LENGTH_CASES.forEach(({ length, accepted, boundary }) => {
    test(`QA-102 | A ${length}-character building name ${accepted ? 'is saved' : 'is rejected'} — ${boundary}`, async () => {
      // The name is this case's subject rather than incidental randomness, so its exact
      // length is fixed here and only its characters are random — a fixed name would
      // collide with the one a previous run already took.
      buildingRequest = getNewRandomBuilding(
        testData['QA-102'].building,
        faker.string.alphanumeric(length),
      )

      await test.step(`Look up the "${testData['QA-102'].property}" property`, async () => {
        propertyId = await buildingsApi.getPropertyId(testData['QA-102'].property)

        expect(propertyId).shouldMatch(PROPERTY_ID)
      })

      await test.step(`Save a building whose name is ${length} characters long`, async () => {
        const saveResult = await buildingsApi.addBuilding(
          propertyId,
          testData['QA-102'].property,
          buildingRequest,
        )

        // The application answers 200 either way and reports nothing in the document, so
        // this is the whole of what it says about the outcome.
        expect(saveResult.accepted).shouldEqual(accepted)
      })

      await test.step(`Confirm the property ${accepted ? 'lists' : 'does not list'} the building`, async () => {
        // The save's own answer is one claim; the list is the independent one. A rejection
        // that still wrote a row, or an acceptance that wrote nothing, fails here.
        expect(
          await buildingsApi.getBuildingFromList(propertyId, buildingRequest.building.name),
        ).shouldEqual(
          accepted
            ? {
                name: buildingRequest.building.name,
                floors: buildingRequest.building.floors,
                description: buildingRequest.building.description,
              }
            : undefined,
        )
      })
    })
  })
})
