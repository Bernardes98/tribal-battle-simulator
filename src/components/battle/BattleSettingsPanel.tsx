import {
  calculateAttackerOverallModifier,
  calculateDefenderFaithMultiplier,
  calculateFaithMultiplier,
  formatMultiplier,
} from '../../domain/battle/modifiers'

import type {
  AttackerModifiers,
  DefenderModifiers,
} from '../../types/Battle'

interface BattleSettingsPanelProps {
  attacker: AttackerModifiers
  defender: DefenderModifiers

  onAttackerChange: (
    modifiers: AttackerModifiers,
  ) => void

  onDefenderChange: (
    modifiers: DefenderModifiers,
  ) => void
}

function BattleSettingsPanel({
  attacker,
  defender,
  onAttackerChange,
  onDefenderChange,
}: BattleSettingsPanelProps) {
  const attackerFaith =
    calculateFaithMultiplier(
      attacker.churchLevel,
    )

  const defenderFaith =
    calculateDefenderFaithMultiplier(
      defender,
    )

  const attackerOverall =
    calculateAttackerOverallModifier(
      attacker,
    )

  const updateAttacker = <
    K extends keyof AttackerModifiers,
  >(
    field: K,
    value: AttackerModifiers[K],
  ) => {
    onAttackerChange({
      ...attacker,
      [field]: value,
    })
  }

  const updateDefender = <
    K extends keyof DefenderModifiers,
  >(
    field: K,
    value: DefenderModifiers[K],
  ) => {
    onDefenderChange({
      ...defender,
      [field]: value,
    })
  }

  return (
    <section className="battle-settings-card">
      <div className="settings-title">
        <div>
          <span className="section-label">
            BATTLE SETTINGS
          </span>

          <h3>Battle modifiers</h3>

          <p>
            Configure the bonuses and conditions
            that affect the battle.
          </p>
        </div>
      </div>

      <div className="settings-columns">
        <div className="settings-side attacker-settings">
          <div className="settings-side-header">
            <div>
              <span className="army-label">
                ATTACKER
              </span>

              <h4>Offensive modifiers</h4>
            </div>

            <div className="modifier-result modifier-result-attacker">
              <span>Overall</span>

              <strong>
                {formatMultiplier(
                  attackerOverall,
                )}
              </strong>
            </div>
          </div>

          <div className="settings-grid">
            <div className="setting-field">
              <label htmlFor="attacker-church">
                Church level
              </label>

              <select
                id="attacker-church"
                value={attacker.churchLevel}
                onChange={(event) =>
                  updateAttacker(
                    'churchLevel',
                    Number(
                      event.target.value,
                    ),
                  )
                }
              >
                <option value={0}>
                  Level 0
                </option>

                <option value={1}>
                  Level 1
                </option>

                <option value={2}>
                  Level 2
                </option>

                <option value={3}>
                  Level 3
                </option>
              </select>

              <span className="field-help">
                Faith:{' '}
                {formatMultiplier(
                  attackerFaith,
                )}
              </span>
            </div>

            <div className="setting-field">
              <label htmlFor="morale">
                Morale
              </label>

              <div className="input-suffix">
                <input
                  id="morale"
                  type="number"
                  min="0"
                  max="100"
                  value={attacker.morale}
                  onChange={(event) =>
                    updateAttacker(
                      'morale',
                      Math.min(
                        100,
                        Math.max(
                          0,
                          Number(
                            event.target
                              .value,
                          ),
                        ),
                      ),
                    )
                  }
                />

                <span>%</span>
              </div>
            </div>

            <div className="setting-field">
              <label htmlFor="luck">
                Luck
              </label>

              <div className="input-suffix">
                <input
                  id="luck"
                  type="number"
                  min="-15"
                  max="15"
                  value={attacker.luck}
                  onChange={(event) =>
                    updateAttacker(
                      'luck',
                      Math.min(
                        15,
                        Math.max(
                          -15,
                          Number(
                            event.target
                              .value,
                          ),
                        ),
                      ),
                    )
                  }
                />

                <span>%</span>
              </div>

              <span className="field-help">
                Range: -15% to +15%
              </span>
            </div>

            <div className="setting-field">
              <label htmlFor="weapon-mastery">
                Weapon Mastery
              </label>

              <select
                id="weapon-mastery"
                value={
                  attacker.weaponMasteryLevel
                }
                onChange={(event) =>
                  updateAttacker(
                    'weaponMasteryLevel',
                    Number(
                      event.target.value,
                    ),
                  )
                }
              >
                <option value={0}>
                  None
                </option>

                <option value={1}>
                  Level 1
                </option>

                <option value={2}>
                  Level 2
                </option>

                <option value={3}>
                  Level 3
                </option>

                <option value={4}>
                  Level 4
                </option>

                <option value={5}>
                  Level 5
                </option>
              </select>

              <span className="field-help">
                +2% per level
              </span>
            </div>

            <div className="setting-field">
              <label htmlFor="medic">
                Medic
              </label>

              <select
                id="medic"
                value={
                  attacker.medicLevel
                }
                onChange={(event) =>
                  updateAttacker(
                    'medicLevel',
                    Number(
                      event.target.value,
                    ),
                  )
                }
              >
                <option value={0}>
                  Disabled
                </option>

                <option value={1}>
                  Enabled
                </option>
              </select>
            </div>

            <div className="setting-field">
              <label htmlFor="medicus">
                Medicus
              </label>

              <select
                id="medicus"
                value={
                  attacker.medicusLevel
                }
                onChange={(event) =>
                  updateAttacker(
                    'medicusLevel',
                    Number(
                      event.target.value,
                    ),
                  )
                }
              >
                <option value={0}>
                  Disabled
                </option>

                <option value={1}>
                  Enabled
                </option>
              </select>
            </div>
          </div>

          <label className="toggle-setting">
            <div>
              <strong>Grandmaster</strong>

              <span>
                Adds the Grandmaster
                offensive bonus.
              </span>
            </div>

            <input
              type="checkbox"
              checked={
                attacker.grandmaster
              }
              onChange={(event) =>
                updateAttacker(
                  'grandmaster',
                  event.target.checked,
                )
              }
            />

            <span className="toggle-switch" />
          </label>
        </div>

        <div className="settings-side defender-settings">
          <div className="settings-side-header">
            <div>
              <span className="army-label">
                DEFENDER
              </span>

              <h4>Defensive modifiers</h4>
            </div>

            <div className="modifier-result modifier-result-defender">
              <span>Faith</span>

              <strong>
                {formatMultiplier(
                  defenderFaith,
                )}
              </strong>
            </div>
          </div>

          <div className="settings-grid">
            <div className="setting-field">
              <label htmlFor="defender-church">
                Church level
              </label>

              <select
                id="defender-church"
                value={defender.churchLevel}
                onChange={(event) =>
                  updateDefender(
                    'churchLevel',
                    Number(
                      event.target.value,
                    ),
                  )
                }
              >
                <option value={0}>
                  Level 0
                </option>

                <option value={1}>
                  Level 1
                </option>

                <option value={2}>
                  Level 2
                </option>

                <option value={3}>
                  Level 3
                </option>
              </select>
            </div>

            <div className="setting-field">
              <label htmlFor="wall-level">
                Wall level
              </label>

              <select
                id="wall-level"
                value={defender.wallLevel}
                onChange={(event) =>
                  updateDefender(
                    'wallLevel',
                    Number(
                      event.target.value,
                    ),
                  )
                }
              >
                {Array.from(
                  {
                    length: 21,
                  },
                  (_, level) => (
                    <option
                      key={level}
                      value={level}
                    >
                      Level {level}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="setting-field">
              <label htmlFor="hospital">
                Hospital level
              </label>

              <select
                id="hospital"
                value={
                  defender.hospitalLevel
                }
                onChange={(event) =>
                  updateDefender(
                    'hospitalLevel',
                    Number(
                      event.target.value,
                    ),
                  )
                }
              >
                {Array.from(
                  {
                    length: 11,
                  },
                  (_, level) => (
                    <option
                      key={level}
                      value={level}
                    >
                      {level === 0
                        ? 'Disabled'
                        : `Level ${level}`}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="setting-field">
              <label htmlFor="clinic">
                Clinic
              </label>

              <select
                id="clinic"
                value={
                  defender.clinicLevel
                }
                onChange={(event) =>
                  updateDefender(
                    'clinicLevel',
                    Number(
                      event.target.value,
                    ),
                  )
                }
              >
                <option value={0}>
                  Disabled
                </option>

                <option value={1}>
                  Enabled
                </option>
              </select>
            </div>

            <div className="setting-field">
              <label htmlFor="iron-wall">
                Iron Wall
              </label>

              <select
                id="iron-wall"
                value={
                  defender.ironWallLevel
                }
                onChange={(event) =>
                  updateDefender(
                    'ironWallLevel',
                    Number(
                      event.target.value,
                    ),
                  )
                }
              >
                <option value={0}>
                  Disabled
                </option>

                <option value={1}>
                  Level 1
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BattleSettingsPanel