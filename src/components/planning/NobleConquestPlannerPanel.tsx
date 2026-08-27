import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  addNobleTrainWaves,
} from '../../domain/planning/attackPlan'

import type {
  AttackPlan,
} from '../../domain/planning/attackPlan'

import {
  CONQUEST_PLANNER_CHANGED_EVENT,
  calculateConquestProjection,
  loadConquestPlannerSettings,
  saveConquestPlannerSettings,
} from '../../domain/planning/conquestPlanner'

import type {
  ConquestPlannerSettings,
  NobleEscortMode,
} from '../../domain/planning/conquestPlanner'

import type {
  BattleSimulationInput,
} from '../../types/Battle'

import './NobleConquestPlannerPanel.css'

interface NobleConquestPlannerPanelProps {
  plan: AttackPlan
  currentInput: BattleSimulationInput
}

const loyalty = (
  value: number,
): string => {
  return Math.max(
    0,
    value,
  ).toFixed(
    value %
      1 ===
      0
      ? 0
      : 1,
  )
}

const formatOffset = (
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

function NobleConquestPlannerPanel({
  plan,
  currentInput,
}: NobleConquestPlannerPanelProps) {
  const [
    settings,
    setSettings,
  ] = useState<
    ConquestPlannerSettings
  >(
    () =>
      loadConquestPlannerSettings(
        plan.id,
      ),
  )

  const [
    trainAdded,
    setTrainAdded,
  ] = useState(false)

  useEffect(
    () => {
      setSettings(
        loadConquestPlannerSettings(
          plan.id,
        ),
      )
    },
    [plan.id],
  )

  useEffect(
    () => {
      const handleChange =
        () => {
          setSettings(
            loadConquestPlannerSettings(
              plan.id,
            ),
          )
        }

      window.addEventListener(
        CONQUEST_PLANNER_CHANGED_EVENT,
        handleChange,
      )

      return () => {
        window.removeEventListener(
          CONQUEST_PLANNER_CHANGED_EVENT,
          handleChange,
        )
      }
    },
    [plan.id],
  )

  const projection =
    useMemo(
      () =>
        calculateConquestProjection(
          settings,
        ),
      [settings],
    )

  const update =
    <K extends
      keyof ConquestPlannerSettings>(
      key: K,
      value:
        ConquestPlannerSettings[K],
    ) => {
      const next = {
        ...settings,
        [key]:
          value,
      }

      setSettings(
        next,
      )

      saveConquestPlannerSettings(
        next,
      )
    }

  const useRecommendation =
    (
      count: number,
    ) => {
      update(
        'nobleCount',
        count,
      )
    }

  const addTrain =
    () => {
      addNobleTrainWaves(
        plan.id,
        currentInput,
        {
          count:
            settings.nobleCount,
          firstOffsetSeconds:
            settings.firstOffsetSeconds,
          intervalSeconds:
            settings.intervalSeconds,
          useCurrentArmyAsEscort:
            settings.escortMode ===
            'CURRENT_ATTACKER',
        },
      )

      setTrainAdded(
        true,
      )

      window.setTimeout(
        () =>
          setTrainAdded(
            false,
          ),
        1800,
      )
    }

  return (
    <section className="noble-conquest-planner">
      <div className="noble-conquest-header">
        <div>
          <span>
            Noble / Conquest Planner
          </span>

          <strong>
            Loyalty & Noble Train
          </strong>

          <small>
            Estimate the number of noble hits needed, then generate conquest waves inside this Attack Plan.
          </small>
        </div>

        <span className="noble-conquest-target">
          {
            plan.target
              .villageName
          }
        </span>
      </div>

      <div className="noble-conquest-settings">
        <label>
          <span>
            Starting Loyalty
          </span>

          <input
            type="number"
            min={
              1
            }
            max={
              100
            }
            value={
              settings.startingLoyalty
            }
            onChange={(
              event,
            ) =>
              update(
                'startingLoyalty',
                Number(
                  event
                    .target
                    .value,
                ),
              )
            }
          />
        </label>

        <label>
          <span>
            Min Reduction / Noble
          </span>

          <input
            type="number"
            min={
              1
            }
            max={
              100
            }
            value={
              settings.minLoyaltyReduction
            }
            onChange={(
              event,
            ) =>
              update(
                'minLoyaltyReduction',
                Number(
                  event
                    .target
                    .value,
                ),
              )
            }
          />
        </label>

        <label>
          <span>
            Max Reduction / Noble
          </span>

          <input
            type="number"
            min={
              settings.minLoyaltyReduction
            }
            max={
              100
            }
            value={
              settings.maxLoyaltyReduction
            }
            onChange={(
              event,
            ) =>
              update(
                'maxLoyaltyReduction',
                Number(
                  event
                    .target
                    .value,
                ),
              )
            }
          />
        </label>

        <label>
          <span>
            Noble Waves
          </span>

          <input
            type="number"
            min={
              1
            }
            max={
              20
            }
            value={
              settings.nobleCount
            }
            onChange={(
              event,
            ) =>
              update(
                'nobleCount',
                Number(
                  event
                    .target
                    .value,
                ),
              )
            }
          />
        </label>

        <label>
          <span>
            First Noble Offset
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
              settings.firstOffsetSeconds
            }
            onChange={(
              event,
            ) =>
              update(
                'firstOffsetSeconds',
                Number(
                  event
                    .target
                    .value,
                ),
              )
            }
          />

          <small>
            {formatOffset(
              settings.firstOffsetSeconds,
            )}
          </small>
        </label>

        <label>
          <span>
            Noble Interval
          </span>

          <input
            type="number"
            min={
              1
            }
            step={
              1
            }
            value={
              settings.intervalSeconds
            }
            onChange={(
              event,
            ) =>
              update(
                'intervalSeconds',
                Number(
                  event
                    .target
                    .value,
                ),
              )
            }
          />

          <small>
            {formatOffset(
              settings.intervalSeconds,
            )}
          </small>
        </label>
      </div>

      <div className="noble-conquest-recommendations">
        <button
          type="button"
          onClick={() =>
            useRecommendation(
              projection.bestCaseNobles,
            )
          }
        >
          <span>
            Best Case
          </span>

          <strong>
            {
              projection.bestCaseNobles
            }{' '}
            nobles
          </strong>

          <small>
            assumes maximum reduction
          </small>
        </button>

        <button
          type="button"
          onClick={() =>
            useRecommendation(
              projection.expectedNobles,
            )
          }
        >
          <span>
            Expected
          </span>

          <strong>
            {
              projection.expectedNobles
            }{' '}
            nobles
          </strong>

          <small>
            avg. reduction{' '}
            {projection.averageReduction.toFixed(
              1,
            )}
          </small>
        </button>

        <button
          type="button"
          className="safe"
          onClick={() =>
            useRecommendation(
              projection.safeNobles,
            )
          }
        >
          <span>
            Safe Count
          </span>

          <strong>
            {
              projection.safeNobles
            }{' '}
            nobles
          </strong>

          <small>
            assumes minimum reduction
          </small>
        </button>
      </div>

      <div className="noble-conquest-projection">
        <div
          className={
            projection.possibleConquest
              ? 'positive'
              : 'negative'
          }
        >
          <span>
            Best Final Loyalty
          </span>

          <strong>
            {loyalty(
              projection.bestCaseFinalLoyalty,
            )}
          </strong>
        </div>

        <div
          className={
            projection.expectedConquest
              ? 'positive'
              : ''
          }
        >
          <span>
            Expected Final Loyalty
          </span>

          <strong>
            {loyalty(
              projection.expectedFinalLoyalty,
            )}
          </strong>
        </div>

        <div
          className={
            projection.guaranteedConquest
              ? 'positive'
              : 'negative'
          }
        >
          <span>
            Worst Final Loyalty
          </span>

          <strong>
            {loyalty(
              projection.worstCaseFinalLoyalty,
            )}
          </strong>
        </div>

        <div>
          <span>
            Assessment
          </span>

          <strong>
            {projection.guaranteedConquest
              ? 'Safe Count'
              : projection.expectedConquest
                ? 'Expected'
                : projection.possibleConquest
                  ? 'Possible'
                  : 'Insufficient'}
          </strong>
        </div>
      </div>

      <div className="noble-conquest-train-config">
        <div>
          <span>
            Noble Escort
          </span>

          <strong>
            Choose what each generated noble wave carries
          </strong>
        </div>

        <div className="noble-conquest-escort-buttons">
          <button
            type="button"
            className={
              settings.escortMode ===
              'CURRENT_ATTACKER'
                ? 'active'
                : undefined
            }
            onClick={() =>
              update(
                'escortMode',
                'CURRENT_ATTACKER' as NobleEscortMode,
              )
            }
          >
            Current Army Escort
          </button>

          <button
            type="button"
            className={
              settings.escortMode ===
              'NOBLE_ONLY'
                ? 'active'
                : undefined
            }
            onClick={() =>
              update(
                'escortMode',
                'NOBLE_ONLY' as NobleEscortMode,
              )
            }
          >
            Noble Only
          </button>
        </div>
      </div>

      <div className="noble-conquest-timeline-wrap">
        <table className="noble-conquest-timeline">
          <thead>
            <tr>
              <th>
                Noble
              </th>

              <th>
                Offset
              </th>

              <th>
                Best Loyalty
              </th>

              <th>
                Expected
              </th>

              <th>
                Worst Loyalty
              </th>
            </tr>
          </thead>

          <tbody>
            {projection.steps.map(
              (step) => (
                <tr
                  key={
                    step.nobleNumber
                  }
                >
                  <td>
                    Noble{' '}
                    {
                      step.nobleNumber
                    }
                  </td>

                  <td>
                    {formatOffset(
                      step.offsetSeconds,
                    )}
                  </td>

                  <td
                    className={
                      step.bestCaseLoyalty <=
                      0
                        ? 'conquered'
                        : undefined
                    }
                  >
                    {loyalty(
                      step.bestCaseLoyalty,
                    )}
                  </td>

                  <td
                    className={
                      step.expectedLoyalty <=
                      0
                        ? 'conquered'
                        : undefined
                    }
                  >
                    {loyalty(
                      step.expectedLoyalty,
                    )}
                  </td>

                  <td
                    className={
                      step.worstCaseLoyalty <=
                      0
                        ? 'conquered'
                        : undefined
                    }
                  >
                    {loyalty(
                      step.worstCaseLoyalty,
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className="noble-conquest-actions">
        <button
          type="button"
          className="primary"
          onClick={
            addTrain
          }
        >
          {trainAdded
            ? 'Noble Train Added ✓'
            : `Add ${settings.nobleCount} Noble Waves`}
        </button>
      </div>

      <div className="noble-conquest-note">
        Loyalty reduction is configurable because server/world rules can differ. The default planning range is 20–35 per noble. Generated waves always contain exactly 1 Nobleman; “Current Army Escort” copies your current attacker as an editable escort template and does not enforce total troop availability across all waves.
      </div>
    </section>
  )
}

export default NobleConquestPlannerPanel
