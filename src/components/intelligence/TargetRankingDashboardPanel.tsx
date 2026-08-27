import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  buildPlayerVillageIntelligence,
} from '../../domain/intelligence/playerVillageIntelligence'

import {
  buildWatchlistDashboardEntries,
} from '../../domain/intelligence/watchlistDashboard'

import {
  loadVillageWatchlistSettings,
  VILLAGE_WATCHLIST_CHANGED_EVENT,
} from '../../domain/intelligence/villageWatchlist'

import {
  loadVillageAnnotations,
  VILLAGE_ANNOTATIONS_CHANGED_EVENT,
} from '../../domain/intelligence/villageAnnotations'

import type {
  VillageTag,
} from '../../domain/intelligence/villageAnnotations'

import {
  filterWatchlistEntries,
} from '../../domain/intelligence/villageFilters'

import type {
  VillageTagMatchMode,
} from '../../domain/intelligence/villageFilters'

import {
  loadTargetScoringSettings,
  TARGET_SCORING_SETTINGS_CHANGED_EVENT,
} from '../../domain/intelligence/targetScoring'

import {
  buildTargetRanking,
  filterTargetRankingByMinimumScore,
  getRankingByVillageKeys,
} from '../../domain/intelligence/targetRanking'

import {
  listSimulationHistory,
} from '../../services/simulationHistoryApi'

import type {
  SimulationHistorySource,
} from '../../services/simulationHistoryApi'

import type {
  BattleSimulationInput,
} from '../../types/Battle'

import type {
  ReportMetadata,
} from '../../types/ReportMetadata'

import VillageFilterControls from './VillageFilterControls'
import TargetScoreDetails from './TargetScoreDetails'

import './TargetRankingDashboardPanel.css'

interface TargetRankingDashboardPanelProps {
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
    hours < 1
  ) {
    return '< 1h'
  }

  if (
    hours < 24
  ) {
    return `${Math.floor(
      hours,
    )}h`
  }

  return `${Math.floor(
    hours / 24,
  )}d`
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

