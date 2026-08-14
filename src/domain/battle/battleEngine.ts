import {
  getBuilding,
  getBuildingHitPoints,
} from '../../data/buildings'

import { units } from '../../data/units'

import type {
  Army,
  BattleResult,
  BattleSideResult,
  BattleSimulationInput,
  CatapultResult,
  CombatGroup,
  CombatGroupResult,
  PaladinWeaponLevels,
  SiegeResult,
} from '../../types/Battle'

import type {
  Unit,
  UnitId,
} from '../../types/Unit'

import {
  calculateAttackerOverallModifier,
  calculateFaithMultiplier,
} from './modifiers'

const unitMap = Object.fromEntries(
  units.map((unit) => [
    unit.id,
    unit,
  ]),
) as Record<UnitId, Unit>

const hospitalBeds = [
  0,
  100,
  129,
  167,
  215,
  278,
  359,
  464,
  599,
  774,
  1000,
]

const infantryUnits: UnitId[] = [
  'spearman',
  'swordsman',
  'axe',
  'berserker',
  'nobleman',
]

const cavalryUnits: UnitId[] = [
  'lightCavalry',
  'heavyCavalry',
]

const archerUnits: UnitId[] = [
  'archer',
  'mountedArcher',
]

const sharedCombatUnits: UnitId[] = [
  'ram',
  'catapult',
  'trebuchet',
  'paladin',
]

const hospitalBasicUnits: UnitId[] = [
  'spearman',
  'swordsman',
  'axe',
  'archer',
]

const hospitalLevelTenUnits: UnitId[] = [
  ...hospitalBasicUnits,
  'lightCavalry',
  'mountedArcher',
  'heavyCavalry',
]

const attackerWeaponBonuses: Partial<
  Record<UnitId, number[]>
> = {
  spearman: [
    0,
    0.05,
    0.1,
    0.2,
  ],

  axe: [
    0,
    0.1,
    0.2,
    0.3,
  ],

  archer: [
    0,
    0.05,
    0.1,
    0.2,
  ],

  lightCavalry: [
    0,
    0.1,
    0.2,
    0.3,
  ],

  catapult: [
    0,
    0.25,
    0.5,
    0.75,
  ],
}

const defenderWeaponBonuses: Partial<
  Record<UnitId, number[]>
> = {
  spearman: [
    0,
    0.1,
    0.2,
    0.3,
  ],

  axe: [
    0,
    0.05,
    0.1,
    0.2,
  ],

  archer: [
    0,
    0.1,
    0.2,
    0.3,
  ],

  lightCavalry: [
    0,
    0.05,
    0.1,
    0.2,
  ],

  heavyCavalry: [
    0,
    0.1,
    0.2,
    0.3,
  ],

  ram: [
    0,
    0.05,
    0.1,
    0.2,
  ],
}

const createEmptyArmy =
  (): Army => {
    return Object.fromEntries(
      units.map((unit) => [
        unit.id,
        0,
      ]),
    ) as Army
  }

const cloneArmy = (
  army: Army,
): Army => ({
  ...army,
})

const excelRound = (
  value: number,
): number => {
  if (value >= 0) {
    return Math.floor(
      value + 0.5,
    )
  }

  return Math.ceil(
    value - 0.5,
  )
}

const roundTo = (
  value: number,
  decimals: number,
): number => {
  const multiplier =
    10 ** decimals

  return (
    Math.round(
      value * multiplier,
    ) / multiplier
  )
}

const getWeaponLevel = (
  weaponLevels: PaladinWeaponLevels,
  unitId: UnitId,
): number => {
  if (
    unitId === 'trebuchet' ||
    unitId === 'nobleman' ||
    unitId === 'paladin'
  ) {
    return 0
  }

  return weaponLevels[unitId]
}

const getAttackerWeaponMultiplier = (
  unitId: UnitId,
  weaponLevels: PaladinWeaponLevels,
): number => {
  const levels =
    attackerWeaponBonuses[
      unitId
    ]

  if (!levels) {
    return 1
  }

  const level = Math.min(
    3,
    Math.max(
      0,
      getWeaponLevel(
        weaponLevels,
        unitId,
      ),
    ),
  )

  return (
    1 +
    levels[level]
  )
}

