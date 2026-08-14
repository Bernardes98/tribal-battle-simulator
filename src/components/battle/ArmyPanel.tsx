import { units } from '../../data/units'
import type { Army } from '../../types/Battle'
import type { UnitId } from '../../types/Unit'

interface ArmyPanelProps {
  side: 'attacker' | 'defender'
  army: Army
  onUnitChange: (unitId: UnitId, quantity: number) => void
  onClear: () => void
}

function ArmyPanel({
  side,
  army,
  onUnitChange,
  onClear,
}: ArmyPanelProps) {
  const isAttacker = side === 'attacker'

  const totalUnits = units.reduce(
    (total, unit) => total + army[unit.id],
    0,
  )

  const totalProvisions = units.reduce(
    (total, unit) =>
      total + army[unit.id] * unit.provisions,
    0,
  )

  const handleChange = (
    unitId: UnitId,
    value: string,
  ) => {
    const parsedValue = Number(value)

    if (!value) {
      onUnitChange(unitId, 0)
      return
    }

    if (
      Number.isNaN(parsedValue) ||
      parsedValue < 0
    ) {
      return
    }

    onUnitChange(
      unitId,
      Math.floor(parsedValue),
    )
  }

  return (
    <section
      className={`army-card ${
        isAttacker
          ? 'attacker-card'
          : 'defender-card'
      }`}
    >
      <div className="army-card-header">
        <div>
          <span className="army-label">
            {isAttacker
              ? 'ATTACKER'
              : 'DEFENDER'}
          </span>

          <h3>
            {isAttacker
              ? 'Attacking Army'
              : 'Defending Army'}
          </h3>
        </div>

        <button
          className="clear-army-button"
          type="button"
          onClick={onClear}
        >
          Clear
        </button>
      </div>

      <div className="unit-list-header">
        <span>Unit</span>
        <span>Stats</span>
        <span>Quantity</span>
      </div>

      <div className="unit-list">
        {units.map((unit) => (
          <div
            className="unit-row"
            key={unit.id}
          >
            <div className="unit-info">
              <div
                className={`unit-icon unit-icon-${unit.category}`}
              >
                {unit.abbreviation}
              </div>

              <div>
                <strong>{unit.name}</strong>

                <span>
                  {unit.provisions} provision
                  {unit.provisions !== 1
                    ? 's'
                    : ''}
                </span>
              </div>
            </div>

            <div className="unit-stats">
              <span>
                ATK
                <strong>
                  {unit.attack}
                </strong>
              </span>

              <span>
                DEF
                <strong>
                  {unit.defenseGeneral}
                </strong>
              </span>
            </div>

            <input
              aria-label={`${unit.name} quantity`}
              className="unit-input"
              inputMode="numeric"
              min="0"
              step="1"
              type="number"
              value={
                army[unit.id] === 0
                  ? ''
                  : army[unit.id]
              }
              placeholder="0"
              onChange={(event) =>
                handleChange(
                  unit.id,
                  event.target.value,
                )
              }
            />
          </div>
        ))}
      </div>

      <div className="army-summary">
        <div>
          <span>Total units</span>
          <strong>
            {totalUnits.toLocaleString()}
          </strong>
        </div>

        <div>
          <span>Provisions</span>
          <strong>
            {totalProvisions.toLocaleString()}
          </strong>
        </div>
      </div>
    </section>
  )
}

export default ArmyPanel