import { type Locator, type Page } from '@playwright/test'
import { type BuildingDetails } from '../helpers/test-data'

export class NewBuildingPage {
  constructor(private page: Page) {}

  buildingsAddedMessage(count: number): Locator {
    return this.page.getByRole('cell', { name: `${count} building(s) added successfully!` })
  }

  async addBuilding(building: BuildingDetails) {
    await this.page.getByRole('button', { name: 'Add' }).click()
    // Inputs are named Buildings[<generated row guid>].<field>, so the row is
    // reached through the stable field suffix rather than the generated id.
    await this.page.locator('input[name$=".Name"]').fill(building.name)
    await this.page.locator('input[name$=".Floors"]').fill(building.floors)
    await this.page.locator('input[name$=".Description"]').fill(building.description)
    await this.page.locator('input[name$=".Address.StreetAddress"]').fill(building.streetAddress)
    await this.page.locator('input[name$=".Address.City"]').fill(building.city)
    await this.page.locator('input[name$=".Address.State"]').fill(building.province)
    await this.page.locator('input[name$=".Address.Zip"]').fill(building.postalCode)
    await this.page.getByRole('button', { name: 'Save' }).click()
  }
}
