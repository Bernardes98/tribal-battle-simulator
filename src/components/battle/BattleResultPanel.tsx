import {
  useState,
} from 'react'

import { units } from '../../data/units'

import {
  canCopyBattleResultImage,
  copyBattleResultImage,
  downloadBattleResultImage,
} from '../../domain/export/battleResultImageExport'

import type {
  BattleResultExportMode,
} from '../../domain/export/battleResultImageExport'

import type {
  BattleResult,
  BattleSimulationInput,
} from '../../types/Battle'

import './BattleResultPanel.css'

interface BattleResultPanelProps {
  result: BattleResult
  input: BattleSimulationInput
  defaultArmyCompositionOpen?: boolean
}

const formatter =
  new Intl.NumberFormat(
    'en-US',
  )

const percentage = (
  value: number,
  total: number,
): number => {
  if (
    total <=
    0
  ) {
    return 0
  }

  return Math.max(
    0,
    Math.min(
      100,
      (
        value /
        total
      ) *
        100,
    ),
  )
}

const formatPercent = (
  value: number,
): string => {
  return `${value.toFixed(
    1,
  )}%`
}

const winnerTitle = (
  winner:
    BattleResult['winner'],
): string => {
  if (
    winner ===
    'attacker'
  ) {
    return 'Attacker Victory'
  }

  if (
    winner ===
    'defender'
  ) {
    return 'Defender Victory'
  }

  return 'Draw'
}

const winnerSubtitle = (
  winner:
    BattleResult['winner'],
): string => {
  if (
    winner ===
    'attacker'
  ) {
    return 'The attacking army broke through the defense.'
  }

  if (
    winner ===
    'defender'
  ) {
    return 'The defending army held the village.'
  }

  return 'Neither side achieved a decisive victory.'
}

const signedLuck = (
  luck: number,
): string => {
  if (
    luck >
    0
  ) {
    return `+${luck}%`
  }

  return `${luck}%`
}

