import {
  useMemo,
} from 'react'

import {
  buildMultiTargetComparison,
} from '../../domain/intelligence/multiTargetAttackComparison'

import type {
  AttackCandidateAnalysis,
} from '../../domain/intelligence/attackCandidateAnalyzer'

import type {
  SimulationHistorySource,
} from '../../services/simulationHistoryApi'

import type {
  BattleSimulationInput,
} from '../../types/Battle'

import type {
  ReportMetadata,
} from '../../types/ReportMetadata'

import './MultiTargetAttackComparisonPanel.css'

interface MultiTargetAttackComparisonPanelProps {
  candidates: AttackCandidateAnalysis[]
  onRemove: (
    villageKey: string,
  ) => void
  onClear: () => void
  onLoadTarget: (
    input: BattleSimulationInput,
    metadata: ReportMetadata | null,
    source: SimulationHistorySource,
  ) => void
}

const formatter =
  new Intl.NumberFormat(
    'en-US',
  )

const percent = (
  value: number,
): string => {
  return `${value.toFixed(
    1,
  )}%`
}

const winnerLabel = (
  winner:
    | 'attacker'
    | 'defender'
    | 'draw',
): string => {
  if (
    winner ===
    'attacker'
  ) {
    return 'Win'
  }

  if (
    winner ===
    'draw'
  ) {
    return 'Draw'
  }

  return 'Loss'
}

const signedLuck = (
  value: number,
): string => {
  if (
    value >
    0
  ) {
    return `+${value}%`
  }

  return `${value}%`
}

