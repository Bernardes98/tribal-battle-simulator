import { units } from '../../data/units'

import {
  simulateBattle,
} from '../battle/battleEngine'

import type {
  Army,
  BattleResult,
  BattleSimulationInput,
} from '../../types/Battle'

import type {
  AttackCandidateAnalysis,
} from './attackCandidateAnalyzer'

export type RecommendedAttackMode =
  | 'safe'
  | 'current'
  | 'best'

export interface RecommendedAttackCompositionResult {
  mode: RecommendedAttackMode
  luck: number
  possible: boolean
  recommendedArmy: Army
  result: BattleResult | null
  originalUnits: number
  recommendedUnits: number
  savedUnits: number
  originalProvisions: number
  recommendedProvisions: number
  savedProvisions: number
  savedProvisionsPercent: number
  iterations: number
}

const createEmptyArmy =
  (): Army => {
    return Object.fromEntries(
      units.map(
        (unit) => [
          unit.id,
          0,
        ],
      ),
    ) as Army
  }

const cloneArmy = (
  army: Army,
): Army => {
  return {
    ...army,
  }
}

const countUnits = (
  army: Army,
): number => {
  return units.reduce(
    (
      total,
      unit,
    ) =>
      total +
      (
        army[
          unit.id
        ] ??
        0
      ),
    0,
  )
}

const countProvisions = (
  army: Army,
): number => {
  return units.reduce(
    (
      total,
      unit,
    ) =>
      total +
      (
        army[
          unit.id
        ] ??
        0
      ) *
        unit.provisions,
    0,
  )
}

const modeLuck = (
  mode:
    RecommendedAttackMode,
  input:
    BattleSimulationInput,
): number => {
  if (
    mode ===
    'safe'
  ) {
    return -15
  }

  if (
    mode ===
    'best'
  ) {
    return 15
  }

  return input
    .attackerModifiers
    .luck
}

const buildInput = (
  input:
    BattleSimulationInput,
  candidate:
    AttackCandidateAnalysis,
  attacker: Army,
  luck: number,
): BattleSimulationInput => {
  const target =
    candidate.ranking
      .entry
      .village
      .latest
      .input

  return {
    attacker: {
      ...attacker,
    },

    defender: {
      ...target.defender,
    },

    attackerModifiers: {
      ...input.attackerModifiers,
      luck,
    },

    defenderModifiers: {
      ...target.defenderModifiers,
    },

    attackerPaladinWeapons: {
      ...input.attackerPaladinWeapons,
    },

    defenderPaladinWeapons: {
      ...target.defenderPaladinWeapons,
    },

    siegeSettings: {
      ...input.siegeSettings,
    },
  }
}

const simulateArmy = (
  input:
    BattleSimulationInput,
  candidate:
    AttackCandidateAnalysis,
  army: Army,
  luck: number,
): BattleResult => {
  return simulateBattle(
    buildInput(
      input,
      candidate,
      army,
      luck,
    ),
  )
}

const armyWins = (
  input:
    BattleSimulationInput,
  candidate:
    AttackCandidateAnalysis,
  army: Army,
  luck: number,
): boolean => {
  return (
    simulateArmy(
      input,
      candidate,
      army,
      luck,
    ).winner ===
    'attacker'
  )
}

const scaleArmy = (
  army: Army,
  scale: number,
): Army => {
  const result =
    createEmptyArmy()

  for (
    const unit
    of units
  ) {
    const available =
      army[
        unit.id
      ] ??
      0

    if (
      available <=
      0
    ) {
      continue
    }

    result[
      unit.id
    ] =
      Math.min(
        available,
        Math.max(
          0,
          Math.ceil(
            available *
              scale,
          ),
        ),
      )
  }

  return result
}

