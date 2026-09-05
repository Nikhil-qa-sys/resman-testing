import { type Locator, type Page } from '@playwright/test'

// What the New Building form needs. The name is supplied as a prefix: the
// application caps it at 15 characters and rejects duplicates ("This building
// already exists"), so the unique suffix is produced here rather than stored.
export type BuildingFormData = {
  namePrefix: string
  floors: string
  description: string
  streetAddress: string
  city: string
  province: string
  postalCode: string
}

export class NewBuildingPage {
  constructor(private page: Page) {}

  buildingsAddedMessage(count: number): Locator {
    return this.page.getByRole('cell', { name: `${count} building(s) added successfully!` })
  }

  // Returns the name it created, so the caller can identify the new building.
  async addBuilding(building: BuildingFormData): Promise<string> {
    const name = `${building.namePrefix}${Math.random().toString(36).slice(2, 8)}`

    // "Add" appends one inline editable row; the fills below auto-wait for that
    // row's inputs to appear, so no explicit wait is needed between them.
    await this.page.getByRole('button', { name: 'Add' }).click()
    // Inputs are named Buildings[<generated row guid>].<field>, so the row is
    // reached through the stable field suffix rather than the generated id.
    await this.page.locator('input[name$=".Name"]').fill(name)
    await this.page.locator('input[name$=".Floors"]').fill(building.floors)
    await this.page.locator('input[name$=".Description"]').fill(building.description)
    await this.page.locator('input[name$=".Address.StreetAddress"]').fill(building.streetAddress)
    await this.page.locator('input[name$=".Address.City"]').fill(building.city)
    await this.page.locator('input[name$=".Address.State"]').fill(building.province)
    await this.page.locator('input[name$=".Address.Zip"]').fill(building.postalCode)
    await this.page.getByRole('button', { name: 'Save' }).click()

    return name
  }
}
