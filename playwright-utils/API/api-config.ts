// Values the API half needs that are not per-case and not secret.
//
// A spec never reads process.env — it takes the `config` fixture. Per-case values
// (a property name, a building's fields) do not belong here either: those live in the
// environment-keyed store under test-data/, keyed by case id, where the compiler can
// check that every environment declares them.
//
// BASE_URL arrives from .env/.env.<TEST_ENV>, which playwright.config.ts dotenv-loads
// before anything here is imported, so there is no per-environment branch to write:
// selecting the env file already selected the URL.
export const apiConfig = {
  baseUrl: process.env.BASE_URL ?? '',
}
