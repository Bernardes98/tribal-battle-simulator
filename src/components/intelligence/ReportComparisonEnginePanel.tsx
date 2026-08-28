import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  compareReportSnapshots,
  defaultReportComparisonPair,
  findSnapshot,
} from '../../domain/intelligence/reportComparisonEngine'

import type {
  ReportComparisonDirection,
  ReportComparisonSeverity,
} from '../../domain/intelligence/reportComparisonEngine'

import type {
  VillageIntelligence,
} from '../../domain/intelligence/playerVillageIntelligence'

import type {
  SimulationHistorySource,
} from '../../services/simulationHistoryApi'

import type {
  BattleSimulationInput,
} from '../../types/Battle'

import type {
  ReportMetadata,
} from '../../types/ReportMetadata'

import './ReportComparisonEnginePanel.css'

interface ReportComparisonEnginePanelProps {
  village: VillageIntelligence
  onLoadDefense: (
    input: BattleSimulationInput,
    metadata: ReportMetadata | null,
    source: SimulationHistorySource,
  ) => void
}

const formatter =
  new Intl.NumberFormat(
    'en-US',
  )

const signed = (
  value: number,
): string => {
  if (
    value >
    0
  ) {
    return `+${formatter.format(
      value,
    )}`
  }

  return formatter.format(
    value,
  )
}

const signedPercent = (
  value:
    number | null,
): string => {
  if (
    value ===
    null
  ) {
    return 'new'
  }

  if (
    value >
    0
  ) {
    return `+${value.toFixed(
      1,
    )}%`
  }

  return `${value.toFixed(
    1,
  )}%`
}

const formatDate = (
  value: string,
): string => {
  const date =
    new Date(
      value,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle:
        'medium',
      timeStyle:
        'short',
    },
  ).format(
    date,
  )
}

const formatElapsed = (
  milliseconds: number,
): string => {
  const hours =
    Math.max(
      0,
      milliseconds /
        3_600_000,
    )

  if (
    hours <
    1
  ) {
    return `${Math.max(
      1,
      Math.round(
        milliseconds /
          60_000,
      ),
    )}m`
  }

  if (
    hours <
    48
  ) {
    return `${hours.toFixed(
      hours <
        10
        ? 1
        : 0,
    )}h`
  }

  return `${(
    hours /
    24
  ).toFixed(
    1,
  )}d`
}

const sourceLabel = (
  source:
    SimulationHistorySource,
): string => {
  if (
    source ===
    'SPY_REPORT'
  ) {
    return 'Spy Report'
  }

  if (
    source ===
    'BATTLE_REPORT'
  ) {
    return 'Battle Report'
  }

  return 'Manual'
}

const directionLabel = (
  value:
    ReportComparisonDirection,
): string => {
  if (
    value ===
    'reinforced'
  ) {
    return 'Defense Reinforced'
  }

  if (
    value ===
    'reduced'
  ) {
    return 'Defense Reduced'
  }

  if (
    value ===
    'mixed'
  ) {
    return 'Mixed Changes'
  }

  return 'No Net Change'
}

const severityLabel = (
  value:
    ReportComparisonSeverity,
): string => {
  if (
    value ===
    'major'
  ) {
    return 'Major Change'
  }

  if (
    value ===
    'moderate'
  ) {
    return 'Moderate Change'
  }

  if (
    value ===
    'minor'
  ) {
    return 'Minor Change'
  }

  return 'No Change'
}

