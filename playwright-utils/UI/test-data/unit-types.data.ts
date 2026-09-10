// Get environment from process.env — TEST_ENV is the variable playwright.config.ts
// selects .env/.env.<env> with, and it defaults to qa in both places.
const ENV = process.env.TEST_ENV || 'qa'

// QA environment test data
const qaTestData = {
  'QA-02': {
    property: 'Beta Tree - Automation',
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
    // How many unit type rows the form is filled with. The confirmation banner counts
    // the rows saved, so the test asserts this same number back.
    unitTypeCount: 1,
  },
  'QA-05': {
    property: 'Beta Tree - Automation',
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
  },
}

// RC environment test data
const rcTestData: typeof qaTestData = {
  'QA-02': {
    property: 'Beta Tree - Automation',
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
    // How many unit type rows the form is filled with. The confirmation banner counts
    // the rows saved, so the test asserts this same number back.
    unitTypeCount: 1,
  },
  'QA-05': {
    property: 'Beta Tree - Automation',
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
  },
}

// Regression environment test data
const regressionTestData: typeof qaTestData = {
  'QA-02': {
    property: 'Beta Tree - Automation',
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
    // How many unit type rows the form is filled with. The confirmation banner counts
    // the rows saved, so the test asserts this same number back.
    unitTypeCount: 1,
  },
  'QA-05': {
    property: 'Beta Tree - Automation',
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
