import {
  useState,
} from 'react'

import {
  ADVANCED_OPTIMIZER_UNIT_IDS,
} from '../../domain/battle/advancedArmyOptimizer'

import type {
  AdvancedArmyOptimizerResult,
} from '../../domain/battle/advancedArmyOptimizer'

import type {
  ArmyOptimizerMode,
} from '../../domain/battle/armyOptimizer'

import { units } from '../../data/units'

import type {
  Army,
} from '../../types/Battle'

import type {
  UnitId,
} from '../../types/Unit'

import './AdvancedArmyOptimizerPanel.css'

interface AdvancedArmyOptimizerPanelProps {
  result:
    AdvancedArmyOptimizerResult | null

  onOptimize: (
    mode: ArmyOptimizerMode,
    unitIds: UnitId[],
  ) => void

  onApply: (
    army: Army,
  ) => void
}

const numberFormatter =
  new Intl.NumberFormat(
    'en-US',
  )

const optimizerUnits =
  units.filter(
    (unit) =>
      ADVANCED_OPTIMIZER_UNIT_IDS.includes(
        unit.id,
      ),
  )

function AdvancedArmyOptimizerPanel({
  result,
  onOptimize,
  onApply,
}: AdvancedArmyOptimizerPanelProps) {
  const [
    mode,
    setMode,
  ] =
    useState<ArmyOptimizerMode>(
      'worstCase',
    )

  const [
    selectedUnitIds,
    setSelectedUnitIds,
  ] =
    useState<UnitId[]>([
      'axe',
      'lightCavalry',
      'mountedArcher',
    ])

  const toggleUnit = (
    unitId: UnitId,
  ) => {
    setSelectedUnitIds(
      (current) => {
        if (
          current.includes(
            unitId,
          )
        ) {
          return current.filter(
            (id) =>
              id !== unitId,
          )
        }

        return [
          ...current,
          unitId,
        ]
      },
    )
  }

  const handleOptimize = () => {
    onOptimize(
      mode,
      selectedUnitIds,
    )
  }

  const handleApply = () => {
    if (
      !result?.recommendedArmy
    ) {
      return
    }

    onApply(
      result.recommendedArmy,
    )
  }

  return (
    <section
      className="advanced-optimizer-card"
      id="advanced-army-optimizer"
    >
      <div className="advanced-optimizer-header">
        <div>
          <span className="section-label">
            ADVANCED STRATEGY TOOL
          </span>

          <h3>
            Composition Optimizer
          </h3>

          <p>
            Search different unit
            compositions and find a
            lower-provision army that
            can defeat the current
            defense.
          </p>
        </div>

        <div className="advanced-beta-badge">
          BETA
        </div>
      </div>

      <div className="advanced-optimizer-settings">
        <div className="advanced-mode-field">
          <label htmlFor="advanced-mode">
            Victory requirement
          </label>

          <select
            id="advanced-mode"
            value={mode}
            onChange={(event) =>
              setMode(
                event.target
                  .value as ArmyOptimizerMode,
              )
            }
          >
            <option value="worstCase">
              Safe Victory (-15% Luck)
            </option>

            <option value="currentLuck">
              Current Luck
            </option>
          </select>

          <span>
            Safe Victory searches
            using the worst possible
            luck.
          </span>
        </div>

        <div className="advanced-fixed-info">
          <span>
            FIXED DURING SEARCH
          </span>

          <strong>
            Siege & Special Units
          </strong>

          <p>
            Rams, Catapults,
            Trebuchets, Noblemen and
            Paladins currently entered
            in the attacker remain
            fixed.
          </p>
        </div>
      </div>

      <div className="advanced-unit-selection">
        <div className="advanced-unit-selection-title">
          <div>
            <h4>
              Allowed units
            </h4>

            <p>
              Choose which units the
              optimizer may use when
              building new army
              compositions.
            </p>
          </div>

          <span>
            {selectedUnitIds.length}{' '}
            selected
          </span>
        </div>

        <div className="advanced-unit-grid">
          {optimizerUnits.map(
            (unit) => {
              const selected =
                selectedUnitIds.includes(
                  unit.id,
                )

              return (
                <button
                  key={unit.id}
                  className={`advanced-unit-option ${
                    selected
                      ? 'advanced-unit-option-selected'
                      : ''
                  }`}
                  type="button"
                  onClick={() =>
                    toggleUnit(
                      unit.id,
                    )
                  }
                >
                  <div className="advanced-unit-option-main">
                    <span
                      className={`unit-icon unit-icon-${unit.category}`}
                    >
                      {
                        unit.abbreviation
                      }
                    </span>

                    <div>
                      <strong>
                        {
                          unit.name
                        }
                      </strong>

                      <span>
                        {
                          unit.provisions
                        }{' '}
                        provision
                        {unit.provisions !==
                        1
                          ? 's'
                          : ''}
                      </span>
                    </div>
                  </div>

                  <div className="advanced-unit-stats">
                    <span>
                      ATK
                      <strong>
                        {
                          unit.attack
                        }
                      </strong>
                    </span>

                    <span>
                      ATK / PROV
                      <strong>
                        {(
                          unit.attack /
                          unit.provisions
                        ).toFixed(
                          1,
                        )}
                      </strong>
                    </span>
                  </div>

                  <span className="advanced-unit-check">
                    {selected
                      ? '✓'
                      : '+'}
                  </span>
                </button>
              )
            },
          )}
        </div>
      </div>

      <div className="advanced-search-action">
        <div>
          <strong>
            Heuristic search
          </strong>

          <span>
            Tests individual units,
            mixed compositions and
            attack-efficient ratios.
          </span>
        </div>

        <button
          className="advanced-search-button"
          type="button"
          onClick={
            handleOptimize
          }
        >
          Search Best Composition
        </button>
      </div>

      {result && (
        <div className="advanced-result">
          {!result.success ? (
            <div className="advanced-result-error">
              <strong>
                No winning composition
              </strong>

              <p>
                {result.message}
              </p>

              <span>
                Simulations:{' '}
                {numberFormatter.format(
                  result.simulations,
                )}
              </span>
            </div>
          ) : (
            <>
              <div className="advanced-result-header">
                <div>
                  <span>
                    BEST COMPOSITION FOUND
                  </span>

                  <h4>
                    {
                      result.bestTemplate
                    }
                  </h4>
                </div>

                <div className="advanced-victory-badge">
                  Victory
                </div>
              </div>

              <div className="advanced-summary-grid">
                <div>
                  <span>
                    Luck Tested
                  </span>

                  <strong>
                    {result.luck >
                    0
                      ? '+'
                      : ''}
                    {
                      result.luck
                    }
                    %
                  </strong>
                </div>

                <div>
                  <span>
                    Current Provisions
                  </span>

                  <strong>
                    {numberFormatter.format(
                      result.currentProvisions,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Recommended
                  </span>

                  <strong className="advanced-purple-value">
                    {numberFormatter.format(
                      result.recommendedProvisions,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Difference
                  </span>

                  <strong
                    className={
                      result.provisionDifference >=
                      0
                        ? 'advanced-saving-value'
                        : 'advanced-cost-value'
                    }
                  >
                    {result.provisionDifference >
                    0
                      ? '-'
                      : result.provisionDifference <
                          0
                        ? '+'
                        : ''}

                    {numberFormatter.format(
                      Math.abs(
                        result.provisionDifference,
                      ),
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Templates Tested
                  </span>

                  <strong>
                    {numberFormatter.format(
                      result.templatesTested,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Winning Templates
                  </span>

                  <strong>
                    {numberFormatter.format(
                      result.winningTemplates,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Simulations
                  </span>

                  <strong>
                    {numberFormatter.format(
                      result.simulations,
                    )}
                  </strong>
                </div>
              </div>

              <div className="advanced-result-table-wrapper">
                <table className="advanced-result-table">
                  <thead>
                    <tr>
                      <th>
                        Unit
                      </th>

                      <th>
                        Current
                      </th>

                      <th>
                        Recommended
                      </th>

                      <th>
                        Difference
                      </th>

                      <th>
                        Provisions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {units
                      .filter(
                        (unit) => {
                          const current =
                            result
                              .recommendedArmy?.[
                              unit.id
                            ] ??
                            0

                          return (
                            current >
                              0 ||
                            (
                              result
                                .battleResult
                                ?.attacker
                                .initialArmy[
                                unit.id
                              ] ??
                              0
                            ) >
                              0
                          )
                        },
                      )
                      .map(
                        (unit) => {
                          const recommended =
                            result
                              .recommendedArmy?.[
                              unit.id
                            ] ??
                            0

                          /*
                           * battleResult.initialArmy
                           * já representa a recomendação.
                           *
                           * Por isso usamos a diferença
                           * de provisões apenas no resumo
                           * e exibimos a recomendação aqui.
                           */
                          return (
                            <tr
                              key={
                                unit.id
                              }
                            >
                              <td>
                                <strong>
                                  {
                                    unit.name
                                  }
                                </strong>
                              </td>

                              <td>
                                —
                              </td>

                              <td className="advanced-recommended-unit">
                                {numberFormatter.format(
                                  recommended,
                                )}
                              </td>

                              <td>
                                —
                              </td>

                              <td>
                                {numberFormatter.format(
                                  recommended *
                                    unit.provisions,
                                )}
                              </td>
                            </tr>
                          )
                        },
                      )}
                  </tbody>
                </table>
              </div>

              {result.battleResult && (
                <div className="advanced-battle-summary">
                  <div>
                    <span>
                      Attacker Survivors
                    </span>

                    <strong>
                      {numberFormatter.format(
                        result
                          .battleResult
                          .attacker
                          .survivingUnits,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Defender Survivors
                    </span>

                    <strong>
                      {numberFormatter.format(
                        result
                          .battleResult
                          .defender
                          .survivingUnits,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Attack Strength
                    </span>

                    <strong>
                      {numberFormatter.format(
                        Math.round(
                          result
                            .battleResult
                            .attackStrength,
                        ),
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Wall Final
                    </span>

                    <strong>
                      {
                        result
                          .battleResult
                          .siege
                          .wall
                          .finalLevel
                      }
                    </strong>
                  </div>
                </div>
              )}

              <div className="advanced-result-actions">
                <button
                  className="advanced-apply-button"
                  type="button"
                  onClick={
                    handleApply
                  }
                >
                  Apply Recommended Army
                </button>
              </div>

              <div className="advanced-disclaimer">
                <strong>
                  Beta search
                </strong>

                <p>
                  The optimizer compares
                  many predefined and
                  dynamically generated
                  compositions. It finds
                  the best result among
                  the tested candidates,
                  but it does not yet
                  guarantee the global
                  mathematical optimum.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}

export default AdvancedArmyOptimizerPanel