const getDefenderWeaponMultiplier = (
  unitId: UnitId,
  weaponLevels: PaladinWeaponLevels,
): number => {
  const levels =
    defenderWeaponBonuses[
      unitId
    ]

  if (!levels) {
    return 1
  }

  const level = Math.min(
    3,
    Math.max(
      0,
      getWeaponLevel(
        weaponLevels,
        unitId,
      ),
    ),
  )

  return (
    1 +
    levels[level]
  )
}

const calculateArmyUnits = (
  army: Army,
): number => {
  return units.reduce(
    (
      total,
      unit,
    ) =>
      total +
      army[unit.id],
    0,
  )
}

const calculateArmyProvisions = (
  army: Army,
): number => {
  return units.reduce(
    (
      total,
      unit,
    ) =>
      total +
      army[unit.id] *
        unit.provisions,
    0,
  )
}

const calculateBaseDefense = (
  wallLevel: number,
): number => {
  if (wallLevel <= 0) {
    return 0
  }

  return excelRound(
    Math.pow(
      1.2515,
      wallLevel - 1,
    ) * 20,
  )
}

const calculateDefenderModifier = (
  input: BattleSimulationInput,
  wallLevel: number,
): number => {
  const faith =
    calculateFaithMultiplier(
      input.defenderModifiers
        .churchLevel,
    )

  return (
    faith *
    (
      1 +
      wallLevel * 0.05
    )
  )
}

const getLargestCombatGroup = (
  army: Army,
): CombatGroup => {
  const infantry =
    army.spearman +
    army.swordsman +
    army.axe +
    army.berserker

  const cavalry =
    army.lightCavalry +
    army.heavyCavalry

  const archer =
    army.archer +
    army.mountedArcher

  if (
    infantry > cavalry &&
    infantry > archer
  ) {
    return 'infantry'
  }

  if (
    cavalry > archer
  ) {
    return 'cavalry'
  }

  return 'archer'
}

const getCombatGroupUnits = (
  group: CombatGroup,
  largestGroup: CombatGroup,
): UnitId[] => {
  let groupUnits: UnitId[]

  if (
    group === 'infantry'
  ) {
    groupUnits = [
      ...infantryUnits,
    ]
  } else if (
    group === 'cavalry'
  ) {
    groupUnits = [
      ...cavalryUnits,
    ]
  } else {
    groupUnits = [
      ...archerUnits,
    ]
  }

  if (
    group === largestGroup
  ) {
    groupUnits.push(
      ...sharedCombatUnits,
    )
  }

  return groupUnits
}

const calculateGroupProvisions = (
  army: Army,
  groupUnits: UnitId[],
): number => {
  return groupUnits.reduce(
    (
      total,
      unitId,
    ) => {
      const unit =
        unitMap[unitId]

      return (
        total +
        army[unitId] *
          unit.provisions
      )
    },
    0,
  )
}

const createDefenseAllocation = (
  defender: Army,
  ratio: number,
): Army => {
  const allocation =
    createEmptyArmy()

  units.forEach(
    (unit) => {
      allocation[
        unit.id
      ] = excelRound(
        defender[unit.id] *
          ratio,
      )
    },
  )

  return allocation
}

const createRemainingAllocation = (
  defender: Army,
  firstAllocation: Army,
  secondAllocation: Army,
): Army => {
  const allocation =
    createEmptyArmy()

  units.forEach(
    (unit) => {
      allocation[
        unit.id
      ] = Math.max(
        0,

        defender[unit.id] -
          firstAllocation[
            unit.id
          ] -
          secondAllocation[
            unit.id
          ],
      )
    },
  )

  return allocation
}

const calculateRawAttackStrength = (
  army: Army,
  groupUnits: UnitId[],
  weaponLevels: PaladinWeaponLevels,
  berserkerMultiplier: number,
): number => {
  return groupUnits.reduce(
    (
      total,
      unitId,
    ) => {
      /*
       * A planilha não utiliza
       * Nobleman na força principal
       * dos grupos de ataque.
       */
      if (
        unitId ===
        'nobleman'
      ) {
        return total
      }

      const unit =
        unitMap[unitId]

      let multiplier =
        getAttackerWeaponMultiplier(
          unitId,
          weaponLevels,
        )

      if (
        unitId ===
        'berserker'
      ) {
        multiplier *=
          berserkerMultiplier
      }

      return (
        total +
        army[unitId] *
          unit.attack *
          multiplier
      )
    },
    0,
  )
}

