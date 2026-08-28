import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  expect,
  test,
  type Locator,
  type Page,
} from '@playwright/test'

const currentDirectory = path.dirname(
  fileURLToPath(import.meta.url),
)

const fixture = (
  name: string,
): string => {
  return path.join(
    currentDirectory,
    'fixtures',
    name,
  )
}

const uploadReport = async (
  page: Page,
  fileName: string,
) => {
  await page.goto('/')

  const importer = page.locator(
    '#report-screenshot-import',
  )

  await expect(
    importer,
  ).toBeVisible()

  await importer
    .locator(
      'input.report-file-input',
    )
    .setInputFiles(
      fixture(fileName),
    )

  await expect(
    importer
      .getByText(
        'Analysis complete',
        {
          exact: true,
        },
      )
      .first(),
  ).toBeVisible({
    timeout: 150_000,
  })

  return importer
}

const showAllUnits = async (
  importer: Locator,
) => {
  const button =
    importer.getByRole(
      'button',
      {
        name: 'Show All Units',
      },
    )

  if (
    await button.isVisible()
  ) {
    await button.click()
  }
}

const getIdentitySides = (
  importer: Locator,
) => {
  return importer.locator(
    '.report-identity-card .report-identity-side',
  )
}

const expectIdentity = async (
  importer: Locator,
  party:
    | 'Attacker'
    | 'Defender',
  expected: {
    player: string
    village: string
    x: string
    y: string
  },
) => {
  const sides =
    getIdentitySides(
      importer,
    )

  const sideCount =
    await sides.count()

  /*
   * Spy report:
   *   only one identity card exists -> Defender
   *
   * Battle report:
   *   0 -> Attacker
   *   1 -> Defender
   *
   * We intentionally target the real component classes instead
   * of ARIA headings because the current UI renders the titles
   * as <strong>, not heading elements.
   */
  await expect(
    sides,
  ).toHaveCount(
    party === 'Attacker'
      ? 2
      : sideCount === 1
        ? 1
        : 2,
  )

  const side =
    party === 'Attacker'
      ? sides.nth(0)
      : sides.nth(
          sideCount - 1,
        )

  await expect(
    side.locator(
      '.report-identity-title strong',
    ),
  ).toHaveText(
    party,
  )

  const inputs =
    side.locator(
      '.report-identity-fields input',
    )

  await expect(
    inputs,
  ).toHaveCount(
    4,
  )

  await expect(
    inputs.nth(0),
  ).toHaveValue(
    expected.player,
  )

  await expect(
    inputs.nth(1),
  ).toHaveValue(
    expected.village,
  )

  await expect(
    inputs.nth(2),
  ).toHaveValue(
    expected.x,
  )

  await expect(
    inputs.nth(3),
  ).toHaveValue(
    expected.y,
  )
}

