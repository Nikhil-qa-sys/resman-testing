import { type Page } from '@playwright/test'

export class BuildingsPage {
  constructor(private page: Page) {}

  async openNewBuildingForm() {
    await this.page.getByRole('link', { name: 'New Building' }).click()
  }
}