const calculateRawDefenseStrength = (
  army: Army,
  group: CombatGroup,
  weaponLevels: PaladinWeaponLevels,
): number => {
  return units.reduce(
    (
      total,
      unit,
    ) => {
      if (
        unit.id ===
        'nobleman'
      ) {
        return total
      }

      let defenseValue = 0

      if (
        group ===
        'infantry'
      ) {
        defenseValue =
          unit.defenseGeneral
      } else if (
        group ===
        'cavalry'
      ) {
        defenseValue =
          unit.defenseCavalry
      } else {
        defenseValue =
          unit.defenseArcher
      }

      const multiplier =
        getDefenderWeaponMultiplier(
          unit.id,
          weaponLevels,
        )

      return (
        total +
        army[unit.id] *
          defenseValue *
          multiplier
      )
    },
    0,
  )
}

const calculateAttackerLossRate = (
  attackStrength: number,
  defenseStrength: number,
): number => {
  if (
    attackStrength === 0 ||
    defenseStrength === 0
  ) {
    return 0
  }

  if (
    attackStrength <=
    defenseStrength
  ) {
    return 1
  }

  return roundTo(
    Math.pow(
      defenseStrength /
        attackStrength,
      1.5,
    ),
    6,
  )
}

const calculateDefenderLossRate = (
  attackStrength: number,
  defenseStrength: number,
): number => {
  if (
    attackStrength === 0 ||
    defenseStrength === 0
  ) {
    return 0
  }

  if (
    defenseStrength <=
    attackStrength
  ) {
    return 1
  }

  return roundTo(
    Math.pow(
      attackStrength /
        defenseStrength,
      1.5,
    ),
    6,
  )
}

const calculateLossQuantity = (
  quantity: number,
  lossRate: number,
): number => {
  if (
    quantity <= 0 ||
    lossRate <= 0
  ) {
    return 0
  }

  const excelLoss =
    excelRound(
      -quantity *
        lossRate +
        0.000001,
    )

  return Math.min(
    quantity,
    Math.max(
      0,
      -excelLoss,
    ),
  )
}

const applyWallDamage = (
  startingLevel: number,
  minimumLevel: number,
  damage: number,
): number => {
  if (
    startingLevel <=
    minimumLevel
  ) {
    return startingLevel
  }

  return Math.max(
    minimumLevel,
    startingLevel -
      damage,
  )
}

interface PreBattleResult {
  attacker: Army
  wallLevel: number
}

const calculatePreBattle = (
  input: BattleSimulationInput,
): PreBattleResult => {
  const attacker =
    cloneArmy(
      input.attacker,
    )

  const defender =
    input.defender

  const initialWallLevel =
    input.defenderModifiers
      .wallLevel

  const totalSiege =
    attacker.ram +
    attacker.catapult

  /*
   * Esses dois cálculos reproduzem
   * as fórmulas PRE-ROUND da
   * planilha original.
   */
  if (
    totalSiege > 0
  ) {
    if (
      attacker.ram > 0 &&
      defender.trebuchet > 0
    ) {
      const ramLoss =
        Math.min(
          attacker.ram,

          excelRound(
            defender.trebuchet *
              (
                attacker.ram /
                totalSiege
              ),
          ),
        )

      attacker.ram -=
        ramLoss
    }

    if (
      attacker.catapult > 0 &&
      defender.nobleman > 0
    ) {
      const catapultLoss =
        Math.min(
          attacker.catapult,

          excelRound(
            defender.nobleman *
              (
                attacker.catapult /
                totalSiege
              ),
          ),
        )

      attacker.catapult -=
        catapultLoss
    }
  }

  if (
    input.attacker.ram ===
      0 ||
    initialWallLevel ===
      0
  ) {
    return {
      attacker,
      wallLevel:
        initialWallLevel,
    }
  }

  const initialAttackerProvisions =
    calculateArmyProvisions(
      input.attacker,
    )

  const ramProvisions =
    input.attacker.ram *
    unitMap.ram.provisions

  const attackerWithoutRam =
    Math.max(
      0,
      initialAttackerProvisions -
        ramProvisions,
    )

  const defenderProvisions =
    calculateArmyProvisions(
      defender,
    )

  const preBattleDefense =
    calculateBaseDefense(
      initialWallLevel,
    ) +
    defender.nobleman *
      100 +
    defenderProvisions

  const supportRatio =
    attackerWithoutRam ===
      0 ||
    preBattleDefense ===
      0
      ? 0
      : Math.min(
          1,

          attackerWithoutRam /
            preBattleDefense,
        )

  const attackerModifier =
    calculateAttackerOverallModifier(
      input.attackerModifiers,
    )

  const ramAttack =
    attacker.ram *
    supportRatio *
    attackerModifier *
    getAttackerWeaponMultiplier(
      'ram',
      input.attackerPaladinWeapons,
    )

  const wallHitPoints =
    getBuildingHitPoints(
      'wall',
      initialWallLevel,
    ) * 2

  const wallDamage =
    wallHitPoints === 0
      ? 0
      : ramAttack /
        wallHitPoints

  const damagedWall =
    applyWallDamage(
      initialWallLevel,

      input.defenderModifiers
        .ironWallLevel,

      wallDamage,
    )

  return {
    attacker,

    wallLevel:
      excelRound(
        damagedWall,
      ),
  }
}

