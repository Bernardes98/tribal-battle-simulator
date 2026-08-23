import {
  buildings,
  getBuilding,
} from '../../data/buildings'
import { units } from '../../data/units'

import type {
  Army,
  AttackerModifiers,
  DefenderModifiers,
  PaladinWeaponLevels,
  SiegeSettings,
} from '../../types/Battle'

import type {
  BuildingId,
} from '../../types/Building'

import type {
  UnitId,
} from '../../types/Unit'

import './BattleSetupTable.css'

interface BattleSetupTableProps {
  attacker: Army
  defender: Army

  attackerModifiers: AttackerModifiers
  defenderModifiers: DefenderModifiers

  attackerPaladinWeapons: PaladinWeaponLevels
  defenderPaladinWeapons: PaladinWeaponLevels

  siegeSettings: SiegeSettings

  onAttackerUnitChange: (
    unitId: UnitId,
    quantity: number,
  ) => void

  onDefenderUnitChange: (
    unitId: UnitId,
    quantity: number,
  ) => void

  onClearAttacker: () => void
  onClearDefender: () => void

  onAttackerModifiersChange: (
    modifiers: AttackerModifiers,
  ) => void

  onDefenderModifiersChange: (
    modifiers: DefenderModifiers,
  ) => void

  onAttackerWeaponsChange: (
    levels: PaladinWeaponLevels,
  ) => void

  onDefenderWeaponsChange: (
    levels: PaladinWeaponLevels,
  ) => void

  onSiegeSettingsChange: (
    settings: SiegeSettings,
  ) => void
}

interface PaladinWeaponOption {
  id: keyof PaladinWeaponLevels
  name: string
  abbreviation: string
}

const paladinWeapons: PaladinWeaponOption[] = [
  {
    id: 'spearman',
    name: 'Spearman weapon',
    abbreviation: 'SP',
  },
  {
    id: 'swordsman',
    name: 'Swordsman weapon',
    abbreviation: 'SW',
  },
  {
    id: 'axe',
    name: 'Axe Fighter weapon',
    abbreviation: 'AX',
  },
  {
    id: 'archer',
    name: 'Archer weapon',
    abbreviation: 'AR',
  },
  {
    id: 'lightCavalry',
    name: 'Light Cavalry weapon',
    abbreviation: 'LC',
  },
  {
    id: 'mountedArcher',
    name: 'Mounted Archer weapon',
    abbreviation: 'MA',
  },
  {
    id: 'heavyCavalry',
    name: 'Heavy Cavalry weapon',
    abbreviation: 'HC',
  },
  {
    id: 'ram',
    name: 'Ram weapon',
    abbreviation: 'RM',
  },
  {
    id: 'catapult',
    name: 'Catapult weapon',
    abbreviation: 'CT',
  },
  {
    id: 'berserker',
    name: 'Berserker weapon',
    abbreviation: 'BE',
  },
]

const numberFormatter = new Intl.NumberFormat(
  'en-US',
)

const clamp = (
  value: number,
  minimum: number,
  maximum: number,
): number => {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  )
}

const parseQuantity = (
  value: string,
): number => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Math.max(
    0,
    Math.floor(parsed),
  )
}

const getArmySummary = (
  army: Army,
) => {
  return units.reduce(
    (summary, unit) => {
      const quantity =
        army[unit.id] ?? 0

      summary.units += quantity
      summary.provisions +=
        quantity * unit.provisions

      return summary
    },
    {
      units: 0,
      provisions: 0,
    },
  )
}

const renderLevelOptions = (
  maximum: number,
  zeroLabel = 'Level 0',
) => {
  return Array.from(
    {
      length: maximum + 1,
    },
    (_, level) => (
      <option
        key={level}
        value={level}
      >
        {level === 0
          ? zeroLabel
          : `Level ${level}`}
      </option>
    ),
  )
}

