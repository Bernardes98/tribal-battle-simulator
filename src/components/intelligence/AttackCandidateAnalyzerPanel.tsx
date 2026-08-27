import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  analyzeAttackCandidates,
  countArmyProvisions,
  countArmyUnits,
} from '../../domain/intelligence/attackCandidateAnalyzer'

import type {
  AttackCandidateStatus,
} from '../../domain/intelligence/attackCandidateAnalyzer'

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

import {
  buildTargetRanking,
} from '../../domain/intelligence/targetRanking'

import {
  loadTargetScoringSettings,
  TARGET_SCORING_SETTINGS_CHANGED_EVENT,
} from '../../domain/intelligence/targetScoring'

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

import './AttackCandidateAnalyzerPanel.css'

interface AttackCandidateAnalyzerPanelProps {
  input: BattleSimulationInput
  refreshToken: number
  onLoadDefense: (
    input: BattleSimulationInput,
    metadata: ReportMetadata | null,
    source: SimulationHistorySource,
  ) => void
}

type CandidateFilter =
  | 'all'
  | AttackCandidateStatus

type CandidateSort =
  | 'viability'
  | 'losses'
  | 'score'
  | 'defense'

const formatter =
  new Intl.NumberFormat(
    'en-US',
  )

const percent =
  (
    value: number,
  ): string => {
    return `${value.toFixed(
      1,
    )}%`
  }

const signedLuck =
  (
    value: number,
  ): string => {
    if (
      value > 0
    ) {
      return `+${value}%`
    }

    return `${value}%`
  }

const resultLabel =
  (
    winner:
      'attacker'
      | 'defender'
      | 'draw',
  ): string => {
    if (
      winner ===
      'attacker'
    ) {
      return 'Win'
    }

    if (
      winner ===
      'draw'
    ) {
      return 'Draw'
    }

    return 'Loss'
  }

const formatRatio =
  (
    value:
      number
      | null,
  ): string => {
    if (
      value === null
    ) {
      return '∞'
    }

    return value.toFixed(
      2,
    )
  }