interface RoundResult {
  attacker: Army
  defender: Army

  groups: CombatGroupResult[]
}

const simulateRound = (
  attacker: Army,
  defender: Army,
  input: BattleSimulationInput,
  largestGroup: CombatGroup,
  berserkerMultiplier: number,
  wallLevel: number,
  includeBaseDefense: boolean,
): RoundResult => {
  const attackerProvisions =
    calculateArmyProvisions(
      attacker,
    )

  const infantryGroupUnits =
    getCombatGroupUnits(
      'infantry',
      largestGroup,
    )

  const cavalryGroupUnits =
    getCombatGroupUnits(
      'cavalry',
      largestGroup,
    )

  const archerGroupUnits =
    getCombatGroupUnits(
      'archer',
      largestGroup,
    )

  const infantryProvisions =
    calculateGroupProvisions(
      attacker,
      infantryGroupUnits,
    )

  const cavalryProvisions =
    calculateGroupProvisions(
      attacker,
      cavalryGroupUnits,
    )

  const infantryRatio =
    attackerProvisions === 0
      ? 0
      : roundTo(
          infantryProvisions /
            attackerProvisions,
          4,
        )

  const cavalryRatio =
    attackerProvisions === 0
      ? 0
      : roundTo(
          cavalryProvisions /
            attackerProvisions,
          4,
        )

  const infantryDefense =
    createDefenseAllocation(
      defender,
      infantryRatio,
    )

  const cavalryDefense =
    createDefenseAllocation(
      defender,
      cavalryRatio,
    )

  const archerDefense =
    createRemainingAllocation(
      defender,
      infantryDefense,
      cavalryDefense,
    )

  const attackerModifier =
    calculateAttackerOverallModifier(
      input.attackerModifiers,
    )

  const defenderModifier =
    calculateDefenderModifier(
      input,
      wallLevel,
    )

  const baseDefense =
    includeBaseDefense
      ? calculateBaseDefense(
          wallLevel,
        )
      : 0

  const attackerLosses =
    createEmptyArmy()

  const defenderLosses =
    createEmptyArmy()

  const groups:
    CombatGroupResult[] = []

  const processGroup = (
    group: CombatGroup,
    groupUnits: UnitId[],
    allocatedDefense: Army,
  ) => {
    const rawAttackStrength =
      calculateRawAttackStrength(
        attacker,
        groupUnits,
        input.attackerPaladinWeapons,
        berserkerMultiplier,
      )

    const attackStrength =
      rawAttackStrength *
      attackerModifier

    const rawDefenseStrength =
      calculateRawDefenseStrength(
        allocatedDefense,
        group,
        input.defenderPaladinWeapons,
      )

    const defenseStrength =
      rawAttackStrength ===
      0
        ? 0
        : rawDefenseStrength *
            defenderModifier +
          baseDefense

    const attackerLossRate =
      calculateAttackerLossRate(
        attackStrength,
        defenseStrength,
      )

    const defenderLossRate =
      calculateDefenderLossRate(
        attackStrength,
        defenseStrength,
      )

    const groupProvisions =
      calculateGroupProvisions(
        attacker,
        groupUnits,
      )

    groupUnits.forEach(
      (unitId) => {
        /*
         * A planilha possui um
         * tratamento especial quando
         * o Nobleman é o único peso
         * existente no grupo.
         */
        if (
          unitId ===
            'nobleman' &&
          attacker.nobleman *
            unitMap.nobleman
              .provisions ===
            groupProvisions
        ) {
          return
        }

        attackerLosses[
          unitId
        ] +=
          calculateLossQuantity(
            attacker[unitId],
            attackerLossRate,
          )
      },
    )

    units.forEach(
      (unit) => {
        defenderLosses[
          unit.id
        ] +=
          calculateLossQuantity(
            allocatedDefense[
              unit.id
            ],
            defenderLossRate,
          )
      },
    )

    groups.push({
      group,
      attackStrength,
      defenseStrength,
      attackerLossRate,
      defenderLossRate,
    })
  }

  processGroup(
    'infantry',
    infantryGroupUnits,
    infantryDefense,
  )

  processGroup(
    'cavalry',
    cavalryGroupUnits,
    cavalryDefense,
  )

  processGroup(
    'archer',
    archerGroupUnits,
    archerDefense,
  )

  const attackerSurvivors =
    createEmptyArmy()

  const defenderSurvivors =
    createEmptyArmy()

  units.forEach(
    (unit) => {
      attackerSurvivors[
        unit.id
      ] = Math.max(
        0,

        attacker[unit.id] -
          attackerLosses[
            unit.id
          ],
      )

      defenderSurvivors[
        unit.id
      ] = Math.max(
        0,

        defender[unit.id] -
          defenderLosses[
            unit.id
          ],
      )
    },
  )

  return {
    attacker:
      attackerSurvivors,

    defender:
      defenderSurvivors,

    groups,
  }
}

