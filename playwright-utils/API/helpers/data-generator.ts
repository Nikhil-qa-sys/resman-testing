import { faker } from '@faker-js/faker'
import buildingRequestPayload from '../request-objects/POST-building.json'

// What one building is worth on the wire. The client turns this into the form keys the
// application binds; nothing outside this file and the client knows that shape.
export type BuildingPayload = {
  building: {
    name: string
    floors: string
    description: string
    address: { streetAddress: string; city: string; state: string; zip: string }
  }
}

// What a case declares for a building. The name arrives as a *prefix*: the application
// caps the field at 15 characters and rejects duplicates, so the unique half is generated
// here, beside the constraint, rather than stored per environment.
export type BuildingCaseData = {
  namePrefix: string
  floors: string
  description: string
  streetAddress: string
  city: string
  province: string
  postalCode: string
}

// Clones the template and fills it from the case's data, so the spec reads the name it
// generated off the returned object instead of re-deriving it.
//
// The clone is the point. The imported JSON is module state shared by every test in the
// worker — filling it in place would hand the next test this test's building name.
//
// `name` overrides the generated one. A case about the name field itself needs an exact
// value — a boundary length, a reserved word — and cannot take the prefix convention,
// since a one-character name has no room for a prefix.
export function getNewRandomBuilding(building: BuildingCaseData, name?: string): BuildingPayload {
  const buildingRequest: BuildingPayload = structuredClone(buildingRequestPayload)

  buildingRequest.building.name = name ?? `${building.namePrefix}${faker.string.alphanumeric(6)}`
  buildingRequest.building.floors = building.floors
  buildingRequest.building.description = building.description
  buildingRequest.building.address = {
    streetAddress: building.streetAddress,
    city: building.city,
    state: building.province,
    zip: building.postalCode,
  }

  return buildingRequest
}
