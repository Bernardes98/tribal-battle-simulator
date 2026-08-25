import {
  useState,
} from 'react'

import { units } from '../../data/units'

import {
  DEFAULT_SAFE_ATTACK_UNIT_IDS,
  SAFE_ATTACK_UNIT_IDS,
} from '../../domain/battle/safeAttack'

import type {
  SafeAttackKeepOptions,
  SafeAttackOptions,
  SafeAttackResult,
} from '../../domain/battle/safeAttack'

import type {
  Army,
  BattleSimulationInput,
} from '../../types/Battle'

import type {
  UnitId,
} from '../../types/Unit'

import './SafeAttackPanel.css'

interface SafeAttackPanelProps {
  input: BattleSimulationInput
  result: SafeAttackResult | null
  onSearch: (
    options: SafeAttackOptions,
  ) => void
  onApply: (
    army: Army,
  ) => void
  onSimulate: (
    result: SafeAttackResult,
  ) => void
}

const numberFormatter =
  new Intl.NumberFormat(
    'en-US',
  )

const availableUnits =
  units.filter(
    (unit) =>
      SAFE_ATTACK_UNIT_IDS.includes(
        unit.id,
      ),
  )

const createInitialKeepOptions =
  (): SafeAttackKeepOptions => ({
    ram: true,
    catapult: true,
    trebuchet: true,
    nobleman: true,
    paladin: true,
  })

const fixedUnits: Array<{
  id: keyof SafeAttackKeepOptions
  unitId: UnitId
  label: string
}> = [
  {
    id: 'ram',
    unitId: 'ram',
    label: 'Rams',
  },
  {
    id: 'catapult',
    unitId: 'catapult',
    label: 'Catapults',
  },
  {
    id: 'trebuchet',
    unitId: 'trebuchet',
    label: 'Trebuchets',
  },
  {
    id: 'nobleman',
    unitId: 'nobleman',
    label: 'Nobleman',
  },
  {
    id: 'paladin',
    unitId: 'paladin',
    label: 'Paladin',
  },
]

