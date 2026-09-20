import fs from 'fs/promises'
import path from 'path'
import Ajv from 'ajv'

// Resolved from this module rather than the working directory, so the schemas are found
// however the runner was invoked.
const SCHEMA_BASE_PATH = path.resolve(__dirname, '../response-schemas')
// allErrors so a failure reports every violation and the actual body, not just the first
// mismatch — a shape that drifted in three places should say so once.
const ajv = new Ajv({ allErrors: true })

export async function validateSchema(dirName: string, fileName: string, responseBody: object) {
  const schemaPath = path.join(SCHEMA_BASE_PATH, dirName, `${fileName}_schema.json`)
  const validate = ajv.compile(await loadSchema(schemaPath))

  if (!validate(responseBody)) {
    throw new Error(
      `Schema validation ${fileName}_schema.json failed:\n` +
        `${JSON.stringify(validate.errors, null, 4)}\n\n` +
        `Actual response body:\n${JSON.stringify(responseBody, null, 4)}`,
    )
  }
}

async function loadSchema(schemaPath: string) {
  try {
    return JSON.parse(await fs.readFile(schemaPath, 'utf-8'))
  } catch (error) {
    throw new Error(`Failed to read the schema file: ${(error as Error).message}`)
  }
}
