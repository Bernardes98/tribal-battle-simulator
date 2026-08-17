import {
  simulateBattle,
} from './battleEngine'

import type {
  BattleResult,
  BattleSimulationInput,
  BattleWinner,
} from '../../types/Battle'

export interface LuckScenarioResult {
  luck: number

  winner: BattleWinner

  attackerSurvivingUnits: number
  attackerSurvivingProvisions: number

  defenderSurvivingUnits: number
  defenderSurvivingProvisions: number

  attackerLostUnits: number
  defenderLostUnits: number

  attackStrength: number
  defenseStrength: number

  result: BattleResult
}

export interface LuckAnalysisResult {
  scenarios: LuckScenarioResult[]

  attackerVictories: number
  defenderVictories: number
  draws: number

  minimumLuckToWin: number | null

  worstScenario: LuckScenarioResult
  bestScenario: LuckScenarioResult
}

const simulateLuckScenario = (
  input: BattleSimulationInput,
  luck: number,
): LuckScenarioResult => {
  const result =
    simulateBattle({
      ...input,

      attackerModifiers: {
        ...input.attackerModifiers,
        luck,
      },
    })

  return {
    luck,

    winner:
      result.winner,

    attackerSurvivingUnits:
      result.attacker
        .survivingUnits,

    attackerSurvivingProvisions:
      result.attacker
        .survivingProvisions,

    defenderSurvivingUnits:
      result.defender
        .survivingUnits,

    defenderSurvivingProvisions:
      result.defender
        .survivingProvisions,

    attackerLostUnits:
      result.attacker
        .lostUnits,

    defenderLostUnits:
      result.defender
        .lostUnits,

    attackStrength:
      result.attackStrength,

    defenseStrength:
      result.defenseStrength,

    result,
  }
}

const findWorstScenario = (
  scenarios: LuckScenarioResult[],
): LuckScenarioResult => {
  return scenarios.reduce(
    (
      worst,
      current,
    ) => {
      if (
        current.attackerSurvivingProvisions <
        worst.attackerSurvivingProvisions
      ) {
        return current
      }

      if (
        current.attackerSurvivingProvisions ===
          worst.attackerSurvivingProvisions &&
        current.defenderSurvivingProvisions >
          worst.defenderSurvivingProvisions
      ) {
        return current
      }

      return worst
    },
  )
}

const findBestScenario = (
  scenarios: LuckScenarioResult[],
): LuckScenarioResult => {
  return scenarios.reduce(
    (
      best,
      current,
    ) => {
      if (
        current.attackerSurvivingProvisions >
        best.attackerSurvivingProvisions
      ) {
        return current
      }

      if (
        current.attackerSurvivingProvisions ===
          best.attackerSurvivingProvisions &&
        current.defenderSurvivingProvisions <
          best.defenderSurvivingProvisions
      ) {
        return current
      }

      return best
    },
  )
}

export const analyzeLuckScenarios = (
  input: BattleSimulationInput,
): LuckAnalysisResult => {
  const scenarios: LuckScenarioResult[] = []

  for (
    let luck = -15;
    luck <= 15;
    luck += 1
  ) {
    scenarios.push(
      simulateLuckScenario(
        input,
        luck,
      ),
    )
  }

  const attackerVictories =
    scenarios.filter(
      (scenario) =>
        scenario.winner ===
        'attacker',
    ).length

  const defenderVictories =
    scenarios.filter(
      (scenario) =>
        scenario.winner ===
        'defender',
    ).length

  const draws =
    scenarios.filter(
      (scenario) =>
        scenario.winner ===
        'draw',
    ).length

  const firstWinningScenario =
    scenarios.find(
      (scenario) =>
        scenario.winner ===
        'attacker',
    )

  return {
    scenarios,

    attackerVictories,
    defenderVictories,
    draws,

    minimumLuckToWin:
      firstWinningScenario
        ?.luck ?? null,

    worstScenario:
      findWorstScenario(
        scenarios,
      ),

    bestScenario:
      findBestScenario(
        scenarios,
      ),
  }
}