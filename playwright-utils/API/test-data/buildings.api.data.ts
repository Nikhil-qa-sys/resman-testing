// Get environment from process.env — TEST_ENV is the variable playwright.config.ts
// selects .env/.env.<env> with, and it defaults to qa in both places.
const ENV = process.env.TEST_ENV || 'qa'

// The name prefixes below leave room for the six-character suffix the client appends:
// the application caps a building name at 15 characters, and a truncated name would be
// listed back under a name the test never generated.

// QA environment test data
const qaTestData = {
  'QA-101': {
    property: 'Beta Tree - Automation',
    building: {
      namePrefix: 'qaApiBld',
      floors: '4',
      description: 'QA automation building via API',
      streetAddress: '789 Playwright Blvd',
      city: 'Dallas',
      province: 'TX',
      postalCode: '75201',
    },
  },
  'QA-102': {
    property: 'Beta Tree - Automation',
    building: {
      // Unused by QA-102 — the case supplies each name at an exact length — but declared
      // so every case in this store carries the same shape.
      namePrefix: 'qaApiBld',
      floors: '4',
      description: 'QA name-length boundary check',
      streetAddress: '789 Playwright Blvd',
      city: 'Dallas',
      province: 'TX',
      postalCode: '75201',
    },
  },
}

// RC environment test data
const rcTestData: typeof qaTestData = {
  'QA-101': {
    property: 'Beta Tree - Automation',
    building: {
      namePrefix: 'rcApiBld',
      floors: '4',
      description: 'RC automation building via API',
      streetAddress: '789 Playwright Blvd',
      city: 'Dallas',
      province: 'TX',
      postalCode: '75201',
    },
  },
  'QA-102': {
    property: 'Beta Tree - Automation',
    building: {
      // Unused by QA-102 — the case supplies each name at an exact length — but declared
      // so every case in this store carries the same shape.
      namePrefix: 'rcApiBld',
      floors: '4',
      description: 'RC name-length boundary check',
      streetAddress: '789 Playwright Blvd',
      city: 'Dallas',
      province: 'TX',
      postalCode: '75201',
    },
  },
}

// Regression environment test data
const regressionTestData: typeof qaTestData = {
  'QA-101': {
    property: 'Beta Tree - Automation',
    building: {
      namePrefix: 'regApiBld',
      floors: '4',
      description: 'Regression automation building via API',
      streetAddress: '789 Playwright Blvd',
      city: 'Dallas',
      province: 'TX',
      postalCode: '75201',
    },
  },
  'QA-102': {
    property: 'Beta Tree - Automation',
    building: {
      // Unused by QA-102 — the case supplies each name at an exact length — but declared
      // so every case in this store carries the same shape.
      namePrefix: 'regApiBld',
      floors: '4',
      description: 'Regression name-length boundary check',
      streetAddress: '789 Playwright Blvd',
      city: 'Dallas',
      province: 'TX',
      postalCode: '75201',
    },
  },
}

// Export test data based on environment
let testData = qaTestData
if (ENV === 'qa') {
  testData = qaTestData
}
if (ENV === 'rc') {
  testData = rcTestData
}
if (ENV === 'regression') {
  testData = regressionTestData
}

export { testData }
