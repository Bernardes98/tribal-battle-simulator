import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { units } from '../../data/units'

import {
  buildPlayerVillageIntelligence,
} from '../../domain/intelligence/playerVillageIntelligence'

import type {
  VillageIntelligence,
} from '../../domain/intelligence/playerVillageIntelligence'

import {
  getVillageWatchAlert,
  loadVillageWatchlistSettings,
  saveVillageWatchlistSettings,
  toggleVillageWatch,
  updateVillageWatchThreshold,
} from '../../domain/intelligence/villageWatchlist'

import {
  loadVillageAnnotations,
  VILLAGE_ANNOTATIONS_CHANGED_EVENT,
} from '../../domain/intelligence/villageAnnotations'

import type {
  VillageTag,
} from '../../domain/intelligence/villageAnnotations'

import {
  filterPlayersWithVillageFilters,
} from '../../domain/intelligence/villageFilters'

import type {
  VillageTagMatchMode,
} from '../../domain/intelligence/villageFilters'

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

import DefenseComparisonPanel from './DefenseComparisonPanel'
import DefenseTrendPanel from './DefenseTrendPanel'
import ReportTimelinePanel from './ReportTimelinePanel'
import VillageNotesTagsPanel from './VillageNotesTagsPanel'
import VillageFilterControls from './VillageFilterControls'

import './PlayerVillageIntelligencePanel.css'

interface PlayerVillageIntelligencePanelProps {
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
          label: unit.name,
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
        5,
      )

  if (
    active.length === 0
  ) {
    return 'No troops detected'
  }

  return active
    .map(
      (item) =>
        `${formatter.format(
          item.quantity,
        )} ${item.label}`,
    )
    .join(' · ')
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

const troopDelta = (
  village:
    VillageIntelligence,
): number | null => {
  if (
    !village.previous
  ) {
    return null
  }

  return (
    village.latest
      .totalTroops -
    village.previous
      .totalTroops
  )
}