function AttackCandidateAnalyzerPanel({
  input,
  refreshToken,
  onLoadDefense,
}: AttackCandidateAnalyzerPanelProps) {
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
    filter,
    setFilter,
  ] = useState<
    CandidateFilter
  >('all')

  const [
    sort,
    setSort,
  ] = useState<
    CandidateSort
  >('viability')

  const load =
    async () => {
      try {
        setLoading(true)
        setError(null)

        setHistory(
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
          'Could not analyze attack candidates:',
          loadError,
        )

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not analyze attack candidates.',
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
      const refreshLocal =
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
          'storage',
          handleStorage,
        )
      }
    },
    [],
  )

  const attackerUnits =
    useMemo(
      () =>
        countArmyUnits(
          input,
        ),
      [input],
    )

  const attackerProvisions =
    useMemo(
      () =>
        countArmyProvisions(
          input,
        ),
      [input],
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

  const ranking =
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

  const candidates =
    useMemo(
      () => {
        if (
          attackerUnits ===
          0
        ) {
          return []
        }

        return analyzeAttackCandidates(
          input,
          ranking,
        )
      },
      [
        input,
        ranking,
        attackerUnits,
      ],
    )

  const counts =
    useMemo(
      () => ({
        safe:
          candidates.filter(
            (
              candidate,
            ) =>
              candidate.status ===
              'safe',
          ).length,

        viable:
          candidates.filter(
            (
              candidate,
            ) =>
              candidate.status ===
              'viable',
          ).length,

        luckDependent:
          candidates.filter(
            (
              candidate,
            ) =>
              candidate.status ===
              'luck-dependent',
          ).length,

        unfavorable:
          candidates.filter(
            (
              candidate,
            ) =>
              candidate.status ===
              'unfavorable',
          ).length,
      }),
      [candidates],
    )

  const visibleCandidates =
    useMemo(
      () => {
        const values =
          candidates.filter(
            (
              candidate,
            ) =>
              filter ===
                'all' ||
              candidate.status ===
                filter,
          )

        return [
          ...values,
        ].sort(
          (
            left,
            right,
          ) => {
            if (
              sort ===
              'losses'
            ) {
              return (
                left.current
                  .attackerLossPercent -
                right.current
                  .attackerLossPercent
              )
            }

            if (
              sort ===
              'score'
            ) {
              return (
                right.targetScore -
                left.targetScore
              )
            }

            if (
              sort ===
              'defense'
            ) {
              return (
                left.ranking
                  .entry
                  .village
                  .latest
                  .totalTroops -
                right.ranking
                  .entry
                  .village
                  .latest
                  .totalTroops
              )
            }

            const order:
              Record<
                AttackCandidateStatus,
                number
              > = {
                safe: 0,
                viable: 1,
                'luck-dependent': 2,
                unfavorable: 3,
              }

            const statusDifference =
              order[
                left.status
              ] -
              order[
                right.status
              ]

            if (
              statusDifference !==
              0
            ) {
              return statusDifference
            }

            return (
              left.current
                .attackerLossPercent -
              right.current
                .attackerLossPercent
            )
          },
        )
      },
      [
        candidates,
        filter,
        sort,
      ],
    )

  return (
    <section
      id="attack-candidate-analyzer"
      className="attack-candidate-analyzer"
    >
      <div className="attack-candidate-header">
        <div>
          <span className="attack-candidate-eyebrow">
            Attack Candidate Analyzer
          </span>

          <h3>
            Test Current Army Against Targets
          </h3>

          <p>
            Uses your current attacker and the latest saved defense for every watched village. Each candidate is simulated at -15%, current luck and +15%.
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

      <div className="attack-candidate-attacker">
        <div>
          <span>
            Current Attacker
          </span>

          <strong>
            {formatter.format(
              attackerUnits,
            )}{' '}
            units
          </strong>

          <small>
            {formatter.format(
              attackerProvisions,
            )}{' '}
            provisions · current luck{' '}
            {signedLuck(
              input
                .attackerModifiers
                .luck,
            )}
          </small>
        </div>

        <div className="attack-candidate-status-counts">
          <span className="safe">
            <strong>
              {
                counts.safe
              }
            </strong>
            safe
          </span>

          <span className="viable">
            <strong>
              {
                counts.viable
              }
            </strong>
            viable
          </span>

          <span className="luck">
            <strong>
              {
                counts.luckDependent
              }
            </strong>
            luck dependent
          </span>

          <span className="unfavorable">
            <strong>
              {
                counts.unfavorable
              }
            </strong>
            unfavorable
          </span>
        </div>
      </div>

      <div className="attack-candidate-toolbar">
        <label>
          <span>
            Candidate status
          </span>

          <select
            value={
              filter
            }
            onChange={(
              event,
            ) =>
              setFilter(
                event
                  .target
                  .value as CandidateFilter,
              )
            }
          >
            <option value="all">
              All Candidates
            </option>

            <option value="safe">
              Safe Candidate
            </option>

            <option value="viable">
              Viable
            </option>

            <option value="luck-dependent">
              Luck Dependent
            </option>

            <option value="unfavorable">
              Unfavorable
            </option>
          </select>
        </label>

        <label>
          <span>
            Sort by
          </span>

          <select
            value={
              sort
            }
            onChange={(
              event,
            ) =>
              setSort(
                event
                  .target
                  .value as CandidateSort,
              )
            }
          >
            <option value="viability">
              Best Viability
            </option>

            <option value="losses">
              Lowest Attacker Loss
            </option>

            <option value="score">
              Highest Target Score
            </option>

            <option value="defense">
              Lowest Defense
            </option>
          </select>
        </label>

        <span>
          {
            visibleCandidates.length
          }{' '}
          candidates
        </span>
      </div>

      {error && (
        <div className="attack-candidate-message error">
          <strong>
            Could not analyze candidates.
          </strong>

          <span>
            {error}
          </span>
        </div>
      )}

      {!error &&
        attackerUnits ===
          0 && (
          <div className="attack-candidate-message">
            <strong>
              Configure your attacker first.
            </strong>

            <span>
              Add troops to the attacker in the simulator. This panel will then test that exact army against your watched targets.
            </span>
          </div>
        )}

      {!error &&
        attackerUnits >
          0 &&
        !loading &&
        watchEntries.length ===
          0 && (
          <div className="attack-candidate-message">
            <strong>
              No watched targets available.
            </strong>

            <span>
              Mark villages with Watch in Intel so they can be evaluated here.
            </span>
          </div>
        )}

      {!error &&
        attackerUnits >
          0 &&
        candidates.length >
          0 &&
        visibleCandidates.length ===
          0 && (
          <div className="attack-candidate-message">
            No candidates match the selected status.
          </div>
        )}

      {visibleCandidates.length >
        0 && (
        <div className="attack-candidate-list">
          {visibleCandidates.map(
            (
              candidate,
              index,
            ) => {
              const village =
                candidate.ranking
                  .entry
                  .village

              return (
                <article
                  key={
                    candidate.villageKey
                  }
                  className={`attack-candidate-card status-${candidate.status}`}
                >
                  <div className="attack-candidate-card-top">
                    <div className="attack-candidate-order">
                      <span>
                        #{index + 1}
                      </span>
                    </div>

                    <div className="attack-candidate-village">
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

                    <div className="attack-candidate-badges">
                      <span className={`attack-candidate-status ${candidate.status}`}>
                        {
                          candidate.statusLabel
                        }
                      </span>

                      <span className="attack-candidate-score">
                        Target Score{' '}
                        {
                          candidate.targetScore
                        }
                        /100
                      </span>
                    </div>
                  </div>

                  <div className="attack-candidate-target-summary">
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

                      <small>
                        troops
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
                        current
                      </small>
                    </div>

                    <div>
                      <span>
                        Target Rank
                      </span>

                      <strong>
                        #
                        {
                          candidate.rank
                        }
                      </strong>

                      <small>
                        {
                          candidate.targetScoreLabel
                        }
                      </small>
                    </div>

                    <div>
                      <span>
                        Current Loss
                      </span>

                      <strong>
                        {percent(
                          candidate.current
                            .attackerLossPercent,
                        )}
                      </strong>

                      <small>
                        effective
                      </small>
                    </div>
                  </div>

                  <div className="attack-candidate-scenarios">
                    {[
                      {
                        label:
                          'Worst Luck',
                        scenario:
                          candidate.worst,
                      },
                      {
                        label:
                          'Current',
                        scenario:
                          candidate.current,
                      },
                      {
                        label:
                          'Best Luck',
                        scenario:
                          candidate.best,
                      },
                    ].map(
                      ({
                        label,
                        scenario,
                      }) => (
                        <div
                          key={
                            label
                          }
                          className={`attack-candidate-scenario winner-${scenario.result.winner}`}
                        >
                          <div className="attack-candidate-scenario-title">
                            <span>
                              {label}
                            </span>

                            <strong>
                              {signedLuck(
                                scenario.luck,
                              )}
                            </strong>
                          </div>

                          <span className="attack-candidate-scenario-result">
                            {resultLabel(
                              scenario.result
                                .winner,
                            )}
                          </span>

                          <dl>
                            <div>
                              <dt>
                                Attacker loss
                              </dt>

                              <dd>
                                {percent(
                                  scenario.attackerLossPercent,
                                )}
                              </dd>
                            </div>

                            <div>
                              <dt>
                                Survives
                              </dt>

                              <dd>
                                {percent(
                                  scenario.attackerSurvivalPercent,
                                )}
                              </dd>
                            </div>

                            <div>
                              <dt>
                                Defense lost
                              </dt>

                              <dd>
                                {percent(
                                  scenario.defenderLossPercent,
                                )}
                              </dd>
                            </div>

                            <div>
                              <dt>
                                Final wall
                              </dt>

                              <dd>
                                {
                                  scenario.finalWallLevel
                                }
                              </dd>
                            </div>

                            <div>
                              <dt>
                                Strength ratio
                              </dt>

                              <dd>
                                {formatRatio(
                                  scenario.strengthRatio,
                                )}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="attack-candidate-card-actions">
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
                      Load Target
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
                      Open Ranking
                    </button>
                  </div>
                </article>
              )
            },
          )}
        </div>
      )}

      <div className="attack-candidate-disclaimer">
        Candidate status is calculated with the battle engine against the latest saved defense. A newer enemy report can change the result.
      </div>
    </section>
  )
}

export default AttackCandidateAnalyzerPanel
