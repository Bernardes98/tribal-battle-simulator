import {
  useMemo,
  useState,
} from 'react'

import { units } from '../../data/units'

import {
  recommendAttackComposition,
} from '../../domain/intelligence/recommendedAttackComposition'

import type {
  RecommendedAttackMode,
} from '../../domain/intelligence/recommendedAttackComposition'

import type {
  AttackCandidateAnalysis,
} from '../../domain/intelligence/attackCandidateAnalyzer'

import type {
  SimulationHistorySource,
} from '../../services/simulationHistoryApi'

import type {
  Army,
  BattleSimulationInput,
} from '../../types/Battle'

import type {
  ReportMetadata,
} from '../../types/ReportMetadata'

import './RecommendedAttackCompositionPanel.css'

interface RecommendedAttackCompositionPanelProps {
  input: BattleSimulationInput
  candidate: AttackCandidateAnalysis
  onApplyArmy: (
    army: Army,
  ) => void
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

function RecommendedAttackCompositionPanel({
  input,
  candidate,
  onApplyArmy,
  onLoadTarget,
}: RecommendedAttackCompositionPanelProps) {
  const [
    mode,
    setMode,
  ] = useState<
    RecommendedAttackMode
  >('safe')

  const recommendation =
    useMemo(
      () =>
        recommendAttackComposition(
          input,
          candidate,
          mode,
        ),
      [
        input,
        candidate,
        mode,
      ],
    )

  const village =
    candidate.ranking
      .entry
      .village

  const rows =
    useMemo(
      () =>
        units
          .map(
            (unit) => {
              const available =
                input.attacker[
                  unit.id
                ] ??
                0

              const recommended =
                recommendation
                  .recommendedArmy[
                    unit.id
                  ] ??
                  0

              return {
                unit,
                available,
                recommended,
                saved:
                  Math.max(
                    0,
                    available -
                      recommended,
                  ),
              }
            },
          )
          .filter(
            (row) =>
              row.available >
                0 ||
              row.recommended >
                0,
          ),
      [
        input.attacker,
        recommendation
          .recommendedArmy,
      ],
    )

  const applyArmyAndTarget =
    () => {
      onApplyArmy(
        recommendation
          .recommendedArmy,
      )

      onLoadTarget(
        village.latest.input,
        village.latest.metadata,
        village.latest.source,
      )
    }

  return (
    <section className="recommended-attack">
      <div className="recommended-attack-header">
        <div>
          <span>
            Recommended Attack Composition
          </span>

          <strong>
            {village.playerName} · {village.villageName}
          </strong>

          <small>
            Finds a smaller proportional subset of your CURRENT attacker, then refines each unit while keeping an attacker victory.
          </small>
        </div>

        <span className="recommended-attack-target-score">
          Target Score{' '}
          {
            candidate.targetScore
          }
          /100
        </span>
      </div>

      <div className="recommended-attack-modes">
        <button
          type="button"
          className={
            mode ===
            'safe'
              ? 'active'
              : undefined
          }
          onClick={() =>
            setMode(
              'safe',
            )
          }
        >
          Safe
          <small>
            Win at -15%
          </small>
        </button>

        <button
          type="button"
          className={
            mode ===
            'current'
              ? 'active'
              : undefined
          }
          onClick={() =>
            setMode(
              'current',
            )
          }
        >
          Current
          <small>
            Luck{' '}
            {signedLuck(
              input
                .attackerModifiers
                .luck,
            )}
          </small>
        </button>

        <button
          type="button"
          className={
            mode ===
            'best'
              ? 'active'
              : undefined
          }
          onClick={() =>
            setMode(
              'best',
            )
          }
        >
          Aggressive
          <small>
            Win at +15%
          </small>
        </button>
      </div>

      {!recommendation.possible && (
        <div className="recommended-attack-impossible">
          <strong>
            No winning subset found for this mode.
          </strong>

          <span>
            Your full current attacker does not win against this saved defense at luck {signedLuck(
              recommendation.luck,
            )}. Increase the attacker or choose another mode.
          </span>
        </div>
      )}

      {recommendation.possible && (
        <>
          <div className="recommended-attack-summary">
            <div>
              <span>
                Available
              </span>

              <strong>
                {formatter.format(
                  recommendation.originalProvisions,
                )}
              </strong>

              <small>
                provisions
              </small>
            </div>

            <div>
              <span>
                Recommended
              </span>

              <strong>
                {formatter.format(
                  recommendation.recommendedProvisions,
                )}
              </strong>

              <small>
                provisions
              </small>
            </div>

            <div className="positive">
              <span>
                Saved
              </span>

              <strong>
                {formatter.format(
                  recommendation.savedProvisions,
                )}
              </strong>

              <small>
                {percent(
                  recommendation.savedProvisionsPercent,
                )}
              </small>
            </div>

            <div>
              <span>
                Units
              </span>

              <strong>
                {formatter.format(
                  recommendation.recommendedUnits,
                )}
              </strong>

              <small>
                {formatter.format(
                  recommendation.savedUnits,
                )}{' '}
                held back
              </small>
            </div>

            <div>
              <span>
                Luck
              </span>

              <strong>
                {signedLuck(
                  recommendation.luck,
                )}
              </strong>

              <small>
                required scenario
              </small>
            </div>
          </div>

          <div className="recommended-attack-table-wrap">
            <table className="recommended-attack-table">
              <thead>
                <tr>
                  <th>
                    Unit
                  </th>

                  <th>
                    Available
                  </th>

                  <th>
                    Recommended
                  </th>

                  <th>
                    Hold Back
                  </th>

                  <th>
                    Provisions
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (row) => (
                    <tr
                      key={
                        row.unit.id
                      }
                    >
                      <td>
                        {
                          row.unit.name
                        }
                      </td>

                      <td>
                        {formatter.format(
                          row.available,
                        )}
                      </td>

                      <td>
                        <strong>
                          {formatter.format(
                            row.recommended,
                          )}
                        </strong>
                      </td>

                      <td
                        className={
                          row.saved >
                          0
                            ? 'positive'
                            : ''
                        }
                      >
                        {formatter.format(
                          row.saved,
                        )}
                      </td>

                      <td>
                        {formatter.format(
                          row.recommended *
                            row.unit.provisions,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          {recommendation.result && (
            <div className="recommended-attack-result">
              <div>
                <span>
                  Result
                </span>

                <strong>
                  {recommendation.result.winner ===
                  'attacker'
                    ? 'Attacker Victory'
                    : recommendation.result.winner ===
                        'draw'
                      ? 'Draw'
                      : 'Defender Victory'}
                </strong>
              </div>

              <div>
                <span>
                  Attack Strength
                </span>

                <strong>
                  {formatter.format(
                    Math.round(
                      recommendation.result.attackStrength,
                    ),
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Defense Strength
                </span>

                <strong>
                  {formatter.format(
                    Math.round(
                      recommendation.result.defenseStrength,
                    ),
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Final Wall
                </span>

                <strong>
                  {
                    recommendation.result.siege.wall.finalLevel
                  }
                </strong>
              </div>
            </div>
          )}

          <div className="recommended-attack-actions">
            <button
              type="button"
              className="primary"
              onClick={() =>
                onApplyArmy(
                  recommendation
                    .recommendedArmy,
                )
              }
            >
              Apply Recommended Army
            </button>

            <button
              type="button"
              onClick={
                applyArmyAndTarget
              }
            >
              Apply Army + Target
            </button>
          </div>
        </>
      )}

      <div className="recommended-attack-note">
        This is a heuristic minimizer, not a mathematical global optimum. It first reduces the army proportionally, then minimizes unit quantities in multiple passes using the battle engine as the victory check.
      </div>
    </section>
  )
}

export default RecommendedAttackCompositionPanel