function BattleSetupTable({
  attacker,
  defender,
  attackerModifiers,
  defenderModifiers,
  attackerPaladinWeapons,
  defenderPaladinWeapons,
  siegeSettings,
  onAttackerUnitChange,
  onDefenderUnitChange,
  onClearAttacker,
  onClearDefender,
  onAttackerModifiersChange,
  onDefenderModifiersChange,
  onAttackerWeaponsChange,
  onDefenderWeaponsChange,
  onSiegeSettingsChange,
}: BattleSetupTableProps) {
  const attackerSummary =
    getArmySummary(attacker)

  const defenderSummary =
    getArmySummary(defender)

  const selectedBuilding =
    getBuilding(
      siegeSettings.catapultTarget,
    )

  const effectiveCatapultLevel =
    siegeSettings.catapultTarget ===
    'wall'
      ? defenderModifiers.wallLevel
      : siegeSettings.catapultTargetLevel

  const updateAttackerModifier = <
    K extends keyof AttackerModifiers,
  >(
    field: K,
    value: AttackerModifiers[K],
  ) => {
    onAttackerModifiersChange({
      ...attackerModifiers,
      [field]: value,
    })
  }

  const updateDefenderModifier = <
    K extends keyof DefenderModifiers,
  >(
    field: K,
    value: DefenderModifiers[K],
  ) => {
    onDefenderModifiersChange({
      ...defenderModifiers,
      [field]: value,
    })
  }

  const updateAttackerWeapon = (
    weapon: keyof PaladinWeaponLevels,
    value: number,
  ) => {
    onAttackerWeaponsChange({
      ...attackerPaladinWeapons,
      [weapon]: value,
    })
  }

  const updateDefenderWeapon = (
    weapon: keyof PaladinWeaponLevels,
    value: number,
  ) => {
    onDefenderWeaponsChange({
      ...defenderPaladinWeapons,
      [weapon]: value,
    })
  }

  const updateCatapultTarget = (
    target: BuildingId,
  ) => {
    const building =
      getBuilding(target)

    const nextLevel =
      target === 'wall'
        ? defenderModifiers.wallLevel
        : Math.min(
            siegeSettings.catapultTargetLevel,
            building.maxLevel,
          )

    onSiegeSettingsChange({
      catapultTarget: target,
      catapultTargetLevel:
        nextLevel,
    })
  }

  const updateCatapultLevel = (
    level: number,
  ) => {
    onSiegeSettingsChange({
      ...siegeSettings,
      catapultTargetLevel:
        clamp(
          level,
          0,
          selectedBuilding.maxLevel,
        ),
    })
  }

  return (
    <section
      className="battle-setup-card"
      id="settings"
    >
      <div className="battle-setup-title">
        <div>
          <span className="section-label">
            BATTLE SETUP
          </span>

          <h3>
            Armies & battle settings
          </h3>

          <p>
            Configure both armies and the main battle modifiers in one compact table.
          </p>
        </div>

        <div className="battle-setup-legend">
          <span className="setup-attacker-dot" />
          Attacker
          <span className="setup-defender-dot" />
          Defender
        </div>
      </div>

      <div className="battle-setup-scroll">
        <div
          className="battle-setup-table"
          role="table"
          aria-label="Battle configuration"
        >
          <div
            className="battle-setup-header"
            role="row"
          >
            <div role="columnheader">
              Unit / setting
            </div>

            <div
              className="battle-side-heading attacker-heading"
              role="columnheader"
            >
              <div>
                <span>ATTACKER</span>
                <strong>
                  {numberFormatter.format(
                    attackerSummary.provisions,
                  )}{' '}
                  provisions
                </strong>
              </div>

              <button
                className="battle-setup-clear"
                type="button"
                onClick={onClearAttacker}
              >
                Clear
              </button>
            </div>

            <div
              className="battle-side-heading defender-heading"
              role="columnheader"
            >
              <div>
                <span>DEFENDER</span>
                <strong>
                  {numberFormatter.format(
                    defenderSummary.provisions,
                  )}{' '}
                  provisions
                </strong>
              </div>

              <button
                className="battle-setup-clear"
                type="button"
                onClick={onClearDefender}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="battle-setup-section-row">
            <span>ARMIES</span>
            <small>
              {numberFormatter.format(
                attackerSummary.units,
              )}{' '}
              attacker units
            </small>
            <small>
              {numberFormatter.format(
                defenderSummary.units,
              )}{' '}
              defender units
            </small>
          </div>

          {units.map((unit) => (
            <div
              className="battle-setup-row unit-setup-row"
              role="row"
              key={unit.id}
            >
              <div
                className="battle-setup-label"
                role="rowheader"
              >
                <span
                  className={`battle-setup-unit-icon battle-setup-unit-${unit.category}`}
                >
                  {unit.abbreviation}
                </span>

                <div>
                  <strong>
                    {unit.name}
                  </strong>

                  <small>
                    {unit.provisions}{' '}
                    provision
                    {unit.provisions === 1
                      ? ''
                      : 's'}
                  </small>
                </div>
              </div>

              <div role="cell">
                <input
                  className="battle-setup-number"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  aria-label={`${unit.name} attacker quantity`}
                  value={attacker[unit.id]}
                  onChange={(event) =>
                    onAttackerUnitChange(
                      unit.id,
                      parseQuantity(
                        event.target.value,
                      ),
                    )
                  }
                />
              </div>

              <div role="cell">
                <input
                  className="battle-setup-number"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  aria-label={`${unit.name} defender quantity`}
                  value={defender[unit.id]}
                  onChange={(event) =>
                    onDefenderUnitChange(
                      unit.id,
                      parseQuantity(
                        event.target.value,
                      ),
                    )
                  }
                />
              </div>
            </div>
          ))}

          <div className="battle-setup-section-row">
            <span>BATTLE MODIFIERS</span>
            <small>Offensive</small>
            <small>Defensive</small>
          </div>

          <div className="battle-setup-row">
            <div className="battle-setup-label">
              <strong>Church</strong>
              <small>Faith bonus</small>
            </div>

            <div>
              <select
                value={attackerModifiers.churchLevel}
                onChange={(event) =>
                  updateAttackerModifier(
                    'churchLevel',
                    Number(event.target.value),
                  )
                }
              >
                {renderLevelOptions(3)}
              </select>
            </div>

            <div>
              <select
                value={defenderModifiers.churchLevel}
                onChange={(event) =>
                  updateDefenderModifier(
                    'churchLevel',
                    Number(event.target.value),
                  )
                }
              >
                {renderLevelOptions(3)}
              </select>
            </div>
          </div>

          <div className="battle-setup-row">
            <div className="battle-setup-label">
              <strong>Morale</strong>
              <small>Attacker only</small>
            </div>

            <div className="battle-setup-input-suffix">
              <input
                type="number"
                min="0"
                max="100"
                value={attackerModifiers.morale}
                onChange={(event) =>
                  updateAttackerModifier(
                    'morale',
                    clamp(
                      Number(event.target.value),
                      0,
                      100,
                    ),
                  )
                }
              />
              <span>%</span>
            </div>

            <div className="battle-setup-na">
              —
            </div>
          </div>

          <div className="battle-setup-row">
            <div className="battle-setup-label">
              <strong>Luck</strong>
              <small>-15% to +15%</small>
            </div>

            <div className="battle-setup-input-suffix">
              <input
                type="number"
                min="-15"
                max="15"
                value={attackerModifiers.luck}
                onChange={(event) =>
                  updateAttackerModifier(
                    'luck',
                    clamp(
                      Number(event.target.value),
                      -15,
                      15,
                    ),
                  )
                }
              />
              <span>%</span>
            </div>

            <div className="battle-setup-na">
              —
            </div>
          </div>

          <div className="battle-setup-row">
            <div className="battle-setup-label">
              <strong>Wall</strong>
              <small>Defender only</small>
            </div>

            <div className="battle-setup-na">
              —
            </div>

            <div>
              <select
                value={defenderModifiers.wallLevel}
                onChange={(event) =>
                  updateDefenderModifier(
                    'wallLevel',
                    Number(event.target.value),
                  )
                }
              >
                {renderLevelOptions(20)}
              </select>
            </div>
          </div>

          <div className="battle-setup-row">
            <div className="battle-setup-label">
              <strong>Tribe bonus</strong>
              <small>Weapon Mastery / Iron Wall</small>
            </div>

            <div>
              <select
                value={attackerModifiers.weaponMasteryLevel}
                onChange={(event) =>
                  updateAttackerModifier(
                    'weaponMasteryLevel',
                    Number(event.target.value),
                  )
                }
              >
                {renderLevelOptions(
                  5,
                  'No Weapon Mastery',
                )}
              </select>
            </div>

            <div>
              <select
                value={defenderModifiers.ironWallLevel}
                onChange={(event) =>
                  updateDefenderModifier(
                    'ironWallLevel',
                    Number(event.target.value),
                  )
                }
              >
                <option value={0}>
                  No Iron Wall
                </option>
                <option value={1}>
                  Level 1
                </option>
              </select>
            </div>
          </div>

          <div className="battle-setup-row">
            <div className="battle-setup-label">
              <strong>Recovery I</strong>
              <small>Medic / Hospital</small>
            </div>

            <div>
              <select
                value={attackerModifiers.medicLevel}
                onChange={(event) =>
                  updateAttackerModifier(
                    'medicLevel',
                    Number(event.target.value),
                  )
                }
              >
                <option value={0}>
                  Medic disabled
                </option>
                <option value={1}>
                  Medic enabled
                </option>
              </select>
            </div>

            <div>
              <select
                value={defenderModifiers.hospitalLevel}
                onChange={(event) =>
                  updateDefenderModifier(
                    'hospitalLevel',
                    Number(event.target.value),
                  )
                }
              >
                {renderLevelOptions(
                  10,
                  'Hospital disabled',
                )}
              </select>
            </div>
          </div>

          <div className="battle-setup-row">
            <div className="battle-setup-label">
              <strong>Recovery II</strong>
              <small>Medicus / Clinic</small>
            </div>

            <div>
              <select
                value={attackerModifiers.medicusLevel}
                onChange={(event) =>
                  updateAttackerModifier(
                    'medicusLevel',
                    Number(event.target.value),
                  )
                }
              >
                <option value={0}>
                  Medicus disabled
                </option>
                <option value={1}>
                  Medicus enabled
                </option>
              </select>
            </div>

            <div>
              <select
                value={defenderModifiers.clinicLevel}
                onChange={(event) =>
                  updateDefenderModifier(
                    'clinicLevel',
                    Number(event.target.value),
                  )
                }
              >
                <option value={0}>
                  Clinic disabled
                </option>
                <option value={1}>
                  Clinic enabled
                </option>
              </select>
            </div>
          </div>

          <div className="battle-setup-row">
            <div className="battle-setup-label">
              <strong>Grandmaster</strong>
              <small>Offensive bonus</small>
            </div>

            <div>
              <label className="battle-setup-check">
                <input
                  type="checkbox"
                  checked={attackerModifiers.grandmaster}
                  onChange={(event) =>
                    updateAttackerModifier(
                      'grandmaster',
                      event.target.checked,
                    )
                  }
                />
                <span>Enabled</span>
              </label>
            </div>

            <div className="battle-setup-na">
              —
            </div>
          </div>

          <div className="battle-setup-section-row">
            <span>PALADIN WEAPONS</span>
            <small>Attacker level</small>
            <small>Defender level</small>
          </div>

          {paladinWeapons.map((weapon) => (
            <div
              className="battle-setup-row paladin-setup-row"
              key={weapon.id}
            >
              <div className="battle-setup-label">
                <span className="battle-setup-unit-icon battle-setup-unit-special">
                  {weapon.abbreviation}
                </span>

                <strong>
                  {weapon.name}
                </strong>
              </div>

              <div>
                <select
                  aria-label={`${weapon.name} attacker`}
                  value={attackerPaladinWeapons[weapon.id]}
                  onChange={(event) =>
                    updateAttackerWeapon(
                      weapon.id,
                      Number(event.target.value),
                    )
                  }
                >
                  {renderLevelOptions(
                    3,
                    'None',
                  )}
                </select>
              </div>

              <div>
                <select
                  aria-label={`${weapon.name} defender`}
                  value={defenderPaladinWeapons[weapon.id]}
                  onChange={(event) =>
                    updateDefenderWeapon(
                      weapon.id,
                      Number(event.target.value),
                    )
                  }
                >
                  {renderLevelOptions(
                    3,
                    'None',
                  )}
                </select>
              </div>
            </div>
          ))}

          <div className="battle-setup-section-row">
            <span>SIEGE</span>
            <small>Target</small>
            <small>Starting level</small>
          </div>

          <div className="battle-setup-row">
            <div className="battle-setup-label">
              <strong>Catapult</strong>
              <small>Building target</small>
            </div>

            <div>
              <select
                value={siegeSettings.catapultTarget}
                onChange={(event) =>
                  updateCatapultTarget(
                    event.target.value as BuildingId,
                  )
                }
              >
                {buildings.map((building) => (
                  <option
                    key={building.id}
                    value={building.id}
                  >
                    {building.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={effectiveCatapultLevel}
                disabled={
                  siegeSettings.catapultTarget ===
                  'wall'
                }
                onChange={(event) =>
                  updateCatapultLevel(
                    Number(event.target.value),
                  )
                }
              >
                {renderLevelOptions(
                  selectedBuilding.maxLevel,
                )}
              </select>
            </div>
          </div>

          <div className="battle-setup-row battle-setup-last-row">
            <div className="battle-setup-label">
              <strong>Ram</strong>
              <small>Automatic siege target</small>
            </div>

            <div className="battle-setup-readonly">
              Wall
            </div>

            <div className="battle-setup-readonly">
              Level {defenderModifiers.wallLevel}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BattleSetupTable
