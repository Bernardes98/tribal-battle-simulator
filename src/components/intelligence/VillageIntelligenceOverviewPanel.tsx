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
  buildWatchlistDashboardEntries,
} from '../../domain/intelligence/watchlistDashboard'

import {
  loadVillageWatchlistSettings,
  saveVillageWatchlistSettings,
  toggleVillageWatch,
  VILLAGE_WATCHLIST_CHANGED_EVENT,
} from '../../domain/intelligence/villageWatchlist'

import {
  getVillageAnnotation,
  VILLAGE_ANNOTATIONS_CHANGED_EVENT,
} from '../../domain/intelligence/villageAnnotations'

import {
  calculateTargetScore,
  loadTargetScoringSettings,
  TARGET_SCORING_SETTINGS_CHANGED_EVENT,
} from '../../domain/intelligence/targetScoring'

import {
  ATTACK_PLAN_CHANGED_EVENT,
  attackPlanObjectiveLabel,
  attackPlanStatusLabel,
  loadAttackPlans,
} from '../../domain/planning/attackPlan'

import type {
  AttackPlan,
} from '../../domain/planning/attackPlan'

import {
  calculateConquestProjection,
  loadConquestPlannerSettings,
  CONQUEST_PLANNER_CHANGED_EVENT,
} from '../../domain/planning/conquestPlanner'

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

import DefenseTrendPanel from './DefenseTrendPanel'
import ReportTimelinePanel from './ReportTimelinePanel'
import VillageNotesTagsPanel from './VillageNotesTagsPanel'
import TargetScoreDetails from './TargetScoreDetails'

import './VillageIntelligenceOverviewPanel.css'

interface VillageIntelligenceOverviewPanelProps {
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

const formatAge = (
  value: string,
): string => {
  const timestamp =
    new Date(
      value,
    ).getTime()

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    return 'Unknown'
  }

  const hours =
    Math.max(
      0,
      (
        Date.now() -
        timestamp
      ) /
        3_600_000,
    )

  if (
    hours <
    1
  ) {
    return '< 1h'
  }

  if (
    hours <
    24
  ) {
    return `${Math.floor(
      hours,
    )}h`
  }

  return `${Math.floor(
    hours /
      24,
  )}d`
}

