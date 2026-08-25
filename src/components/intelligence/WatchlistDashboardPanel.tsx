import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { units } from '../../data/units'

import {
  buildPlayerVillageIntelligence,
} from '../../domain/intelligence/playerVillageIntelligence'

import {
  buildWatchlistDashboardEntries,
  countWatchlistAttention,
} from '../../domain/intelligence/watchlistDashboard'

import {
  loadVillageWatchlistSettings,
  VILLAGE_WATCHLIST_CHANGED_EVENT,
} from '../../domain/intelligence/villageWatchlist'

import {
  listSimulationHistory,
} from '../../services/simulationHistoryApi'

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

import './WatchlistDashboardPanel.css'

interface WatchlistDashboardPanelProps {
  refreshToken: number
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

const totalTroops = (
  army: Army,
): number => {
  return units.reduce(
    (total, unit) =>
      total +
      (army[unit.id] ?? 0),
    0,
  )
}

const armySummary = (
  army: Army,
): string => {
  const active =
    units
      .map(
        (unit) => ({
          name: unit.name,
          quantity:
            army[unit.id] ??
            0,
        }),
      )
      .filter(
        (item) =>
          item.quantity >
          0,
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.quantity -
          left.quantity,
      )
      .slice(
        0,
        4,
      )

  if (
    active.length ===
    0
  ) {
    return 'No troops detected'
  }

  return active
    .map(
      (item) =>
        `${formatter.format(
          item.quantity,
        )} ${item.name}`,
    )
    .join(' · ')
}

const formatAge = (
  hours: number,
): string => {
  if (
    !Number.isFinite(
      hours,
    )
  ) {
    return 'Unknown'
  }

  if (
    hours <
    1
  ) {
    return 'Less than 1h ago'
  }

  if (
    hours <
    24
  ) {
    return `${Math.floor(
      hours,
    )}h ago`
  }

  return `${Math.floor(
    hours /
      24,
  )}d ago`
}

const signed = (
  value: number | null,
): string => {
  if (
    value === null
  ) {
    return '—'
  }

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

const attentionLabel = (
  value:
    | 'critical'
    | 'increased'
    | 'recent'
    | 'stale'
    | 'normal',
): string => {
  switch (value) {
    case 'critical':
      return 'Defense Alert'

    case 'increased':
      return 'Defense Increased'

    case 'recent':
      return 'Fresh Spy'

    case 'stale':
      return 'Needs Update'

    default:
      return 'Watching'
  }
}

function WatchlistDashboardPanel({
  refreshToken,
  onLoadDefense,
}: WatchlistDashboardPanelProps) {
  const [
    items,
    setItems,
  ] = useState<
    Awaited<
      ReturnType<
        typeof listSimulationHistory
      >
    >
  >([])

  const [
    watchSettings,
    setWatchSettings,
  ] = useState(
    loadVillageWatchlistSettings,
  )

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null)

  const load =
    async () => {
      try {
        setLoading(true)
        setError(null)

        const history =
          await listSimulationHistory()

        setItems(history)
        setWatchSettings(
          loadVillageWatchlistSettings(),
        )
      } catch (
        loadError
      ) {
        console.error(
          'Could not load watchlist dashboard:',
          loadError,
        )

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load watchlist dashboard.',
        )
      } finally {
        setLoading(false)
      }
    }

  useEffect(
    () => {
      void load()
    },
    [refreshToken],
  )

  useEffect(
    () => {
      const handleWatchlistChange =
        () => {
          setWatchSettings(
            loadVillageWatchlistSettings(),
          )
        }

      const handleStorage =
        (
          event:
            StorageEvent,
        ) => {
          if (
            event.key ===
            'tribal-battle-village-watchlist-v1'
          ) {
            handleWatchlistChange()
          }
        }

      window.addEventListener(
        VILLAGE_WATCHLIST_CHANGED_EVENT,
        handleWatchlistChange,
      )

      window.addEventListener(
        'storage',
        handleStorage,
      )

      return () => {
        window.removeEventListener(
          VILLAGE_WATCHLIST_CHANGED_EVENT,
          handleWatchlistChange,
        )

        window.removeEventListener(
          'storage',
          handleStorage,
        )
      }
    },
    [],
  )

  const players =
    useMemo(
      () =>
        buildPlayerVillageIntelligence(
          items,
        ),
      [items],
    )

  const villages =
    useMemo(
      () =>
        players.flatMap(
          (player) =>
            player.villages,
        ),
      [players],
    )

  const entries =
    useMemo(
      () =>
        buildWatchlistDashboardEntries(
          villages,
          watchSettings
            .watchedVillageKeys,
          watchSettings
            .alertThresholdPercent,
        ),
      [
        villages,
        watchSettings,
      ],
    )

  const attention =
    useMemo(
      () =>
        countWatchlistAttention(
          entries,
        ),
      [entries],
    )

  return (
    <section
      id="watchlist-dashboard"
      className="watchlist-dashboard"
    >
      <div className="watchlist-dashboard-header">
        <div>
          <span className="watchlist-dashboard-eyebrow">
            Watchlist Dashboard
          </span>

          <h3>
            Watched Villages
          </h3>

          <p>
            A compact view of villages that need your attention. Priority here means monitoring urgency, not whether an attack is recommended.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void load()
          }
          disabled={
            loading
          }
        >
          {loading
            ? 'Refreshing...'
            : 'Refresh'}
        </button>
      </div>

