import {
  useState,
} from 'react'

import { units } from '../../data/units'

import type {
  Army,
} from '../../types/Battle'

import type {
  ArmyOptimizerMode,
  ArmyOptimizerResult,
} from '../../domain/battle/armyOptimizer'

import './ArmyOptimizerPanel.css'

interface ArmyOptimizerPanelProps {
  result:
    ArmyOptimizerResult | null

  onOptimize: (
    mode: ArmyOptimizerMode,
  ) => void

  onApply: (
    army: Army,
  ) => void
}

const numberFormatter =
  new Intl.NumberFormat(
    'en-US',
  )

const percentageFormatter =
  new Intl.NumberFormat(
    'en-US',
    {
      maximumFractionDigits: 2,
    },
  )

function ArmyOptimizerPanel({
  result,
  onOptimize,
  onApply,
}: ArmyOptimizerPanelProps) {
  const [
    mode,
    setMode,
  ] =
    useState<ArmyOptimizerMode>(
      'worstCase',
    )

  const handleOptimize = () => {
    onOptimize(mode)
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
      className="army-optimizer-card"
      id="army-optimizer"
    >
      <div className="army-optimizer-header">
        <div>
          <span className="section-label">
            STRATEGY TOOL
          </span>

          <h3>
            Army Optimizer
          </h3>

          <p>
            Find the smallest version
            of your current attacking
            army that can still win.
          </p>
        </div>

        <div className="optimizer-badge">
          BETA
        </div>
      </div>

      <div className="optimizer-settings">
        <div className="optimizer-setting">
          <label htmlFor="optimizer-mode">
            Optimization mode
          </label>

          <select
            id="optimizer-mode"
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
            Safe Victory uses the
            worst possible luck value.
          </span>
        </div>

        <div className="optimizer-description">
          <div>
            <span>
              METHOD
            </span>

            <strong>
              Proportional scaling
            </strong>
          </div>

          <p>
            The optimizer keeps your
            current army composition
            and searches for the
            smallest winning size.
          </p>
        </div>

        <button
          className="optimizer-button"
          type="button"
          onClick={
            handleOptimize
          }
        >
          Find Minimum Army
        </button>
      </div>

      {result && (
        <div className="optimizer-result">
          {!result.success ? (
            <div className="optimizer-error">
              <strong>
                No recommendation
              </strong>

              <p>
                {result.message}
              </p>
            </div>
          ) : (
            <>
              <div className="optimizer-result-heading">
                <div>
                  <span>
                    RECOMMENDATION
                  </span>

                  <h4>
                    Minimum Winning Army
                  </h4>
                </div>

                <span className="optimizer-victory-badge">
                  Victory
                </span>
              </div>

              <div className="optimizer-summary">
                <div>
                  <span>
                    Luck Tested
                  </span>

                  <strong>
                    {result.luck > 0
                      ? '+'
                      : ''}
                    {result.luck}%
                  </strong>
                </div>

                <div>
                  <span>
                    Army Size
                  </span>

                  <strong>
                    {percentageFormatter.format(
                      result.multiplier *
                        100,
                    )}
                    %
                  </strong>
                </div>

                <div>
                  <span>
                    Original Provisions
                  </span>

                  <strong>
                    {numberFormatter.format(
                      result.originalProvisions,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Required Provisions
                  </span>

                  <strong className="optimizer-required-value">
                    {numberFormatter.format(
                      result.recommendedProvisions,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Provisions Saved
                  </span>

                  <strong className="optimizer-saved-value">
                    {result.savedProvisions >
                    0
                      ? '-'
                      : '+'}

                    {numberFormatter.format(
                      Math.abs(
                        result.savedProvisions,
                      ),
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

              <div className="optimizer-army-table-wrapper">
                <table className="optimizer-army-table">
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
                    </tr>
                  </thead>

                  <tbody>
                    {units
                      .filter(
                        (unit) =>
                          result
                            .originalArmy[
                            unit.id
                          ] >
                            0 ||
                          (
                            result
                              .recommendedArmy?.[
                              unit.id
                            ] ??
                            0
                          ) >
                            0,
                      )
                      .map(
                        (unit) => {
                          const current =
                            result
                              .originalArmy[
                              unit.id
                            ]

                          const recommended =
                            result
                              .recommendedArmy?.[
                              unit.id
                            ] ??
                            0

                          const difference =
                            recommended -
                            current

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
                                {numberFormatter.format(
                                  current,
                                )}
                              </td>

                              <td className="recommended-unit-value">
                                {numberFormatter.format(
                                  recommended,
                                )}
                              </td>

                              <td
                                className={
                                  difference <=
                                  0
                                    ? 'optimizer-difference-reduced'
                                    : 'optimizer-difference-increased'
                                }
                              >
                                {difference >
                                0
                                  ? '+'
                                  : ''}

                                {numberFormatter.format(
                                  difference,
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
                <div className="optimizer-result-details">
                  <div>
                    <span>
                      Final Attacker
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
                      Final Defender
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

              <div className="optimizer-actions">
                <button
                  className="optimizer-apply-button"
                  type="button"
                  onClick={
                    handleApply
                  }
                >
                  Apply Recommended Army
                </button>
              </div>

              <div className="optimizer-note">
                <strong>
                  Beta optimizer
                </strong>

                <p>
                  This version reduces
                  or increases the
                  current composition
                  proportionally. A
                  future advanced
                  optimizer will also
                  search for better
                  unit compositions.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}

export default ArmyOptimizerPanel