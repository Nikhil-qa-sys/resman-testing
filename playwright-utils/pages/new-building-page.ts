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
  // reached through its stable name suffix rather than the generated id.
  public readonly nameInput: Locator
  public readonly floorsInput: Locator
  public readonly descriptionInput: Locator
  public readonly streetAddressInput: Locator
  public readonly cityInput: Locator
  public readonly provinceInput: Locator
  public readonly postalCodeInput: Locator

  constructor(private page: Page) {
    this.addButton = this.page.getByRole('button', { name: 'Add' })
    this.saveButton = this.page.getByRole('button', { name: 'Save' })
    this.nameInput = this.page.locator('input[name$=".Name"]')
    this.floorsInput = this.page.locator('input[name$=".Floors"]')
    this.descriptionInput = this.page.locator('input[name$=".Description"]')
    this.streetAddressInput = this.page.locator('input[name$=".Address.StreetAddress"]')
    this.cityInput = this.page.locator('input[name$=".Address.City"]')
    this.provinceInput = this.page.locator('input[name$=".Address.State"]')
    this.postalCodeInput = this.page.locator('input[name$=".Address.Zip"]')
  }

  // Parametrized by the number of rows saved, so it cannot be a constructor
  // property.
  buildingsAddedMessage(count: number): Locator {
    return this.page.getByRole('cell', { name: `${count} building(s) added successfully!` })
  }

  // Returns the name it created, so the caller can identify the new building.
  async addBuilding(building: BuildingFormData): Promise<string> {
    const name = `${building.namePrefix}${Math.random().toString(36).slice(2, 8)}`

    // "Add" appends one inline editable row; the fills below auto-wait for that
    // row's inputs to appear, so no explicit wait is needed between them.
    await this.addButton.click()
    await this.nameInput.fill(name)
    await this.floorsInput.fill(building.floors)
    await this.descriptionInput.fill(building.description)
    await this.streetAddressInput.fill(building.streetAddress)
    await this.cityInput.fill(building.city)
    await this.provinceInput.fill(building.province)
    await this.postalCodeInput.fill(building.postalCode)
    await this.saveButton.click()

    return name
  }
}
