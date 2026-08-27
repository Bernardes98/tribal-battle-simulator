import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { units } from '../../data/units'

import {
  ATTACK_PLAN_CHANGED_EVENT,
  ATTACK_PLAN_OBJECTIVES,
  ATTACK_PLAN_STATUSES,
  attackPlanObjectiveLabel,
  attackPlanStatusLabel,
  clearFinishedAttackPlans,
  duplicateAttackPlan,
  loadAttackPlans,
  removeAttackPlan,
  updateAttackPlan,
} from '../../domain/planning/attackPlan'

import type {
  AttackPlan,
  AttackPlanObjective,
  AttackPlanStatus,
} from '../../domain/planning/attackPlan'

import type {
  SimulationHistorySource,
} from '../../services/simulationHistoryApi'

import type {
  BattleSimulationInput,
} from '../../types/Battle'

import type {
  ReportMetadata,
} from '../../types/ReportMetadata'

import AdvancedWavePlannerPanel from './AdvancedWavePlannerPanel'
import NobleConquestPlannerPanel from './NobleConquestPlannerPanel'

import './AttackPlanQueuePanel.css'

interface AttackPlanQueuePanelProps {
  currentInput: BattleSimulationInput
  onOpenPlan: (
    input: BattleSimulationInput,
    metadata: ReportMetadata | null,
    source: SimulationHistorySource,
  ) => void
}

type StatusFilter =
  | 'ALL'
  | AttackPlanStatus

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

const formatDate = (
  value: string,
): string => {
  if (!value) {
    return 'Not scheduled'
  }

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

const datetimeLocalValue =
  (
    value: string,
  ): string => {
    if (!value) {
      return ''
    }

    const date =
      new Date(value)

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return ''
    }

    const local =
      new Date(
        date.getTime() -
          date.getTimezoneOffset() *
            60_000,
      )

    return local
      .toISOString()
      .slice(
        0,
        16,
      )
  }

const toIsoDate =
  (
    value: string,
  ): string => {
    if (!value) {
      return ''
    }

    const date =
      new Date(value)

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return ''
    }

    return date.toISOString()
  }

