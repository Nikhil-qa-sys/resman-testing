// Get environment from process.env — TEST_ENV is the variable playwright.config.ts
// selects .env/.env.<env> with, and it defaults to qa in both places.
const ENV = process.env.TEST_ENV || 'qa'

// QA environment test data
const qaTestData = {
  'QA-07': {
    property: 'Beta Tree - Automation',
    // The precondition: QA-07 creates its own building, unit type and unit before
    // the applicant, so the unit it assigns is guaranteed vacant and the run never
    // depends on a record another case left behind.
    building: {
      namePrefix: 'qaBld',
      floors: '4',
      description: 'QA automation building',
      streetAddress: '100 Automation Way',
      city: 'Austin',
      province: 'TX',
      postalCode: '73301',
    },
    buildingCount: 1,
    unitType: {
      namePrefix: 'qaUT',
      description: 'QA automation unit type',
      bedrooms: '2',
      bathrooms: '1',
      marketRent: '1500',
      rentCategory: 'Resident Rent',
      requiredDeposit: '1200',
      depositCategory: 'Security Deposit Paid',
      squareFootage: '950',
      maximumOccupancy: '4',
    },
    unitTypeCount: 1,
    unit: {
      numberPrefix: 'qaU',
      floor: '1',
      status: 'Ready',
      streetAddress: 'Rose street 61',
      city: 'Michigan',
      province: 'TX',
      postalCode: '75001',
    },
    unitCount: 1,
  },
}

// RC environment test data
const rcTestData: typeof qaTestData = {
  'QA-07': {
    property: 'Beta Tree - Automation',
    building: {
      namePrefix: 'rcBld',
      floors: '4',
      description: 'RC automation building',
      streetAddress: '100 Automation Way',
      city: 'Austin',
      province: 'TX',
      postalCode: '73301',
    },
    buildingCount: 1,
    unitType: {
      namePrefix: 'rcUT',
      description: 'RC automation unit type',
      bedrooms: '2',
      bathrooms: '1',
      marketRent: '1500',
      rentCategory: 'Auto Rent Charge',
      requiredDeposit: '1200',
      depositCategory: 'Security Deposit',
      squareFootage: '950',
      maximumOccupancy: '4',
    },
    unitTypeCount: 1,
    unit: {
      numberPrefix: 'rcU',
      floor: '1',
      status: 'Ready',
      streetAddress: 'Rose street 61',
      city: 'Michigan',
      province: 'TX',
      postalCode: '75001',
    },
    unitCount: 1,
  },
}

// Regression environment test data
const regressionTestData: typeof qaTestData = {
  'QA-07': {
    // Not Beta Tree - Automation: that property exists on regression but the New
    // Applicant form's fill-with-test-data shortcut never fetches available units
    // for it, so the form is never completed. Core Automation 2026 is the property
    // the applicant cases run against on regression.
    property: 'Core Automation 2026',
    building: {
      namePrefix: 'regBld',
      floors: '4',
      description: 'Regression automation building',
      streetAddress: '100 Automation Way',
      city: 'Austin',
      province: 'TX',
      postalCode: '73301',
    },
    buildingCount: 1,
    unitType: {
      namePrefix: 'regUT',
      description: 'Regression automation unit type',
      bedrooms: '2',
      bathrooms: '1',
      marketRent: '1500',
      rentCategory: 'Accelerated Rent Charges',
      requiredDeposit: '1200',
      depositCategory: 'Security Deposit',
      squareFootage: '950',
      maximumOccupancy: '4',
    },
    unitTypeCount: 1,
    unit: {
      numberPrefix: 'regU',
      floor: '1',
      status: 'Ready',
      streetAddress: 'Rose street 61',
      city: 'Michigan',
      province: 'TX',
      postalCode: '75001',
    },
    unitCount: 1,
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
