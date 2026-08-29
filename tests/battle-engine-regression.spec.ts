import {
  expect,
  test,
} from '@playwright/test'

import {
  simulateBattle,
} from '../src/domain/battle/battleEngine'

import type {
  Army,
  BattleResult,
  BattleSimulationInput,
  PaladinWeaponLevels,
} from '../src/types/Battle'

import type {
  UnitId,
} from '../src/types/Unit'

import {
  units,
} from '../src/data/units'

const emptyArmy = (): Army =>
  Object.fromEntries(
    units.map((unit) => [
      unit.id,
      0,
    ]),
  ) as Army

const army = (
  values: Partial<Army>,
): Army => ({
  ...emptyArmy(),
  ...values,
})

const emptyWeapons =
  (): PaladinWeaponLevels => ({
    spearman: 0,
    swordsman: 0,
    axe: 0,
    archer: 0,
    lightCavalry: 0,
    mountedArcher: 0,
    heavyCavalry: 0,
    ram: 0,
    catapult: 0,
    berserker: 0,
  })

const baseInput = (
  overrides: Partial<BattleSimulationInput> = {},
): BattleSimulationInput => ({
  attacker: emptyArmy(),
  defender: emptyArmy(),

  attackerModifiers: {
    churchLevel: 1,
    morale: 100,
    luck: 0,
    grandmaster: false,
    weaponMasteryLevel: 0,
    medicLevel: 0,
    medicusLevel: 0,
  },

  defenderModifiers: {
    churchLevel: 1,
    hospitalLevel: 0,
    clinicLevel: 0,
    ironWallLevel: 0,
    wallLevel: 0,
  },

  attackerPaladinWeapons:
    emptyWeapons(),

  defenderPaladinWeapons:
    emptyWeapons(),

  siegeSettings: {
    catapultTarget:
      'villageHeadquarters',
    catapultTargetLevel: 20,
  },

  ...overrides,
})

const withAttackerModifiers = (
  input: BattleSimulationInput,
  overrides: Partial<BattleSimulationInput['attackerModifiers']>,
): BattleSimulationInput => ({
  ...input,
  attackerModifiers: {
    ...input.attackerModifiers,
    ...overrides,
  },
})

const withDefenderModifiers = (
  input: BattleSimulationInput,
  overrides: Partial<BattleSimulationInput['defenderModifiers']>,
): BattleSimulationInput => ({
  ...input,
  defenderModifiers: {
    ...input.defenderModifiers,
    ...overrides,
  },
})

const withAttackerWeapons = (
  input: BattleSimulationInput,
  overrides: Partial<PaladinWeaponLevels>,
): BattleSimulationInput => ({
  ...input,
  attackerPaladinWeapons: {
    ...input.attackerPaladinWeapons,
    ...overrides,
  },
})

const withDefenderWeapons = (
  input: BattleSimulationInput,
  overrides: Partial<PaladinWeaponLevels>,
): BattleSimulationInput => ({
  ...input,
  defenderPaladinWeapons: {
    ...input.defenderPaladinWeapons,
    ...overrides,
  },
})

const nonZeroArmy = (
  value: Army,
): Partial<Record<UnitId, number>> =>
  Object.fromEntries(
    units
      .filter((unit) =>
        value[unit.id] !== 0,
      )
      .map((unit) => [
        unit.id,
        value[unit.id],
      ]),
  )

const rounded = (
  value: number,
): number =>
  Number(value.toFixed(6))

