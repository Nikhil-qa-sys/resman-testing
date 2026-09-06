import { type Locator, type Page } from '@playwright/test'

export class LoginPage {
  public readonly usernameInput: Locator
  public readonly passwordInput: Locator
  public readonly signInButton: Locator

  constructor(private page: Page) {
    this.usernameInput = this.page.getByRole('textbox', { name: 'Username' })
    this.passwordInput = this.page.getByRole('textbox', { name: 'Password' })
    this.signInButton = this.page.getByRole('button', { name: 'Sign in' })
  }

  async signIn(username: string, password: string) {
    await this.usernameInput.fill(username)
    await this.passwordInput.fill(password)
    await this.signInButton.click()
  }
}