const calculateAttackerRevival = (
  losses: Army,
  input: BattleSimulationInput,
): Army => {
  const revived =
    createEmptyArmy()

  const revivalRate =
    (
      input.attackerModifiers
        .medicLevel +
      input.attackerModifiers
        .medicusLevel
    ) *
    0.1

  if (
    revivalRate <= 0
  ) {
    return revived
  }

  units.forEach(
    (unit) => {
      revived[
        unit.id
      ] = Math.min(
        losses[unit.id],

        excelRound(
          losses[unit.id] *
            revivalRate,
        ),
      )
    },
  )

  return revived
}

const calculateDefenderRevival = (
  losses: Army,
  input: BattleSimulationInput,
): Army => {
  const revived =
    createEmptyArmy()

  const hospitalLevel =
    Math.min(
      10,

      Math.max(
        0,
        input.defenderModifiers
          .hospitalLevel,
      ),
    )

  if (
    hospitalLevel === 0
  ) {
    return revived
  }

  const availableBeds =
    hospitalBeds[
      hospitalLevel
    ] +
    input.defenderModifiers
      .clinicLevel *
      100

  const eligibleUnits =
    hospitalLevel < 10
      ? hospitalBasicUnits
      : hospitalLevelTenUnits

  const totalLostProvisions =
    eligibleUnits.reduce(
      (
        total,
        unitId,
      ) =>
        total +
        losses[unitId] *
          unitMap[unitId]
            .provisions,
      0,
    )

  if (
    totalLostProvisions ===
    0
  ) {
    return revived
  }

  eligibleUnits.forEach(
    (unitId) => {
      const rawRevived =
        losses[unitId] *
        (
          availableBeds /
          totalLostProvisions
        )

      revived[
        unitId
      ] = Math.min(
        losses[unitId],

        Math.max(
          0,
          excelRound(
            rawRevived,
          ),
        ),
      )
    },
  )

  return revived
}

const calculateLosses = (
  initialArmy: Army,
  combatSurvivors: Army,
): Army => {
  const losses =
    createEmptyArmy()

  units.forEach(
    (unit) => {
      losses[
        unit.id
      ] = Math.max(
        0,

        initialArmy[
          unit.id
        ] -
          combatSurvivors[
            unit.id
          ],
      )
    },
  )

  return losses
}