function TargetRankingDashboardPanel({
  refreshToken,
  onLoadDefense,
}: TargetRankingDashboardPanelProps) {
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
    watchSettings,
    setWatchSettings,
  ] = useState(
    loadVillageWatchlistSettings,
  )

  const [
    annotations,
    setAnnotations,
  ] = useState(
    loadVillageAnnotations,
  )

  const [
    scoringSettings,
    setScoringSettings,
  ] = useState(
    loadTargetScoringSettings,
  )

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
    minimumScore,
    setMinimumScore,
  ] = useState(50)

  const [
    comparisonKeys,
    setComparisonKeys,
  ] = useState<
    string[]
  >([])

  const [
    scoreDetailsKey,
    setScoreDetailsKey,
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

        setWatchSettings(
          loadVillageWatchlistSettings(),
        )

        setAnnotations(
          loadVillageAnnotations(),
        )

        setScoringSettings(
          loadTargetScoringSettings(),
        )
      } catch (
        loadError
      ) {
        console.error(
          'Could not load target ranking:',
          loadError,
        )

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load target ranking.',
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
      const refreshLocalData =
        () => {
          setWatchSettings(
            loadVillageWatchlistSettings(),
          )

          setAnnotations(
            loadVillageAnnotations(),
          )

          setScoringSettings(
            loadTargetScoringSettings(),
          )
        }

      const handleStorage =
        (
          event:
            StorageEvent,
        ) => {
          if (
            event.key ===
              'tribal-battle-village-watchlist-v1' ||
            event.key ===
              'tribal-battle-village-annotations-v1' ||
            event.key ===
              'tribal-battle-target-scoring-settings-v1'
          ) {
            refreshLocalData()
          }
        }

      window.addEventListener(
        VILLAGE_WATCHLIST_CHANGED_EVENT,
        refreshLocalData,
      )

      window.addEventListener(
        VILLAGE_ANNOTATIONS_CHANGED_EVENT,
        refreshLocalData,
      )

      window.addEventListener(
        TARGET_SCORING_SETTINGS_CHANGED_EVENT,
        refreshLocalData,
      )

      window.addEventListener(
        'storage',
        handleStorage,
      )

      return () => {
        window.removeEventListener(
          VILLAGE_WATCHLIST_CHANGED_EVENT,
          refreshLocalData,
        )

        window.removeEventListener(
          VILLAGE_ANNOTATIONS_CHANGED_EVENT,
          refreshLocalData,
        )

        window.removeEventListener(
          TARGET_SCORING_SETTINGS_CHANGED_EVENT,
          refreshLocalData,
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

  const watchEntries =
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

  const filteredWatchEntries =
    useMemo(
      () =>
        filterWatchlistEntries(
          watchEntries,
          annotations,
          {
            search,
            selectedTags,
            tagMode,
          },
          'all',
        ),
      [
        watchEntries,
        annotations,
        search,
        selectedTags,
        tagMode,
      ],
    )

  const fullRanking =
    useMemo(
      () =>
        buildTargetRanking(
          watchEntries,
          annotations,
          scoringSettings,
        ),
      [
        watchEntries,
        annotations,
        scoringSettings,
      ],
    )

  const ranking =
    useMemo(
      () =>
        filterTargetRankingByMinimumScore(
          buildTargetRanking(
            filteredWatchEntries,
            annotations,
            scoringSettings,
          ),
          minimumScore,
        ),
      [
        filteredWatchEntries,
        annotations,
        scoringSettings,
        minimumScore,
      ],
    )

  const comparison =
    useMemo(
      () =>
        getRankingByVillageKeys(
          fullRanking,
          comparisonKeys,
        ),
      [
        fullRanking,
        comparisonKeys,
      ],
    )

  useEffect(
    () => {
      const available =
        new Set(
          fullRanking.map(
            (value) =>
              value.entry
                .village.key,
          ),
        )

      setComparisonKeys(
        (
          current,
        ) =>
          current.filter(
            (key) =>
              available.has(
                key,
              ),
          ),
      )
    },
    [fullRanking],
  )

  const toggleComparison =
    (
      villageKey: string,
    ) => {
      setComparisonKeys(
        (
          current,
        ) => {
          if (
            current.includes(
              villageKey,
            )
          ) {
            return current.filter(
              (key) =>
                key !==
                villageKey,
            )
          }

          if (
            current.length >=
            3
          ) {
            return [
              current[1],
              current[2],
              villageKey,
            ].filter(
              (
                value,
              ): value is string =>
                Boolean(value),
            )
          }

          return [
            ...current,
            villageKey,
          ]
        },
      )
    }

  const topThree =
    fullRanking.slice(
      0,
      3,
    )

  return (
    <section
      id="target-ranking"
      className="target-ranking"
    >
      <div className="target-ranking-header">
        <div>
          <span className="target-ranking-eyebrow">
            Target Ranking
          </span>

          <h3>
            Ranked Targets
          </h3>

          <p>
            Rank watched villages with your configurable Target Score, then compare up to three candidates side by side.
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

      {topThree.length >
        0 && (
        <div className="target-ranking-podium">
          {topThree.map(
            (
              value,
              index,
            ) => (
              <article
                key={
                  value.entry
                    .village.key
                }
                className={`target-ranking-podium-card podium-${index + 1}`}
              >
                <span className="target-ranking-position">
                  #{index + 1}
                </span>

                <strong>
                  {
                    value.entry
                      .village
                      .villageName
                  }
                </strong>

                <small>
                  {
                    value.entry
                      .village
                      .playerName
                  }
                  {value.entry
                      .village.x !==
                    null &&
                    value.entry
                      .village.y !==
                      null
                    ? ` · ${value.entry.village.x}|${value.entry.village.y}`
                    : ''}
                </small>

                <span className={`target-ranking-score score-${value.score.label.toLowerCase()}`}>
                  {
                    value.score.score
                  }
                  /100 ·{' '}
                  {
                    value.score.label
                  }
                </span>
              </article>
            ),
          )}
        </div>
      )}

      <VillageFilterControls
        search={search}
        onSearchChange={
          setSearch
        }
        selectedTags={
          selectedTags
        }
        onSelectedTagsChange={
          setSelectedTags
        }
        tagMode={
          tagMode
        }
        onTagModeChange={
          setTagMode
        }
        resultCount={
          ranking.length
        }
      />

      <div className="target-ranking-score-filter">
        <label>
          <span>
            Minimum Target Score
          </span>

          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={
              minimumScore
            }
            onChange={(
              event,
            ) =>
              setMinimumScore(
                Number(
                  event
                    .target
                    .value,
                ),
              )
            }
          />

          <strong>
            {
              minimumScore
            }
            /100
          </strong>
        </label>

        <span>
          {comparisonKeys.length}
          /3 selected for comparison
        </span>
      </div>

      {comparison.length >
        0 && (
        <div className="target-ranking-comparison">
          <div className="target-ranking-comparison-header">
            <div>
              <span>
                Side-by-Side Comparison
              </span>

              <strong>
                Compare selected targets
              </strong>
            </div>

            <button
              type="button"
              onClick={() =>
                setComparisonKeys(
                  [],
                )
              }
            >
              Clear Comparison
            </button>
          </div>

          <div
            className={`target-ranking-comparison-grid compare-${comparison.length}`}
          >
            {comparison.map(
              (value) => {
                const village =
                  value.entry
                    .village

                return (
                  <article
                    key={
                      village.key
                    }
                    className="target-ranking-comparison-card"
                  >
                    <span className="target-ranking-comparison-rank">
                      Rank #{value.rank}
                    </span>

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

                    <div className="target-ranking-comparison-score">
                      {
                        value.score.score
                      }
                      <span>
                        /100
                      </span>
                    </div>

                    <dl>
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
                          Intel age
                        </dt>

                        <dd>
                          {formatAge(
                            value.entry
                              .ageHours,
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Defense Δ
                        </dt>

                        <dd
                          className={
                            (
                              value.entry
                                .troopDelta ??
                              0
                            ) >
                            0
                              ? 'negative'
                              : (
                                    value.entry
                                      .troopDelta ??
                                    0
                                  ) <
                                  0
                                ? 'positive'
                                : ''
                          }
                        >
                          {signed(
                            value.entry
                              .troopDelta,
                          )}
                        </dd>
                      </div>
                    </dl>

                    <div className="target-ranking-comparison-tags">
                      {value.annotation
                        .tags.length >
                      0
                        ? value.annotation.tags.map(
                            (tag) => (
                              <span
                                key={
                                  tag
                                }
                              >
                                {
                                  tag
                                }
                              </span>
                            ),
                          )
                        : (
                          <span>
                            No tags
                          </span>
                        )}
                    </div>

                    <button
                      type="button"
                      className="primary"
                      onClick={() =>
                        onLoadDefense(
                          village.latest
                            .input,
                          village.latest
                            .metadata,
                          village.latest
                            .source,
                        )
                      }
                    >
                      Load Defense
                    </button>
                  </article>
                )
              },
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="target-ranking-message error">
          <strong>
            Could not load target ranking.
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
          <div className="target-ranking-message">
            Loading target ranking...
          </div>
        )}

      {!error &&
        !loading &&
        watchEntries.length ===
          0 && (
          <div className="target-ranking-message">
            <strong>
              No watched villages yet.
            </strong>

            <span>
              Mark villages with Watch in Intel before ranking targets.
            </span>
          </div>
        )}

      {!error &&
        watchEntries.length >
          0 &&
        ranking.length ===
          0 && (
          <div className="target-ranking-message">
            <strong>
              No target meets the active filters.
            </strong>

            <span>
              Lower the minimum score or change the search and tag filters.
            </span>
          </div>
        )}

      {ranking.length >
        0 && (
        <div className="target-ranking-list">
          {ranking.map(
            (value) => {
              const village =
                value.entry
                  .village

              const selected =
                comparisonKeys.includes(
                  village.key,
                )

              return (
                <article
                  key={
                    village.key
                  }
                  className={`target-ranking-row ${
                    selected
                      ? 'selected'
                      : ''
                  }`}
                >
                  <div className="target-ranking-row-rank">
                    <strong>
                      #{value.rank}
                    </strong>

                    <span>
                      {
                        value.score.score
                      }
                    </span>
                  </div>

                  <div className="target-ranking-row-village">
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

                    <small>
                      {village.x !==
                        null &&
                        village.y !==
                          null
                        ? `${village.x}|${village.y}`
                        : 'No coordinates'}
                    </small>
                  </div>

                  <div className="target-ranking-row-metrics">
                    <div>
                      <span>
                        Score
                      </span>

                      <strong>
                        {
                          value.score.score
                        }
                        /100
                      </strong>

                      <small>
                        {
                          value.score.label
                        }
                      </small>
                    </div>

                    <div>
                      <span>
                        Defense
                      </span>

                      <strong>
                        {formatter.format(
                          village.latest
                            .totalTroops,
                        )}
                      </strong>

                      <small>
                        {signed(
                          value.entry
                            .troopDelta,
                        )}{' '}
                        change
                      </small>
                    </div>

                    <div>
                      <span>
                        Wall
                      </span>

                      <strong>
                        {
                          village.latest
                            .wallLevel
                        }
                      </strong>

                      <small>
                        level
                      </small>
                    </div>

                    <div>
                      <span>
                        Intel
                      </span>

                      <strong>
                        {formatAge(
                          value.entry
                            .ageHours,
                        )}
                      </strong>

                      <small>
                        {
                          village.latest
                            .source ===
                          'SPY_REPORT'
                            ? 'Spy Report'
                            : village.latest
                                  .source ===
                                'BATTLE_REPORT'
                              ? 'Battle Report'
                              : 'Manual'
                        }
                      </small>
                    </div>
                  </div>

                  <div className="target-ranking-row-actions">
                    <button
                      type="button"
                      className={
                        selected
                          ? 'compare selected'
                          : 'compare'
                      }
                      onClick={() =>
                        toggleComparison(
                          village.key,
                        )
                      }
                    >
                      {selected
                        ? '✓ Comparing'
                        : 'Compare'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setScoreDetailsKey(
                          scoreDetailsKey ===
                          village.key
                            ? null
                            : village.key,
                        )
                      }
                    >
                      {scoreDetailsKey ===
                      village.key
                        ? 'Hide Score'
                        : 'Score Details'}
                    </button>

                    <button
                      type="button"
                      className="primary"
                      onClick={() =>
                        onLoadDefense(
                          village.latest
                            .input,
                          village.latest
                            .metadata,
                          village.latest
                            .source,
                        )
                      }
                    >
                      Load Defense
                    </button>
                  </div>

                  {scoreDetailsKey ===
                    village.key && (
                    <div className="target-ranking-row-details">
                      <TargetScoreDetails
                        result={
                          value.score
                        }
                      />
                    </div>
                  )}
                </article>
              )
            },
          )}
        </div>
      )}

      <div className="target-ranking-disclaimer">
        Ranking is a configurable planning heuristic based on stored intelligence and your preferences. Always validate a target with the battle simulator before acting.
      </div>
    </section>
  )
}

export default TargetRankingDashboardPanel
