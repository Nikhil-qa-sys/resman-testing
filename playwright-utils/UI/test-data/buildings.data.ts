// Get environment from process.env — TEST_ENV is the variable playwright.config.ts
// selects .env/.env.<env> with, and it defaults to qa in both places.
const ENV = process.env.TEST_ENV || 'qa'

// QA environment test data
const qaTestData = {
  'QA-01': {
    property: 'Beta Tree - Automation',
    building: {
      namePrefix: 'qaBld',
      floors: '4',
      description: 'QA automation building',
      streetAddress: '789 Playwright Blvd',
      city: 'Dallas',
      province: 'TX',
      postalCode: '75201',
    },
    // How many building rows the form is filled with. The confirmation banner counts
    // the rows saved, so the test asserts this same number back.
    buildingCount: 1,
  },
  'QA-04': {
    property: 'Beta Tree - Automation',
    building: {
      namePrefix: 'qaBld',
      floors: '4',
      description: 'QA automation building',
      streetAddress: '789 Playwright Blvd',
      city: 'Dallas',
      province: 'TX',
      postalCode: '75201',
    },
    buildingCount: 1,
  },
}

// RC environment test data
const rcTestData: typeof qaTestData = {
  'QA-01': {
    property: 'Beta Tree - Automation',
    building: {
      namePrefix: 'rcBld',
      floors: '4',
      description: 'RC automation building',
      streetAddress: '789 Playwright Blvd',
      city: 'Dallas',
      province: 'TX',
      postalCode: '75201',
    },
    // How many building rows the form is filled with. The confirmation banner counts
    // the rows saved, so the test asserts this same number back.
    buildingCount: 1,
  },
  'QA-04': {
    property: 'Beta Tree - Automation',
    building: {
      namePrefix: 'rcBld',
      floors: '4',
      description: 'RC automation building',
      streetAddress: '789 Playwright Blvd',
      city: 'Dallas',
      province: 'TX',
      postalCode: '75201',
    },
    buildingCount: 1,
  },
}

// Regression environment test data
const regressionTestData: typeof qaTestData = {
  'QA-01': {
    property: 'Beta Tree - Automation',
    building: {
      namePrefix: 'regBld',
      floors: '4',
      description: 'Regression automation building',
      streetAddress: '789 Playwright Blvd',
      city: 'Dallas',
      province: 'TX',
      postalCode: '75201',
    },
    // How many building rows the form is filled with. The confirmation banner counts
    // the rows saved, so the test asserts this same number back.
    buildingCount: 1,
  },
  'QA-04': {
    property: 'Beta Tree - Automation',
    building: {
      namePrefix: 'regBld',
      floors: '4',
      description: 'Regression automation building',
      streetAddress: '789 Playwright Blvd',
      city: 'Dallas',
      province: 'TX',
      postalCode: '75201',
    },
    buildingCount: 1,
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
