// Get environment from process.env — TEST_ENV is the variable playwright.config.ts
// selects .env/.env.<env> with, and it defaults to qa in both places.
const ENV = process.env.TEST_ENV || 'qa'

// QA environment test data
const qaTestData = {
  'QA-03': {
    property: 'Beta Tree - Automation',
    // The precondition: QA-03 creates its own building and unit type before the
    // unit, then selects those two when filling the unit row.
    building: {
      namePrefix: 'qaBld',
      floors: '4',
      description: 'QA automation building',
      streetAddress: '100 Automation Way',
      city: 'Austin',
      province: 'TX',
      postalCode: '73301',
    },
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
    unit: {
      numberPrefix: 'qaU',
      floor: '1',
      status: 'Ready',
      streetAddress: 'Rose street 61',
      city: 'Michigan',
      province: 'TX',
      postalCode: '75001',
    },
    // How many unit rows the form is filled with. The confirmation banner counts
    // the rows saved, so the test asserts this same number back.
    unitCount: 1,
  },
}

// RC environment test data
const rcTestData: typeof qaTestData = {
  'QA-03': {
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
  'QA-03': {
    property: 'Beta Tree - Automation',
    building: {
      namePrefix: 'regBld',
      floors: '4',
      description: 'Regression automation building',
      streetAddress: '100 Automation Way',
      city: 'Austin',
      province: 'TX',
      postalCode: '73301',
    },
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