const signed = (
  value:
    number
    | null,
): string => {
  if (
    value ===
    null
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

const activeDefenseRows =
  (
    village:
      VillageIntelligence,
  ) => {
    return units
      .map(
        (unit) => ({
          unit,
          quantity:
            village.latest
              .army[
                unit.id
              ] ??
            0,
        }),
      )
      .filter(
        (row) =>
          row.quantity >
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
  }

function VillageIntelligenceOverviewPanel({
  refreshToken,
  onLoadDefense,
}: VillageIntelligenceOverviewPanelProps) {
  const [
    history,
    setHistory,
  ] = useState<
    Awaited<
      ReturnType<
        typeof listSimulationHistory
      >
    >
  >([])

  const [
    selectedVillageKey,
    setSelectedVillageKey,
  ] = useState('')

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    localVersion,
    setLocalVersion,
  ] = useState(0)

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
        setLoading(
          true,
        )

        setError(
          null,
        )

        setHistory(
          await listSimulationHistory(),
        )
      } catch (
        loadError
      ) {
        console.error(
          'Could not load village overview:',
          loadError,
        )

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load village overview.',
        )
      } finally {
        setLoading(
          false,
        )
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
      const refreshLocal =
        () => {
          setLocalVersion(
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
              'tribal-battle-village-watchlist-v1' ||
            event.key ===
              'tribal-battle-village-annotations-v1' ||
            event.key ===
              'tribal-battle-target-scoring-settings-v1' ||
            event.key ===
              'tribal-battle-attack-plans-v1' ||
            event.key ===
              'tribal-battle-conquest-planner-v1'
          ) {
            refreshLocal()
          }
        }

      window.addEventListener(
        VILLAGE_WATCHLIST_CHANGED_EVENT,
        refreshLocal,
      )

      window.addEventListener(
        VILLAGE_ANNOTATIONS_CHANGED_EVENT,
        refreshLocal,
      )

      window.addEventListener(
        TARGET_SCORING_SETTINGS_CHANGED_EVENT,
        refreshLocal,
      )

      window.addEventListener(
        ATTACK_PLAN_CHANGED_EVENT,
        refreshLocal,
      )

      window.addEventListener(
        CONQUEST_PLANNER_CHANGED_EVENT,
        refreshLocal,
      )

      window.addEventListener(
        'storage',
        handleStorage,
      )

      return () => {
        window.removeEventListener(
          VILLAGE_WATCHLIST_CHANGED_EVENT,
          refreshLocal,
        )

        window.removeEventListener(
          VILLAGE_ANNOTATIONS_CHANGED_EVENT,
          refreshLocal,
        )

        window.removeEventListener(
          TARGET_SCORING_SETTINGS_CHANGED_EVENT,
          refreshLocal,
        )

        window.removeEventListener(
          ATTACK_PLAN_CHANGED_EVENT,
          refreshLocal,
        )

        window.removeEventListener(
          CONQUEST_PLANNER_CHANGED_EVENT,
          refreshLocal,
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
          history,
        ),
      [history],
    )

  const villages =
    useMemo(
      () =>
        players
          .flatMap(
            (player) =>
              player.villages,
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.latest
                  .createdAt,
              ).getTime() -
              new Date(
                left.latest
                  .createdAt,
              ).getTime(),
          ),
      [players],
    )

  useEffect(
    () => {
      if (
        villages.length ===
        0
      ) {
        setSelectedVillageKey(
          '',
        )

        return
      }

      if (
        !villages.some(
          (village) =>
            village.key ===
            selectedVillageKey,
        )
      ) {
        setSelectedVillageKey(
          villages[0].key,
        )
      }
    },
    [
      villages,
      selectedVillageKey,
    ],
  )

  const filteredVillages =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase()

        if (!query) {
          return villages
        }

        return villages.filter(
          (village) => {
            const coordinates =
              village.x !==
                null &&
              village.y !==
                null
                ? `${village.x}|${village.y}`
                : ''

            const annotation =
              getVillageAnnotation(
                village.key,
              )

            return [
              village.playerName,
              village.villageName,
              coordinates,
              annotation.note,
              annotation.tags.join(
                ' ',
              ),
            ]
              .join(' ')
              .toLowerCase()
              .includes(
                query,
              )
          },
        )
      },
      [
        villages,
        search,
        localVersion,
      ],
    )

  const selectedVillage =
    useMemo(
      () =>
        villages.find(
          (village) =>
            village.key ===
            selectedVillageKey,
        ) ??
        null,
      [
        villages,
        selectedVillageKey,
      ],
    )

  const watchSettings =
    useMemo(
      () => {
        void localVersion

        return loadVillageWatchlistSettings()
      },
      [localVersion],
    )

  const scoringSettings =
    useMemo(
      () => {
        void localVersion

        return loadTargetScoringSettings()
      },
      [localVersion],
    )

  const annotation =
    useMemo(
      () => {
        void localVersion

        return selectedVillage
          ? getVillageAnnotation(
              selectedVillage.key,
            )
          : null
      },
      [
        selectedVillage,
        localVersion,
      ],
    )

  const watchEntry =
    useMemo(
      () => {
        if (
          !selectedVillage
        ) {
          return null
        }

        return (
          buildWatchlistDashboardEntries(
            [
              selectedVillage,
            ],
            [
              selectedVillage.key,
            ],
            watchSettings
              .alertThresholdPercent,
          )[0] ??
          null
        )
      },
      [
        selectedVillage,
        watchSettings,
      ],
    )

  const targetScore =
    useMemo(
      () => {
        if (
          !watchEntry ||
          !annotation
        ) {
          return null
        }

        return calculateTargetScore(
          watchEntry,
          annotation,
          scoringSettings,
        )
      },
      [
        watchEntry,
        annotation,
        scoringSettings,
      ],
    )

  const plans =
    useMemo(
      () => {
        void localVersion

        if (
          !selectedVillage
        ) {
          return []
        }

        return loadAttackPlans().filter(
          (plan) =>
            plan.target
              .villageKey ===
            selectedVillage.key,
        )
      },
      [
        selectedVillage,
        localVersion,
      ],
    )

  const selectedIsWatched =
    selectedVillage
      ? watchSettings
          .watchedVillageKeys
          .includes(
            selectedVillage.key,
          )
      : false

  const defenseRows =
    useMemo(
      () =>
        selectedVillage
          ? activeDefenseRows(
              selectedVillage,
            )
          : [],
      [selectedVillage],
    )

  const troopDelta =
    selectedVillage
      ?.previous
      ? selectedVillage
          .latest
          .totalTroops -
        selectedVillage
          .previous
          .totalTroops
      : null

  const wallDelta =
    selectedVillage
      ?.previous
      ? selectedVillage
          .latest
          .wallLevel -
        selectedVillage
          .previous
          .wallLevel
      : null

  const totalWaves =
    plans.reduce(
      (
        total,
        plan,
      ) =>
        total +
        plan.waves.length,
      0,
    )

  const nobleWaves =
    plans.reduce(
      (
        total,
        plan,
      ) =>
        total +
        plan.waves.filter(
          (wave) =>
            wave.objective ===
            'CONQUER',
        ).length,
      0,
    )

  const toggleWatch =
    () => {
      if (
        !selectedVillage
      ) {
        return
      }

      saveVillageWatchlistSettings(
        toggleVillageWatch(
          watchSettings,
          selectedVillage.key,
        ),
      )
    }

  return (
    <section
      id="village-overview"
      className="village-overview"
    >
      <div className="village-overview-header">
        <div>
          <span className="village-overview-eyebrow">
            Village Intelligence Overview
          </span>

          <h3>
            Complete Village Workspace
          </h3>

          <p>
            Reports, defense trend, notes, Target Score, attack plans and conquest context in one place.
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

      <div className="village-overview-selector">
        <label>
          <span>
            Find Village
          </span>

          <input
            type="search"
            value={
              search
            }
            placeholder="Player, village, coordinates, notes or tags..."
            onChange={(
              event,
            ) =>
              setSearch(
                event
                  .target
                  .value,
              )
            }
          />
        </label>

        <label>
          <span>
            Selected Village
          </span>

          <select
            value={
              selectedVillageKey
            }
            onChange={(
              event,
            ) =>
              setSelectedVillageKey(
                event
                  .target
                  .value,
              )
            }
          >
            {filteredVillages.map(
              (village) => (
                <option
                  key={
                    village.key
                  }
                  value={
                    village.key
                  }
                >
                  {village.playerName} · {village.villageName}
                  {village.x !==
                    null &&
                    village.y !==
                      null
                    ? ` · ${village.x}|${village.y}`
                    : ''}
                </option>
              ),
            )}
          </select>
        </label>

        <span>
          {
            filteredVillages.length
          }{' '}
          tracked
        </span>
      </div>

      {error && (
        <div className="village-overview-message error">
          <strong>
            Could not load village intelligence.
          </strong>

          <span>
            {error}
          </span>
        </div>
      )}

      {!error &&
        !loading &&
        villages.length ===
          0 && (
          <div className="village-overview-message">
            <strong>
              No village intelligence yet.
            </strong>

            <span>
              Import a Spy or Battle report first.
            </span>
          </div>
        )}

      {!error &&
        selectedVillage &&
        watchEntry &&
        targetScore &&
        annotation && (
        <>
          <div className="village-overview-identity">
            <div>
              <span>
                {
                  selectedVillage.playerName
                }
              </span>

              <strong>
                {
                  selectedVillage.villageName
                }
              </strong>

              <small>
                {selectedVillage.x !==
                  null &&
                  selectedVillage.y !==
                    null
                  ? `${selectedVillage.x}|${selectedVillage.y}`
                  : 'No coordinates'}
                {' · '}
                latest{' '}
                {formatDate(
                  selectedVillage.latest.createdAt,
                )}
              </small>
            </div>

            <div className="village-overview-identity-actions">
              {annotation.tags.map(
                (tag) => (
                  <span
                    key={
                      tag
                    }
                  >
                    {tag}
                  </span>
                ),
              )}

              <button
                type="button"
                className={
                  selectedIsWatched
                    ? 'watching'
                    : undefined
                }
                onClick={
                  toggleWatch
                }
              >
                {selectedIsWatched
                  ? '✓ Watching'
                  : 'Watch Village'}
              </button>

              <button
                type="button"
                className="primary"
                onClick={() =>
                  onLoadDefense(
                    selectedVillage.latest.input,
                    selectedVillage.latest.metadata,
                    selectedVillage.latest.source,
                  )
                }
              >
                Load Latest Defense
              </button>
            </div>
          </div>

          <div className="village-overview-summary">
            <div>
              <span>
                Reports
              </span>

              <strong>
                {
                  selectedVillage.reportCount
                }
              </strong>

              <small>
                saved snapshots
              </small>
            </div>

            <div>
              <span>
                Latest Defense
              </span>

              <strong>
                {formatter.format(
                  selectedVillage.latest.totalTroops,
                )}
              </strong>

              <small
                className={
                  (troopDelta ??
                    0) >
                  0
                    ? 'negative'
                    : (troopDelta ??
                          0) <
                        0
                      ? 'positive'
                      : ''
                }
              >
                {signed(
                  troopDelta,
                )}{' '}
                vs previous
              </small>
            </div>

            <div>
              <span>
                Wall
              </span>

              <strong>
                {
                  selectedVillage.latest.wallLevel
                }
              </strong>

              <small>
                {signed(
                  wallDelta,
                )}{' '}
                change
              </small>
            </div>

            <div>
              <span>
                Intel Age
              </span>

              <strong>
                {formatAge(
                  selectedVillage.latest.createdAt,
                )}
              </strong>

              <small>
                {
                  selectedVillage.latest.source ===
                  'SPY_REPORT'
                    ? 'Spy Report'
                    : selectedVillage.latest.source ===
                        'BATTLE_REPORT'
                      ? 'Battle Report'
                      : 'Manual'
                }
              </small>
            </div>

            <div>
              <span>
                Target Score
              </span>

              <strong>
                {
                  targetScore.score
                }
                /100
              </strong>

              <small>
                {
                  targetScore.label
                }
              </small>
            </div>

            <div>
              <span>
                Attack Plans
              </span>

              <strong>
                {
                  plans.length
                }
              </strong>

              <small>
                {totalWaves} waves · {nobleWaves} noble
              </small>
            </div>
          </div>

          <div className="village-overview-grid">
            <section className="village-overview-card defense">
              <div className="village-overview-card-header">
                <div>
                  <span>
                    Latest Defense
                  </span>

                  <strong>
                    Known troop composition
                  </strong>
                </div>

                <span>
                  {formatter.format(
                    selectedVillage.latest.totalTroops,
                  )}
                </span>
              </div>

              {defenseRows.length >
                0 ? (
                <div className="village-overview-defense-list">
                  {defenseRows.map(
                    (row) => (
                      <div
                        key={
                          row.unit.id
                        }
                      >
                        <span>
                          {
                            row.unit.name
                          }
                        </span>

                        <strong>
                          {formatter.format(
                            row.quantity,
                          )}
                        </strong>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="village-overview-card-empty">
                  No known defending troops in the latest snapshot.
                </div>
              )}
            </section>

            <section className="village-overview-card intel">
              <div className="village-overview-card-header">
                <div>
                  <span>
                    Intelligence Status
                  </span>

                  <strong>
                    Monitoring & annotations
                  </strong>
                </div>

                <span>
                  {
                    watchEntry.attention
                  }
                </span>
              </div>

              <dl className="village-overview-intel-list">
                <div>
                  <dt>
                    Watchlist
                  </dt>

                  <dd>
                    {selectedIsWatched
                      ? 'Watching'
                      : 'Not watched'}
                  </dd>
                </div>

                <div>
                  <dt>
                    Alert
                  </dt>

                  <dd>
                    {watchEntry.hasAlert
                      ? 'Defense Alert'
                      : 'No alert'}
                  </dd>
                </div>

                <div>
                  <dt>
                    Defense Δ
                  </dt>

                  <dd>
                    {signed(
                      watchEntry.troopDelta,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    Tags
                  </dt>

                  <dd>
                    {annotation.tags.length >
                    0
                      ? annotation.tags.join(
                          ', ',
                        )
                      : 'No tags'}
                  </dd>
                </div>
              </dl>

              {annotation.note && (
                <div className="village-overview-note-preview">
                  {
                    annotation.note
                  }
                </div>
              )}
            </section>
          </div>

          <div className="village-overview-full-section">
            <TargetScoreDetails
              result={
                targetScore
              }
            />
          </div>

          <div className="village-overview-full-section">
            <DefenseTrendPanel
              village={
                selectedVillage
              }
            />
          </div>

          <div className="village-overview-full-section">
            <VillageNotesTagsPanel
              village={
                selectedVillage
              }
            />
          </div>

          <section className="village-overview-plans">
            <div className="village-overview-plans-header">
              <div>
                <span>
                  Attack Planning
                </span>

                <strong>
                  Plans for this village
                </strong>
              </div>

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(
                      'attack-plans',
                    )
                    ?.scrollIntoView({
                      behavior:
                        'smooth',
                      block:
                        'start',
                    })
                }
              >
                Open Plans
              </button>
            </div>

            {plans.length ===
              0 ? (
              <div className="village-overview-card-empty">
                No saved Attack Plans for this village.
              </div>
            ) : (
              <div className="village-overview-plan-list">
                {plans.map(
                  (plan) => {
                    const conquest =
                      calculateConquestProjection(
                        loadConquestPlannerSettings(
                          plan.id,
                        ),
                      )

                    return (
                      <article
                        key={
                          plan.id
                        }
                      >
                        <div className="village-overview-plan-top">
                          <div>
                            <span>
                              {attackPlanStatusLabel(
                                plan.status,
                              )}
                            </span>

                            <strong>
                              {attackPlanObjectiveLabel(
                                plan.objective,
                              )}
                            </strong>

                            <small>
                              {plan.plannedAt
                                ? formatDate(
                                    plan.plannedAt,
                                  )
                                : 'Unscheduled'}
                            </small>
                          </div>

                          <span>
                            {
                              plan.waves.length
                            }{' '}
                            {plan.waves.length ===
                            1
                              ? 'wave'
                              : 'waves'}
                          </span>
                        </div>

                        <div className="village-overview-plan-metrics">
                          <div>
                            <span>
                              Expected
                            </span>

                            <strong>
                              {plan.expectedWinner ===
                              'attacker'
                                ? 'Win'
                                : plan.expectedWinner ===
                                    'draw'
                                  ? 'Draw'
                                  : 'Loss'}
                            </strong>
                          </div>

                          <div>
                            <span>
                              Attacker Loss
                            </span>

                            <strong>
                              {plan.expectedAttackerLossPercent.toFixed(
                                1,
                              )}
                              %
                            </strong>
                          </div>

                          <div>
                            <span>
                              Noble Waves
                            </span>

                            <strong>
                              {plan.waves.filter(
                                (wave) =>
                                  wave.objective ===
                                  'CONQUER',
                              ).length}
                            </strong>
                          </div>

                          <div>
                            <span>
                              Conquest Projection
                            </span>

                            <strong>
                              {conquest.guaranteedConquest
                                ? 'Safe'
                                : conquest.expectedConquest
                                  ? 'Expected'
                                  : conquest.possibleConquest
                                    ? 'Possible'
                                    : 'Not enough'}
                            </strong>
                          </div>
                        </div>

                        {plan.note && (
                          <p>
                            {
                              plan.note
                            }
                          </p>
                        )}
                      </article>
                    )
                  },
                )}
              </div>
            )}
          </section>

          <div className="village-overview-full-section timeline">
            <ReportTimelinePanel
              village={
                selectedVillage
              }
              onLoadDefense={
                onLoadDefense
              }
            />
          </div>
        </>
      )}

      <div className="village-overview-footer-note">
        The overview consolidates saved intelligence only. Target Score, conquest projection and attack plans are planning aids and should be revalidated after fresh scouting.
      </div>
    </section>
  )
}

export default VillageIntelligenceOverviewPanel