const snapshotResult = (
  result: BattleResult,
) => ({
  winner: result.winner,
  attackStrength:
    result.attackStrength,
  defenseStrength:
    result.defenseStrength,

  attacker: {
    losses:
      nonZeroArmy(
        result.attacker.losses,
      ),
    revived:
      nonZeroArmy(
        result.attacker.revived,
      ),
    survivors:
      nonZeroArmy(
        result.attacker.survivors,
      ),
    lostUnits:
      result.attacker.lostUnits,
    revivedUnits:
      result.attacker.revivedUnits,
    survivingUnits:
      result.attacker.survivingUnits,
    lostProvisions:
      result.attacker.lostProvisions,
  },

  defender: {
    losses:
      nonZeroArmy(
        result.defender.losses,
      ),
    revived:
      nonZeroArmy(
        result.defender.revived,
      ),
    survivors:
      nonZeroArmy(
        result.defender.survivors,
      ),
    lostUnits:
      result.defender.lostUnits,
    revivedUnits:
      result.defender.revivedUnits,
    survivingUnits:
      result.defender.survivingUnits,
    lostProvisions:
      result.defender.lostProvisions,
  },

  groups: result.groups.map(
    (group) => ({
      group: group.group,
      attackStrength:
        rounded(
          group.attackStrength,
        ),
      defenseStrength:
        rounded(
          group.defenseStrength,
        ),
      attackerLossRate:
        rounded(
          group.attackerLossRate,
        ),
      defenderLossRate:
        rounded(
          group.defenderLossRate,
        ),
    }),
  ),

  siege: {
    wall: result.siege.wall,
    catapult: {
      target:
        result.siege.catapult.target,
      startingLevel:
        result.siege.catapult.startingLevel,
      postLevel:
        result.siege.catapult.postLevel,
      attackStrength:
        rounded(
          result.siege.catapult.attackStrength,
        ),
      targetHitPoints:
        rounded(
          result.siege.catapult.targetHitPoints,
        ),
      damageLevels:
        rounded(
          result.siege.catapult.damageLevels,
        ),
    },
  },
})

interface RegressionCase {
  name: string
  input: BattleSimulationInput
}

