import {
  buildReportTimeline,
} from '../../domain/intelligence/reportTimeline'

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

import './ReportTimelinePanel.css'

interface ReportTimelinePanelProps {
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
  value: number | null,
): string => {
  if (
    value === null
  ) {
    return '—'
  }

  if (
    value > 0
  ) {
    return `+${formatter.format(
      value,
    )}`
  }

  return formatter.format(
    value,
  )
}

const formatDate = (
  value: string,
): string => {
  const date =
    new Date(value)

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
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(date)
}

const sourceLabel = (
  source: SimulationHistorySource,
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

function ReportTimelinePanel({
  village,
  onLoadDefense,
}: ReportTimelinePanelProps) {
  const entries =
    buildReportTimeline(
      village,
    )

  if (
    entries.length === 0
  ) {
    return null
  }

  return (
    <section className="report-timeline">
      <div className="report-timeline-header">
        <div>
          <span>
            Report Timeline
          </span>

          <strong>
            {village.playerName} · {village.villageName}
          </strong>
        </div>

        <span>
          {entries.length} saved reports
        </span>
      </div>

      <div className="report-timeline-list">
        {entries.map(
          (
            entry,
            index,
          ) => {
            const troopClass =
              (entry.troopDelta ?? 0) > 0
                ? 'positive'
                : (entry.troopDelta ?? 0) < 0
                  ? 'negative'
                  : ''

            const wallClass =
              (entry.wallDelta ?? 0) > 0
                ? 'positive'
                : (entry.wallDelta ?? 0) < 0
                  ? 'negative'
                  : ''

            return (
              <article
                key={
                  entry.snapshot.id
                }
                className="report-timeline-entry"
              >
                <div className="report-timeline-marker">
                  <span>
                    {index + 1}
                  </span>
                </div>

                <div className="report-timeline-content">
                  <div className="report-timeline-entry-top">
                    <div>
                      <span className={`report-timeline-source source-${entry.snapshot.source.toLowerCase()}`}>
                        {sourceLabel(
                          entry.snapshot.source,
                        )}
                      </span>

                      <time
                        dateTime={
                          entry.snapshot.createdAt
                        }
                      >
                        {formatDate(
                          entry.snapshot.createdAt,
                        )}
                      </time>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onLoadDefense(
                          entry.snapshot.input,
                          entry.snapshot.metadata,
                          entry.snapshot.source,
                        )
                      }
                    >
                      Load Snapshot
                    </button>
                  </div>

                  <div className="report-timeline-metrics">
                    <div>
                      <span>
                        Defense
                      </span>

                      <strong>
                        {formatter.format(
                          entry.totalTroops,
                        )}
                      </strong>

                      <small>
                        troops
                      </small>
                    </div>

                    <div className={troopClass}>
                      <span>
                        Change
                      </span>

                      <strong>
                        {signed(
                          entry.troopDelta,
                        )}
                      </strong>

                      <small>
                        vs older report
                      </small>
                    </div>

                    <div>
                      <span>
                        Wall
                      </span>

                      <strong>
                        {
                          entry.snapshot.wallLevel
                        }
                      </strong>

                      <small className={wallClass}>
                        {entry.wallDelta === null
                          ? 'first saved value'
                          : `${signed(
                              entry.wallDelta,
                            )} level`}
                      </small>
                    </div>
                  </div>

                  <div className="report-timeline-units">
                    {entry.topUnits.length > 0
                      ? entry.topUnits.map(
                          (unit) => (
                            <span
                              key={
                                unit.name
                              }
                            >
                              <strong>
                                {formatter.format(
                                  unit.quantity,
                                )}
                              </strong>{' '}
                              {unit.name}
                            </span>
                          ),
                        )
                      : (
                        <span>
                          No troops detected
                        </span>
                      )}
                  </div>
                </div>
              </article>
            )
          },
        )}
      </div>
    </section>
  )
}

export default ReportTimelinePanel
