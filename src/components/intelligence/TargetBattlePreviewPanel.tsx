import {
  useMemo,
  useState,
} from 'react'

import type {
  AttackCandidateAnalysis,
  AttackCandidateScenario,
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

import './TargetBattlePreviewPanel.css'

interface TargetBattlePreviewPanelProps {
  candidate: AttackCandidateAnalysis
  onLoadTarget: (
    input: BattleSimulationInput,
    metadata: ReportMetadata | null,
    source: SimulationHistorySource,
  ) => void
}

type PreviewScenario =
  | 'worst'
  | 'current'
  | 'best'

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
    value > 0
  ) {
    return `+${value}%`
  }

  return `${value}%`
}

const winnerLabel = (
  value:
    | 'attacker'
    | 'defender'
    | 'draw',
): string => {
  if (
    value ===
    'attacker'
  ) {
    return 'Attacker Victory'
  }

  if (
    value ===
    'defender'
  ) {
    return 'Defender Victory'
  }

  return 'Draw'
}

const ratio = (
  value:
    number
    | null,
): string => {
  if (
    value ===
    null
  ) {
    return '∞'
  }

  return value.toFixed(
    2,
  )
}

function TargetBattlePreviewPanel({
  candidate,
  onLoadTarget,
}: TargetBattlePreviewPanelProps) {
  const [
    scenarioKey,
    setScenarioKey,
  ] = useState<
    PreviewScenario
  >('current')

  const village =
    candidate.ranking
      .entry
      .village

  const scenario:
    AttackCandidateScenario =
    useMemo(
      () => {
        if (
          scenarioKey ===
          'worst'
        ) {
          return candidate.worst
        }

        if (
          scenarioKey ===
          'best'
        ) {
          return candidate.best
        }

        return candidate.current
      },
      [
        candidate,
        scenarioKey,
      ],
    )

  const result =
    scenario.result

  const attackerLossProvisions =
    Math.max(
      0,
      result.attacker
        .initialProvisions -
        result.attacker
          .survivingProvisions,
    )

  const defenderLossProvisions =
    Math.max(
      0,
      result.defender
        .initialProvisions -
        result.defender
          .survivingProvisions,
    )

  const scenarioTitle =
    scenarioKey ===
      'worst'
      ? 'Worst Luck'
      : scenarioKey ===
          'best'
        ? 'Best Luck'
        : 'Current Luck'

  return (
    <section className="target-battle-preview">
      <div className="target-battle-preview-header">
        <div>
          <span>
            Target Battle Preview
          </span>

          <strong>
            {village.playerName} · {village.villageName}
          </strong>

          <small>
            {village.x !==
              null &&
              village.y !==
                null
              ? `${village.x}|${village.y}`
              : 'No coordinates'}
          </small>
        </div>

        <div className="target-battle-preview-header-badges">
          <span
            className={`status-${candidate.status}`}
          >
            {
              candidate.statusLabel
            }
          </span>

          <span>
            Score{' '}
            {
              candidate.targetScore
            }
            /100
          </span>
        </div>
      </div>

      <div className="target-battle-preview-tabs">
        <button
          type="button"
          className={
            scenarioKey ===
            'worst'
              ? 'active'
              : undefined
          }
          onClick={() =>
            setScenarioKey(
              'worst',
            )
          }
        >
          Worst
          <small>
            -15%
          </small>
        </button>

        <button
          type="button"
          className={
            scenarioKey ===
            'current'
              ? 'active'
              : undefined
          }
          onClick={() =>
            setScenarioKey(
              'current',
            )
          }
        >
          Current
          <small>
            {signedLuck(
              candidate.current
                .luck,
            )}
          </small>
        </button>

        <button
          type="button"
          className={
            scenarioKey ===
            'best'
              ? 'active'
              : undefined
          }
          onClick={() =>
            setScenarioKey(
              'best',
            )
          }
        >
          Best
          <small>
            +15%
          </small>
        </button>
      </div>

      <div
        className={`target-battle-preview-outcome winner-${result.winner}`}
      >
        <div>
          <span>
            {scenarioTitle}
          </span>

          <strong>
            {winnerLabel(
              result.winner,
            )}
          </strong>

          <small>
            Luck{' '}
            {signedLuck(
              scenario.luck,
            )}
          </small>
        </div>

        <div>
          <span>
            Strength Ratio
          </span>

          <strong>
            {ratio(
              scenario.strengthRatio,
            )}
          </strong>

          <small>
            Attack / Defense
          </small>
        </div>
      </div>

      <div className="target-battle-preview-strength">
        <div>
          <span>
            Attack Strength
          </span>

          <strong>
            {formatter.format(
              Math.round(
                result.attackStrength,
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
                result.defenseStrength,
              ),
            )}
          </strong>
        </div>

        <div>
          <span>
            Known Defense
          </span>

          <strong>
            {formatter.format(
              village.latest
                .totalTroops,
            )}
          </strong>
        </div>

        <div>
          <span>
            Final Wall
          </span>

          <strong>
            {
              scenario.finalWallLevel
            }
          </strong>
        </div>
      </div>

      <div className="target-battle-preview-sides">
        <article className="target-battle-preview-side attacker">
          <div className="target-battle-preview-side-header">
            <span>
              Attacker
            </span>

            <strong>
              {percent(
                scenario.attackerSurvivalPercent,
              )}{' '}
              survives
            </strong>
          </div>

          <dl>
            <div>
              <dt>
                Initial provisions
              </dt>

              <dd>
                {formatter.format(
                  result.attacker
                    .initialProvisions,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Lost provisions
              </dt>

              <dd>
                {formatter.format(
                  attackerLossProvisions,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Surviving provisions
              </dt>

              <dd>
                {formatter.format(
                  result.attacker
                    .survivingProvisions,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Effective loss
              </dt>

              <dd>
                {percent(
                  scenario.attackerLossPercent,
                )}
              </dd>
            </div>
          </dl>

          <div className="target-battle-preview-bar">
            <span
              style={{
                width: `${scenario.attackerSurvivalPercent}%`,
              }}
            />
          </div>
        </article>

        <article className="target-battle-preview-side defender">
          <div className="target-battle-preview-side-header">
            <span>
              Defender
            </span>

            <strong>
              {percent(
                scenario.defenderLossPercent,
              )}{' '}
              lost
            </strong>
          </div>

          <dl>
            <div>
              <dt>
                Initial provisions
              </dt>

              <dd>
                {formatter.format(
                  result.defender
                    .initialProvisions,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Lost provisions
              </dt>

              <dd>
                {formatter.format(
                  defenderLossProvisions,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Surviving provisions
              </dt>

              <dd>
                {formatter.format(
                  result.defender
                    .survivingProvisions,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Effective loss
              </dt>

              <dd>
                {percent(
                  scenario.defenderLossPercent,
                )}
              </dd>
            </div>
          </dl>

          <div className="target-battle-preview-bar defender">
            <span
              style={{
                width: `${Math.max(
                  0,
                  100 -
                    scenario.defenderLossPercent,
                )}%`,
              }}
            />
          </div>
        </article>
      </div>

      <div className="target-battle-preview-luck-grid">
        <div>
          <span>
            -15%
          </span>

          <strong>
            {winnerLabel(
              candidate.worst
                .result
                .winner,
            )}
          </strong>

          <small>
            {percent(
              candidate.worst
                .attackerLossPercent,
            )}{' '}
            attacker loss
          </small>
        </div>

        <div>
          <span>
            Current
          </span>

          <strong>
            {winnerLabel(
              candidate.current
                .result
                .winner,
            )}
          </strong>

          <small>
            {percent(
              candidate.current
                .attackerLossPercent,
            )}{' '}
            attacker loss
          </small>
        </div>

        <div>
          <span>
            +15%
          </span>

          <strong>
            {winnerLabel(
              candidate.best
                .result
                .winner,
            )}
          </strong>

          <small>
            {percent(
              candidate.best
                .attackerLossPercent,
            )}{' '}
            attacker loss
          </small>
        </div>
      </div>

      <div className="target-battle-preview-actions">
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
          Open in Full Simulator
        </button>

        <button
          type="button"
          onClick={() =>
            document
              .getElementById(
                'target-ranking',
              )
              ?.scrollIntoView({
                behavior:
                  'smooth',
                block:
                  'start',
              })
          }
        >
          Open Target Ranking
        </button>
      </div>

      <div className="target-battle-preview-note">
        Preview uses the same battle engine as the main simulator and the latest saved defense for this village. It does not replace fresh scouting information.
      </div>
    </section>
  )
}

export default TargetBattlePreviewPanel