const minimizeSingleUnit =
  (
    input:
      BattleSimulationInput,
    candidate:
      AttackCandidateAnalysis,
    army: Army,
    unitId:
      (typeof units)[number]['id'],
    luck: number,
  ): {
    army: Army
    iterations: number
  } => {
    const current =
      army[
        unitId
      ] ??
      0

    if (
      current <=
      0
    ) {
      return {
        army,
        iterations: 0,
      }
    }

    let low = 0
    let high =
      current

    let iterations = 0

    while (
      low <
      high
    ) {
      iterations += 1

      const middle =
        Math.floor(
          (
            low +
            high
          ) /
            2,
        )

      const testArmy = {
        ...army,
        [unitId]:
          middle,
      }

      if (
        armyWins(
          input,
          candidate,
          testArmy,
          luck,
        )
      ) {
        high =
          middle
      } else {
        low =
          middle +
          1
      }
    }

    return {
      army: {
        ...army,
        [unitId]:
          low,
      },
      iterations,
    }
  }

export const recommendAttackComposition =
  (
    input:
      BattleSimulationInput,
    candidate:
      AttackCandidateAnalysis,
    mode:
      RecommendedAttackMode,
  ): RecommendedAttackCompositionResult => {
    const availableArmy =
      cloneArmy(
        input.attacker,
      )

    const originalUnits =
      countUnits(
        availableArmy,
      )

    const originalProvisions =
      countProvisions(
        availableArmy,
      )

    const luck =
      modeLuck(
        mode,
        input,
      )

    if (
      originalUnits <=
      0 ||
      !armyWins(
        input,
        candidate,
        availableArmy,
        luck,
      )
    ) {
      return {
        mode,
        luck,
        possible: false,
        recommendedArmy:
          availableArmy,
        result:
          originalUnits >
          0
            ? simulateArmy(
                input,
                candidate,
                availableArmy,
                luck,
              )
            : null,
        originalUnits,
        recommendedUnits:
          originalUnits,
        savedUnits: 0,
        originalProvisions,
        recommendedProvisions:
          originalProvisions,
        savedProvisions: 0,
        savedProvisionsPercent: 0,
        iterations: 0,
      }
    }

    let low = 0
    let high = 1

    let recommendedArmy =
      availableArmy

    let iterations = 0

    for (
      let index = 0
      index < 18
      index += 1
    ) {
      iterations += 1

      const middle =
        (
          low +
          high
        ) /
        2

      const testArmy =
        scaleArmy(
          availableArmy,
          middle,
        )

      if (
        armyWins(
          input,
          candidate,
          testArmy,
          luck,
        )
      ) {
        recommendedArmy =
          testArmy

        high =
          middle
      } else {
        low =
          middle
      }
    }

    const unitsByProvision =
      [
        ...units,
      ].sort(
        (
          left,
          right,
        ) =>
          right.provisions -
          left.provisions,
      )

    for (
      let pass = 0
      pass < 2
      pass += 1
    ) {
      for (
        const unit
        of unitsByProvision
      ) {
        const minimized =
          minimizeSingleUnit(
            input,
            candidate,
            recommendedArmy,
            unit.id,
            luck,
          )

        recommendedArmy =
          minimized.army

        iterations +=
          minimized.iterations
      }
    }

    const result =
      simulateArmy(
        input,
        candidate,
        recommendedArmy,
        luck,
      )

    const recommendedUnits =
      countUnits(
        recommendedArmy,
      )

    const recommendedProvisions =
      countProvisions(
        recommendedArmy,
      )

    const savedUnits =
      Math.max(
        0,
        originalUnits -
          recommendedUnits,
      )

    const savedProvisions =
      Math.max(
        0,
        originalProvisions -
          recommendedProvisions,
      )

    const savedProvisionsPercent =
      originalProvisions >
      0
        ? (
            savedProvisions /
            originalProvisions
          ) *
          100
        : 0

    return {
      mode,
      luck,
      possible:
        result.winner ===
        'attacker',
      recommendedArmy,
      result,
      originalUnits,
      recommendedUnits,
      savedUnits,
      originalProvisions,
      recommendedProvisions,
      savedProvisions,
      savedProvisionsPercent,
      iterations,
    }
  }