      <div className="watchlist-dashboard-summary">
        <div>
          <span>
            Watched
          </span>

          <strong>
            {entries.length}
          </strong>
        </div>

        <div
          className={
            attention.critical >
            0
              ? 'critical'
              : ''
          }
        >
          <span>
            Alerts
          </span>

          <strong>
            {
              attention.critical
            }
          </strong>
        </div>

        <div>
          <span>
            Increased
          </span>

          <strong>
            {
              attention.increased
            }
          </strong>
        </div>

        <div>
          <span>
            Fresh Spy
          </span>

          <strong>
            {
              attention.recent
            }
          </strong>
        </div>

        <div>
          <span>
            Needs Update
          </span>

          <strong>
            {
              attention.stale
            }
          </strong>
        </div>

        <div>
          <span>
            Alert Threshold
          </span>

          <strong>
            {
              watchSettings
                .alertThresholdPercent
            }
            %
          </strong>
        </div>
      </div>

      {error && (
        <div className="watchlist-dashboard-message error">
          <strong>
            Could not load watchlist.
          </strong>

          <span>
            {error}
          </span>
        </div>
      )}

      {!error &&
        loading &&
        items.length ===
          0 && (
          <div className="watchlist-dashboard-message">
            Loading watched villages...
          </div>
        )}

      {!error &&
        !loading &&
        entries.length ===
          0 && (
          <div className="watchlist-dashboard-message">
            <strong>
              Your watchlist is empty.
            </strong>

            <span>
              Open Intel and mark a village with ☆ Watch. It will then appear here automatically.
            </span>

            <button
              type="button"
              onClick={() =>
                document
                  .getElementById(
                    'player-village-intelligence',
                  )
                  ?.scrollIntoView({
                    behavior:
                      'smooth',
                    block:
                      'start',
                  })
              }
            >
              Open Intel
            </button>
          </div>
        )}

      {entries.length >
        0 && (
        <div className="watchlist-dashboard-grid">
          {entries.map(
            (
              entry,
            ) => {
              const {
                village,
              } = entry

              return (
                <article
                  key={
                    village.key
                  }
                  className={`watchlist-dashboard-village attention-${entry.attention}`}
                >
                  <div className="watchlist-dashboard-village-top">
                    <div>
                      <span>
                        {
                          village.playerName
                        }
                      </span>

                      <strong>
                        {
                          village.villageName
                        }
                      </strong>

                      {village.x !==
                        null &&
                        village.y !==
                          null && (
                          <small>
                            (
                            {
                              village.x
                            }
                            |
                            {
                              village.y
                            }
                            )
                          </small>
                        )}
                    </div>

                    <span className="watchlist-dashboard-attention">
                      {attentionLabel(
                        entry.attention,
                      )}
                    </span>
                  </div>

                  <div className="watchlist-dashboard-village-metrics">
                    <div>
                      <span>
                        Latest Defense
                      </span>

                      <strong>
                        {formatter.format(
                          totalTroops(
                            village.latest.army,
                          ),
                        )}
                      </strong>

                      <small>
                        troops
                      </small>
                    </div>

                    <div>
                      <span>
                        Change
                      </span>

                      <strong
                        className={
                          (entry.troopDelta ??
                            0) >
                          0
                            ? 'positive'
                            : (entry.troopDelta ??
                                  0) <
                                0
                              ? 'negative'
                              : ''
                        }
                      >
                        {signed(
                          entry.troopDelta,
                        )}
                      </strong>

                      <small>
                        {entry.troopDeltaPercent !==
                        null
                          ? `${entry.troopDeltaPercent.toFixed(
                              1,
                            )}%`
                          : 'no previous report'}
                      </small>
                    </div>

                    <div>
                      <span>
                        Wall
                      </span>

                      <strong>
                        {
                          village.latest.wallLevel
                        }
                      </strong>

                      <small>
                        level
                      </small>
                    </div>

                    <div>
                      <span>
                        Last Seen
                      </span>

                      <strong>
                        {formatAge(
                          entry.ageHours,
                        )}
                      </strong>

                      <small>
                        {
                          village.latest.source ===
                          'SPY_REPORT'
                            ? 'Spy Report'
                            : village.latest.source ===
                                'BATTLE_REPORT'
                              ? 'Battle Report'
                              : 'Manual'
                        }
                      </small>
                    </div>
                  </div>

                  <div className="watchlist-dashboard-army">
                    {armySummary(
                      village.latest.army,
                    )}
                  </div>

                  <div className="watchlist-dashboard-actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() =>
                        onLoadDefense(
                          village.latest.input,
                          village.latest.metadata,
                          village.latest.source,
                        )
                      }
                    >
                      Load Defense
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById(
                            `intel-${village.latest.id}`,
                          )
                          ?.scrollIntoView({
                            behavior:
                              'smooth',
                            block:
                              'center',
                          })
                      }
                    >
                      Open Intel
                    </button>
                  </div>
                </article>
              )
            },
          )}
        </div>
      )}
    </section>
  )
}

export default WatchlistDashboardPanel
