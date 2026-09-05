export type TestEnv = 'qa' | 'rc' | 'regression'

export type BuildingDetails = {
  name: string
  floors: string
  description: string
  streetAddress: string
  city: string
  province: string
  postalCode: string
}

export type BuildingTestData = {
  property: string
  building: BuildingDetails
}

// The application rejects a duplicate building name ("This building already
// exists") and caps it at 15 characters, so the declared data carries a prefix
// and a unique suffix is appended per run. Keep prefixes to 9 characters or fewer.
type DeclaredBuildingTestData = {
  property: string
  building: Omit<BuildingDetails, 'name'> & { namePrefix: string }
}

const TEST_DATA: Record<string, Record<TestEnv, DeclaredBuildingTestData>> = {
  'QA-01': {
    qa: {
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
    },
    rc: {
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
    },
    regression: {
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
    },
  },
}

// Mirrors the TEST_ENV default in playwright.config.ts.
export function currentEnv(): TestEnv {
  return (process.env.TEST_ENV || 'qa') as TestEnv
}

export function getBuildingTestData(testCaseId: string): BuildingTestData {
  const environment = currentEnv()
  const testCase = TEST_DATA[testCaseId]
  if (!testCase) {
    throw new Error(`No test data declared for test case "${testCaseId}"`)
  }
  const declared = testCase[environment]
  if (!declared) {
    throw new Error(`Test case "${testCaseId}" declares no data for TEST_ENV="${environment}"`)
  }
  const { namePrefix, ...building } = declared.building
  return {
    property: declared.property,
    building: { ...building, name: `${namePrefix}${Math.random().toString(36).slice(2, 8)}` },
  }
}