const regressionCases: RegressionCase[] = [
  {
    name: 'basic infantry battle',
    input: baseInput({
      attacker: army({
        axe: 1000,
      }),
      defender: army({
        spearman: 500,
        swordsman: 500,
      }),
    }),
  },
  {
    name: 'basic cavalry battle',
    input: baseInput({
      attacker: army({
        lightCavalry: 500,
      }),
      defender: army({
        spearman: 600,
        swordsman: 200,
      }),
    }),
  },
  {
    name: 'basic archer battle',
    input: baseInput({
      attacker: army({
        archer: 900,
      }),
      defender: army({
        spearman: 400,
        swordsman: 400,
      }),
    }),
  },
  {
    name: 'mixed army battle',
    input: baseInput({
      attacker: army({
        axe: 1200,
        lightCavalry: 350,
        mountedArcher: 220,
        ram: 80,
      }),
      defender: army({
        spearman: 900,
        swordsman: 700,
        archer: 500,
        heavyCavalry: 120,
      }),
    }),
  },
  {
    name: 'empty armies',
    input: baseInput(),
  },
  {
    name: 'empty attacker',
    input: baseInput({
      defender: army({
        spearman: 100,
      }),
    }),
  },
  {
    name: 'empty defender',
    input: baseInput({
      attacker: army({
        axe: 100,
      }),
    }),
  },
  {
    name: 'wall level 20 without rams',
    input: withDefenderModifiers(
      baseInput({
        attacker: army({
          axe: 3000,
        }),
        defender: army({
          spearman: 1000,
          swordsman: 1000,
        }),
      }),
      {
        wallLevel: 20,
      },
    ),
  },
  {
    name: 'ram versus wall level 20',
    input: withDefenderModifiers(
      baseInput({
        attacker: army({
          axe: 4000,
          ram: 300,
        }),
        defender: army({
          spearman: 1000,
          swordsman: 1000,
        }),
      }),
      {
        wallLevel: 20,
      },
    ),
  },
  {
    name: 'iron wall protects minimum wall level',
    input: withDefenderModifiers(
      baseInput({
        attacker: army({
          axe: 6000,
          ram: 800,
        }),
        defender: army({
          spearman: 800,
          swordsman: 800,
        }),
      }),
      {
        wallLevel: 20,
        ironWallLevel: 10,
      },
    ),
  },
  {
    name: 'catapult attacks headquarters',
    input: baseInput({
      attacker: army({
        axe: 5000,
        catapult: 500,
      }),
      defender: army({
        spearman: 300,
      }),
      siegeSettings: {
        catapultTarget:
          'villageHeadquarters',
        catapultTargetLevel: 25,
      },
    }),
  },
  {
    name: 'catapult attacks wall',
    input: withDefenderModifiers(
      baseInput({
        attacker: army({
          axe: 5000,
          catapult: 500,
        }),
        defender: army({
          spearman: 300,
        }),
        siegeSettings: {
          catapultTarget: 'wall',
          catapultTargetLevel: 20,
        },
      }),
      {
        wallLevel: 20,
      },
    ),
  },
  {
    name: 'morale 75 percent',
    input: withAttackerModifiers(
      baseInput({
        attacker: army({
          axe: 2000,
        }),
        defender: army({
          spearman: 800,
          swordsman: 800,
        }),
      }),
      {
        morale: 75,
      },
    ),
  },
  {
    name: 'luck minus 25 percent',
    input: withAttackerModifiers(
      baseInput({
        attacker: army({
          axe: 2000,
        }),
        defender: army({
          spearman: 800,
          swordsman: 800,
        }),
      }),
      {
        luck: -25,
      },
    ),
  },
  {
    name: 'luck plus 25 percent',
    input: withAttackerModifiers(
      baseInput({
        attacker: army({
          axe: 2000,
        }),
        defender: army({
          spearman: 800,
          swordsman: 800,
        }),
      }),
      {
        luck: 25,
      },
    ),
  },
  {
    name: 'attacker without church faith',
    input: withAttackerModifiers(
      baseInput({
        attacker: army({
          axe: 2000,
        }),
        defender: army({
          spearman: 700,
        }),
      }),
      {
        churchLevel: 0,
      },
    ),
  },
  {
    name: 'church level 3 on both sides',
    input: withDefenderModifiers(
      withAttackerModifiers(
        baseInput({
          attacker: army({
            axe: 2000,
          }),
          defender: army({
            spearman: 700,
          }),
        }),
        {
          churchLevel: 3,
        },
      ),
      {
        churchLevel: 3,
      },
    ),
  },
  {
    name: 'grandmaster officer enabled',
    input: withAttackerModifiers(
      baseInput({
        attacker: army({
          axe: 1800,
        }),
        defender: army({
          spearman: 700,
          swordsman: 500,
        }),
      }),
      {
        grandmaster: true,
      },
    ),
  },
  {
    name: 'weapon mastery level 3',
    input: withAttackerModifiers(
      baseInput({
        attacker: army({
          axe: 1800,
        }),
        defender: army({
          spearman: 700,
          swordsman: 500,
        }),
      }),
      {
        weaponMasteryLevel: 3,
      },
    ),
  },
  {
    name: 'attacker paladin spear weapon level 3',
    input: withAttackerWeapons(
      baseInput({
        attacker: army({
          spearman: 2200,
          paladin: 1,
        }),
        defender: army({
          swordsman: 700,
          archer: 500,
        }),
      }),
      {
        spearman: 3,
      },
    ),
  },
  {
    name: 'defender paladin heavy cavalry weapon level 3',
    input: withDefenderWeapons(
      baseInput({
        attacker: army({
          lightCavalry: 800,
        }),
        defender: army({
          heavyCavalry: 250,
          paladin: 1,
        }),
      }),
      {
        heavyCavalry: 3,
      },
    ),
  },
  {
    name: 'hospital level 1 revival',
    input: withDefenderModifiers(
      baseInput({
        attacker: army({
          axe: 4000,
        }),
        defender: army({
          spearman: 1000,
          swordsman: 1000,
          archer: 500,
        }),
      }),
      {
        hospitalLevel: 1,
      },
    ),
  },
  {
    name: 'hospital level 10 cavalry revival',
    input: withDefenderModifiers(
      baseInput({
        attacker: army({
          axe: 8000,
        }),
        defender: army({
          spearman: 1000,
          heavyCavalry: 600,
          mountedArcher: 400,
        }),
      }),
      {
        hospitalLevel: 10,
      },
    ),
  },
  {
    name: 'clinic adds hospital capacity',
    input: withDefenderModifiers(
      baseInput({
        attacker: army({
          axe: 7000,
        }),
        defender: army({
          spearman: 1500,
          swordsman: 1500,
        }),
      }),
      {
        hospitalLevel: 5,
        clinicLevel: 3,
      },
    ),
  },
  {
    name: 'medic and medicus attacker revival',
    input: withAttackerModifiers(
      baseInput({
        attacker: army({
          axe: 1800,
          lightCavalry: 250,
        }),
        defender: army({
          spearman: 1200,
          swordsman: 1000,
        }),
      }),
      {
        medicLevel: 2,
        medicusLevel: 1,
      },
    ),
  },
  {
    name: 'nobleman alone',
    input: baseInput({
      attacker: army({
        nobleman: 1,
      }),
      defender: army({
        spearman: 50,
      }),
    }),
  },
  {
    name: 'nobleman with escort',
    input: baseInput({
      attacker: army({
        axe: 1500,
        lightCavalry: 300,
        nobleman: 1,
      }),
      defender: army({
        spearman: 500,
        swordsman: 500,
      }),
    }),
  },
  {
    name: 'trebuchet destroys pre battle rams',
    input: withDefenderModifiers(
      baseInput({
        attacker: army({
          axe: 2500,
          ram: 300,
        }),
        defender: army({
          spearman: 600,
          trebuchet: 80,
        }),
      }),
      {
        wallLevel: 15,
      },
    ),
  },
  {
    name: 'defender nobleman destroys pre battle catapults',
    input: baseInput({
      attacker: army({
        axe: 3000,
        catapult: 300,
      }),
      defender: army({
        spearman: 500,
        nobleman: 50,
      }),
    }),
  },
  {
    name: 'berserker underdog multiplier',
    input: baseInput({
      attacker: army({
        berserker: 100,
      }),
      defender: army({
        spearman: 1800,
        swordsman: 1200,
      }),
    }),
  },
]