function SafeAttackPanel({
  input,
  result,
  onSearch,
  onApply,
  onSimulate,
}: SafeAttackPanelProps) {
  const [
    minimumLuck,
    setMinimumLuck,
  ] = useState(-15)

  const [
    selectedUnitIds,
    setSelectedUnitIds,
  ] = useState<UnitId[]>([
    ...DEFAULT_SAFE_ATTACK_UNIT_IDS,
  ])

  const [
    keepCurrent,
    setKeepCurrent,
  ] = useState<SafeAttackKeepOptions>(
    createInitialKeepOptions,
  )

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
            (currentUnitId) =>
              currentUnitId !==
              unitId,
          )
        }

        return [
          ...current,
          unitId,
        ]
      },
    )
  }

  const handleSearch = () => {
    onSearch({
      minimumLuck,
      unitIds:
        selectedUnitIds,
      keepCurrent,
    })
  }

  const recommendedUnits =
    result?.recommendedArmy
      ? units.filter(
          (unit) =>
            (
              result.recommendedArmy?.[
                unit.id
              ] ?? 0
            ) > 0,
        )
      : []

  return (
    <section
      className="safe-attack-card"
      id="safe-attack"
    >
      <div className="safe-attack-header">
        <div>
          <span className="safe-attack-kicker">
            Strategy Tool
          </span>

          <h3>
            Safe Attack
          </h3>

          <p>
            Find a low-provision army that still wins at the configured worst luck scenario.
          </p>
        </div>

        <div className="safe-attack-objective">
          <span>
            Objective
          </span>

          <strong>
            Minimum Provisions
          </strong>
        </div>
      </div>

      <div className="safe-attack-config">
        <div className="safe-attack-setting">
          <label
            htmlFor="safe-attack-minimum-luck"
          >
            Minimum Luck
          </label>

          <div className="safe-attack-luck-input">
            <input
              id="safe-attack-minimum-luck"
              type="number"
              min="-15"
              max="15"
              step="1"
              value={minimumLuck}
              onChange={(event) => {
                const parsed =
                  Number(
                    event.target.value,
                  )

                setMinimumLuck(
                  Number.isFinite(parsed)
                    ? Math.max(
                        -15,
                        Math.min(
                          15,
                          parsed,
                        ),
                      )
                    : -15,
                )
              }}
            />

            <span>%</span>
          </div>

          <small>
            -15% is the safest Tribal Wars 2 scenario.
          </small>
        </div>

        <div className="safe-attack-setting safe-attack-unit-setting">
          <div className="safe-attack-setting-title">
            Allowed Units
          </div>

          <div className="safe-attack-unit-grid">
            {availableUnits.map(
              (unit) => (
                <label
                  className="safe-attack-check"
                  key={unit.id}
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedUnitIds.includes(
                        unit.id,
                      )
                    }
                    onChange={() =>
                      toggleUnit(
                        unit.id,
                      )
                    }
                  />

                  <span>
                    {unit.name}
                  </span>

                  <small>
                    {unit.provisions} prov.
                  </small>
                </label>
              ),
            )}
          </div>
        </div>

        <div className="safe-attack-setting">
          <div className="safe-attack-setting-title">
            Keep Current Special / Siege Units
          </div>

          <div className="safe-attack-fixed-grid">
            {fixedUnits.map(
              (fixedUnit) => (
                <label
                  className="safe-attack-check safe-attack-fixed-check"
                  key={fixedUnit.id}
                >
                  <input
                    type="checkbox"
                    checked={
                      keepCurrent[
                        fixedUnit.id
                      ]
                    }
                    onChange={(event) => {
                      setKeepCurrent(
                        (current) => ({
                          ...current,
                          [fixedUnit.id]:
                            event.target.checked,
                        }),
                      )
                    }}
                  />

                  <span>
                    {fixedUnit.label}
                  </span>

                  <strong>
                    {numberFormatter.format(
                      input.attacker[
                        fixedUnit.unitId
                      ],
                    )}
                  </strong>
                </label>
              ),
            )}
          </div>
        </div>
      </div>

      <div className="safe-attack-search-row">
        <div>
          <strong>
            {selectedUnitIds.length}
          </strong>{' '}
          attacking unit types enabled
        </div>

        <button
          className="safe-attack-search-button"
          type="button"
          disabled={
            selectedUnitIds.length ===
            0
          }
          onClick={handleSearch}
        >
          Find Safe Attack
        </button>
      </div>

      {result && (
        <div
          className={`safe-attack-result ${
            result.success
              ? 'safe-attack-result-success'
              : 'safe-attack-result-failure'
          }`}
        >
          {!result.success ||
          !result.recommendedArmy ||
          !result.battleResult ? (
            <div className="safe-attack-failure-content">
              <strong>
                No safe attack found
              </strong>

              <p>
                {result.message}
              </p>
            </div>
          ) : (
            <>
              <div className="safe-attack-result-header">
                <div>
                  <span>
                    Safe Attack Found
                  </span>

                  <h4>
                    Worst-case victory at {result.minimumLuck}% luck
                  </h4>
                </div>

                <div className="safe-attack-victory-badge">
                  Victory
                </div>
              </div>

              <div className="safe-attack-stats">
                <div>
                  <span>
                    Provisions
                  </span>

                  <strong>
                    {numberFormatter.format(
                      result.recommendedProvisions,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Worst-case losses
                  </span>

                  <strong>
                    {numberFormatter.format(
                      result.battleResult.attacker.lostUnits,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Survivors
                  </span>

                  <strong>
                    {numberFormatter.format(
                      result.battleResult.attacker.survivingUnits,
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

              <div className="safe-attack-army">
                <div className="safe-attack-army-title">
                  Recommended Army
                </div>

                <div className="safe-attack-army-list">
                  {recommendedUnits.map(
                    (unit) => (
                      <div
                        className="safe-attack-army-unit"
                        key={unit.id}
                      >
                        <span>
                          {unit.name}
                        </span>

                        <strong>
                          {numberFormatter.format(
                            result.recommendedArmy?.[
                              unit.id
                            ] ?? 0,
                          )}
                        </strong>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="safe-attack-meta">
                <span>
                  Best composition:{' '}
                  <strong>
                    {result.bestTemplate ??
                      'n/a'}
                  </strong>
                </span>

                <span>
                  Templates tested:{' '}
                  <strong>
                    {result.templatesTested}
                  </strong>
                </span>
              </div>

              <p className="safe-attack-note">
                Minimum found among the tested composition templates. The final army is always validated by the same battle engine used by the simulator.
              </p>

              <div className="safe-attack-actions">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      result.recommendedArmy
                    ) {
                      onApply(
                        result.recommendedArmy,
                      )
                    }
                  }}
                >
                  Apply to Attacker
                </button>

                <button
                  className="safe-attack-primary-button"
                  type="button"
                  onClick={() =>
                    onSimulate(
                      result,
                    )
                  }
                >
                  Apply & Simulate {result.minimumLuck}%
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}

export default SafeAttackPanel