const addArmies = (
  first: Army,
  second: Army,
): Army => {
  const result =
    createEmptyArmy()

  units.forEach(
    (unit) => {
      result[
        unit.id
      ] =
        first[unit.id] +
        second[unit.id]
    },
  )

  return result
}

const buildSideResult = (
  initialArmy: Army,
  combatSurvivors: Army,
  revived: Army,
): BattleSideResult => {
  const losses =
    calculateLosses(
      initialArmy,
      combatSurvivors,
    )

  const finalSurvivors =
    addArmies(
      combatSurvivors,
      revived,
    )

  return {
    initialArmy:
      cloneArmy(initialArmy),

    losses:
      cloneArmy(losses),

    revived:
      cloneArmy(revived),

    survivorsBeforeRevival:
      cloneArmy(
        combatSurvivors,
      ),

    survivors:
      finalSurvivors,

    initialUnits:
      calculateArmyUnits(
        initialArmy,
      ),

    lostUnits:
      calculateArmyUnits(
        losses,
      ),

    revivedUnits:
      calculateArmyUnits(
        revived,
      ),

    survivingUnits:
      calculateArmyUnits(
        finalSurvivors,
      ),

    initialProvisions:
      calculateArmyProvisions(
        initialArmy,
      ),

    lostProvisions:
      calculateArmyProvisions(
        losses,
      ),

    revivedProvisions:
      calculateArmyProvisions(
        revived,
      ),

    survivingProvisions:
      calculateArmyProvisions(
        finalSurvivors,
      ),
  }
}

const calculateFinalSiege = (
  input: BattleSimulationInput,
  attackerSurvivors: Army,
  preBattleWallLevel: number,
): SiegeResult => {
  const attackerModifier =
    calculateAttackerOverallModifier(
      input.attackerModifiers,
    )

  const defenderModifier =
    calculateDefenderModifier(
      input,
      preBattleWallLevel,
    )

  const ironWallLevel =
    input.defenderModifiers
      .ironWallLevel

  const wallHitPoints =
    getBuildingHitPoints(
      'wall',
      preBattleWallLevel,
    ) * 2

  const ramAttackStrength =
    attackerSurvivors.ram *
    attackerModifier *
    getAttackerWeaponMultiplier(
      'ram',
      input.attackerPaladinWeapons,
    )

  const finalRamDamage =
    wallHitPoints === 0
      ? 0
      : ramAttackStrength /
        wallHitPoints

  const postBattleWallLevel =
    excelRound(
      applyWallDamage(
        preBattleWallLevel,
        ironWallLevel,
        finalRamDamage,
      ),
    )

  const target =
    input.siegeSettings
      .catapultTarget

  const building =
    getBuilding(target)

  const targetStartingLevel =
    target === 'wall'
      ? postBattleWallLevel
      : Math.min(
          building.maxLevel,

          Math.max(
            0,
            input.siegeSettings
              .catapultTargetLevel,
          ),
        )

  /*
   * A planilha utiliza o multiplicador
   * da coluna do Ram no cálculo final
   * das catapultas. Mantemos a mesma
   * regra para preservar compatibilidade.
   */
  const catapultAttackStrength =
    attackerSurvivors.catapult *
    attackerModifier *
    getAttackerWeaponMultiplier(
      'ram',
      input.attackerPaladinWeapons,
    )

  const targetHitPoints =
    getBuildingHitPoints(
      target,
      targetStartingLevel,
    ) *
    defenderModifier

  const catapultDamage =
    targetHitPoints === 0
      ? 0
      : catapultAttackStrength /
        targetHitPoints

  let postCatapultLevel =
    targetStartingLevel

  if (
    attackerSurvivors
      .catapult >
      0
  ) {
    if (
      target === 'wall'
    ) {
      postCatapultLevel =
        excelRound(
          applyWallDamage(
            targetStartingLevel,
            ironWallLevel,
            catapultDamage,
          ),
        )
    } else {
      postCatapultLevel =
        excelRound(
          Math.max(
            0,

            targetStartingLevel -
              catapultDamage,
          ),
        )
    }
  }

  const finalWallLevel =
    target === 'wall'
      ? postCatapultLevel
      : postBattleWallLevel

  const catapultResult:
    CatapultResult = {
      target,

      targetName:
        building.name,

      startingLevel:
        targetStartingLevel,

      postLevel:
        postCatapultLevel,

      attackStrength:
        catapultAttackStrength,

      targetHitPoints,

      damageLevels:
        catapultDamage,
    }

  return {
    wall: {
      startingLevel:
        input.defenderModifiers
          .wallLevel,

      preBattleLevel:
        preBattleWallLevel,

      postBattleLevel:
        postBattleWallLevel,

      finalLevel:
        finalWallLevel,
    },

    catapult:
      catapultResult,
  }
}