function PlayerVillageIntelligencePanel({
  refreshToken,
  onLoadDefense,
}: PlayerVillageIntelligencePanelProps) {
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
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null)

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    selectedTags,
    setSelectedTags,
  ] = useState<
    VillageTag[]
  >([])

  const [
    tagMode,
    setTagMode,
  ] = useState<
    VillageTagMatchMode
  >('any')

  const [
    annotationVersion,
    setAnnotationVersion,
  ] = useState(0)

  const [
    expandedVillage,
    setExpandedVillage,
  ] = useState<
    string | null
  >(null)

  const [
    comparedVillage,
    setComparedVillage,
  ] = useState<
    string | null
  >(null)

  const [
    watchlistSettings,
    setWatchlistSettings,
  ] = useState(
    loadVillageWatchlistSettings,
  )

  const [
    watchedOnly,
    setWatchedOnly,
  ] = useState(false)

  const [
    trendedVillage,
    setTrendedVillage,
  ] = useState<
    string | null
  >(null)

  const [
    timelineVillage,
    setTimelineVillage,
  ] = useState<
    string | null
  >(null)

  const [
    annotatedVillage,
    setAnnotatedVillage,
  ] = useState<
    string | null
  >(null)

  const load =
    async () => {
      try {
        setLoading(true)
        setError(null)

        setItems(
          await listSimulationHistory(),
        )
      } catch (
        loadError
      ) {
        console.error(
          'Could not load player intelligence:',
          loadError,
        )

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load player intelligence.',
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
      const handleChange =
        () => {
          setAnnotationVersion(
            (value) =>
              value + 1,
          )
        }

      const handleStorage =
        (
          event:
            StorageEvent,
        ) => {
          if (
            event.key ===
            'tribal-battle-village-annotations-v1'
          ) {
            handleChange()
          }
        }

      window.addEventListener(
        VILLAGE_ANNOTATIONS_CHANGED_EVENT,
        handleChange,
      )

      window.addEventListener(
        'storage',
        handleStorage,
      )

      return () => {
        window.removeEventListener(
          VILLAGE_ANNOTATIONS_CHANGED_EVENT,
          handleChange,
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

  const annotations =
    useMemo(
      () => {
        void annotationVersion

        return loadVillageAnnotations()
      },
      [annotationVersion],
    )

  const filteredPlayers =
    useMemo(
      () =>
        filterPlayersWithVillageFilters(
          players,
          annotations,
          {
            search,
            selectedTags,
            tagMode,
          },
        ),
      [
        players,
        annotations,
        search,
        selectedTags,
        tagMode,
      ],
    )

  const totalVillages =
    useMemo(
      () =>
        players.reduce(
          (
            total,
            player,
          ) =>
            total +
            player.villageCount,
          0,
        ),
      [players],
    )

  const allVillages =
    useMemo(
      () =>
        players.flatMap(
          (player) =>
            player.villages,
        ),
      [players],
    )

  const watchedVillages =
    useMemo(
      () =>
        allVillages.filter(
          (village) =>
            watchlistSettings
              .watchedVillageKeys
              .includes(
                village.key,
              ),
        ),
      [
        allVillages,
        watchlistSettings
          .watchedVillageKeys,
      ],
    )

  const watchedAlerts =
    useMemo(
      () =>
        watchedVillages
          .map(
            (village) => ({
              village,
              alert:
                getVillageWatchAlert(
                  village,
                  watchlistSettings
                    .alertThresholdPercent,
                ),
            }),
          )
          .filter(
            (item) =>
              item.alert
                .isAlert,
          ),
      [
        watchedVillages,
        watchlistSettings
          .alertThresholdPercent,
      ],
    )

  const visiblePlayers =
    useMemo(
      () => {
        if (!watchedOnly) {
          return filteredPlayers
        }

        return filteredPlayers
          .map(
            (player) => {
              const villages =
                player.villages.filter(
                  (village) =>
                    watchlistSettings
                      .watchedVillageKeys
                      .includes(
                        village.key,
                      ),
                )

              if (
                villages.length ===
                0
              ) {
                return null
              }

              return {
                ...player,
                villageCount:
                  villages.length,
                reportCount:
                  villages.reduce(
                    (
                      total,
                      village,
                    ) =>
                      total +
                      village.reportCount,
                    0,
                  ),
                villages,
              }
            },
          )
          .filter(
            (
              player,
            ): player is NonNullable<
              typeof player
            > =>
              player !==
              null,
          )
      },
      [
        filteredPlayers,
        watchedOnly,
        watchlistSettings
          .watchedVillageKeys,
      ],
    )

  const setWatchlist =
    (
      next: typeof watchlistSettings,
    ) => {
      setWatchlistSettings(
        next,
      )

      saveVillageWatchlistSettings(
        next,
      )
    }

  const toggleWatch =
    (
      villageKey: string,
    ) => {
      setWatchlist(
        toggleVillageWatch(
          watchlistSettings,
          villageKey,
        ),
      )
    }

  return (
    <section
      id="player-village-intelligence"
      className="player-intelligence-card"
    >
      <div className="player-intelligence-header">
        <div>
          <span className="player-intelligence-eyebrow">
            Intelligence
          </span>

          <h3>
            Player & Village Intelligence
          </h3>

          <p>
            Track defenses previously imported from battle and spy reports.
          </p>
        </div>

        <div className="player-intelligence-stats">
          <span>
            <strong>
              {players.length}
            </strong>
            players
          </span>

          <span>
            <strong>
              {totalVillages}
            </strong>
            villages
          </span>

          <span>
            <strong>
              {watchedVillages.length}
            </strong>
            watched
          </span>

          <span
            className={
              watchedAlerts.length >
              0
                ? 'player-intelligence-stat-alert'
                : undefined
            }
          >
            <strong>
              {watchedAlerts.length}
            </strong>
            alerts
          </span>
        </div>
      </div>

      <VillageFilterControls
        search={search}
        onSearchChange={setSearch}
        selectedTags={selectedTags}
        onSelectedTagsChange={setSelectedTags}
        tagMode={tagMode}
        onTagModeChange={setTagMode}
        resultCount={
          filteredPlayers.reduce(
            (
              total,
              player,
            ) =>
              total +
              player.villageCount,
            0,
          )
        }
      />

      <div className="player-intelligence-toolbar">
        <label className="player-intelligence-threshold">
          <span>
            Watch alert at
          </span>

          <div>
            <input
              type="number"
              min="5"
              max="200"
              step="5"
              value={
                watchlistSettings
                  .alertThresholdPercent
              }
              onChange={(
                event,
              ) => {
                const value =
                  Number(
                    event
                      .target
                      .value,
                  )

                setWatchlist(
                  updateVillageWatchThreshold(
                    watchlistSettings,
                    value,
                  ),
                )
              }}
            />

            <strong>
              %
            </strong>
          </div>
        </label>

        <button
          type="button"
          className={
            watchedOnly
              ? 'player-intelligence-filter-active'
              : undefined
          }
          onClick={() =>
            setWatchedOnly(
              (value) =>
                !value,
            )
          }
        >
          {watchedOnly
            ? 'Show All'
            : 'Watched Only'}
        </button>

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

      {watchedAlerts.length >
        0 && (
        <div className="player-intelligence-watch-alerts">
          <div className="player-intelligence-watch-alerts-title">
            <strong>
              Watchlist Alert
            </strong>

            <span>
              New spy reports show a defense increase above your{' '}
              {
                watchlistSettings
                  .alertThresholdPercent
              }
              % threshold.
            </span>
          </div>

          <div className="player-intelligence-watch-alert-list">
            {watchedAlerts.map(
              ({
                village,
                alert,
              }) => (
                <button
                  key={
                    village.key
                  }
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
                  <strong>
                    {
                      village.playerName
                    } ·{' '}
                    {
                      village.villageName
                    }
                  </strong>

                  <span>
                    +{formatter.format(
                      alert.delta ??
                        0,
                    )}{' '}
                    troops · +
                    {(
                      alert.percentage ??
                      0
                    ).toFixed(
                      1,
                    )}
                    %
                  </span>
                </button>
              ),
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="player-intelligence-error">
          <strong>
            Could not load intelligence.
          </strong>

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              void load()
            }
          >
            Try Again
          </button>
        </div>
      )}

      {!error &&
        loading &&
        items.length ===
          0 && (
          <div className="player-intelligence-empty">
            Loading imported reports...
          </div>
        )}

      {!error &&
        !loading &&
        players.length ===
          0 && (
          <div className="player-intelligence-empty">
            <strong>
              No village intelligence yet.
            </strong>

            <span>
              Import a Spy Report or Battle Report, apply it and simulate the battle. The identified defender will appear here.
            </span>
          </div>
        )}

      {!error &&
        players.length >
          0 &&
        visiblePlayers.length ===
          0 && (
          <div className="player-intelligence-empty">
            {watchedOnly
              ? 'No watched village matches your search.'
              : 'No player or village matches your search.'}
          </div>
        )}

      {visiblePlayers.length >
        0 && (
        <div className="player-intelligence-players">
          {visiblePlayers.map(
            (
              player,
            ) => (
              <article
                key={
                  player.key
                }
                className="player-intelligence-player"
              >
                <div className="player-intelligence-player-header">
                  <div>
                    <span>
                      Player
                    </span>

                    <strong>
                      {
                        player.playerName
                      }
                    </strong>
                  </div>

                  <div className="player-intelligence-player-meta">
                    <span>
                      {
                        player.villageCount
                      }{' '}
                      {player.villageCount ===
                      1
                        ? 'village'
                        : 'villages'}
                    </span>

                    <span>
                      {
                        player.reportCount
                      }{' '}
                      reports
                    </span>

                    <span>
                      Last seen{' '}
                      {formatDate(
                        player.latestSeenAt,
                      )}
                    </span>
                  </div>
                </div>

                <div className="player-intelligence-villages">
                  {player.villages.map(
                    (
                      village,
                    ) => {
                      const delta =
                        troopDelta(
                          village,
                        )

                      const expanded =
                        expandedVillage ===
                        village.key

                      const watched =
                        watchlistSettings
                          .watchedVillageKeys
                          .includes(
                            village.key,
                          )

                      const watchAlert =
                        getVillageWatchAlert(
                          village,
                          watchlistSettings
                            .alertThresholdPercent,
                        )

                      return (
                        <div
                          key={
                            village.key
                          }
                          id={`intel-${village.latest.id}`}
                          className={`player-intelligence-village ${
                            watched
                              ? 'is-watched'
                              : ''
                          } ${
                            watched &&
                            watchAlert.isAlert
                              ? 'has-watch-alert'
                              : ''
                          }`}
                        >
                          <div className="player-intelligence-village-main">
                            <div className="player-intelligence-village-name">
                              <span>
                                Village
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

                              {watched && (
                                <span className="player-intelligence-watch-badge">
                                  ★ Watched
                                </span>
                              )}

                              {watched &&
                                watchAlert.isAlert && (
                                <span className="player-intelligence-watch-badge alert">
                                  Defense +{(
                                    watchAlert.percentage ??
                                    0
                                  ).toFixed(
                                    1,
                                  )}
                                  %
                                </span>
                              )}
                            </div>

                            <div className="player-intelligence-latest">
                              <span className={`player-intelligence-source source-${village.latest.source.toLowerCase()}`}>
                                {sourceLabel(
                                  village.latest.source,
                                )}
                              </span>

                              <span>
                                Last seen{' '}
                                <strong>
                                  {formatDate(
                                    village.latest.createdAt,
                                  )}
                                </strong>
                              </span>

                              <span>
                                Reports{' '}
                                <strong>
                                  {
                                    village.reportCount
                                  }
                                </strong>
                              </span>
                            </div>

                            <div className="player-intelligence-defense">
                              <div>
                                <span>
                                  Latest defense
                                </span>

                                <strong>
                                  {formatter.format(
                                    totalTroops(
                                      village.latest.army,
                                    ),
                                  )}{' '}
                                  troops
                                </strong>

                                <small>
                                  {armySummary(
                                    village.latest.army,
                                  )}
                                </small>
                              </div>

                              <div className="player-intelligence-wall">
                                <span>
                                  Wall
                                </span>

                                <strong>
                                  {
                                    village.latest.wallLevel
                                  }
                                </strong>
                              </div>

                              {delta !==
                                null && (
                                <div
                                  className={`player-intelligence-delta ${
                                    delta >
                                    0
                                      ? 'positive'
                                      : delta <
                                          0
                                        ? 'negative'
                                        : ''
                                  }`}
                                >
                                  <span>
                                    Since previous
                                  </span>

                                  <strong>
                                    {delta >
                                    0
                                      ? '+'
                                      : ''}
                                    {formatter.format(
                                      delta,
                                    )}
                                  </strong>
                                </div>
                              )}
                            </div>

                            <div className="player-intelligence-actions">
                              <button
                                type="button"
                                className="player-intelligence-primary"
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
                                  setExpandedVillage(
                                    expanded
                                      ? null
                                      : village.key,
                                  )
                                }
                              >
                                {expanded
                                  ? 'Hide History'
                                  : 'View History'}
                              </button>

                              {village.previous && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setComparedVillage(
                                      comparedVillage ===
                                      village.key
                                        ? null
                                        : village.key,
                                    )
                                  }
                                >
                                  {comparedVillage ===
                                  village.key
                                    ? 'Hide Changes'
                                    : 'Compare Latest'}
                                </button>
                              )}

                              {village.snapshots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTrendedVillage(
                                      trendedVillage ===
                                      village.key
                                        ? null
                                        : village.key,
                                    )
                                  }
                                >
                                  {trendedVillage ===
                                  village.key
                                    ? 'Hide Trend'
                                    : 'Defense Trend'}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setTimelineVillage(
                                    timelineVillage ===
                                    village.key
                                      ? null
                                      : village.key,
                                  )
                                }
                              >
                                {timelineVillage ===
                                village.key
                                  ? 'Hide Timeline'
                                  : 'Report Timeline'}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setAnnotatedVillage(
                                    annotatedVillage ===
                                    village.key
                                      ? null
                                      : village.key,
                                  )
                                }
                              >
                                {annotatedVillage ===
                                village.key
                                  ? 'Hide Notes'
                                  : 'Notes & Tags'}
                              </button>

                              <button
                                type="button"
                                className={
                                  watched
                                    ? 'player-intelligence-watch-button active'
                                    : 'player-intelligence-watch-button'
                                }
                                onClick={() =>
                                  toggleWatch(
                                    village.key,
                                  )
                                }
                              >
                                {watched
                                  ? '★ Unwatch'
                                  : '☆ Watch'}
                              </button>
                            </div>
                          </div>

                          {comparedVillage ===
                            village.key && (
                            <DefenseComparisonPanel
                              village={village}
                            />
                          )}

                          {trendedVillage ===
                            village.key && (
                            <DefenseTrendPanel
                              village={village}
                            />
                          )}

                          {timelineVillage ===
                            village.key && (
                            <ReportTimelinePanel
                              village={village}
                              onLoadDefense={
                                onLoadDefense
                              }
                            />
                          )}

                          {annotatedVillage ===
                            village.key && (
                            <VillageNotesTagsPanel
                              village={village}
                            />
                          )}

                          {expanded && (
                            <div className="player-intelligence-timeline">
                              {village.snapshots.map(
                                (
                                  snapshot,
                                  index,
                                ) => (
                                  <div
                                    key={
                                      snapshot.id
                                    }
                                    className="player-intelligence-snapshot"
                                  >
                                    <span className="player-intelligence-snapshot-index">
                                      #
                                      {
                                        village.reportCount -
                                        index
                                      }
                                    </span>

                                    <div>
                                      <strong>
                                        {formatter.format(
                                          snapshot.totalTroops,
                                        )}{' '}
                                        troops
                                      </strong>

                                      <small>
                                        {armySummary(
                                          snapshot.army,
                                        )}
                                      </small>
                                    </div>

                                    <span>
                                      Wall{' '}
                                      {
                                        snapshot.wallLevel
                                      }
                                    </span>

                                    <span>
                                      {sourceLabel(
                                        snapshot.source,
                                      )}
                                    </span>

                                    <time
                                      dateTime={
                                        snapshot.createdAt
                                      }
                                    >
                                      {formatDate(
                                        snapshot.createdAt,
                                      )}
                                    </time>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        onLoadDefense(
                                          snapshot.input,
                                          snapshot.metadata,
                                          snapshot.source,
                                        )
                                      }
                                    >
                                      Load
                                    </button>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      )
                    },
                  )}
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </section>
  )
}

export default PlayerVillageIntelligencePanel
