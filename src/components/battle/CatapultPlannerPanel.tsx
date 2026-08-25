import {
  useMemo,
  useState,
} from 'react'

import type {
  ChangeEvent,
} from 'react'

import {
  calculateCatapultPlan,
} from '../../domain/battle/catapultPlanner'

import type {
  CatapultPlannerResult,
} from '../../domain/battle/catapultPlanner'

import type {
  BattleSimulationInput,
} from '../../types/Battle'

import './CatapultPlannerPanel.css'

interface CatapultPlannerPanelProps {
  input: BattleSimulationInput
  onApply: (
    catapultCount: number,
    luck: number,
  ) => void
  onSimulate: (
    result: CatapultPlannerResult,
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

const formatTargetName = (
  value: unknown,
): string => {
  const normalized =
    String(value ?? 'building')
      .replace(/[_-]+/g, ' ')
      .replace(
        /([a-z])([A-Z])/g,
        '$1 $2',
      )
      .trim()

  if (!normalized) {
    return 'Building'
  }

  return normalized
    .split(/\s+/)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(' ')
}

function CatapultPlannerPanel({
  input,
  onApply,
  onSimulate,
}: CatapultPlannerPanelProps) {
  const currentBuildingLevel =
    Math.max(
      0,
      Math.floor(
        input.siegeSettings
          .catapultTargetLevel,
      ),
    )

  const targetName =
    formatTargetName(
      input.siegeSettings
        .catapultTarget,
    )

  const [
    targetBuildingLevel,
    setTargetBuildingLevel,
  ] = useState(
    Math.max(
      0,
      currentBuildingLevel - 5,
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
    maxCatapults,
    setMaxCatapults,
  ] = useState(10_000)

  const [
    result,
    setResult,
  ] = useState<CatapultPlannerResult | null>(
    null,
  )

  const currentCatapults =
    input.attacker.catapult ?? 0

  const targetOptions =
    useMemo(
      () =>
        Array.from(
          {
            length:
              currentBuildingLevel + 1,
          },
          (_, index) =>
            currentBuildingLevel -
            index,
        ),
      [currentBuildingLevel],
    )

  const catapultSurvivors =
    result?.battleResult
      ?.attacker
      .survivorsBeforeRevival
      .catapult ?? 0

  const catapultLosses =
    result?.recommendedCatapults ===
        null ||
      result?.recommendedCatapults ===
        undefined
      ? 0
      : Math.max(
          0,
          result.recommendedCatapults -
            catapultSurvivors,
        )

  const handleTargetChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    setTargetBuildingLevel(
      sanitizeInteger(
        event.target.value,
        0,
        currentBuildingLevel,
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

  const handleMaxCatapultsChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    setMaxCatapults(
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
      calculateCatapultPlan(
        input,
        {
          targetBuildingLevel,
          minimumLuck,
          requireAttackerVictory,
          maxCatapults,
        },
      ),
    )
  }

  return (
    <section
      className="catapult-planner-card"
      id="catapult-planner"
    >
      <div className="catapult-planner-header">
        <div>
          <span className="catapult-planner-kicker">
            Siege Tool
          </span>

          <h3>
            Catapult Planner
          </h3>

          <p>
            Find the minimum number of catapults needed to reduce the selected building to a target level while preserving the rest of the current attacking army.
          </p>
        </div>

        <div className="catapult-planner-current-summary">
          <span>
            Current target
          </span>

          <strong>
            {targetName}
          </strong>

          <small>
            Level {currentBuildingLevel} ·{' '}
            {numberFormatter.format(
              currentCatapults,
            )}{' '}
            current catapults
          </small>
        </div>
      </div>

      <div className="catapult-planner-target-note">
        <strong>
          Target building: {targetName}
        </strong>

        <span>
          The planner uses the catapult target selected in the simulator settings. Change it there when you want to plan damage for another building.
        </span>
      </div>

      <div className="catapult-planner-config-grid">
        <label className="catapult-planner-setting">
          <span>
            Target Building Level
          </span>

          <select
            value={Math.min(
              targetBuildingLevel,
              currentBuildingLevel,
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
            Search stops at the smallest catapult count that leaves {targetName} at or below this level.
          </small>
        </label>

        <label className="catapult-planner-setting">
          <span>
            Minimum Luck
          </span>

          <div className="catapult-planner-number-with-unit">
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
            Use -15% when you want the plan to remain valid at the worst possible luck.
          </small>
        </label>

        <label className="catapult-planner-setting">
          <span>
            Search Limit
          </span>

          <div className="catapult-planner-number-with-unit">
            <input
              type="number"
              min="1"
              max="500000"
              step="1"
              value={maxCatapults}
              onChange={handleMaxCatapultsChange}
            />

            <strong>
              catapults
            </strong>
          </div>

          <small>
            Safety ceiling for the search. Increase only for unusually large siege scenarios.
          </small>
        </label>

        <label className="catapult-planner-victory-option">
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
              Recommended. Building damage only counts when the complete attack also wins.
            </small>
          </span>
        </label>
      </div>

      <div className="catapult-planner-search-row">
        <div>
          <strong>
            Current army is preserved.
          </strong>

          <span>
            Only the number of catapults is changed during the search.
          </span>
        </div>

        <button
          type="button"
          className="catapult-planner-primary-action"
          onClick={calculate}
          disabled={currentBuildingLevel <= 0}
        >
          Calculate Catapults
        </button>
      </div>

      {currentBuildingLevel <= 0 && (
        <div className="catapult-planner-empty-target">
          Set a building level greater than 0 in the simulator siege settings before calculating a catapult plan.
        </div>
      )}

      {result && (
        <div
          className={
            result.success
              ? 'catapult-planner-result catapult-planner-result-success'
              : 'catapult-planner-result catapult-planner-result-failure'
          }
        >
          {!result.success && (
            <div className="catapult-planner-failure-content">
              <strong>
                No valid catapult plan found
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
            result.recommendedCatapults !== null &&
            result.recommendedArmy &&
            result.battleResult && (
              <>
                <div className="catapult-planner-result-header">
                  <div>
                    <span>
                      Minimum Catapult Plan
                    </span>

                    <h4>
                      {numberFormatter.format(
                        result.recommendedCatapults,
                      )}{' '}
                      Catapults
                    </h4>
                  </div>

                  <div
                    className={
                      result.battleResult.winner ===
                      'attacker'
                        ? 'catapult-planner-result-badge catapult-planner-result-badge-success'
                        : 'catapult-planner-result-badge'
                    }
                  >
                    {result.battleResult.winner ===
                    'attacker'
                      ? 'Victory'
                      : result.battleResult.winner}
                  </div>
                </div>

                <div className="catapult-planner-stats">
                  <div>
                    <span>
                      {targetName}
                    </span>

                    <strong>
                      Level {result.currentBuildingLevel}
                      {' → '}
                      {result.battleResult.siege.catapult.postLevel}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Catapult Losses
                    </span>

                    <strong>
                      {numberFormatter.format(
                        catapultLosses,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Catapult Survivors
                    </span>

                    <strong>
                      {numberFormatter.format(
                        catapultSurvivors,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Search
                    </span>

                    <strong>
                      {numberFormatter.format(
                        result.simulations,
                      )}{' '}
                      simulations
                    </strong>
                  </div>
                </div>

                <p className="catapult-planner-result-note">
                  {result.additionalCatapults > 0
                    ? `${numberFormatter.format(result.additionalCatapults)} more catapults than the current army are required.`
                    : result.additionalCatapults < 0
                      ? `${numberFormatter.format(Math.abs(result.additionalCatapults))} current catapults can be removed and the target is still reached.`
                      : 'The current catapult count is already the minimum for this target.'}
                </p>

                <div className="catapult-planner-actions">
                  <button
                    type="button"
                    onClick={() => {
                      onApply(
                        result.recommendedCatapults ?? 0,
                        result.minimumLuck,
                      )
                    }}
                  >
                    Apply Catapults
                  </button>

                  <button
                    type="button"
                    className="catapult-planner-simulate-action"
                    onClick={() => {
                      onSimulate(result)
                    }}
                  >
                    Apply &amp; Simulate
                  </button>
                </div>
              </>
            )}
        </div>
      )}
    </section>
  )
}

export default CatapultPlannerPanel