export const simulateBattle = (
  input: BattleSimulationInput,
): BattleResult => {
  const initialAttacker =
    cloneArmy(
      input.attacker,
    )

  const initialDefender =
    cloneArmy(
      input.defender,
    )

  /*
   * Rams can reduce the wall before
   * the normal combat begins.
   */
  const preBattle =
    calculatePreBattle(
      input,
    )

  let currentAttacker =
    cloneArmy(
      preBattle.attacker,
    )

  let currentDefender =
    cloneArmy(
      initialDefender,
    )

  const largestGroup =
    getLargestCombatGroup(
      currentAttacker,
    )

  const initialAttackerProvisions =
    calculateArmyProvisions(
      initialAttacker,
    )

  const initialDefenderProvisions =
    calculateArmyProvisions(
      initialDefender,
    )

  const berserkerMultiplier =
    initialAttackerProvisions *
        2 <=
      initialDefenderProvisions
      ? 2
      : 1

  let firstRoundGroups:
    CombatGroupResult[] = []

  for (
    let round = 1;
    round <= 3;
    round += 1
  ) {
    const roundResult =
      simulateRound(
        currentAttacker,
        currentDefender,
        input,
        largestGroup,
        berserkerMultiplier,
        preBattle.wallLevel,
        round === 1,
      )

    currentAttacker =
      roundResult.attacker

    currentDefender =
      roundResult.defender

    if (
      round === 1
    ) {
      firstRoundGroups =
        roundResult.groups
    }
  }

  /*
   * Siege damage happens using the
   * troops that survived combat,
   * before Medic/Hospital revival.
   */
  const siege =
    calculateFinalSiege(
      input,
      currentAttacker,
      preBattle.wallLevel,
    )

  const attackerLosses =
    calculateLosses(
      initialAttacker,
      currentAttacker,
    )

  const defenderLosses =
    calculateLosses(
      initialDefender,
      currentDefender,
    )

  const attackerRevived =
    calculateAttackerRevival(
      attackerLosses,
      input,
    )

  const defenderRevived =
    calculateDefenderRevival(
      defenderLosses,
      input,
    )

  const attackerResult =
    buildSideResult(
      initialAttacker,
      currentAttacker,
      attackerRevived,
    )

  const defenderResult =
    buildSideResult(
      initialDefender,
      currentDefender,
      defenderRevived,
    )

  const attackStrength =
    firstRoundGroups.reduce(
      (
        total,
        group,
      ) =>
        total +
        group.attackStrength,
      0,
    )

  const defenseStrength =
    firstRoundGroups.reduce(
      (
        total,
        group,
      ) =>
        total +
        group.defenseStrength,
      0,
    )

  let winner:
    BattleResult['winner']

  const combatAttackerUnits =
    calculateArmyUnits(
      currentAttacker,
    )

  const combatDefenderUnits =
    calculateArmyUnits(
      currentDefender,
    )

  if (
    combatAttackerUnits ===
      0 &&
    combatDefenderUnits ===
      0
  ) {
    winner = 'draw'
  } else if (
    combatDefenderUnits ===
    0
  ) {
    winner = 'attacker'
  } else {
    winner = 'defender'
  }

  return {
    winner,

    attackStrength:
      roundTo(
        attackStrength,
        2,
      ),

    defenseStrength:
      roundTo(
        defenseStrength,
        2,
      ),

    attacker:
      attackerResult,

    defender:
      defenderResult,

    groups:
      firstRoundGroups,

    siege,

    warnings: [],
  }
}