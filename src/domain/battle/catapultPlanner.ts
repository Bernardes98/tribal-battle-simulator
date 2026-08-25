import type {
  Army,
  BattleResult,
  BattleSimulationInput,
} from '../../types/Battle'

import { simulateBattle } from './battleEngine'

export interface CatapultPlannerOptions {
  targetBuildingLevel: number
  minimumLuck: number
  requireAttackerVictory: boolean
  maxCatapults: number
}

export interface CatapultPlannerResult {
  success: boolean
  targetBuilding: BattleSimulationInput['siegeSettings']['catapultTarget']
  currentBuildingLevel: number
  targetBuildingLevel: number
  minimumLuck: number
  requireAttackerVictory: boolean
  currentCatapults: number
  recommendedCatapults: number | null
  additionalCatapults: number
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

const createInputWithCatapults = (
  input: BattleSimulationInput,
  catapultCount: number,
  minimumLuck: number,
): BattleSimulationInput => ({
  ...input,
  attacker: {
    ...input.attacker,
    catapult: catapultCount,
  },
  attackerModifiers: {
    ...input.attackerModifiers,
    luck: minimumLuck,
  },
})

export const calculateCatapultPlan = (
  input: BattleSimulationInput,
  options: CatapultPlannerOptions,
): CatapultPlannerResult => {
  const currentBuildingLevel =
    clampInteger(
      input.siegeSettings
        .catapultTargetLevel,
      0,
      100,
    )

  const targetBuildingLevel =
    clampInteger(
      options.targetBuildingLevel,
      0,
      currentBuildingLevel,
    )

  const minimumLuck =
    clampLuck(
      options.minimumLuck,
    )

  const currentCatapults =
    Math.max(
      0,
      Math.floor(
        input.attacker.catapult ?? 0,
      ),
    )

  const maxCatapults =
    clampInteger(
      options.maxCatapults,
      1,
      500_000,
    )

  let simulations = 0

  const simulateWithCatapults = (
    catapultCount: number,
  ): BattleResult => {
    simulations += 1

    return simulateBattle(
      createInputWithCatapults(
        input,
        catapultCount,
        minimumLuck,
      ),
    )
  }

  const reachesGoal = (
    battleResult: BattleResult,
  ): boolean => {
    const reachesBuildingTarget =
      battleResult.siege.catapult
        .postLevel <=
      targetBuildingLevel

    const reachesVictoryTarget =
      !options.requireAttackerVictory ||
      battleResult.winner === 'attacker'

    return (
      reachesBuildingTarget &&
      reachesVictoryTarget
    )
  }

  const zeroCatapultResult =
    simulateWithCatapults(0)

  if (
    reachesGoal(
      zeroCatapultResult,
    )
  ) {
    const recommendedArmy =
      cloneArmy(
        input.attacker,
      )

    recommendedArmy.catapult = 0

    return {
      success: true,
      targetBuilding:
        input.siegeSettings
          .catapultTarget,
      currentBuildingLevel,
      targetBuildingLevel,
      minimumLuck,
      requireAttackerVictory:
        options.requireAttackerVictory,
      currentCatapults,
      recommendedCatapults: 0,
      additionalCatapults:
        -currentCatapults,
      recommendedArmy,
      battleResult:
        zeroCatapultResult,
      simulations,
      message:
        currentBuildingLevel <=
        targetBuildingLevel
          ? 'The selected building is already at or below the requested target level.'
          : 'The current non-catapult army already reaches the requested building level without catapults.',
    }
  }

  let upperBound =
    Math.min(
      maxCatapults,
      Math.max(
        1,
        currentCatapults,
      ),
    )

  let upperResult =
    simulateWithCatapults(
      upperBound,
    )

  while (
    !reachesGoal(
      upperResult,
    ) &&
    upperBound < maxCatapults
  ) {
    upperBound =
      Math.min(
        maxCatapults,
        upperBound * 2,
      )

    upperResult =
      simulateWithCatapults(
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
      targetBuilding:
        input.siegeSettings
          .catapultTarget,
      currentBuildingLevel,
      targetBuildingLevel,
      minimumLuck,
      requireAttackerVictory:
        options.requireAttackerVictory,
      currentCatapults,
      recommendedCatapults: null,
      additionalCatapults: 0,
      recommendedArmy: null,
      battleResult: null,
      simulations,
      message:
        options.requireAttackerVictory
          ? `No attack with up to ${maxCatapults.toLocaleString('en-US')} catapults both wins the battle and reduces the selected building to level ${targetBuildingLevel}. Add more combat troops, increase the catapult limit, or disable the victory requirement.`
          : `No attack with up to ${maxCatapults.toLocaleString('en-US')} catapults reduces the selected building to level ${targetBuildingLevel}. Increase the catapult limit or strengthen the attacking army.`,
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
      simulateWithCatapults(
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
   * Catapult damage uses integer rounding. The local
   * refinement around the binary-search boundary keeps
   * the result exact without making the planner slow.
   */
  const refinementStart =
    Math.max(
      0,
      high - 24,
    )

  let recommendedCatapults =
    high

  let recommendedResult =
    simulateWithCatapults(
      high,
    )

  for (
    let catapultCount =
      refinementStart;
    catapultCount < high;
    catapultCount += 1
  ) {
    const candidateResult =
      simulateWithCatapults(
        catapultCount,
      )

    if (
      reachesGoal(
        candidateResult,
      )
    ) {
      recommendedCatapults =
        catapultCount
      recommendedResult =
        candidateResult
      break
    }
  }

  const recommendedArmy =
    cloneArmy(
      input.attacker,
    )

  recommendedArmy.catapult =
    recommendedCatapults

  return {
    success: true,
    targetBuilding:
      input.siegeSettings
        .catapultTarget,
    currentBuildingLevel,
    targetBuildingLevel,
    minimumLuck,
    requireAttackerVictory:
      options.requireAttackerVictory,
    currentCatapults,
    recommendedCatapults,
    additionalCatapults:
      recommendedCatapults -
      currentCatapults,
    recommendedArmy,
    battleResult:
      recommendedResult,
    simulations,
    message:
      'Minimum catapult count found for the selected building target and battle conditions.',
  }
}
