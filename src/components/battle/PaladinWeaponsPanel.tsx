import type {
  PaladinWeaponLevels,
} from '../../types/Battle'

interface PaladinWeaponsPanelProps {
  attacker: PaladinWeaponLevels
  defender: PaladinWeaponLevels

  onAttackerChange: (
    levels: PaladinWeaponLevels,
  ) => void

  onDefenderChange: (
    levels: PaladinWeaponLevels,
  ) => void
}

interface Weapon {
  id: keyof PaladinWeaponLevels
  name: string
  abbreviation: string
}

const weapons: Weapon[] = [
  {
    id: 'spearman',
    name: 'Spearman',
    abbreviation: 'SP',
  },
  {
    id: 'swordsman',
    name: 'Swordsman',
    abbreviation: 'SW',
  },
  {
    id: 'axe',
    name: 'Axe Fighter',
    abbreviation: 'AX',
  },
  {
    id: 'archer',
    name: 'Archer',
    abbreviation: 'AR',
  },
  {
    id: 'lightCavalry',
    name: 'Light Cavalry',
    abbreviation: 'LC',
  },
  {
    id: 'mountedArcher',
    name: 'Mounted Archer',
    abbreviation: 'MA',
  },
  {
    id: 'heavyCavalry',
    name: 'Heavy Cavalry',
    abbreviation: 'HC',
  },
  {
    id: 'ram',
    name: 'Ram',
    abbreviation: 'RM',
  },
  {
    id: 'catapult',
    name: 'Catapult',
    abbreviation: 'CT',
  },
  {
    id: 'berserker',
    name: 'Berserker',
    abbreviation: 'BE',
  },
]

function PaladinWeaponsPanel({
  attacker,
  defender,
  onAttackerChange,
  onDefenderChange,
}: PaladinWeaponsPanelProps) {
  const updateAttacker = (
    weapon: keyof PaladinWeaponLevels,
    value: number,
  ) => {
    onAttackerChange({
      ...attacker,
      [weapon]: value,
    })
  }

  const updateDefender = (
    weapon: keyof PaladinWeaponLevels,
    value: number,
  ) => {
    onDefenderChange({
      ...defender,
      [weapon]: value,
    })
  }

  return (
    <section className="paladin-card">
      <div className="settings-title">
        <div>
          <span className="section-label">
            PALADIN
          </span>

          <h3>Paladin weapons</h3>

          <p>
            Configure the Paladin weapon bonus
            for each unit type.
          </p>
        </div>
      </div>

      <div className="paladin-table">
        <div className="paladin-table-header">
          <span>Unit</span>
          <span>Attacker</span>
          <span>Defender</span>
        </div>

        {weapons.map((weapon) => (
          <div
            className="paladin-row"
            key={weapon.id}
          >
            <div className="paladin-unit">
              <span className="paladin-unit-icon">
                {weapon.abbreviation}
              </span>

              <strong>
                {weapon.name}
              </strong>
            </div>

            <select
              value={attacker[weapon.id]}
              onChange={(event) =>
                updateAttacker(
                  weapon.id,
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
            </select>

            <select
              value={defender[weapon.id]}
              onChange={(event) =>
                updateDefender(
                  weapon.id,
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
            </select>
          </div>
        ))}
      </div>
    </section>
  )
}

export default PaladinWeaponsPanel