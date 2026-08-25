import {
  useMemo,
  useState,
} from 'react'

import type {
  ChangeEvent,
} from 'react'

import { units } from '../../data/units'

import {
  calculateArmyProvisions,
  calculateArmyUnitCount,
  createEmptyArmy,
  simulateMultiWavePlan,
} from '../../domain/battle/multiWave'

import type {
  MultiWaveDefinition,
  MultiWavePlanResult,
} from '../../domain/battle/multiWave'

import type {
  Army,
  BattleSimulationInput,
} from '../../types/Battle'

import type {
  UnitId,
} from '../../types/Unit'

import './MultiWavePlannerPanel.css'

interface MultiWavePlannerPanelProps {
  input: BattleSimulationInput
  onApplyFinalDefense: (
    army: Army,
    wallLevel: number,
    targetLevel: number,
  ) => void
  onApplyWave: (
    army: Army,
    luck: number,
  ) => void
}

const numberFormatter =
  new Intl.NumberFormat(
    'en-US',
  )

const createWaveId = (): string => {
  if (
    typeof crypto !==
      'undefined' &&
    'randomUUID' in crypto
  ) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random()}`
}

const createWave = (
  index: number,
  army: Army,
  luck: number,
): MultiWaveDefinition => ({
  id: createWaveId(),
  name: `Wave ${index}`,
  army: {
    ...army,
  },
  luck,
})

const sanitizeQuantity = (
  value: string,
): number => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Math.max(
    0,
    Math.min(
      999_999_999,
      Math.floor(parsed),
    ),
  )
}

function MultiWavePlannerPanel({
  input,
  onApplyFinalDefense,
  onApplyWave,
}: MultiWavePlannerPanelProps) {
  const [
    waves,
    setWaves,
  ] = useState<MultiWaveDefinition[]>(
    () => [
      createWave(
        1,
        input.attacker,
        input.attackerModifiers
          .luck,
      ),
      createWave(
        2,
        createEmptyArmy(),
        input.attackerModifiers
          .luck,
      ),
    ],
  )

  const [
    includeDefenderRevivalBetweenWaves,
    setIncludeDefenderRevivalBetweenWaves,
  ] = useState(false)

  const [
    result,
    setResult,
  ] = useState<MultiWavePlanResult | null>(
    null,
  )

  const totalInitialDefense =
    useMemo(
      () =>
        calculateArmyUnitCount(
          input.defender,
        ),
      [input.defender],
    )

  const updateWave = (
    waveId: string,
    updater: (
      wave: MultiWaveDefinition,
    ) => MultiWaveDefinition,
  ) => {
    setWaves(
      (current) =>
        current.map(
          (wave) =>
            wave.id === waveId
              ? updater(wave)
              : wave,
        ),
    )

    setResult(null)
  }

  const updateWaveUnit = (
    waveId: string,
    unitId: UnitId,
    value: string,
  ) => {
    updateWave(
      waveId,
      (wave) => ({
        ...wave,
        army: {
          ...wave.army,
          [unitId]:
            sanitizeQuantity(
              value,
            ),
        },
      }),
    )
  }

  const loadCurrentAttacker = (
    waveId: string,
  ) => {
    updateWave(
      waveId,
      (wave) => ({
        ...wave,
        army: {
          ...input.attacker,
        },
        luck:
          input.attackerModifiers
            .luck,
      }),
    )
  }

  const clearWave = (
    waveId: string,
  ) => {
    updateWave(
      waveId,
      (wave) => ({
        ...wave,
        army:
          createEmptyArmy(),
      }),
    )
  }

  const duplicateWave = (
    waveId: string,
  ) => {
    if (waves.length >= 6) {
      return
    }

    const source =
      waves.find(
        (wave) =>
          wave.id === waveId,
      )

    if (!source) {
      return
    }

    setWaves(
      (current) => [
        ...current,
        createWave(
          current.length + 1,
          source.army,
          source.luck,
        ),
      ],
    )

    setResult(null)
  }

  const removeWave = (
    waveId: string,
  ) => {
    if (waves.length <= 1) {
      return
    }

    setWaves(
      (current) =>
        current
          .filter(
            (wave) =>
              wave.id !== waveId,
          )
          .map(
            (wave, index) => ({
              ...wave,
              name:
                `Wave ${index + 1}`,
            }),
          ),
    )

    setResult(null)
  }

  const addWave = () => {
    if (waves.length >= 6) {
      return
    }

    setWaves(
      (current) => [
        ...current,
        createWave(
          current.length + 1,
          createEmptyArmy(),
          input.attackerModifiers
            .luck,
        ),
      ],
    )

    setResult(null)
  }

  const runPlan = () => {
    setResult(
      simulateMultiWavePlan(
        input,
        waves,
        {
          includeDefenderRevivalBetweenWaves,
        },
      ),
    )
  }

  return (
    <section
      className="multi-wave-card"
      id="multi-wave"
    >
      <div className="multi-wave-header">
        <div>
          <span className="multi-wave-kicker">
            Strategy Tool
          </span>

          <h3>
            Multi-Wave Planner
          </h3>

          <p>
            Simulate consecutive attacks against the same village. Defender survivors, wall damage and the selected catapult target are carried into the next wave.
          </p>
        </div>

        <div className="multi-wave-defense-summary">
          <span>
            Initial Defense
          </span>

          <strong>
            {numberFormatter.format(
              totalInitialDefense,
            )}{' '}
            troops
          </strong>

          <small>
            Wall level{' '}
            {
              input.defenderModifiers
                .wallLevel
            }
          </small>
        </div>
      </div>

      <div className="multi-wave-options">
        <label className="multi-wave-checkbox">
          <input
            type="checkbox"
            checked={
              includeDefenderRevivalBetweenWaves
            }
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setIncludeDefenderRevivalBetweenWaves(
                event.target.checked,
              )
              setResult(null)
            }}
          />

          <span>
            Include defender Hospital/Clinic revival before the next wave
          </span>
        </label>

        <span className="multi-wave-option-note">
          Off is recommended for closely timed waves.
        </span>
      </div>

      <div className="multi-wave-list">
        {waves.map(
          (wave, waveIndex) => {
            const unitCount =
              calculateArmyUnitCount(
                wave.army,
              )

            const provisions =
              calculateArmyProvisions(
                wave.army,
              )

            return (
              <article
                className="multi-wave-editor"
                key={wave.id}
              >
                <div className="multi-wave-editor-header">
                  <div>
                    <span>
                      Wave{' '}
                      {waveIndex + 1}
                    </span>

                    <strong>
                      {numberFormatter.format(
                        unitCount,
                      )}{' '}
                      troops
                    </strong>

                    <small>
                      {numberFormatter.format(
                        provisions,
                      )}{' '}
                      provisions
                    </small>
                  </div>

                  <div className="multi-wave-editor-actions">
                    <button
                      type="button"
                      onClick={() =>
                        loadCurrentAttacker(
                          wave.id,
                        )
                      }
                    >
                      Use Current
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        duplicateWave(
                          wave.id,
                        )
                      }
                      disabled={
                        waves.length >= 6
                      }
                    >
                      Duplicate
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        clearWave(
                          wave.id,
                        )
                      }
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      className="multi-wave-remove-button"
                      onClick={() =>
                        removeWave(
                          wave.id,
                        )
                      }
                      disabled={
                        waves.length <= 1
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="multi-wave-luck-row">
                  <label
                    htmlFor={`multi-wave-luck-${wave.id}`}
                  >
                    Luck
                  </label>

                  <input
                    id={`multi-wave-luck-${wave.id}`}
                    type="number"
                    min="-15"
                    max="15"
                    step="1"
                    value={wave.luck}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      const value =
                        Math.max(
                          -15,
                          Math.min(
                            15,
                            Number(
                              event.target.value,
                            ) || 0,
                          ),
                        )

                      updateWave(
                        wave.id,
                        (currentWave) => ({
                          ...currentWave,
                          luck: value,
                        }),
                      )
                    }}
                  />

                  <span>%</span>
                </div>

                <div className="multi-wave-unit-grid">
                  {units.map(
                    (unit) => (
                      <label
                        className="multi-wave-unit-field"
                        key={unit.id}
                        title={unit.name}
                      >
                        <span>
                          {unit.abbreviation}
                        </span>

                        <input
                          type="number"
                          min="0"
                          max="999999999"
                          step="1"
                          value={
                            wave.army[
                              unit.id
                            ]
                          }
                          aria-label={`${wave.name} ${unit.name} quantity`}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            updateWaveUnit(
                              wave.id,
                              unit.id,
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    ),
                  )}
                </div>

                <button
                  type="button"
                  className="multi-wave-apply-wave"
                  onClick={() =>
                    onApplyWave(
                      wave.army,
                      wave.luck,
                    )
                  }
                >
                  Apply Wave to Attacker
                </button>
              </article>
            )
          },
        )}
      </div>

      <div className="multi-wave-main-actions">
        <button
          type="button"
          className="multi-wave-secondary-action"
          onClick={addWave}
          disabled={
            waves.length >= 6
          }
        >
          + Add Wave
        </button>

        <button
          type="button"
          className="multi-wave-primary-action"
          onClick={runPlan}
        >
          Simulate {waves.length}{' '}
          Waves
        </button>
      </div>

      {result && (
        <div className="multi-wave-results">
          <div className="multi-wave-result-summary">
            <div>
              <span>
                Final Defense
              </span>

              <strong>
                {numberFormatter.format(
                  calculateArmyUnitCount(
                    result.finalDefender,
                  ),
                )}{' '}
                troops
              </strong>
            </div>

            <div>
              <span>
                Final Wall
              </span>

              <strong>
                Level{' '}
                {
                  result.finalWallLevel
                }
              </strong>
            </div>

            <div>
              <span>
                Village Cleared
              </span>

              <strong>
                {result.clearedAtWave
                  ? `Wave ${result.clearedAtWave}`
                  : 'No'}
              </strong>
            </div>
          </div>

          <div className="multi-wave-result-table-wrap">
            <table className="multi-wave-result-table">
              <thead>
                <tr>
                  <th>
                    Wave
                  </th>
                  <th>
                    Luck
                  </th>
                  <th>
                    Result
                  </th>
                  <th>
                    Attacker
                  </th>
                  <th>
                    Losses
                  </th>
                  <th>
                    Survivors
                  </th>
                  <th>
                    Defense Before
                  </th>
                  <th>
                    Defense After
                  </th>
                  <th>
                    Wall
                  </th>
                  <th>
                    Target
                  </th>
                </tr>
              </thead>

              <tbody>
                {result.steps.map(
                  (step, index) => (
                    <tr
                      key={
                        step.wave.id
                      }
                    >
                      <td>
                        {index + 1}
                      </td>

                      <td>
                        {step.wave.luck > 0
                          ? '+'
                          : ''}
                        {step.wave.luck}%
                      </td>

                      <td>
                        <span
                          className={`multi-wave-winner multi-wave-winner-${step.battleResult.winner}`}
                        >
                          {
                            step
                              .battleResult
                              .winner
                          }
                        </span>
                      </td>

                      <td>
                        {numberFormatter.format(
                          step
                            .battleResult
                            .attacker
                            .initialUnits,
                        )}
                      </td>

                      <td>
                        {numberFormatter.format(
                          step
                            .battleResult
                            .attacker
                            .lostUnits,
                        )}
                      </td>

                      <td>
                        {numberFormatter.format(
                          step
                            .battleResult
                            .attacker
                            .survivingUnits,
                        )}
                      </td>

                      <td>
                        {numberFormatter.format(
                          calculateArmyUnitCount(
                            step.defenderBefore,
                          ),
                        )}
                      </td>

                      <td>
                        {numberFormatter.format(
                          calculateArmyUnitCount(
                            step.defenderAfter,
                          ),
                        )}
                      </td>

                      <td>
                        {step.wallBefore}
                        {' → '}
                        {step.wallAfter}
                      </td>

                      <td>
                        {
                          step
                            .battleResult
                            .siege
                            .catapult
                            .targetName
                        }{' '}
                        {step.targetLevelBefore}
                        {' → '}
                        {step.targetLevelAfter}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <div className="multi-wave-result-actions">
            <button
              type="button"
              className="multi-wave-primary-action"
              onClick={() =>
                onApplyFinalDefense(
                  result.finalDefender,
                  result.finalWallLevel,
                  result.finalTargetLevel,
                )
              }
            >
              Apply Final Defense to Simulator
            </button>

            <small>
              This also updates the wall and the current catapult target level for the next simulation.
            </small>
          </div>
        </div>
      )}
    </section>
  )
}

export default MultiWavePlannerPanel
