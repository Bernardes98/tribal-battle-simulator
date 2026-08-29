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


const parseV58Text = async (
  page: Page,
  rawText: string,
  reportType: 'spy' | 'battle' = 'battle',
) => {
  await page.goto('/')

  return await page.evaluate(
    async ({
      rawText: sourceText,
      reportType: sourceReportType,
    }) => {
      const importAdvanced = new Function(
        'return import("/src/domain/import/reportAdvancedParser.ts")',
      ) as () => Promise<{
        parseReportAdvancedData: (
          rawText: string,
          reportType: 'spy' | 'battle',
        ) => unknown
      }>

      const importModifiers = new Function(
        'return import("/src/domain/import/reportModifierParser.ts")',
      ) as () => Promise<{
        parseReportModifiers: (
          rawText: string,
          reportType: 'spy' | 'battle',
        ) => unknown
      }>

      const [advancedModule, modifierModule] =
        await Promise.all([
          importAdvanced(),
          importModifiers(),
        ])

      return {
        advanced: advancedModule.parseReportAdvancedData(
          sourceText,
          sourceReportType,
        ),
        modifiers: modifierModule.parseReportModifiers(
          sourceText,
          sourceReportType,
        ),
      }
    },
    {
      rawText,
      reportType,
    },
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

test.describe(
  'OCR 2.0 resolution regression',
  () => {
    for (const fileName of [
      'spy-report-85.png',
      'spy-report-125.png',
    ]) {
      test(
        `keeps spy report recognition stable for ${fileName}`,
        async ({ page }) => {
          const importer = await uploadReport(
            page,
            fileName,
          )

          await expect(
            importer.getByRole(
              'heading',
              { name: 'Spy Report' },
            ),
          ).toBeVisible()

          await expect(
            importer.locator('#Defender-spearman'),
          ).toHaveValue('86')

          await expect(
            importer.locator('#Defender-swordsman'),
          ).toHaveValue('20')
        },
      )
    }

    for (const fileName of [
      'battle-report-85.png',
      'battle-report-125.png',
    ]) {
      test(
        `keeps battle report recognition stable for ${fileName}`,
        async ({ page }) => {
          const importer = await uploadReport(
            page,
            fileName,
          )

          await showAllUnits(importer)

          await expect(
            importer.getByRole(
              'heading',
              { name: 'Battle Report' },
            ),
          ).toBeVisible()

          await expect(
            importer.locator('#Attacker-axe'),
          ).toHaveValue('3171')

          await expect(
            importer.locator('#Defender-swordsman'),
          ).toHaveValue('34')
        },
      )
    }
  },
)

test.describe(
  'OCR 2.0 advanced text parser regression',
  () => {
    test(
      'reads hospital, clinic, iron wall and officer settings',
      async ({ page }) => {
        const parsed = await parseV58Text(
          page,
          `
            Relatório de Batalha
            Atacante
            Grão-Mestre
            Maestria em Armas Nível 4
            Médico
            Medicus
            Defensor
            Hospital Nível 9
            Clínica Nível 6
            Muralha de Ferro Nível 5
          `,
        ) as {
          modifiers: {
            attacker: Record<string, unknown>
            defender: Record<string, unknown>
          }
        }

        expect(parsed.modifiers.attacker).toMatchObject({
          grandmaster: true,
          weaponMasteryLevel: 4,
          medicLevel: 1,
          medicusLevel: 1,
        })

        expect(parsed.modifiers.defender).toMatchObject({
          hospitalLevel: 9,
          clinicLevel: 6,
          ironWallLevel: 5,
        })
      },
    )

    test(
      'reads Portuguese report timestamps',
      async ({ page }) => {
        const parsed = await parseV58Text(
          page,
          '19 de ago de 2026 10:01:46 Relatório de Batalha',
        ) as {
          advanced: {
            timestamp: {
              localDateTime: string
            } | null
          }
        }

        expect(
          parsed.advanced.timestamp?.localDateTime,
        ).toBe('2026-08-19T10:01:46')
      },
    )

    test(
      'reads English and numeric timestamps',
      async ({ page }) => {
        const english = await parseV58Text(
          page,
          'Aug 19, 2026 10:01:46 Battle Report',
        ) as {
          advanced: {
            timestamp: {
              localDateTime: string
            } | null
          }
        }

        const numeric = await parseV58Text(
          page,
          '19/08/2026 23:37:05 Spy Report',
          'spy',
        ) as {
          advanced: {
            timestamp: {
              localDateTime: string
            } | null
          }
        }

        expect(
          english.advanced.timestamp?.localDateTime,
        ).toBe('2026-08-19T10:01:46')

        expect(
          numeric.advanced.timestamp?.localDateTime,
        ).toBe('2026-08-19T23:37:05')
      },
    )

    test(
      'maps explicit Paladin weapon levels to the correct side',
      async ({ page }) => {
        const parsed = await parseV58Text(
          page,
          `
            Battle Report
            Attacker
            Paladin weapon: Halberd of Guan Yu Level 3
            Defender
            Paladin weapon: Baptiste's Banner Level 2
          `,
        ) as {
          advanced: {
            attackerPaladinWeaponPatch: Record<string, number>
            defenderPaladinWeaponPatch: Record<string, number>
          }
        }

        expect(
          parsed.advanced.attackerPaladinWeaponPatch,
        ).toMatchObject({
          spearman: 3,
        })

        expect(
          parsed.advanced.defenderPaladinWeaponPatch,
        ).toMatchObject({
          heavyCavalry: 2,
        })
      },
    )

    test(
      'does not auto-apply a Paladin weapon when its level is unreadable',
      async ({ page }) => {
        const parsed = await parseV58Text(
          page,
          `
            Battle Report
            Attacker
            Paladin weapon: Thorgard's Battle Axe
            Defender
          `,
        ) as {
          advanced: {
            attackerPaladinWeaponPatch: Record<string, number>
            paladinWeapons: Array<{
              unitId: string
              level: number | null
              confidence: string
            }>
          }
        }

        expect(
          parsed.advanced.attackerPaladinWeaponPatch,
        ).toEqual({})

        expect(
          parsed.advanced.paladinWeapons,
        ).toContainEqual(
          expect.objectContaining({
            unitId: 'axe',
            level: null,
            confidence: 'low',
          }),
        )
      },
    )

    test(
      'captures labeled bonuses without guessing unlabeled percentages',
      async ({ page }) => {
        const parsed = await parseV58Text(
          page,
          `
            Battle Report
            Morale 87%
            Weapon Mastery 8%
            Attack modifier 121%
            11%
          `,
        ) as {
          advanced: {
            bonuses: Array<{
              label: string
              percent: number
            }>
          }
        }

        expect(parsed.advanced.bonuses).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              label: 'Morale',
              percent: 87,
            }),
            expect.objectContaining({
              label: 'Weapon Mastery',
              percent: 8,
            }),
            expect.objectContaining({
              label: 'Attack modifier',
              percent: 121,
            }),
          ]),
        )

        expect(
          parsed.advanced.bonuses.some(
            (bonus) => bonus.percent === 11,
          ),
        ).toBe(false)
      },
    )
  },
)