function BattleResultPanel({
  result,
  input,
  defaultArmyCompositionOpen = false,
}: BattleResultPanelProps) {
  const [
    exportMode,
    setExportMode,
  ] = useState<
    BattleResultExportMode
  >('summary')

  const [
    exportState,
    setExportState,
  ] = useState<
    | 'idle'
    | 'saving'
    | 'copying'
    | 'saved'
    | 'copied'
    | 'error'
  >('idle')

  const [
    exportMessage,
    setExportMessage,
  ] = useState('')

  const [
    armyCompositionOpen,
    setArmyCompositionOpen,
  ] = useState(
    defaultArmyCompositionOpen,
  )

  const withExportFeedback =
    async (
      action:
        'save'
        | 'copy',
    ) => {
      setExportState(
        action ===
        'save'
          ? 'saving'
          : 'copying',
      )

      setExportMessage(
        action ===
        'save'
          ? 'Rendering PNG...'
          : 'Rendering image...',
      )

      try {
        if (
          action ===
          'save'
        ) {
          await downloadBattleResultImage(
            result,
            input,
            exportMode,
          )

          setExportState(
            'saved',
          )

          setExportMessage(
            'PNG saved.',
          )
        } else {
          await copyBattleResultImage(
            result,
            input,
            exportMode,
          )

          setExportState(
            'copied',
          )

          setExportMessage(
            'Image copied to clipboard.',
          )
        }

        window.setTimeout(
          () => {
            setExportState(
              'idle',
            )

            setExportMessage(
              '',
            )
          },
          2200,
        )
      } catch (
        error
      ) {
        console.error(
          'Could not export battle result image:',
          error,
        )

        setExportState(
          'error',
        )

        setExportMessage(
          error instanceof Error
            ? error.message
            : 'Could not export battle result image.',
        )
      }
    }

  const attackerInitial =
    result.attacker
      .initialProvisions

  const attackerSurviving =
    result.attacker
      .survivingProvisions

  const defenderInitial =
    result.defender
      .initialProvisions

  const defenderSurviving =
    result.defender
      .survivingProvisions

  const attackerLost =
    Math.max(
      0,
      attackerInitial -
        attackerSurviving,
    )

  const defenderLost =
    Math.max(
      0,
      defenderInitial -
        defenderSurviving,
    )

  const attackerSurvivalPercent =
    percentage(
      attackerSurviving,
      attackerInitial,
    )

  const attackerLossPercent =
    percentage(
      attackerLost,
      attackerInitial,
    )

  const defenderSurvivalPercent =
    percentage(
      defenderSurviving,
      defenderInitial,
    )

  const defenderLossPercent =
    percentage(
      defenderLost,
      defenderInitial,
    )

  const strengthRatio =
    result.defenseStrength >
    0
      ? result.attackStrength /
        result.defenseStrength
      : result.attackStrength >
          0
        ? null
        : 0

  const initialWall =
    input.defenderModifiers
      .wallLevel

  const finalWall =
    result.siege.wall
      .finalLevel

  const wallReduction =
    Math.max(
      0,
      initialWall -
        finalWall,
    )

  const armyRows =
    units.filter(
      (unit) =>
        (
          input.attacker[
            unit.id
          ] ??
          0
        ) >
          0 ||
        (
          input.defender[
            unit.id
          ] ??
          0
        ) >
          0,
    )

  return (
    <section
      id="battle-result"
      className={`battle-report result-${result.winner}`}
    >
      <div className="battle-report-topbar">
        <div>
          <span className="battle-report-kicker">
            Battle Report
          </span>

          <strong>
            Simulation Result
          </strong>
        </div>

        <span className="battle-report-engine-badge">
          Battle Engine
        </span>
      </div>

      <div
        className="battle-report-export"
        data-export-exclude="true"
      >
        <div className="battle-report-export-mode">
          <span>
            Export
          </span>

          <button
            type="button"
            className={
              exportMode ===
              'summary'
                ? 'active'
                : undefined
            }
            onClick={() =>
              setExportMode(
                'summary',
              )
            }
          >
            Summary
          </button>

          <button
            type="button"
            className={
              exportMode ===
              'full'
                ? 'active'
                : undefined
            }
            onClick={() =>
              setExportMode(
                'full',
              )
            }
          >
            Full Report
          </button>
        </div>

        <div className="battle-report-export-actions">
          <button
            type="button"
            className="primary"
            disabled={
              exportState ===
                'saving' ||
              exportState ===
                'copying'
            }
            onClick={() =>
              void withExportFeedback(
                'save',
              )
            }
          >
            {exportState ===
            'saving'
              ? 'Creating PNG...'
              : 'Save PNG'}
          </button>

          <button
            type="button"
            disabled={
              !canCopyBattleResultImage() ||
              exportState ===
                'saving' ||
              exportState ===
                'copying'
            }
            title={
              canCopyBattleResultImage()
                ? 'Copy PNG to clipboard'
                : 'Image clipboard is not supported by this browser'
            }
            onClick={() =>
              void withExportFeedback(
                'copy',
              )
            }
          >
            {exportState ===
            'copying'
              ? 'Copying...'
              : 'Copy Image'}
          </button>
        </div>

        {exportMessage && (
          <span className={`battle-report-export-message ${exportState}`}>
            {
              exportMessage
            }
          </span>
        )}
      </div>

      <div className="battle-report-outcome">
        <div className="battle-report-outcome-emblem">
          {result.winner ===
          'attacker'
            ? '⚔'
            : result.winner ===
                'defender'
              ? '🛡'
              : '⚖'}
        </div>

        <div className="battle-report-outcome-copy">
          <span>
            Outcome
          </span>

          <h3>
            {winnerTitle(
              result.winner,
            )}
          </h3>

          <p>
            {winnerSubtitle(
              result.winner,
            )}
          </p>
        </div>

        <div className="battle-report-outcome-strength">
          <span>
            Strength Ratio
          </span>

          <strong>
            {strengthRatio ===
            null
              ? '∞'
              : strengthRatio.toFixed(
                  2,
                )}
            ×
          </strong>

          <small>
            Attack / Defense
          </small>
        </div>
      </div>

      <div className="battle-report-strength-strip">
        <div className="attacker">
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

        <div className="versus">
          VS
        </div>

        <div className="defender">
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
      </div>

      <div className="battle-report-sides">
        <article className="battle-report-side attacker">
          <div className="battle-report-side-title">
            <div className="battle-report-side-icon">
              ⚔
            </div>

            <div>
              <span>
                Attacker
              </span>

              <strong>
                {result.winner ===
                'attacker'
                  ? 'Victory'
                  : result.winner ===
                      'draw'
                    ? 'Draw'
                    : 'Defeated'}
              </strong>
            </div>
          </div>

          <div className="battle-report-side-main-stat">
            <span>
              Surviving Force
            </span>

            <strong>
              {formatPercent(
                attackerSurvivalPercent,
              )}
            </strong>

            <small>
              {formatter.format(
                attackerSurviving,
              )}{' '}
              provisions survive
            </small>
          </div>

          <div className="battle-report-survival-bar">
            <span
              style={{
                width: `${attackerSurvivalPercent}%`,
              }}
            />
          </div>

          <dl className="battle-report-side-stats">
            <div>
              <dt>
                Initial
              </dt>

              <dd>
                {formatter.format(
                  attackerInitial,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Lost
              </dt>

              <dd>
                {formatter.format(
                  attackerLost,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Survived
              </dt>

              <dd>
                {formatter.format(
                  attackerSurviving,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Loss Rate
              </dt>

              <dd>
                {formatPercent(
                  attackerLossPercent,
                )}
              </dd>
            </div>
          </dl>
        </article>

        <div className="battle-report-crossed">
          <span>
            ⚔
          </span>
        </div>

        <article className="battle-report-side defender">
          <div className="battle-report-side-title">
            <div className="battle-report-side-icon">
              🛡
            </div>

            <div>
              <span>
                Defender
              </span>

              <strong>
                {result.winner ===
                'defender'
                  ? 'Victory'
                  : result.winner ===
                      'draw'
                    ? 'Draw'
                    : 'Defeated'}
              </strong>
            </div>
          </div>

          <div className="battle-report-side-main-stat">
            <span>
              Remaining Defense
            </span>

            <strong>
              {formatPercent(
                defenderSurvivalPercent,
              )}
            </strong>

            <small>
              {formatter.format(
                defenderSurviving,
              )}{' '}
              provisions survive
            </small>
          </div>

          <div className="battle-report-survival-bar defender">
            <span
              style={{
                width: `${defenderSurvivalPercent}%`,
              }}
            />
          </div>

          <dl className="battle-report-side-stats">
            <div>
              <dt>
                Initial
              </dt>

              <dd>
                {formatter.format(
                  defenderInitial,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Lost
              </dt>

              <dd>
                {formatter.format(
                  defenderLost,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Survived
              </dt>

              <dd>
                {formatter.format(
                  defenderSurviving,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Loss Rate
              </dt>

              <dd>
                {formatPercent(
                  defenderLossPercent,
                )}
              </dd>
            </div>
          </dl>
        </article>
      </div>

      <div className="battle-report-events">
        <div className="battle-report-event wall">
          <span className="battle-report-event-icon">
            🧱
          </span>

          <div>
            <span>
              Wall
            </span>

            <strong>
              Level {initialWall}
              {' → '}
              Level {finalWall}
            </strong>

            <small>
              {wallReduction >
              0
                ? `Reduced by ${wallReduction} level${wallReduction === 1 ? '' : 's'}`
                : 'No wall level reduction'}
            </small>
          </div>
        </div>

        <div className="battle-report-event">
          <span className="battle-report-event-icon">
            ☘
          </span>

          <div>
            <span>
              Luck
            </span>

            <strong>
              {signedLuck(
                input.attackerModifiers
                  .luck,
              )}
            </strong>

            <small>
              attacker battle luck
            </small>
          </div>
        </div>

        <div className="battle-report-event">
          <span className="battle-report-event-icon">
            ◆
          </span>

          <div>
            <span>
              Morale
            </span>

            <strong>
              {
                input.attackerModifiers
                  .morale
              }
              %
            </strong>

            <small>
              attacker morale
            </small>
          </div>
        </div>

        <div className="battle-report-event">
          <span className="battle-report-event-icon">
            ⛪
          </span>

          <div>
            <span>
              Church
            </span>

            <strong>
              A{
                input.attackerModifiers
                  .churchLevel
              }
              {' · '}
              D{
                input.defenderModifiers
                  .churchLevel
              }
            </strong>

            <small>
              attacker / defender level
            </small>
          </div>
        </div>
      </div>

      <details
        className="battle-report-details"
        open={
          armyCompositionOpen
        }
        onToggle={(
          event,
        ) =>
          setArmyCompositionOpen(
            event.currentTarget.open,
          )
        }
      >
        <summary>
          <span>
            Army Composition
          </span>

          <small>
            Starting troops used in this simulation
          </small>
        </summary>

        <div className="battle-report-army-table-wrap">
          <table className="battle-report-army-table">
            <thead>
              <tr>
                <th>
                  Unit
                </th>

                <th>
                  Attacker
                </th>

                <th>
                  Defender
                </th>

                <th>
                  Provision / Unit
                </th>
              </tr>
            </thead>

            <tbody>
              {armyRows.map(
                (unit) => (
                  <tr
                    key={
                      unit.id
                    }
                  >
                    <td>
                      {
                        unit.name
                      }
                    </td>

                    <td>
                      {formatter.format(
                        input.attacker[
                          unit.id
                        ] ??
                          0,
                      )}
                    </td>

                    <td>
                      {formatter.format(
                        input.defender[
                          unit.id
                        ] ??
                          0,
                      )}
                    </td>

                    <td>
                      {
                        unit.provisions
                      }
                    </td>
                  </tr>
                ),
              )}

              {armyRows.length ===
                0 && (
                <tr>
                  <td
                    colSpan={
                      4
                    }
                    className="battle-report-empty-row"
                  >
                    No units configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </details>

      <div className="battle-report-footer">
        <div>
          <span>
            Attacker casualties
          </span>

          <strong>
            {formatPercent(
              attackerLossPercent,
            )}
          </strong>
        </div>

        <div className="battle-report-footer-center">
          <span>
            Final Result
          </span>

          <strong>
            {winnerTitle(
              result.winner,
            )}
          </strong>
        </div>

        <div>
          <span>
            Defender casualties
          </span>

          <strong>
            {formatPercent(
              defenderLossPercent,
            )}
          </strong>
        </div>
      </div>

      <div className="battle-report-note">
        Casualty totals are shown as effective provisions because the current battle result exposes aggregate surviving provisions rather than exact surviving quantities for each unit type.
      </div>
    </section>
  )
}

export default BattleResultPanel