test.describe(
  'Tribal Wars screenshot importer regression',
  () => {
    test(
      'imports the calibrated spy report troops and metadata into the defender',
      async ({
        page,
      }) => {
        const importer =
          await uploadReport(
            page,
            'spy-report.png',
          )

        await expect(
          importer.getByRole(
            'heading',
            {
              name:
                'Spy Report',
            },
          ),
        ).toBeVisible()

        /*
         * Metadata regression:
         *
         * Defender
         * SolRain
         * Salvhigard
         * (501|516)
         */
        await expectIdentity(
          importer,
          'Defender',
          {
            player:
              'SolRain',
            village:
              'Salvhigard',
            x:
              '501',
            y:
              '516',
          },
        )

        /*
         * Troop regression.
         */
        await expect(
          importer.locator(
            '#Defender-spearman',
          ),
        ).toHaveValue(
          '86',
        )

        await expect(
          importer.locator(
            '#Defender-swordsman',
          ),
        ).toHaveValue(
          '20',
        )

        await showAllUnits(
          importer,
        )

        const expectedZeroUnits =
          [
            'axe',
            'archer',
            'lightCavalry',
            'mountedArcher',
            'heavyCavalry',
            'ram',
            'catapult',
            'berserker',
            'trebuchet',
            'nobleman',
            'paladin',
          ]

        for (
          const unitId
          of expectedZeroUnits
        ) {
          await expect(
            importer.locator(
              `#Defender-${unitId}`,
            ),
          ).toHaveValue(
            '0',
          )
        }

        await importer
          .getByRole(
            'button',
            {
              name:
                'Apply Defender',
            },
          )
          .click()

        await expect(
          page.getByLabel(
            'Spearman defender quantity',
          ),
        ).toHaveValue(
          '86',
        )

        await expect(
          page.getByLabel(
            'Swordsman defender quantity',
          ),
        ).toHaveValue(
          '20',
        )
      },
    )

    test(
      'imports the calibrated battle report troops and metadata',
      async ({
        page,
      }) => {
        const importer =
          await uploadReport(
            page,
            'battle-report.png',
          )

        await expect(
          importer.getByRole(
            'heading',
            {
              name:
                'Battle Report',
            },
          ),
        ).toBeVisible()

        /*
         * Metadata regression.
         */
        await expectIdentity(
          importer,
          'Attacker',
          {
            player:
              'FelipeG98',
            village:
              '[001] F',
            x:
              '499',
            y:
              '511',
          },
        )

        await expectIdentity(
          importer,
          'Defender',
          {
            player:
              'SolRain',
            village:
              'Salvhigard',
            x:
              '501',
            y:
              '516',
          },
        )

        await showAllUnits(
          importer,
        )

        /*
         * Attacker regression.
         */
        await expect(
          importer.locator(
            '#Attacker-axe',
          ),
        ).toHaveValue(
          '3171',
        )

        await expect(
          importer.locator(
            '#Attacker-nobleman',
          ),
        ).toHaveValue(
          '1',
        )

        await expect(
          importer.locator(
            '#Attacker-paladin',
          ),
        ).toHaveValue(
          '1',
        )

        await expect(
          importer.locator(
            '#Attacker-ram',
          ),
        ).toHaveValue(
          '0',
        )

        /*
         * Defender regression.
         */
        await expect(
          importer.locator(
            '#Defender-spearman',
          ),
        ).toHaveValue(
          '0',
        )

        await expect(
          importer.locator(
            '#Defender-swordsman',
          ),
        ).toHaveValue(
          '34',
        )

        const attackerZeroUnits =
          [
            'spearman',
            'swordsman',
            'archer',
            'lightCavalry',
            'mountedArcher',
            'heavyCavalry',
            'ram',
            'catapult',
            'berserker',
            'trebuchet',
          ]

        for (
          const unitId
          of attackerZeroUnits
        ) {
          await expect(
            importer.locator(
              `#Attacker-${unitId}`,
            ),
          ).toHaveValue(
            '0',
          )
        }

        const defenderZeroUnits =
          [
            'spearman',
            'axe',
            'archer',
            'lightCavalry',
            'mountedArcher',
            'heavyCavalry',
            'ram',
            'catapult',
            'berserker',
            'trebuchet',
            'nobleman',
            'paladin',
          ]

        for (
          const unitId
          of defenderZeroUnits
        ) {
          await expect(
            importer.locator(
              `#Defender-${unitId}`,
            ),
          ).toHaveValue(
            '0',
          )
        }

        await importer
          .getByRole(
            'button',
            {
              name:
                'Apply Both Armies',
            },
          )
          .click()

        await expect(
          page.getByLabel(
            'Axe Fighter attacker quantity',
          ),
        ).toHaveValue(
          '3171',
        )

        await expect(
          page.getByLabel(
            'Nobleman attacker quantity',
          ),
        ).toHaveValue(
          '1',
        )

        await expect(
          page.getByLabel(
            'Paladin attacker quantity',
          ),
        ).toHaveValue(
          '1',
        )

        await expect(
          page.getByLabel(
            'Ram attacker quantity',
          ),
        ).toHaveValue(
          '0',
        )

        await expect(
          page.getByLabel(
            'Spearman defender quantity',
          ),
        ).toHaveValue(
          '0',
        )

        await expect(
          page.getByLabel(
            'Swordsman defender quantity',
          ),
        ).toHaveValue(
          '34',
        )
      },
    )
  },
)
