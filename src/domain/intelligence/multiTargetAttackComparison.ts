import type {
  AttackCandidateAnalysis,
  AttackCandidateStatus,
} from './attackCandidateAnalyzer'

export interface MultiTargetComparisonEntry {
  candidate: AttackCandidateAnalysis
  opportunityScore: number
  opportunityLabel:
    | 'Best Match'
    | 'Strong'
    | 'Balanced'
    | 'Risky'
    | 'Poor'
}

const statusWeight:
  Record<
    AttackCandidateStatus,
    number
  > = {
    safe: 40,
    viable: 28,
    'luck-dependent': 12,
    unfavorable: -20,
  }

const opportunityLabel = (
  score: number,
): MultiTargetComparisonEntry['opportunityLabel'] => {
  if (
    score >= 80
  ) {
    return 'Best Match'
  }

  if (
    score >= 65
  ) {
    return 'Strong'
  }

  if (
    score >= 50
  ) {
    return 'Balanced'
  }

  if (
    score >= 30
  ) {
    return 'Risky'
  }

  return 'Poor'
}

export const calculateOpportunityScore =
  (
    candidate:
      AttackCandidateAnalysis,
  ): number => {
    const viability =
      statusWeight[
        candidate.status
      ]

    const lossScore =
      Math.max(
        -20,
        Math.min(
          30,
          30 -
            candidate.current
              .attackerLossPercent *
              0.5,
        ),
      )

    const targetScore =
      candidate.targetScore *
      0.3

    const defenderDamage =
      candidate.current
        .defenderLossPercent *
      0.15

    const worstCaseBonus =
      candidate.worst
        .attackerWins
        ? 12
        : 0

    const raw =
      viability +
      lossScore +
      targetScore +
      defenderDamage +
      worstCaseBonus

    return Math.round(
      Math.max(
        0,
        Math.min(
          100,
          raw,
        ),
      ),
    )
  }

export const buildMultiTargetComparison =
  (
    candidates:
      AttackCandidateAnalysis[],
  ): MultiTargetComparisonEntry[] => {
    return candidates
      .map(
        (candidate) => {
          const opportunityScore =
            calculateOpportunityScore(
              candidate,
            )

          return {
            candidate,
            opportunityScore,
            opportunityLabel:
              opportunityLabel(
                opportunityScore,
              ),
          }
        },
      )
      .sort(
        (
          left,
          right,
        ) => {
          const opportunityDifference =
            right.opportunityScore -
            left.opportunityScore

          if (
            opportunityDifference !==
            0
          ) {
            return opportunityDifference
          }

          const lossDifference =
            left.candidate
              .current
              .attackerLossPercent -
            right.candidate
              .current
              .attackerLossPercent

          if (
            lossDifference !==
            0
          ) {
            return lossDifference
          }

          return (
            right.candidate
              .targetScore -
            left.candidate
              .targetScore
          )
        },
      )
  }
