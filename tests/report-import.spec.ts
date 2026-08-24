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

test.describe(
  'Tribal Wars screenshot importer regression',
  () => {
    test(
      'imports the calibrated spy report into the defender',
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
      'imports the calibrated battle report initial armies',
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

        await showAllUnits(
          importer,
        )

        /*
         * ATACANTE
         *
         * Este fixture é o novo relatório:
         *
         * Axe Fighter = 3171
         * Nobleman    = 1
         * Paladin     = 1
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

        /*
         * Não existem aríetes
         * nesse relatório.
         */
        await expect(
          importer.locator(
            '#Attacker-ram',
          ),
        ).toHaveValue(
          '0',
        )

        /*
         * DEFENSOR
         *
         * Spearman   = 0
         * Swordsman  = 34
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

        /*
         * Garante que as demais
         * unidades vazias realmente
         * foram interpretadas como 0.
         */
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

        /*
         * O novo screenshot não
         * informa redução de muralha.
         *
         * Portanto NÃO devemos esperar
         * Wall Level = 6.
         */

        await importer
          .getByRole(
            'button',
            {
              name:
                'Apply Both Armies',
            },
          )
          .click()

        /*
         * Confere que os valores
         * realmente chegaram ao
         * simulador.
         */
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