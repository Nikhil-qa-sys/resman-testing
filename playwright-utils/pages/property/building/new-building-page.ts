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
  public readonly addButton: Locator
  public readonly saveButton: Locator
  // Inputs are named Buildings[<generated row guid>].<field>, so each field is
  // reached through its stable name suffix rather than the generated id. Each is
  // plural and matches one element per grid row; methods pick the row by index
  // (see the inline-grid rule in playwright-scripting.md).
  public readonly nameInputs: Locator
  public readonly floorsInputs: Locator
  public readonly descriptionInputs: Locator
  public readonly streetAddressInputs: Locator
  public readonly cityInputs: Locator
  public readonly provinceInputs: Locator
  public readonly postalCodeInputs: Locator

  constructor(private page: Page) {
    this.addButton = this.page.getByRole('button', { name: 'Add' })
    this.saveButton = this.page.getByRole('button', { name: 'Save' })
    this.nameInputs = this.page.locator('input[name$=".Name"]')
    this.floorsInputs = this.page.locator('input[name$=".Floors"]')
    this.descriptionInputs = this.page.locator('input[name$=".Description"]')
    this.streetAddressInputs = this.page.locator('input[name$=".Address.StreetAddress"]')
    this.cityInputs = this.page.locator('input[name$=".Address.City"]')
    this.provinceInputs = this.page.locator('input[name$=".Address.State"]')
    this.postalCodeInputs = this.page.locator('input[name$=".Address.Zip"]')
  }

  // Parametrized by the number of rows saved, so it cannot be a constructor
  // property.
  buildingsAddedMessage(count: number): Locator {
    return this.page.getByRole('cell', { name: `${count} building(s) added successfully!` })
  }

  // Builds `buildingCount` rows and saves them in one submit, so the confirmation
  // the caller asserts on counts exactly the rows filled here. Returns the names it
  // created, so the caller can identify the new buildings.
  async addBuildings(building: BuildingFormData, buildingCount: number): Promise<string[]> {
    const buildingNames: string[] = []

    for (let index = 0; index < buildingCount; index++) {
      const name = `${building.namePrefix}${Math.random().toString(36).slice(2, 8)}`

      // "Add" appends one inline editable row at the end of the grid, so this
      // iteration owns row `index`. Addressing it by index is what makes the fill
      // wait for the new row: until the grid appends it, nth(index) matches
      // nothing and the action keeps polling rather than filling the row before.
      await this.addButton.click()
      await this.nameInputs.nth(index).fill(name)
      await this.floorsInputs.nth(index).fill(building.floors)
      await this.descriptionInputs.nth(index).fill(building.description)
      await this.streetAddressInputs.nth(index).fill(building.streetAddress)
      await this.cityInputs.nth(index).fill(building.city)
      await this.provinceInputs.nth(index).fill(building.province)
      await this.postalCodeInputs.nth(index).fill(building.postalCode)

      buildingNames.push(name)
    }

    await this.saveButton.click()

    return buildingNames
  }
}
