import {
  useMemo,
  useState,
} from 'react'

import type {
  ChangeEvent,
} from 'react'

import {
  calculateWallRamPlan,
} from '../../domain/battle/wallRamPlanner'

import type {
  WallRamPlannerResult,
} from '../../domain/battle/wallRamPlanner'

import type {
  BattleSimulationInput,
} from '../../types/Battle'

import './WallRamPlannerPanel.css'

interface WallRamPlannerPanelProps {
  input: BattleSimulationInput
  onApply: (
    ramCount: number,
    luck: number,
  ) => void
  onSimulate: (
    result: WallRamPlannerResult,
  ) => void
}

const numberFormatter =
  new Intl.NumberFormat(
    'en-US',
  )

const sanitizeInteger = (
  value: string,
  minimum: number,
  maximum: number,
): number => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return minimum
  }

  return Math.max(
    minimum,
    Math.min(
      maximum,
      Math.floor(parsed),
    ),
  )
}

function WallRamPlannerPanel({
  input,
  onApply,
  onSimulate,
}: WallRamPlannerPanelProps) {
  const currentWallLevel =
    Math.max(
      0,
      Math.min(
        20,
        Math.floor(
          input.defenderModifiers
            .wallLevel,
        ),
      ),
    )

  const [
    targetWallLevel,
    setTargetWallLevel,
  ] = useState(
    Math.max(
      0,
      currentWallLevel - 5,
    ),
  )

  const [
    minimumLuck,
    setMinimumLuck,
  ] = useState(-15)

  const [
    requireAttackerVictory,
    setRequireAttackerVictory,
  ] = useState(true)

  const [
    maxRams,
    setMaxRams,
  ] = useState(10_000)

  const [
    result,
    setResult,
  ] = useState<WallRamPlannerResult | null>(
    null,
  )

  const currentRams =
    input.attacker.ram ?? 0

  const currentRamSurvivors =
    result?.battleResult
      ?.attacker
      .survivorsBeforeRevival
      .ram ?? 0

  const currentRamLosses =
    result?.recommendedRams === null ||
    result?.recommendedRams === undefined
      ? 0
      : Math.max(
          0,
          result.recommendedRams -
            currentRamSurvivors,
        )

  const targetOptions =
    useMemo(
      () =>
        Array.from(
          {
            length:
              currentWallLevel + 1,
          },
          (_, index) =>
            currentWallLevel - index,
        ),
      [currentWallLevel],
    )

  const handleTargetChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    setTargetWallLevel(
      sanitizeInteger(
        event.target.value,
        0,
        currentWallLevel,
      ),
    )
    setResult(null)
  }

  const handleLuckChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    setMinimumLuck(
      sanitizeInteger(
        event.target.value,
        -15,
        15,
      ),
    )
    setResult(null)
  }

  const handleMaxRamsChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    setMaxRams(
      sanitizeInteger(
        event.target.value,
        1,
        500_000,
      ),
    )
    setResult(null)
  }

  const calculate = () => {
    setResult(
      calculateWallRamPlan(
        input,
        {
          targetWallLevel,
          minimumLuck,
          requireAttackerVictory,
          maxRams,
        },
      ),
    )
  }

  return (
    <section
      className="wall-ram-card"
      id="wall-ram"
    >
      <div className="wall-ram-header">
        <div>
          <span className="wall-ram-kicker">
            Siege Tool
          </span>

          <h3>
            Wall & Ram Planner
          </h3>

          <p>
            Find the minimum number of rams needed to reach a target wall level using the current attacking army and the same battle engine as the simulator.
          </p>
        </div>

        <div className="wall-ram-current-summary">
          <span>
            Current battle
          </span>

          <strong>
            Wall {currentWallLevel}
          </strong>

          <small>
            {numberFormatter.format(
              currentRams,
            )}{' '}
            current rams
          </small>
        </div>
      </div>

      <div className="wall-ram-config-grid">
        <label className="wall-ram-setting">
          <span>
            Target Wall Level
          </span>

          <select
            value={Math.min(
              targetWallLevel,
              currentWallLevel,
            )}
            onChange={handleTargetChange}
          >
            {targetOptions.map(
              (level) => (
                <option
                  key={level}
                  value={level}
                >
                  Level {level}
                </option>
              ),
            )}
          </select>

          <small>
            Planner searches for the smallest ram count that leaves the wall at or below this level.
          </small>
        </label>

        <label className="wall-ram-setting">
          <span>
            Minimum Luck
          </span>

          <div className="wall-ram-number-with-unit">
            <input
              type="number"
              min="-15"
              max="15"
              step="1"
              value={minimumLuck}
              onChange={handleLuckChange}
            />

            <strong>%</strong>
          </div>

          <small>
            Use -15% to plan for the worst possible luck.
          </small>
        </label>

        <label className="wall-ram-setting">
          <span>
            Search Limit
          </span>

          <div className="wall-ram-number-with-unit">
            <input
              type="number"
              min="1"
              max="500000"
              step="1"
              value={maxRams}
              onChange={handleMaxRamsChange}
            />

            <strong>
              rams
            </strong>
          </div>

          <small>
            Safety ceiling for the search. Increase it only when testing very large defenses.
          </small>
        </label>

        <label className="wall-ram-victory-option">
          <input
            type="checkbox"
            checked={requireAttackerVictory}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setRequireAttackerVictory(
                event.target.checked,
              )
              setResult(null)
            }}
          />

          <span>
            <strong>
              Require attacker victory
            </strong>

            <small>
              Recommended. The wall target only counts when the complete attack also wins.
            </small>
          </span>
        </label>
      </div>

      <div className="wall-ram-search-row">
        <div>
          <strong>
            Current army is preserved.
          </strong>

          <span>
            Only the number of rams is changed during the search.
          </span>
        </div>

        <button
          type="button"
          className="wall-ram-primary-action"
          onClick={calculate}
        >
          Calculate Rams
        </button>
      </div>

      {result && (
        <div
          className={
            result.success
              ? 'wall-ram-result wall-ram-result-success'
              : 'wall-ram-result wall-ram-result-failure'
          }
        >
          {!result.success && (
            <div className="wall-ram-failure-content">
              <strong>
                No valid ram plan found
              </strong>

              <p>
                {result.message}
              </p>

              <small>
                {numberFormatter.format(
                  result.simulations,
                )}{' '}
                battle simulations were evaluated.
              </small>
            </div>
          )}

          {result.success &&
            result.recommendedRams !== null &&
            result.recommendedArmy &&
            result.battleResult && (
              <>
                <div className="wall-ram-result-header">
                  <div>
                    <span>
                      Minimum Ram Plan
                    </span>

                    <h4>
                      {numberFormatter.format(
                        result.recommendedRams,
                      )}{' '}
                      Rams
                    </h4>
                  </div>

                  <div
                    className={
                      result.battleResult.winner ===
                      'attacker'
                        ? 'wall-ram-result-badge wall-ram-result-badge-success'
                        : 'wall-ram-result-badge'
                    }
                  >
                    {result.battleResult.winner ===
                    'attacker'
                      ? 'Victory'
                      : result.battleResult.winner}
                  </div>
                </div>

                <div className="wall-ram-stats">
                  <div>
                    <span>
                      Wall
                    </span>

                    <strong>
                      {result.currentWallLevel}
                      {' → '}
                      {result.battleResult.siege.wall.finalLevel}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Rams Needed
                    </span>

                    <strong>
                      {numberFormatter.format(
                        result.recommendedRams,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Difference vs Current
                    </span>

                    <strong>
                      {result.additionalRams > 0
                        ? '+'
                        : ''}
                      {numberFormatter.format(
                        result.additionalRams,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Worst Luck
                    </span>

                    <strong>
                      {result.minimumLuck}%
                    </strong>
                  </div>

                  <div>
                    <span>
                      Ram Losses
                    </span>

                    <strong>
                      {numberFormatter.format(
                        currentRamLosses,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Ram Survivors
                    </span>

                    <strong>
                      {numberFormatter.format(
                        currentRamSurvivors,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Total Attacker Survivors
                    </span>

                    <strong>
                      {numberFormatter.format(
                        result.battleResult.attacker
                          .survivingUnits,
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

                <p className="wall-ram-result-note">
                  {result.message}
                </p>

                <div className="wall-ram-actions">
                  <button
                    type="button"
                    onClick={() =>
                      onApply(
                        result.recommendedRams!,
                        result.minimumLuck,
                      )
                    }
                  >
                    Apply Rams
                  </button>

                  <button
                    type="button"
                    className="wall-ram-primary-action"
                    onClick={() =>
                      onSimulate(
                        result,
                      )
                    }
                  >
                    Apply & Simulate
                  </button>
                </div>
              </>
            )}
        </div>
      )}
    </section>
  )
}

export default WallRamPlannerPanel
