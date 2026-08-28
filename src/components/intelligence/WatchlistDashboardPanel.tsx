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
  getVillageAnnotation,
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
  WatchlistAttentionFilter,
} from '../../domain/intelligence/villageFilters'

import {
  calculateTargetScore,
  loadTargetScoringSettings,
  TARGET_SCORING_SETTINGS_CHANGED_EVENT,
} from '../../domain/intelligence/targetScoring'

import {
  listIntelligenceHistory,
} from '../../services/intelligenceApi'

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

import VillageFilterControls from './VillageFilterControls'
import TargetScoreDetails from './TargetScoreDetails'
import TargetScoringSettingsPanel from './TargetScoringSettingsPanel'

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
        typeof listIntelligenceHistory
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
    annotationVersion,
    setAnnotationVersion,
  ] = useState(0)

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
    attentionFilter,
    setAttentionFilter,
  ] = useState<
    WatchlistAttentionFilter
  >('all')

  const [
    scoringSettings,
    setScoringSettings,
  ] = useState(
    loadTargetScoringSettings,
  )

  const [
    scoreDetailsVillage,
    setScoreDetailsVillage,
  ] = useState<
    string | null
  >(null)

  const [
    sortMode,
    setSortMode,
  ] = useState<
    | 'score'
    | 'monitoring'
    | 'defense'
    | 'freshness'
  >('score')

  const load =
    async () => {
      try {
        setLoading(true)
        setError(null)

        const history =
          await listIntelligenceHistory()

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

          if (
            event.key ===
            'tribal-battle-village-annotations-v1'
          ) {
            setAnnotationVersion(
              (value) =>
                value + 1,
            )
          }
        }

      window.addEventListener(
        VILLAGE_WATCHLIST_CHANGED_EVENT,
        handleWatchlistChange,
      )

      const handleAnnotationsChange =
        () => {
          setAnnotationVersion(
            (value) =>
              value + 1,
          )
        }

      window.addEventListener(
        'storage',
        handleStorage,
      )

      window.addEventListener(
        VILLAGE_ANNOTATIONS_CHANGED_EVENT,
        handleAnnotationsChange,
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

        window.removeEventListener(
          VILLAGE_ANNOTATIONS_CHANGED_EVENT,
          handleAnnotationsChange,
        )
      }
    },
    [],
  )

  useEffect(
    () => {
      const handleChange =
        () => {
          setScoringSettings(
            loadTargetScoringSettings(),
          )
        }

      window.addEventListener(
        TARGET_SCORING_SETTINGS_CHANGED_EVENT,
        handleChange,
      )

      const handleStorage =
        (
          event: StorageEvent,
        ) => {
          if (
            event.key ===
            'tribal-battle-target-scoring-settings-v1'
          ) {
            handleChange()
          }
        }

      window.addEventListener(
        'storage',
        handleStorage,
      )

      return () => {
        window.removeEventListener(
          TARGET_SCORING_SETTINGS_CHANGED_EVENT,
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

  const annotations =
    useMemo(
      () => {
        void annotationVersion

        return loadVillageAnnotations()
      },
      [annotationVersion],
    )

  const filteredEntries =
    useMemo(
      () =>
        filterWatchlistEntries(
          entries,
          annotations,
          {
            search,
            selectedTags,
            tagMode,
          },
          attentionFilter,
        ),
      [
        entries,
        annotations,
        search,
        selectedTags,
        tagMode,
        attentionFilter,
      ],
    )

  const scoredEntries =
    useMemo(
      () =>
        filteredEntries.map(
          (entry) => ({
            entry,
            score:
              calculateTargetScore(
                entry,
                annotations[
                  entry.village.key
                ] ?? {
                  villageKey:
                    entry.village.key,
                  tags: [],
                  note: '',
                  updatedAt:
                    new Date(0).toISOString(),
                },
                scoringSettings,
              ),
          }),
        ),
      [
        filteredEntries,
        annotations,
        scoringSettings,
      ],
    )

  const sortedScoredEntries =
    useMemo(
      () => {
        const values =
          [...scoredEntries]

        values.sort(
          (left, right) => {
            if (sortMode === 'score') {
              return (
                right.score.score -
                left.score.score
              )
            }

            if (sortMode === 'defense') {
              return (
                left.entry.village.latest.totalTroops -
                right.entry.village.latest.totalTroops
              )
            }

            if (sortMode === 'freshness') {
              return (
                left.entry.ageHours -
                right.entry.ageHours
              )
            }

            const order = {
              critical: 0,
              increased: 1,
              recent: 2,
              stale: 3,
              normal: 4,
            }

            return (
              order[left.entry.attention] -
              order[right.entry.attention]
            )
          },
        )

        return values
      },
      [
        scoredEntries,
        sortMode,
      ],
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

      <VillageFilterControls
        search={search}
        onSearchChange={setSearch}
        selectedTags={selectedTags}
        onSelectedTagsChange={setSelectedTags}
        tagMode={tagMode}
        onTagModeChange={setTagMode}
        attention={attentionFilter}
        onAttentionChange={setAttentionFilter}
        resultCount={
          filteredEntries.length
        }
      />

      <div className="watchlist-dashboard-sort-row">
        <label>
          <span>Sort by</span>

          <select
            value={sortMode}
            onChange={(event) =>
              setSortMode(
                event.target.value as
                  typeof sortMode,
              )
            }
          >
            <option value="score">
              Target Score
            </option>
            <option value="monitoring">
              Monitoring Priority
            </option>
            <option value="defense">
              Lowest Defense
            </option>
            <option value="freshness">
              Freshest Report
            </option>
          </select>
        </label>

        <small>
          Target Score is a configurable planning heuristic, not a battle guarantee.
        </small>
      </div>

      <TargetScoringSettingsPanel />

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
        0 &&
        sortedScoredEntries.length ===
          0 && (
          <div className="watchlist-dashboard-message">
            <strong>
              No villages match the active filters.
            </strong>

            <span>
              Clear or change the search, tags or status filter.
            </span>
          </div>
        )}

      {sortedScoredEntries.length >
        0 && (
        <div className="watchlist-dashboard-grid">
          {sortedScoredEntries.map(
            ({
              entry,
              score,
            }) => {
              const {
                village,
              } = entry

              void annotationVersion

              const annotation =
                getVillageAnnotation(
                  village.key,
                )

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

                    <div className="watchlist-dashboard-village-badges">
                      <span className={`watchlist-dashboard-score score-${score.label.toLowerCase()}`}>
                        {score.score}
                        /100 · {score.label}
                      </span>

                      <span className="watchlist-dashboard-attention">
                        {attentionLabel(
                          entry.attention,
                        )}
                      </span>
                    </div>
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

                  {(annotation.tags.length > 0 ||
                    annotation.note) && (
                    <div className="watchlist-dashboard-annotation">
                      {annotation.tags.length > 0 && (
                        <div className="watchlist-dashboard-tags">
                          {annotation.tags.map(
                            (tag) => (
                              <span key={tag}>
                                {tag}
                              </span>
                            ),
                          )}
                        </div>
                      )}

                      {annotation.note && (
                        <p>{annotation.note}</p>
                      )}
                    </div>
                  )}

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

                    <button
                      type="button"
                      onClick={() =>
                        setScoreDetailsVillage(
                          scoreDetailsVillage ===
                          village.key
                            ? null
                            : village.key,
                        )
                      }
                    >
                      {scoreDetailsVillage ===
                      village.key
                        ? 'Hide Score'
                        : 'Score Details'}
                    </button>
                  </div>

                  {scoreDetailsVillage ===
                    village.key && (
                    <TargetScoreDetails
                      result={score}
                    />
                  )}
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