test.describe(
  'Battle Engine mathematical regression',
  () => {
    for (
      const regressionCase of
      regressionCases
    ) {
      test(
        regressionCase.name,
        () => {
          const result =
            simulateBattle(
              regressionCase.input,
            )

          expect(
            JSON.stringify(
              snapshotResult(result),
              null,
              2,
            ),
          ).toMatchSnapshot(
            `${regressionCase.name}.txt`,
          )
        },
      )
    }
  },
)

const expectFinite = (
  value: number,
) => {
  expect(
    Number.isFinite(value),
  ).toBe(true)
}

const expectArmyInvariant = (
  initial: Army,
  losses: Army,
  revived: Army,
  survivors: Army,
) => {
  for (const unit of units) {
    const unitId = unit.id

    expect(
      losses[unitId],
    ).toBeGreaterThanOrEqual(0)

    expect(
      losses[unitId],
    ).toBeLessThanOrEqual(
      initial[unitId],
    )

    expect(
      revived[unitId],
    ).toBeGreaterThanOrEqual(0)

    expect(
      revived[unitId],
    ).toBeLessThanOrEqual(
      losses[unitId],
    )

    expect(
      survivors[unitId],
    ).toBeGreaterThanOrEqual(0)

    expect(
      survivors[unitId],
    ).toBeLessThanOrEqual(
      initial[unitId],
    )

    expectFinite(losses[unitId])
    expectFinite(revived[unitId])
    expectFinite(survivors[unitId])

    expect(
      Number.isInteger(
        losses[unitId],
      ),
    ).toBe(true)

    expect(
      Number.isInteger(
        revived[unitId],
      ),
    ).toBe(true)

    expect(
      Number.isInteger(
        survivors[unitId],
      ),
    ).toBe(true)
  }
}

