import type {
  Army,
  BattleResult,
  BattleSimulationInput,
} from '../../types/Battle'

import { simulateBattle } from './battleEngine'

export interface WallRamPlannerOptions {
  targetWallLevel: number
  minimumLuck: number
  requireAttackerVictory: boolean
  maxRams: number
}

export interface WallRamPlannerResult {
  success: boolean
  currentWallLevel: number
  targetWallLevel: number
  minimumLuck: number
  requireAttackerVictory: boolean
  currentRams: number
  recommendedRams: number | null
  additionalRams: number
  recommendedArmy: Army | null
  battleResult: BattleResult | null
  simulations: number
  message: string
}

const clampInteger = (
  value: number,
  minimum: number,
  maximum: number,
): number => {
  if (!Number.isFinite(value)) {
    return minimum
  }

  return Math.max(
    minimum,
    Math.min(
      maximum,
      Math.floor(value),
    ),
  )
}

const clampLuck = (
  value: number,
): number => {
  if (!Number.isFinite(value)) {
    return -15
  }

  return Math.max(
    -15,
    Math.min(15, value),
  )
}

const cloneArmy = (
  army: Army,
): Army => ({
  ...army,
})

const createInputWithRams = (
  input: BattleSimulationInput,
  ramCount: number,
  minimumLuck: number,
): BattleSimulationInput => ({
  ...input,
  attacker: {
    ...input.attacker,
    ram: ramCount,
  },
  attackerModifiers: {
    ...input.attackerModifiers,
    luck: minimumLuck,
  },
})

export const calculateWallRamPlan = (
  input: BattleSimulationInput,
  options: WallRamPlannerOptions,
): WallRamPlannerResult => {
  const currentWallLevel =
    clampInteger(
      input.defenderModifiers.wallLevel,
      0,
      20,
    )

  const targetWallLevel =
    clampInteger(
      options.targetWallLevel,
      0,
      currentWallLevel,
    )

  const minimumLuck =
    clampLuck(
      options.minimumLuck,
    )

  const currentRams =
    Math.max(
      0,
      Math.floor(
        input.attacker.ram ?? 0,
      ),
    )

  const maxRams =
    clampInteger(
      options.maxRams,
      1,
      500_000,
    )

  let simulations = 0

  const simulateWithRams = (
    ramCount: number,
  ): BattleResult => {
    simulations += 1

    return simulateBattle(
      createInputWithRams(
        input,
        ramCount,
        minimumLuck,
      ),
    )
  }

  const reachesGoal = (
    battleResult: BattleResult,
  ): boolean => {
    const reachesWallTarget =
      battleResult.siege.wall.finalLevel <=
      targetWallLevel

    const reachesVictoryTarget =
      !options.requireAttackerVictory ||
      battleResult.winner === 'attacker'

    return (
      reachesWallTarget &&
      reachesVictoryTarget
    )
  }

  const zeroRamResult =
    simulateWithRams(0)

  if (
    reachesGoal(
      zeroRamResult,
    )
  ) {
    const recommendedArmy =
      cloneArmy(
        input.attacker,
      )

    recommendedArmy.ram = 0

    return {
      success: true,
      currentWallLevel,
      targetWallLevel,
      minimumLuck,
      requireAttackerVictory:
        options.requireAttackerVictory,
      currentRams,
      recommendedRams: 0,
      additionalRams:
        -currentRams,
      recommendedArmy,
      battleResult:
        zeroRamResult,
      simulations,
      message:
        currentWallLevel <= targetWallLevel
          ? 'The wall is already at or below the requested target.'
          : 'The current non-ram army already reaches the requested wall target without rams.',
    }
  }

  let upperBound =
    Math.min(
      maxRams,
      Math.max(
        1,
        currentRams,
      ),
    )

  let upperResult =
    simulateWithRams(
      upperBound,
    )

  while (
    !reachesGoal(
      upperResult,
    ) &&
    upperBound < maxRams
  ) {
    upperBound =
      Math.min(
        maxRams,
        upperBound * 2,
      )

    upperResult =
      simulateWithRams(
        upperBound,
      )
  }

  if (
    !reachesGoal(
      upperResult,
    )
  ) {
    return {
      success: false,
      currentWallLevel,
      targetWallLevel,
      minimumLuck,
      requireAttackerVictory:
        options.requireAttackerVictory,
      currentRams,
      recommendedRams: null,
      additionalRams: 0,
      recommendedArmy: null,
      battleResult: null,
      simulations,
      message:
        options.requireAttackerVictory
          ? `No attack with up to ${maxRams.toLocaleString('en-US')} rams both wins the battle and reaches wall level ${targetWallLevel}. Add more combat troops, increase the ram limit, or disable the victory requirement.`
          : `No attack with up to ${maxRams.toLocaleString('en-US')} rams reaches wall level ${targetWallLevel}. Increase the ram limit or strengthen the attacking army.`,
    }
  }

  let low = 0
  let high = upperBound

  while (
    low + 1 < high
  ) {
    const middle =
      Math.floor(
        (low + high) / 2,
      )

    const middleResult =
      simulateWithRams(
        middle,
      )

    if (
      reachesGoal(
        middleResult,
      )
    ) {
      high = middle
    } else {
      low = middle
    }
  }

  /*
   * Siege calculations can contain integer rounding.
   * Binary search gets us very close; this small local
   * refinement protects the exact minimum around a
   * rounding boundary without making the planner slow.
   */
  const refinementStart =
    Math.max(
      0,
      high - 24,
    )

  let recommendedRams = high
  let recommendedResult =
    simulateWithRams(
      high,
    )

  for (
    let ramCount = refinementStart;
    ramCount < high;
    ramCount += 1
  ) {
    const candidateResult =
      simulateWithRams(
        ramCount,
      )

    if (
      reachesGoal(
        candidateResult,
      )
    ) {
      recommendedRams =
        ramCount
      recommendedResult =
        candidateResult
      break
    }
  }

  const recommendedArmy =
    cloneArmy(
      input.attacker,
    )

  recommendedArmy.ram =
    recommendedRams

  return {
    success: true,
    currentWallLevel,
    targetWallLevel,
    minimumLuck,
    requireAttackerVictory:
      options.requireAttackerVictory,
    currentRams,
    recommendedRams,
    additionalRams:
      recommendedRams -
      currentRams,
    recommendedArmy,
    battleResult:
      recommendedResult,
    simulations,
    message:
      'Minimum ram count found for the selected wall target and battle conditions.',
  }
}