function MultiTargetAttackComparisonPanel({
  candidates,
  onRemove,
  onClear,
  onLoadTarget,
}: MultiTargetAttackComparisonPanelProps) {
  const comparison =
    useMemo(
      () =>
        buildMultiTargetComparison(
          candidates,
        ),
      [candidates],
    )

  if (
    comparison.length <
    2
  ) {
    return null
  }

  const best =
    comparison[0]

  return (
    <section className="multi-target-comparison">
      <div className="multi-target-comparison-header">
        <div>
          <span>
            Multi-Target Attack Comparison
          </span>

          <strong>
            Same Army · {comparison.length} Targets
          </strong>

          <small>
            Compare the exact current attacker against selected watched targets.
          </small>
        </div>

        <button
          type="button"
          onClick={
            onClear
          }
        >
          Clear Comparison
        </button>
      </div>

      <div className="multi-target-comparison-best">
        <div>
          <span>
            Best Opportunity
          </span>

          <strong>
            {
              best.candidate
                .ranking
                .entry
                .village
                .villageName
            }
          </strong>

          <small>
            {
              best.candidate
                .ranking
                .entry
                .village
                .playerName
            }
          </small>
        </div>

        <div>
          <span>
            Opportunity
          </span>

          <strong>
            {
              best.opportunityScore
            }
            /100
          </strong>

          <small>
            {
              best.opportunityLabel
            }
          </small>
        </div>

        <div>
          <span>
            Current Result
          </span>

          <strong>
            {winnerLabel(
              best.candidate
                .current
                .result
                .winner,
            )}
          </strong>

          <small>
            {percent(
              best.candidate
                .current
                .attackerLossPercent,
            )}{' '}
            loss
          </small>
        </div>
      </div>

      <div className="multi-target-comparison-table-wrap">
        <table className="multi-target-comparison-table">
          <thead>
            <tr>
              <th>
                Target
              </th>

              <th>
                Opportunity
              </th>

              <th>
                Target Score
              </th>

              <th>
                Defense
              </th>

              <th>
                Wall
              </th>

              <th>
                Status
              </th>

              <th>
                -15%
              </th>

              <th>
                Current
              </th>

              <th>
                +15%
              </th>

              <th>
                Attacker Loss
              </th>

              <th>
                Defense Lost
              </th>

              <th>
                Final Wall
              </th>

              <th>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {comparison.map(
              (
                entry,
                index,
              ) => {
                const candidate =
                  entry.candidate

                const village =
                  candidate.ranking
                    .entry
                    .village

                return (
                  <tr
                    key={
                      candidate.villageKey
                    }
                    className={
                      index ===
                      0
                        ? 'best'
                        : undefined
                    }
                  >
                    <td className="multi-target-comparison-target">
                      <span>
                        #{index + 1}
                      </span>

                      <div>
                        <strong>
                          {
                            village.villageName
                          }
                        </strong>

                        <small>
                          {
                            village.playerName
                          }
                          {village.x !==
                            null &&
                            village.y !==
                              null
                            ? ` · ${village.x}|${village.y}`
                            : ''}
                        </small>
                      </div>
                    </td>

                    <td>
                      <strong>
                        {
                          entry.opportunityScore
                        }
                        /100
                      </strong>

                      <small>
                        {
                          entry.opportunityLabel
                        }
                      </small>
                    </td>

                    <td>
                      {
                        candidate.targetScore
                      }
                      /100
                    </td>

                    <td>
                      {formatter.format(
                        village.latest
                          .totalTroops,
                      )}
                    </td>

                    <td>
                      {
                        village.latest
                          .wallLevel
                      }
                    </td>

                    <td>
                      <span className={`multi-target-comparison-status ${candidate.status}`}>
                        {
                          candidate.statusLabel
                        }
                      </span>
                    </td>

                    <td
                      className={`result-${candidate.worst.result.winner}`}
                    >
                      {winnerLabel(
                        candidate.worst
                          .result
                          .winner,
                      )}
                      <small>
                        {percent(
                          candidate.worst
                            .attackerLossPercent,
                        )}
                      </small>
                    </td>

                    <td
                      className={`result-${candidate.current.result.winner}`}
                    >
                      {winnerLabel(
                        candidate.current
                          .result
                          .winner,
                      )}
                      <small>
                        {signedLuck(
                          candidate.current
                            .luck,
                        )}{' '}
                        ·{' '}
                        {percent(
                          candidate.current
                            .attackerLossPercent,
                        )}
                      </small>
                    </td>

                    <td
                      className={`result-${candidate.best.result.winner}`}
                    >
                      {winnerLabel(
                        candidate.best
                          .result
                          .winner,
                      )}
                      <small>
                        {percent(
                          candidate.best
                            .attackerLossPercent,
                        )}
                      </small>
                    </td>

                    <td>
                      {percent(
                        candidate.current
                          .attackerLossPercent,
                      )}
                    </td>

                    <td>
                      {percent(
                        candidate.current
                          .defenderLossPercent,
                      )}
                    </td>

                    <td>
                      {
                        candidate.current
                          .finalWallLevel
                      }
                    </td>

                    <td>
                      <div className="multi-target-comparison-actions">
                        <button
                          type="button"
                          className="primary"
                          onClick={() =>
                            onLoadTarget(
                              village.latest
                                .input,
                              village.latest
                                .metadata,
                              village.latest
                                .source,
                            )
                          }
                        >
                          Load
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onRemove(
                              candidate.villageKey,
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              },
            )}
          </tbody>
        </table>
      </div>

      <div className="multi-target-comparison-cards">
        {comparison.map(
          (
            entry,
            index,
          ) => {
            const candidate =
              entry.candidate

            const village =
              candidate.ranking
                .entry
                .village

            return (
              <article
                key={
                  candidate.villageKey
                }
                className={
                  index ===
                  0
                    ? 'best'
                    : undefined
                }
              >
                <div className="multi-target-comparison-card-header">
                  <span>
                    #{index + 1}
                  </span>

                  <div>
                    <strong>
                      {
                        village.villageName
                      }
                    </strong>

                    <small>
                      {
                        village.playerName
                      }
                    </small>
                  </div>

                  <span className="multi-target-comparison-opportunity">
                    {
                      entry.opportunityScore
                    }
                    /100
                  </span>
                </div>

                <dl>
                  <div>
                    <dt>
                      Status
                    </dt>

                    <dd>
                      {
                        candidate.statusLabel
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Target Score
                    </dt>

                    <dd>
                      {
                        candidate.targetScore
                      }
                      /100
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Defense
                    </dt>

                    <dd>
                      {formatter.format(
                        village.latest
                          .totalTroops,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Wall
                    </dt>

                    <dd>
                      {
                        village.latest
                          .wallLevel
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Current
                    </dt>

                    <dd>
                      {winnerLabel(
                        candidate.current
                          .result
                          .winner,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Loss
                    </dt>

                    <dd>
                      {percent(
                        candidate.current
                          .attackerLossPercent,
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            )
          },
        )}
      </div>

      <div className="multi-target-comparison-note">
        Opportunity Score is only a relative comparison helper. It combines viability, current attacker losses, Target Score, defender damage and worst-case success. The battle engine result remains the primary combat result.
      </div>
    </section>
  )
}

export default MultiTargetAttackComparisonPanel
