import { type Locator, type Page } from '@playwright/test'

export type UnitFormData = {
  numberPrefix: string
  floor: string
  status: string
  streetAddress: string
  city: string
  province: string
  postalCode: string
}

export class NewUnitPage {
  
  public readonly propertySelector: Locator
  public readonly addButton: Locator
  public readonly saveButton: Locator
  public readonly numberInputs: Locator
  public readonly buildingInputs: Locator
  public readonly floorInputs: Locator
  public readonly unitTypeInputs: Locator
  public readonly statusInputs: Locator
  public readonly streetAddressInputs: Locator
  public readonly cityInputs: Locator
  public readonly provinceInputs: Locator
  public readonly postalCodeInputs: Locator

  constructor(private page: Page) {
    this.propertySelector = this.page.locator('#PropertyName')
    this.addButton = this.page.getByRole('button', { name: 'Add', exact: true })
    this.saveButton = this.page.getByRole('button', { name: 'Save', exact: true })
    this.numberInputs = this.page.locator('input[name$=".Number"]')
    this.buildingInputs = this.page.locator('input[name$="BuildingIDInput"]')
    this.floorInputs = this.page.locator('input[name$=".Floor"]')
    this.unitTypeInputs = this.page.locator('input[name$="UnitTypeIDInput"]')
    this.statusInputs = this.page.locator('input[name$="UnitStatusIDInput"]')
    this.streetAddressInputs = this.page.locator('input[name$=".Address.StreetAddress"]')
    this.cityInputs = this.page.locator('input[name$=".Address.City"]')
    this.provinceInputs = this.page.locator('input[name$=".Address.State"]')
    this.postalCodeInputs = this.page.locator('input[name$=".Address.Zip"]')
  }

  unitsAddedMessage(count: number): Locator {
    return this.page.getByRole('cell', { name: `${count} unit(s) added successfully!` })
  }

  buildingSuggestion(buildingName: string): Locator {
    return this.page.getByRole('menuitem', { name: buildingName, exact: true })
  }

  statusSuggestion(status: string): Locator {
    return this.page.getByRole('menuitem', { name: status, exact: true })
  }

  // Unit type options render as "<name> - <description>", so the name alone never
  // matches exactly. Anchoring the pattern at the start of the option keeps a unit
  // type whose name merely contains this one from matching. The names this suite
  // generates are alphanumeric, so they carry no regex metacharacters.
  unitTypeSuggestion(unitTypeName: string): Locator {
    return this.page.getByRole('menuitem', { name: new RegExp(`^${unitTypeName} - `) })
  }

  // Builds `unitCount` rows and saves them in one submit, so the confirmation the
  // caller asserts on counts exactly the rows filled here. Returns the numbers it
  // created, so the caller can identify the new units.
  async addUnits(
    unit: UnitFormData,
    buildingName: string,
    unitTypeName: string,
    unitCount: number,
  ): Promise<string[]> {
    const unitNumbers: string[] = []

    for (let index = 0; index < unitCount; index++) {
      const number = `${unit.numberPrefix}${Math.random().toString(36).slice(2, 8)}`

      // "Add" appends one inline editable row at the end of the grid, so this
      // iteration owns row `index`. Addressing it by index is what makes the fill
      // wait for the new row: until the grid appends it, nth(index) matches
      // nothing and the action keeps polling rather than filling the row before.
      await this.addButton.click()
      await this.numberInputs.nth(index).fill(number)
      await this.chooseSuggestion(this.buildingInputs.nth(index), buildingName, this.buildingSuggestion(buildingName))
      await this.floorInputs.nth(index).fill(unit.floor)
      await this.chooseSuggestion(this.unitTypeInputs.nth(index), unitTypeName, this.unitTypeSuggestion(unitTypeName))
      await this.chooseSuggestion(this.statusInputs.nth(index), unit.status, this.statusSuggestion(unit.status))
      await this.streetAddressInputs.nth(index).fill(unit.streetAddress)
      await this.cityInputs.nth(index).fill(unit.city)
      await this.provinceInputs.nth(index).fill(unit.province)
      await this.postalCodeInputs.nth(index).fill(unit.postalCode)

      unitNumbers.push(number)
    }

    await this.saveButton.click()

    return unitNumbers
  }

  // Private, and parametrized by the field it drives: building, unit type and
  // status are the same widget, so one helper serves all three rather than three
  // methods differing only in which input they target.
  private async chooseSuggestion(autocompleteInput: Locator, value: string, suggestion: Locator) {
    // fill() sets the value without keystrokes, which never opens the suggestions.
    await autocompleteInput.pressSequentially(value)
    await suggestion.click()
  }
}
