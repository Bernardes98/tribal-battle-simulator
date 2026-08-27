import {
  useMemo,
  useState,
} from 'react'

import { units } from '../../data/units'

import {
  ATTACK_PLAN_OBJECTIVES,
  ATTACK_PLAN_WAVE_STATUSES,
  addAttackPlanWave,
  attackPlanObjectiveLabel,
  attackPlanWaveStatusLabel,
  clearAttackPlanWaveArmy,
  duplicateAttackPlanWave,
  moveAttackPlanWave,
  removeAttackPlanWave,
  replaceAttackPlanWaveFromCurrent,
  updateAttackPlanWave,
  updateAttackPlanWaveArmy,
} from '../../domain/planning/attackPlan'

import type {
  AttackPlan,
  AttackPlanObjective,
  AttackPlanWaveStatus,
} from '../../domain/planning/attackPlan'

import type {
  BattleSimulationInput,
} from '../../types/Battle'

import './AdvancedWavePlannerPanel.css'

interface AdvancedWavePlannerPanelProps {
  plan: AttackPlan
  currentInput: BattleSimulationInput
  onOpenWave: (
    input: BattleSimulationInput,
  ) => void
}

const formatter =
  new Intl.NumberFormat(
    'en-US',
  )

const formatOffset =
  (
    seconds: number,
  ): string => {
    const normalized =
      Math.max(
        0,
        Math.round(
          seconds,
        ),
      )

    const hours =
      Math.floor(
        normalized /
          3600,
      )

    const minutes =
      Math.floor(
        (
          normalized %
          3600
        ) /
          60,
      )

    const remainingSeconds =
      normalized %
      60

    return [
      hours,
      minutes,
      remainingSeconds,
    ]
      .map(
        (value) =>
          String(
            value,
          ).padStart(
            2,
            '0',
          ),
      )
      .join(':')
  }

const countArmy =
  (
    input:
      BattleSimulationInput,
  ) => {
    return units.reduce(
      (
        total,
        unit,
      ) => {
        const quantity =
          input.attacker[
            unit.id
          ] ?? 0

        return {
          units:
            total.units +
            quantity,

          provisions:
            total.provisions +
            quantity *
              unit.provisions,
        }
      },
      {
        units: 0,
        provisions: 0,
      },
    )
  }

