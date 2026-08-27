import { units } from '../../data/units'

import {
  simulateBattle,
} from '../battle/battleEngine'

import type {
  BattleResult,
  BattleSimulationInput,
} from '../../types/Battle'

import type {
  TargetRankingEntry,
} from './targetRanking'

export type AttackCandidateStatus =
  | 'safe'
  | 'viable'
  | 'luck-dependent'
  | 'unfavorable'

export interface AttackCandidateScenario {
  luck: number
  result: BattleResult
  attackerWins: boolean
  attackerLossPercent: number
  attackerSurvivalPercent: number
  defenderLossPercent: number
  finalWallLevel: number
  strengthRatio: number | null
}

export interface AttackCandidateAnalysis {
  villageKey: string
  rank: number
  targetScore: number
  targetScoreLabel: string
  status: AttackCandidateStatus
  statusLabel: string
  current: AttackCandidateScenario
  worst: AttackCandidateScenario
  best: AttackCandidateScenario
  ranking: TargetRankingEntry
}

const percentage = (
  numerator: number,
  denominator: number,
): number => {
  if (
    denominator <=
    0
  ) {
    return 0
  }

  return Math.max(
    0,
    Math.min(
      100,
      (
        numerator /
        denominator
      ) *
        100,
    ),
  )
}

export const countArmyUnits = (
  input:
    BattleSimulationInput,
): number => {
  return units.reduce(
    (
      total,
      unit,
    ) =>
      total +
      (
        input.attacker[
          unit.id
        ] ??
        0
      ),
    0,
  )
}

export const countArmyProvisions = (
  input:
    BattleSimulationInput,
): number => {
  return units.reduce(
    (
      total,
      unit,
    ) =>
      total +
      (
        input.attacker[
          unit.id
        ] ??
        0
      ) *
        unit.provisions,
    0,
  )
}

const buildTargetInput = (
  currentInput:
    BattleSimulationInput,
  ranking:
    TargetRankingEntry,
  luck: number,
): BattleSimulationInput => {
  const snapshot =
    ranking.entry
      .village.latest

  return {
    attacker: {
      ...currentInput.attacker,
    },

    defender: {
      ...snapshot.input.defender,
    },

    attackerModifiers: {
      ...currentInput.attackerModifiers,
      luck,
    },

    defenderModifiers: {
      ...snapshot.input.defenderModifiers,
    },

    attackerPaladinWeapons: {
      ...currentInput.attackerPaladinWeapons,
    },

    defenderPaladinWeapons: {
      ...snapshot.input.defenderPaladinWeapons,
    },

    siegeSettings: {
      ...currentInput.siegeSettings,
    },
  }
}

const analyzeScenario = (
  input:
    BattleSimulationInput,
): AttackCandidateScenario => {
  const result =
    simulateBattle(
      input,
    )

  const initialAttacker =
    result.attacker
      .initialProvisions

  const survivingAttacker =
    result.attacker
      .survivingProvisions

  const initialDefender =
    result.defender
      .initialProvisions

  const survivingDefender =
    result.defender
      .survivingProvisions

  const effectiveAttackerLoss =
    Math.max(
      0,
      initialAttacker -
        survivingAttacker,
    )

  const effectiveDefenderLoss =
    Math.max(
      0,
      initialDefender -
        survivingDefender,
    )

  return {
    luck:
      input
        .attackerModifiers
        .luck,

    result,

    attackerWins:
      result.winner ===
      'attacker',

    attackerLossPercent:
      percentage(
        effectiveAttackerLoss,
        initialAttacker,
      ),

    attackerSurvivalPercent:
      percentage(
        survivingAttacker,
        initialAttacker,
      ),

    defenderLossPercent:
      percentage(
        effectiveDefenderLoss,
        initialDefender,
      ),

    finalWallLevel:
      result.siege
        .wall.finalLevel,

    strengthRatio:
      result.defenseStrength >
      0
        ? result.attackStrength /
          result.defenseStrength
        : result.attackStrength >
            0
          ? null
          : 0,
  }
}

const resolveStatus = (
  worst:
    AttackCandidateScenario,
  current:
    AttackCandidateScenario,
  best:
    AttackCandidateScenario,
): {
  status:
    AttackCandidateStatus
  label: string
} => {
  if (
    worst.attackerWins
  ) {
    return {
      status: 'safe',
      label:
        'Safe Candidate',
    }
  }

  if (
    current.attackerWins
  ) {
    return {
      status: 'viable',
      label:
        'Viable',
    }
  }

  if (
    best.attackerWins
  ) {
    return {
      status:
        'luck-dependent',
      label:
        'Luck Dependent',
    }
  }

  return {
    status:
      'unfavorable',
    label:
      'Unfavorable',
  }
}

export const analyzeAttackCandidate =
  (
    currentInput:
      BattleSimulationInput,
    ranking:
      TargetRankingEntry,
  ): AttackCandidateAnalysis => {
    const worst =
      analyzeScenario(
        buildTargetInput(
          currentInput,
          ranking,
          -15,
        ),
      )

    const current =
      analyzeScenario(
        buildTargetInput(
          currentInput,
          ranking,
          currentInput
            .attackerModifiers
            .luck,
        ),
      )

    const best =
      analyzeScenario(
        buildTargetInput(
          currentInput,
          ranking,
          15,
        ),
      )

    const resolved =
      resolveStatus(
        worst,
        current,
        best,
      )

    return {
      villageKey:
        ranking.entry
          .village.key,

      rank:
        ranking.rank,

      targetScore:
        ranking.score
          .score,

      targetScoreLabel:
        ranking.score
          .label,

      status:
        resolved.status,

      statusLabel:
        resolved.label,

      current,
      worst,
      best,

      ranking,
    }
  }

const statusOrder:
  Record<
    AttackCandidateStatus,
    number
  > = {
    safe: 0,
    viable: 1,
    'luck-dependent': 2,
    unfavorable: 3,
  }

export const analyzeAttackCandidates =
  (
    currentInput:
      BattleSimulationInput,
    ranking:
      TargetRankingEntry[],
  ): AttackCandidateAnalysis[] => {
    return ranking
      .map(
        (entry) =>
          analyzeAttackCandidate(
            currentInput,
            entry,
          ),
      )
      .sort(
        (
          left,
          right,
        ) => {
          const statusDifference =
            statusOrder[
              left.status
            ] -
            statusOrder[
              right.status
            ]

          if (
            statusDifference !==
            0
          ) {
            return statusDifference
          }

          const lossesDifference =
            left.current
              .attackerLossPercent -
            right.current
              .attackerLossPercent

          if (
            lossesDifference !==
            0
          ) {
            return lossesDifference
          }

          return (
            right.targetScore -
            left.targetScore
          )
        },
      )
  }
