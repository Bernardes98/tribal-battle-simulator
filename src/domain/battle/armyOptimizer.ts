import { units } from '../../data/units'

import {
  simulateBattle,
} from './battleEngine'

import type {
  Army,
  BattleResult,
  BattleSimulationInput,
} from '../../types/Battle'

import type {
  UnitId,
} from '../../types/Unit'

export type ArmyOptimizerMode =
  | 'currentLuck'
  | 'worstCase'

export interface ArmyOptimizerResult {
  success: boolean

  mode: ArmyOptimizerMode

  luck: number

  multiplier: number

  originalArmy: Army
  recommendedArmy: Army | null

  originalProvisions: number
  recommendedProvisions: number

  savedProvisions: number

  battleResult: BattleResult | null

  simulations: number

  message: string
}

const createEmptyArmy = (): Army => {
  return Object.fromEntries(
    units.map((unit) => [
      unit.id,
      0,
    ]),
  ) as Army
}

const calculateProvisions = (
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

const hasCombatUnits = (
  army: Army,
): boolean => {
  return units.some(
    (unit) =>
      unit.id !== 'paladin' &&
      unit.id !== 'nobleman' &&
      army[unit.id] > 0,
  )
}

/*
 * Paladin e Nobleman são tratados
 * como unidades especiais.
 *
 * Se existirem no exército original,
 * permanecem com a mesma quantidade
 * durante o redimensionamento.
 */
const scaleArmy = (
  army: Army,
  multiplier: number,
): Army => {
  const result =
    createEmptyArmy()

  units.forEach((unit) => {
    const quantity =
      army[unit.id]

    if (quantity <= 0) {
      result[unit.id] = 0
      return
    }

    if (
      unit.id === 'paladin' ||
      unit.id === 'nobleman'
    ) {
      result[unit.id] =
        quantity

      return
    }

    result[unit.id] =
      Math.max(
        0,
        Math.ceil(
          quantity *
            multiplier,
        ),
      )
  })

  return result
}

const buildSimulationInput = (
  original:
    BattleSimulationInput,
  attacker: Army,
  luck: number,
): BattleSimulationInput => {
  return {
    ...original,

    attacker,

    attackerModifiers: {
      ...original.attackerModifiers,

      luck,
    },
  }
}

const isVictory = (
  result: BattleResult,
): boolean => {
  return (
    result.winner ===
    'attacker'
  )
}

export const optimizeArmy = (
  input: BattleSimulationInput,
  mode: ArmyOptimizerMode,
): ArmyOptimizerResult => {
  const originalArmy = {
    ...input.attacker,
  }

  const originalProvisions =
    calculateProvisions(
      originalArmy,
    )

  const luck =
    mode === 'worstCase'
      ? -15
      : input.attackerModifiers
          .luck

  if (
    !hasCombatUnits(
      originalArmy,
    )
  ) {
    return {
      success: false,

      mode,
      luck,

      multiplier: 0,

      originalArmy,
      recommendedArmy: null,

      originalProvisions,

      recommendedProvisions: 0,
      savedProvisions: 0,

      battleResult: null,

      simulations: 0,

      message:
        'Add combat units to the attacking army before running the optimizer.',
    }
  }

  let simulations = 0

  const simulateMultiplier = (
    multiplier: number,
  ) => {
    const army =
      scaleArmy(
        originalArmy,
        multiplier,
      )

    const result =
      simulateBattle(
        buildSimulationInput(
          input,
          army,
          luck,
        ),
      )

    simulations += 1

    return {
      army,
      result,
    }
  }

  /*
   * Primeiro procuramos um limite
   * superior que consiga vencer.
   *
   * Se o exército atual já vence,
   * começamos em 1x.
   *
   * Caso não vença, aumentamos:
   *
   * 1x
   * 1.5x
   * 2x
   * 3x
   * 4x
   * ...
   */
  let low = 0
  let high = 1

  let highSimulation =
    simulateMultiplier(high)

  const maxMultiplier = 10

  while (
    !isVictory(
      highSimulation.result,
    ) &&
    high <
      maxMultiplier
  ) {
    low = high

    high =
      Math.min(
        maxMultiplier,
        high * 1.5,
      )

    highSimulation =
      simulateMultiplier(high)
  }

  if (
    !isVictory(
      highSimulation.result,
    )
  ) {
    return {
      success: false,

      mode,
      luck,

      multiplier: high,

      originalArmy,
      recommendedArmy: null,

      originalProvisions,

      recommendedProvisions: 0,
      savedProvisions: 0,

      battleResult:
        highSimulation.result,

      simulations,

      message:
        'No winning army was found up to 10x the current composition.',
    }
  }

  /*
   * Binary Search.
   *
   * Encontramos aproximadamente o
   * menor multiplicador capaz de
   * vencer.
   */
  for (
    let iteration = 0;
    iteration < 24;
    iteration += 1
  ) {
    const middle =
      (low + high) / 2

    const middleSimulation =
      simulateMultiplier(
        middle,
      )

    if (
      isVictory(
        middleSimulation.result,
      )
    ) {
      high = middle

      highSimulation =
        middleSimulation
    } else {
      low = middle
    }
  }

  /*
   * Como as unidades precisam ser
   * inteiras, fazemos uma segunda
   * busca em pequenos passos ao redor
   * do resultado obtido.
   */
  let bestArmy =
    highSimulation.army

  let bestResult =
    highSimulation.result

  let bestMultiplier =
    high

  const refinementStart =
    Math.max(
      0,
      high - 0.02,
    )

  const refinementEnd =
    high + 0.002

  for (
    let multiplier =
      refinementStart;
    multiplier <=
    refinementEnd;
    multiplier += 0.0005
  ) {
    const simulation =
      simulateMultiplier(
        multiplier,
      )

    if (
      !isVictory(
        simulation.result,
      )
    ) {
      continue
    }

    const provisions =
      calculateProvisions(
        simulation.army,
      )

    const bestProvisions =
      calculateProvisions(
        bestArmy,
      )

    if (
      provisions <
      bestProvisions
    ) {
      bestArmy =
        simulation.army

      bestResult =
        simulation.result

      bestMultiplier =
        multiplier
    }
  }

  const recommendedProvisions =
    calculateProvisions(
      bestArmy,
    )

  return {
    success: true,

    mode,
    luck,

    multiplier:
      bestMultiplier,

    originalArmy,

    recommendedArmy:
      bestArmy,

    originalProvisions,

    recommendedProvisions,

    savedProvisions:
      originalProvisions -
      recommendedProvisions,

    battleResult:
      bestResult,

    simulations,

    message:
      'Minimum proportional army found successfully.',
  }
}