function AdvancedWavePlannerPanel({
  plan,
  currentInput,
  onOpenWave,
}: AdvancedWavePlannerPanelProps) {
  const [
    expandedWaveId,
    setExpandedWaveId,
  ] = useState<
    string | null
  >(
    plan.waves[0]?.id ??
      null,
  )

  const totals =
    useMemo(
      () =>
        plan.waves.reduce(
          (
            total,
            wave,
          ) => {
            const army =
              countArmy(
                wave.simulationInput,
              )

            return {
              units:
                total.units +
                army.units,
              provisions:
                total.provisions +
                army.provisions,
            }
          },
          {
            units: 0,
            provisions: 0,
          },
        ),
      [plan.waves],
    )

  return (
    <section className="advanced-wave-planner">
      <div className="advanced-wave-planner-header">
        <div>
          <span>
            Advanced Wave Planner
          </span>

          <strong>
            {plan.waves.length}{' '}
            {plan.waves.length ===
            1
              ? 'wave'
              : 'waves'}
          </strong>

          <small>
            Build cleanup, ram, catapult and noble waves under the same target plan.
          </small>
        </div>

        <button
          type="button"
          onClick={() =>
            addAttackPlanWave(
              plan.id,
              currentInput,
            )
          }
        >
          + Add Current Setup as Wave
        </button>
      </div>

      <div className="advanced-wave-planner-summary">
        <div>
          <span>
            Total Waves
          </span>

          <strong>
            {
              plan.waves.length
            }
          </strong>
        </div>

        <div>
          <span>
            Planned Units
          </span>

          <strong>
            {formatter.format(
              totals.units,
            )}
          </strong>
        </div>

        <div>
          <span>
            Planned Provisions
          </span>

          <strong>
            {formatter.format(
              totals.provisions,
            )}
          </strong>
        </div>

        <div>
          <span>
            Last Offset
          </span>

          <strong>
            {formatOffset(
              plan.waves.reduce(
                (
                  maximum,
                  wave,
                ) =>
                  Math.max(
                    maximum,
                    wave.offsetSeconds,
                  ),
                0,
              ),
            )}
          </strong>
        </div>
      </div>

      <div className="advanced-wave-list">
        {plan.waves.map(
          (
            wave,
            index,
          ) => {
            const expanded =
              expandedWaveId ===
              wave.id

            const army =
              countArmy(
                wave.simulationInput,
              )

            return (
              <article
                key={
                  wave.id
                }
                className={`advanced-wave-card status-${wave.status.toLowerCase()}`}
              >
                <div className="advanced-wave-card-top">
                  <div className="advanced-wave-order">
                    <strong>
                      #{index + 1}
                    </strong>

                    <span>
                      {formatOffset(
                        wave.offsetSeconds,
                      )}
                    </span>
                  </div>

                  <div className="advanced-wave-title">
                    <span>
                      {attackPlanObjectiveLabel(
                        wave.objective,
                      )}
                    </span>

                    <strong>
                      {
                        wave.label
                      }
                    </strong>

                    <small>
                      {formatter.format(
                        army.units,
                      )}{' '}
                      units ·{' '}
                      {formatter.format(
                        army.provisions,
                      )}{' '}
                      provisions
                    </small>
                  </div>

                  <div className="advanced-wave-badges">
                    <span className={`status-${wave.status.toLowerCase()}`}>
                      {attackPlanWaveStatusLabel(
                        wave.status,
                      )}
                    </span>

                    <span>
                      +{wave.offsetSeconds}s
                    </span>
                  </div>
                </div>

                <div className="advanced-wave-actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={() =>
                      onOpenWave(
                        wave.simulationInput,
                      )
                    }
                  >
                    Open Wave
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      replaceAttackPlanWaveFromCurrent(
                        plan.id,
                        wave.id,
                        currentInput,
                      )
                    }
                  >
                    Use Current Setup
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedWaveId(
                        expanded
                          ? null
                          : wave.id,
                      )
                    }
                  >
                    {expanded
                      ? 'Hide Editor'
                      : 'Edit Wave'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      duplicateAttackPlanWave(
                        plan.id,
                        wave.id,
                      )
                    }
                  >
                    Duplicate
                  </button>

                  <button
                    type="button"
                    disabled={
                      index ===
                      0
                    }
                    onClick={() =>
                      moveAttackPlanWave(
                        plan.id,
                        wave.id,
                        'UP',
                      )
                    }
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    disabled={
                      index ===
                      plan.waves.length -
                        1
                    }
                    onClick={() =>
                      moveAttackPlanWave(
                        plan.id,
                        wave.id,
                        'DOWN',
                      )
                    }
                  >
                    ↓
                  </button>

                  <button
                    type="button"
                    className="danger"
                    disabled={
                      plan.waves.length <=
                      1
                    }
                    onClick={() =>
                      removeAttackPlanWave(
                        plan.id,
                        wave.id,
                      )
                    }
                  >
                    Delete
                  </button>
                </div>

                {expanded && (
                  <div className="advanced-wave-editor">
                    <div className="advanced-wave-fields">
                      <label>
                        <span>
                          Wave Name
                        </span>

                        <input
                          type="text"
                          maxLength={
                            80
                          }
                          value={
                            wave.label
                          }
                          onChange={(
                            event,
                          ) =>
                            updateAttackPlanWave(
                              plan.id,
                              wave.id,
                              {
                                label:
                                  event
                                    .target
                                    .value,
                              },
                            )
                          }
                        />
                      </label>

                      <label>
                        <span>
                          Objective
                        </span>

                        <select
                          value={
                            wave.objective
                          }
                          onChange={(
                            event,
                          ) =>
                            updateAttackPlanWave(
                              plan.id,
                              wave.id,
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
                          Wave Status
                        </span>

                        <select
                          value={
                            wave.status
                          }
                          onChange={(
                            event,
                          ) =>
                            updateAttackPlanWave(
                              plan.id,
                              wave.id,
                              {
                                status:
                                  event
                                    .target
                                    .value as AttackPlanWaveStatus,
                              },
                            )
                          }
                        >
                          {ATTACK_PLAN_WAVE_STATUSES.map(
                            (status) => (
                              <option
                                key={
                                  status
                                }
                                value={
                                  status
                                }
                              >
                                {attackPlanWaveStatusLabel(
                                  status,
                                )}
                              </option>
                            ),
                          )}
                        </select>
                      </label>

                      <label>
                        <span>
                          Offset After Plan Start (seconds)
                        </span>

                        <input
                          type="number"
                          min={
                            0
                          }
                          step={
                            1
                          }
                          value={
                            wave.offsetSeconds
                          }
                          onChange={(
                            event,
                          ) =>
                            updateAttackPlanWave(
                              plan.id,
                              wave.id,
                              {
                                offsetSeconds:
                                  Number(
                                    event
                                      .target
                                      .value,
                                  ),
                              },
                            )
                          }
                        />

                        <small>
                          {formatOffset(
                            wave.offsetSeconds,
                          )}
                        </small>
                      </label>
                    </div>

                    <div className="advanced-wave-army-header">
                      <div>
                        <span>
                          Wave Army
                        </span>

                        <strong>
                          Edit each unit independently
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          clearAttackPlanWaveArmy(
                            plan.id,
                            wave.id,
                          )
                        }
                      >
                        Clear Army
                      </button>
                    </div>

                    <div className="advanced-wave-army-grid">
                      {units.map(
                        (unit) => (
                          <label
                            key={
                              unit.id
                            }
                          >
                            <span>
                              {
                                unit.name
                              }
                            </span>

                            <input
                              type="number"
                              min={
                                0
                              }
                              step={
                                1
                              }
                              value={
                                wave.simulationInput
                                  .attacker[
                                    unit.id
                                  ] ??
                                0
                              }
                              onChange={(
                                event,
                              ) =>
                                updateAttackPlanWaveArmy(
                                  plan.id,
                                  wave.id,
                                  {
                                    ...wave.simulationInput
                                      .attacker,
                                    [unit.id]:
                                      Math.max(
                                        0,
                                        Math.round(
                                          Number(
                                            event
                                              .target
                                              .value,
                                          ) ||
                                            0,
                                        ),
                                      ),
                                  },
                                )
                              }
                            />
                          </label>
                        ),
                      )}
                    </div>

                    <label className="advanced-wave-note">
                      <span>
                        Wave Notes
                      </span>

                      <textarea
                        rows={
                          3
                        }
                        maxLength={
                          1000
                        }
                        value={
                          wave.note
                        }
                        placeholder="Purpose, timing, target building, noble coordination..."
                        onChange={(
                          event,
                        ) =>
                          updateAttackPlanWave(
                            plan.id,
                            wave.id,
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
                          wave.note
                            .length
                        }
                        /1000
                      </small>
                    </label>

                    <div className="advanced-wave-editor-note">
                      “Use Current Setup” copies the current attacker, attacker modifiers, Paladin weapons and siege settings into this wave while keeping this plan's saved defender.
                    </div>
                  </div>
                )}
              </article>
            )
          },
        )}
      </div>
    </section>
  )
}

export default AdvancedWavePlannerPanel
