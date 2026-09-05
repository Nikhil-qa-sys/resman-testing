import { type Page } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async signIn(username: string, password: string) {
    await this.page.getByRole('textbox', { name: 'Username' }).fill(username)
    await this.page.getByRole('textbox', { name: 'Password' }).fill(password)
    await this.page.getByRole('button', { name: 'Sign in' }).click()
  }
}