const armySummary = (
  plan: AttackPlan,
): string => {
  const active =
    units
      .map(
        (unit) => ({
          name:
            unit.name,
          quantity:
            plan.simulationInput
              .attacker[
                unit.id
              ] ?? 0,
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
    active.length ===
    0
  ) {
    return 'No attacker units'
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

const armyTotals = (
  plan: AttackPlan,
) => {
  return plan.waves.reduce(
    (
      total,
      wave,
    ) => {
      const waveTotals =
        units.reduce(
          (
            waveTotal,
            unit,
          ) => {
            const quantity =
              wave.simulationInput
                .attacker[
                  unit.id
                ] ?? 0

            return {
              units:
                waveTotal.units +
                quantity,
              provisions:
                waveTotal.provisions +
                quantity *
                  unit.provisions,
            }
          },
          {
            units: 0,
            provisions: 0,
          },
        )

      return {
        units:
          total.units +
          waveTotals.units,
        provisions:
          total.provisions +
          waveTotals.provisions,
      }
    },
    {
      units: 0,
      provisions: 0,
    },
  )
}

function AttackPlanQueuePanel({
  currentInput,
  onOpenPlan,
}: AttackPlanQueuePanelProps) {
  const [
    plans,
    setPlans,
  ] = useState<
    AttackPlan[]
  >(
    loadAttackPlans,
  )

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    StatusFilter
  >('ALL')

  const [
    expandedPlanId,
    setExpandedPlanId,
  ] = useState<
    string | null
  >(null)

  const refresh =
    () => {
      setPlans(
        loadAttackPlans(),
      )
    }

  useEffect(
    () => {
      const handleStorage =
        (
          event:
            StorageEvent,
        ) => {
          if (
            event.key ===
            'tribal-battle-attack-plans-v1'
          ) {
            refresh()
          }
        }

      window.addEventListener(
        ATTACK_PLAN_CHANGED_EVENT,
        refresh,
      )

      window.addEventListener(
        'storage',
        handleStorage,
      )

      return () => {
        window.removeEventListener(
          ATTACK_PLAN_CHANGED_EVENT,
          refresh,
        )

        window.removeEventListener(
          'storage',
          handleStorage,
        )
      }
    },
    [],
  )

  const counts =
    useMemo(
      () => ({
        total:
          plans.length,

        planned:
          plans.filter(
            (plan) =>
              plan.status ===
              'PLANNED',
          ).length,

        ready:
          plans.filter(
            (plan) =>
              plan.status ===
              'READY',
          ).length,

        sent:
          plans.filter(
            (plan) =>
              plan.status ===
              'SENT',
          ).length,

        finished:
          plans.filter(
            (plan) =>
              plan.status ===
                'COMPLETED' ||
              plan.status ===
                'CANCELLED',
          ).length,
      }),
      [plans],
    )

  const visiblePlans =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase()

        return plans
          .filter(
            (plan) => {
              if (
                statusFilter !==
                  'ALL' &&
                plan.status !==
                  statusFilter
              ) {
                return false
              }

              if (!query) {
                return true
              }

              const coordinates =
                plan.target.x !==
                  null &&
                plan.target.y !==
                  null
                  ? `${plan.target.x}|${plan.target.y}`
                  : ''

              return [
                plan.target
                  .playerName,
                plan.target
                  .villageName,
                coordinates,
                attackPlanObjectiveLabel(
                  plan.objective,
                ),
                plan.note,
              ]
                .join(' ')
                .toLowerCase()
                .includes(
                  query,
                )
            },
          )
          .sort(
            (
              left,
              right,
            ) => {
              const leftScheduled =
                left.plannedAt
                  ? new Date(
                      left.plannedAt,
                    ).getTime()
                  : Number.POSITIVE_INFINITY

              const rightScheduled =
                right.plannedAt
                  ? new Date(
                      right.plannedAt,
                    ).getTime()
                  : Number.POSITIVE_INFINITY

              if (
                leftScheduled !==
                rightScheduled
              ) {
                return (
                  leftScheduled -
                  rightScheduled
                )
              }

              return (
                new Date(
                  right.createdAt,
                ).getTime() -
                new Date(
                  left.createdAt,
                ).getTime()
              )
            },
          )
      },
      [
        plans,
        search,
        statusFilter,
      ],
    )

  const changePlan =
    (
      planId: string,
      patch:
        Partial<
          Pick<
            AttackPlan,
            | 'plannedAt'
            | 'status'
            | 'objective'
            | 'note'
          >
        >,
    ) => {
      updateAttackPlan(
        planId,
        patch,
      )
    }

  return (
    <section
      id="attack-plans"
      className="attack-plan-queue"
    >
      <div className="attack-plan-queue-header">
        <div>
          <span className="attack-plan-queue-eyebrow">
            Attack Plan / Queue
          </span>

          <h3>
            Planned Attacks
          </h3>

          <p>
            Save candidate attacks, schedule them, track their status and reopen the exact army/target setup later.
          </p>
        </div>

        <div className="attack-plan-queue-header-actions">
          <button
            type="button"
            onClick={
              refresh
            }
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={
              clearFinishedAttackPlans
            }
            disabled={
              counts.finished ===
              0
            }
          >
            Clear Finished
          </button>
        </div>
      </div>

      <div className="attack-plan-queue-summary">
        <div>
          <span>
            Total
          </span>

          <strong>
            {
              counts.total
            }
          </strong>
        </div>

        <div>
          <span>
            Planned
          </span>

          <strong>
            {
              counts.planned
            }
          </strong>
        </div>

        <div>
          <span>
            Ready
          </span>

          <strong>
            {
              counts.ready
            }
          </strong>
        </div>

        <div>
          <span>
            Sent
          </span>

          <strong>
            {
              counts.sent
            }
          </strong>
        </div>

        <div>
          <span>
            Finished
          </span>

          <strong>
            {
              counts.finished
            }
          </strong>
        </div>
      </div>

      <div className="attack-plan-queue-toolbar">
        <label>
          <span>
            Search
          </span>

          <input
            type="search"
            value={
              search
            }
            placeholder="Player, village, coordinates, objective or note..."
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
            Status
          </span>

          <select
            value={
              statusFilter
            }
            onChange={(
              event,
            ) =>
              setStatusFilter(
                event
                  .target
                  .value as StatusFilter,
              )
            }
          >
            <option value="ALL">
              All Statuses
            </option>

            {ATTACK_PLAN_STATUSES.map(
              (status) => (
                <option
                  key={
                    status
                  }
                  value={
                    status
                  }
                >
                  {attackPlanStatusLabel(
                    status,
                  )}
                </option>
              ),
            )}
          </select>
        </label>

        <span>
          {
            visiblePlans.length
          }{' '}
          {visiblePlans.length ===
          1
            ? 'plan'
            : 'plans'}
        </span>
      </div>

      {plans.length ===
        0 && (
        <div className="attack-plan-queue-empty">
          <strong>
            No attack plans yet.
          </strong>

          <span>
            Go to Candidates and use Add to Plan on a target you want to keep.
          </span>
        </div>
      )}

      {plans.length >
        0 &&
        visiblePlans.length ===
          0 && (
          <div className="attack-plan-queue-empty">
            No plans match the current filters.
          </div>
        )}

      {visiblePlans.length >
        0 && (
        <div className="attack-plan-queue-list">
          {visiblePlans.map(
            (plan) => {
              const totals =
                armyTotals(
                  plan,
                )

              const expanded =
                expandedPlanId ===
                plan.id

              return (
                <article
                  key={
                    plan.id
                  }
                  className={`attack-plan-card status-${plan.status.toLowerCase()}`}
                >
                  <div className="attack-plan-card-top">
                    <div className="attack-plan-target">
                      <span>
                        {
                          plan.target
                            .playerName
                        }
                      </span>

                      <strong>
                        {
                          plan.target
                            .villageName
                        }
                      </strong>

                      <small>
                        {plan.target.x !==
                          null &&
                          plan.target.y !==
                            null
                          ? `${plan.target.x}|${plan.target.y}`
                          : 'No coordinates'}
                      </small>
                    </div>

                    <div className="attack-plan-badges">
                      <span className={`status-${plan.status.toLowerCase()}`}>
                        {attackPlanStatusLabel(
                          plan.status,
                        )}
                      </span>

                      <span>
                        Score{' '}
                        {
                          plan.targetScore
                        }
                        /100
                      </span>

                      <span>
                        Rank #
                        {
                          plan.targetRank
                        }
                      </span>
                    </div>
                  </div>

                  <div className="attack-plan-metrics">
                    <div>
                      <span>
                        Army
                      </span>

                      <strong>
                        {formatter.format(
                          totals.units,
                        )}
                      </strong>

                      <small>
                        units
                      </small>
                    </div>

                    <div>
                      <span>
                        Provisions
                      </span>

                      <strong>
                        {formatter.format(
                          totals.provisions,
                        )}
                      </strong>

                      <small>
                        attacker
                      </small>
                    </div>

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

                      <small>
                        {percent(
                          plan.expectedAttackerLossPercent,
                        )}{' '}
                        attacker loss
                      </small>
                    </div>

                    <div>
                      <span>
                        Objective
                      </span>

                      <strong>
                        {attackPlanObjectiveLabel(
                          plan.objective,
                        )}
                      </strong>

                      <small>
                        {plan.waves.length}{' '}
                        {plan.waves.length ===
                        1
                          ? 'wave'
                          : 'waves'}
                      </small>
                    </div>

                    <div>
                      <span>
                        Schedule
                      </span>

                      <strong>
                        {plan.plannedAt
                          ? formatDate(
                              plan.plannedAt,
                            )
                          : 'Unscheduled'}
                      </strong>

                      <small>
                        saved{' '}
                        {formatDate(
                          plan.createdAt,
                        )}
                      </small>
                    </div>
                  </div>

                  <div className="attack-plan-army">
                    {armySummary(
                      plan,
                    )}
                  </div>

                  <div className="attack-plan-card-actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() =>
                        onOpenPlan(
                          plan.waves[0]?.simulationInput ??
                            plan.simulationInput,
                          plan.reportMetadata,
                          plan.source,
                        )
                      }
                    >
                      Open in Simulator
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPlanId(
                          expanded
                            ? null
                            : plan.id,
                        )
                      }
                    >
                      {expanded
                        ? 'Hide Details'
                        : 'Edit Plan'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        duplicateAttackPlan(
                          plan.id,
                        )
                      }
                    >
                      Duplicate
                    </button>

                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        removeAttackPlan(
                          plan.id,
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>

                  {expanded && (
                    <div className="attack-plan-editor">
                      <label>
                        <span>
                          Status
                        </span>

                        <select
                          value={
                            plan.status
                          }
                          onChange={(
                            event,
                          ) =>
                            changePlan(
                              plan.id,
                              {
                                status:
                                  event
                                    .target
                                    .value as AttackPlanStatus,
                              },
                            )
                          }
                        >
                          {ATTACK_PLAN_STATUSES.map(
                            (status) => (
                              <option
                                key={
                                  status
                                }
                                value={
                                  status
                                }
                              >
                                {attackPlanStatusLabel(
                                  status,
                                )}
                              </option>
                            ),
                          )}
                        </select>
                      </label>

                      <label>
                        <span>
                          Objective
                        </span>

                        <select
                          value={
                            plan.objective
                          }
                          onChange={(
                            event,
                          ) =>
                            changePlan(
                              plan.id,
                              {
                                objective:
                                  event
                                    .target
                                    .value as AttackPlanObjective,
                              },
                            )
                          }
                        >
                          {ATTACK_PLAN_OBJECTIVES.map(
                            (objective) => (
                              <option
                                key={
                                  objective
                                }
                                value={
                                  objective
                                }
                              >
                                {attackPlanObjectiveLabel(
                                  objective,
                                )}
                              </option>
                            ),
                          )}
                        </select>
                      </label>

                      <label>
                        <span>
                          Planned Date / Time
                        </span>

                        <input
                          type="datetime-local"
                          value={
                            datetimeLocalValue(
                              plan.plannedAt,
                            )
                          }
                          onChange={(
                            event,
                          ) =>
                            changePlan(
                              plan.id,
                              {
                                plannedAt:
                                  toIsoDate(
                                    event
                                      .target
                                      .value,
                                  ),
                              },
                            )
                          }
                        />
                      </label>

                      <label className="attack-plan-note">
                        <span>
                          Notes
                        </span>

                        <textarea
                          rows={4}
                          maxLength={
                            1000
                          }
                          value={
                            plan.note
                          }
                          placeholder="Wave purpose, timing, noble notes, coordination..."
                          onChange={(
                            event,
                          ) =>
                            changePlan(
                              plan.id,
                              {
                                note:
                                  event
                                    .target
                                    .value,
                              },
                            )
                          }
                        />

                        <small>
                          {
                            plan.note
                              .length
                          }
                          /1000
                        </small>
                      </label>

                      <AdvancedWavePlannerPanel
                        plan={
                          plan
                        }
                        currentInput={
                          currentInput
                        }
                        onOpenWave={(
                          waveInput,
                        ) =>
                          onOpenPlan(
                            waveInput,
                            plan.reportMetadata,
                            plan.source,
                          )
                        }
                      />

                      <NobleConquestPlannerPanel
                        plan={
                          plan
                        }
                        currentInput={
                          currentInput
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

      <div className="attack-plan-queue-note">
        V40 stores one complete attack setup per plan. Multi-wave composition and noble trains will be added in the next planning versions.
      </div>
    </section>
  )
}

export default AttackPlanQueuePanel