function ReportComparisonEnginePanel({
  village,
  onLoadDefense,
}: ReportComparisonEnginePanelProps) {
  const initialPair =
    defaultReportComparisonPair(
      village,
    )

  const [
    olderId,
    setOlderId,
  ] = useState(
    initialPair?.[0].id ??
      '',
  )

  const [
    newerId,
    setNewerId,
  ] = useState(
    initialPair?.[1].id ??
      '',
  )

  const [
    changedOnly,
    setChangedOnly,
  ] = useState(
    true,
  )

  useEffect(
    () => {
      const pair =
        defaultReportComparisonPair(
          village,
        )

      setOlderId(
        pair?.[0].id ??
          '',
      )

      setNewerId(
        pair?.[1].id ??
          '',
      )
    },
    [village.key],
  )

  const older =
    useMemo(
      () =>
        findSnapshot(
          village,
          olderId,
        ),
      [
        village,
        olderId,
      ],
    )

  const newer =
    useMemo(
      () =>
        findSnapshot(
          village,
          newerId,
        ),
      [
        village,
        newerId,
      ],
    )

  const comparison =
    useMemo(
      () => {
        if (
          !older ||
          !newer ||
          older.id ===
            newer.id
        ) {
          return null
        }

        return compareReportSnapshots(
          older,
          newer,
        )
      },
      [
        older,
        newer,
      ],
    )

  if (
    village.snapshots.length <
    2
  ) {
    return (
      <div className="report-comparison-engine-empty">
        A second report is required for the advanced comparison engine.
      </div>
    )
  }

  const visibleUnits =
    comparison
      ? comparison.units.filter(
          (change) =>
            !changedOnly ||
            change.delta !==
              0,
        )
      : []

  const visibleModifiers =
    comparison
      ? comparison.modifiers.filter(
          (change) =>
            !changedOnly ||
            change.delta !==
              0,
        )
      : []

  return (
    <section className="report-comparison-engine">
      <div className="report-comparison-engine-header">
        <div>
          <span>
            Report Comparison Engine
          </span>

          <strong>
            Compare any two saved snapshots
          </strong>

          <small>
            {village.playerName} · {village.villageName}
          </small>
        </div>

        {comparison && (
          <div className="report-comparison-engine-badges">
            <span className={`direction-${comparison.direction}`}>
              {directionLabel(
                comparison.direction,
              )}
            </span>

            <span className={`severity-${comparison.severity}`}>
              {severityLabel(
                comparison.severity,
              )}
            </span>
          </div>
        )}
      </div>

      <div className="report-comparison-engine-selectors">
        <label>
          <span>
            Older Report
          </span>

          <select
            value={
              olderId
            }
            onChange={(
              event,
            ) =>
              setOlderId(
                event
                  .target
                  .value,
              )
            }
          >
            {village.snapshots.map(
              (snapshot) => (
                <option
                  key={
                    snapshot.id
                  }
                  value={
                    snapshot.id
                  }
                >
                  {formatDate(
                    snapshot.createdAt,
                  )}{' '}
                  ·{' '}
                  {sourceLabel(
                    snapshot.source,
                  )}
                </option>
              ),
            )}
          </select>
        </label>

        <div className="report-comparison-engine-arrow">
          →
        </div>

        <label>
          <span>
            Newer Report
          </span>

          <select
            value={
              newerId
            }
            onChange={(
              event,
            ) =>
              setNewerId(
                event
                  .target
                  .value,
              )
            }
          >
            {village.snapshots.map(
              (snapshot) => (
                <option
                  key={
                    snapshot.id
                  }
                  value={
                    snapshot.id
                  }
                >
                  {formatDate(
                    snapshot.createdAt,
                  )}{' '}
                  ·{' '}
                  {sourceLabel(
                    snapshot.source,
                  )}
                </option>
              ),
            )}
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            setOlderId(
              newerId,
            )

            setNewerId(
              olderId,
            )
          }}
          disabled={
            !olderId ||
            !newerId
          }
        >
          Swap
        </button>
      </div>

      {!comparison && (
        <div className="report-comparison-engine-message">
          Select two different reports to compare them.
        </div>
      )}

      {comparison && (
        <>
          <div className="report-comparison-engine-time">
            <div>
              <span>
                Older
              </span>

              <strong>
                {formatDate(
                  comparison.older.createdAt,
                )}
              </strong>

              <small>
                {sourceLabel(
                  comparison.olderSource,
                )}
              </small>
            </div>

            <div>
              <span>
                Time Between Reports
              </span>

              <strong>
                {formatElapsed(
                  comparison.elapsedMilliseconds,
                )}
              </strong>

              <small>
                observed change window
              </small>
            </div>

            <div>
              <span>
                Newer
              </span>

              <strong>
                {formatDate(
                  comparison.newer.createdAt,
                )}
              </strong>

              <small>
                {sourceLabel(
                  comparison.newerSource,
                )}
              </small>
            </div>
          </div>

          <div className="report-comparison-engine-summary">
            <div>
              <span>
                Troops
              </span>

              <strong>
                {formatter.format(
                  comparison.previousTotalTroops,
                )}
                {' → '}
                {formatter.format(
                  comparison.currentTotalTroops,
                )}
              </strong>

              <small className={
                comparison.troopDelta >
                  0
                  ? 'negative'
                  : comparison.troopDelta <
                      0
                    ? 'positive'
                    : ''
              }>
                {signed(
                  comparison.troopDelta,
                )}{' '}
                ·{' '}
                {signedPercent(
                  comparison.troopDeltaPercent,
                )}
              </small>
            </div>

            <div>
              <span>
                Provisions
              </span>

              <strong>
                {formatter.format(
                  comparison.previousProvisions,
                )}
                {' → '}
                {formatter.format(
                  comparison.currentProvisions,
                )}
              </strong>

              <small className={
                comparison.provisionDelta >
                  0
                  ? 'negative'
                  : comparison.provisionDelta <
                      0
                    ? 'positive'
                    : ''
              }>
                {signed(
                  comparison.provisionDelta,
                )}{' '}
                ·{' '}
                {signedPercent(
                  comparison.provisionDeltaPercent,
                )}
              </small>
            </div>

            <div>
              <span>
                Reinforced Types
              </span>

              <strong>
                {
                  comparison.increasedUnitTypes
                }
              </strong>

              <small>
                {
                  comparison.appearedUnitTypes
                }{' '}
                newly appeared
              </small>
            </div>

            <div>
              <span>
                Reduced Types
              </span>

              <strong>
                {
                  comparison.decreasedUnitTypes
                }
              </strong>

              <small>
                {
                  comparison.disappearedUnitTypes
                }{' '}
                disappeared
              </small>
            </div>
          </div>

          <div className="report-comparison-engine-insights">
            {comparison.summary.map(
              (
                item,
                index,
              ) => (
                <div
                  key={
                    `${item.text}-${index}`
                  }
                  className={
                    item.tone
                  }
                >
                  {
                    item.text
                  }
                </div>
              ),
            )}
          </div>

          <div className="report-comparison-engine-toolbar">
            <label>
              <input
                type="checkbox"
                checked={
                  changedOnly
                }
                onChange={(
                  event,
                ) =>
                  setChangedOnly(
                    event
                      .target
                      .checked,
                  )
                }
              />

              <span>
                Changed values only
              </span>
            </label>

            <div>
              <button
                type="button"
                onClick={() =>
                  onLoadDefense(
                    comparison.older.input,
                    comparison.older.metadata,
                    comparison.older.source,
                  )
                }
              >
                Load Older
              </button>

              <button
                type="button"
                className="primary"
                onClick={() =>
                  onLoadDefense(
                    comparison.newer.input,
                    comparison.newer.metadata,
                    comparison.newer.source,
                  )
                }
              >
                Load Newer
              </button>
            </div>
          </div>

          <div className="report-comparison-engine-table-wrap">
            <table className="report-comparison-engine-table">
              <thead>
                <tr>
                  <th>
                    Unit
                  </th>

                  <th>
                    Older
                  </th>

                  <th>
                    Newer
                  </th>

                  <th>
                    Change
                  </th>

                  <th>
                    %
                  </th>

                  <th>
                    Provision Δ
                  </th>

                  <th>
                    State
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleUnits.map(
                  (change) => (
                    <tr
                      key={
                        change.unitId
                      }
                    >
                      <td>
                        {
                          change.unitName
                        }
                      </td>

                      <td>
                        {formatter.format(
                          change.older,
                        )}
                      </td>

                      <td>
                        {formatter.format(
                          change.newer,
                        )}
                      </td>

                      <td
                        className={
                          change.delta >
                          0
                            ? 'negative'
                            : change.delta <
                                0
                              ? 'positive'
                              : ''
                        }
                      >
                        {signed(
                          change.delta,
                        )}
                      </td>

                      <td
                        className={
                          change.delta >
                          0
                            ? 'negative'
                            : change.delta <
                                0
                              ? 'positive'
                              : ''
                        }
                      >
                        {signedPercent(
                          change.deltaPercent,
                        )}
                      </td>

                      <td>
                        {signed(
                          change.provisionDelta,
                        )}
                      </td>

                      <td>
                        {change.appeared
                          ? 'New'
                          : change.disappeared
                            ? 'Gone'
                            : change.delta >
                                0
                              ? 'Increased'
                              : change.delta <
                                  0
                                ? 'Reduced'
                                : 'Same'}
                      </td>
                    </tr>
                  ),
                )}

                {visibleUnits.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={
                        7
                      }
                      className="report-comparison-engine-no-rows"
                    >
                      No troop changes for the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="report-comparison-engine-modifiers">
            <div className="report-comparison-engine-section-title">
              <span>
                Defense Settings
              </span>

              <strong>
                Buildings / modifiers
              </strong>
            </div>

            {visibleModifiers.length >
              0 ? (
              <div className="report-comparison-engine-modifier-grid">
                {visibleModifiers.map(
                  (change) => (
                    <div
                      key={
                        change.key
                      }
                    >
                      <span>
                        {
                          change.label
                        }
                      </span>

                      <strong>
                        {
                          change.older
                        }
                        {' → '}
                        {
                          change.newer
                        }
                      </strong>

                      <small className={
                        change.delta >
                        0
                          ? 'negative'
                          : change.delta <
                              0
                            ? 'positive'
                            : ''
                      }>
                        {signed(
                          change.delta,
                        )}
                      </small>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="report-comparison-engine-no-modifiers">
                No defense-setting changes for the current filter.
              </div>
            )}
          </div>

          <div className="report-comparison-engine-note">
            “Reinforced” and “Reduced” describe observed saved snapshots, not confirmed troop movement. A battle, support movement, production or incomplete scouting can all change what is visible between reports.
          </div>
        </>
      )}
    </section>
  )
}

export default ReportComparisonEnginePanel