test.describe(
  'Battle Engine invariants',
  () => {
    test(
      'all regression cases preserve army and numeric invariants',
      () => {
        for (
          const regressionCase of
          regressionCases
        ) {
          const result =
            simulateBattle(
              regressionCase.input,
            )

          expectFinite(
            result.attackStrength,
          )
          expectFinite(
            result.defenseStrength,
          )

          expectArmyInvariant(
            regressionCase.input
              .attacker,
            result.attacker.losses,
            result.attacker.revived,
            result.attacker.survivors,
          )

          expectArmyInvariant(
            regressionCase.input
              .defender,
            result.defender.losses,
            result.defender.revived,
            result.defender.survivors,
          )

          expect(
            result.siege.wall
              .finalLevel,
          ).toBeGreaterThanOrEqual(0)

          expect(
            result.siege.catapult
              .postLevel,
          ).toBeGreaterThanOrEqual(0)

          for (
            const group of
            result.groups
          ) {
            expectFinite(
              group.attackStrength,
            )
            expectFinite(
              group.defenseStrength,
            )
            expectFinite(
              group.attackerLossRate,
            )
            expectFinite(
              group.defenderLossRate,
            )
          }
        }
      },
    )

    test(
      'simulation is deterministic for fixed input and luck',
      () => {
        const input =
          withAttackerModifiers(
            withDefenderModifiers(
              baseInput({
                attacker: army({
                  axe: 3500,
                  lightCavalry: 700,
                  ram: 150,
                  catapult: 80,
                  paladin: 1,
                }),
                defender: army({
                  spearman: 1300,
                  swordsman: 1000,
                  archer: 900,
                  heavyCavalry: 200,
                  paladin: 1,
                }),
              }),
              {
                wallLevel: 18,
                hospitalLevel: 5,
              },
            ),
            {
              luck: 17,
              morale: 92,
              grandmaster: true,
            },
          )

        const first =
          simulateBattle(input)
        const second =
          simulateBattle(input)

        expect(second).toEqual(first)
      },
    )

    test(
      'large armies do not overflow or produce invalid values',
      () => {
        const input =
          withDefenderModifiers(
            baseInput({
              attacker: army({
                axe: 5_000_000,
                lightCavalry: 2_000_000,
                mountedArcher: 1_000_000,
                ram: 250_000,
                catapult: 100_000,
              }),
              defender: army({
                spearman: 4_000_000,
                swordsman: 3_000_000,
                archer: 2_000_000,
                heavyCavalry: 750_000,
              }),
            }),
            {
              wallLevel: 20,
              hospitalLevel: 10,
              clinicLevel: 5,
              ironWallLevel: 5,
            },
          )

        const result =
          simulateBattle(input)

        expectFinite(
          result.attackStrength,
        )
        expectFinite(
          result.defenseStrength,
        )

        expectArmyInvariant(
          input.attacker,
          result.attacker.losses,
          result.attacker.revived,
          result.attacker.survivors,
        )

        expectArmyInvariant(
          input.defender,
          result.defender.losses,
          result.defender.revived,
          result.defender.survivors,
        )
      },
    )

    test(
      'fixed luck extremes remain ordered by attacker strength',
      () => {
        const common =
          baseInput({
            attacker: army({
              axe: 2500,
            }),
            defender: army({
              spearman: 1000,
              swordsman: 700,
            }),
          })

        const minus =
          simulateBattle(
            withAttackerModifiers(
              common,
              {
                luck: -25,
              },
            ),
          )

        const neutral =
          simulateBattle(common)

        const plus =
          simulateBattle(
            withAttackerModifiers(
              common,
              {
                luck: 25,
              },
            ),
          )

        expect(
          minus.attackStrength,
        ).toBeLessThan(
          neutral.attackStrength,
        )

        expect(
          neutral.attackStrength,
        ).toBeLessThan(
          plus.attackStrength,
        )
      },
    )
  },
)
