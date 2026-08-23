import { units } from '../../data/units'

import type {
  Army,
  AttackerModifiers,
  DefenderModifiers,
} from '../../types/Battle'

import './BattleQuickActions.css'

interface BattleQuickActionsProps {
  attacker: Army
  defender: Army
  attackerModifiers: AttackerModifiers
  defenderModifiers: DefenderModifiers
  onSwapArmies: () => void
  onResetBattle: () => void
  onLoadExample: () => void
  onSimulate: () => void
  onAnalyzeLuck: () => void
}

interface ArmySummary {
  units: number
  provisions: number
  activeTypes: number
}

const numberFormatter = new Intl.NumberFormat(
  'en-US',
)

const getArmySummary = (
  army: Army,
): ArmySummary => {
  return units.reduce<ArmySummary>(
    (summary, unit) => {
      const quantity =
        army[unit.id] ?? 0

      summary.units += quantity
      summary.provisions +=
        quantity * unit.provisions

      if (quantity > 0) {
        summary.activeTypes += 1
      }

      return summary
    },
    {
      units: 0,
      provisions: 0,
      activeTypes: 0,
    },
  )
}

function BattleQuickActions({
  attacker,
  defender,
  attackerModifiers,
  defenderModifiers,
  onSwapArmies,
  onResetBattle,
  onLoadExample,
  onSimulate,
  onAnalyzeLuck,
}: BattleQuickActionsProps) {
  const attackerSummary =
    getArmySummary(attacker)

  const defenderSummary =
    getArmySummary(defender)

  return (
    <section
      className="battle-quick-actions"
      aria-label="Battle summary and quick actions"
    >
      <div className="quick-summary-side quick-summary-attacker">
        <div className="quick-summary-side-title">
          <span className="quick-summary-marker" />

          <div>
            <small>ATTACKER</small>
            <strong>
              {numberFormatter.format(
                attackerSummary.units,
              )}{' '}
              units
            </strong>
          </div>
        </div>

        <div className="quick-summary-values">
          <span>
            <strong>
              {numberFormatter.format(
                attackerSummary.provisions,
              )}
            </strong>
            provisions
          </span>

          <span>
            <strong>
              {attackerSummary.activeTypes}
            </strong>
            troop types
          </span>

          <span>
            <strong>
              {attackerModifiers.morale}%
            </strong>
            morale
          </span>

          <span>
            <strong>
              {attackerModifiers.luck > 0
                ? `+${attackerModifiers.luck}%`
                : `${attackerModifiers.luck}%`}
            </strong>
            luck
          </span>
        </div>
      </div>

      <div className="quick-actions-center">
        <div className="quick-actions-secondary">
          <button
            className="quick-action-button"
            type="button"
            onClick={onSwapArmies}
            title="Swap attacker and defender troops. Side-specific settings stay on their original side."
          >
            <span aria-hidden="true">⇄</span>
            Swap Armies
          </button>

          <button
            className="quick-action-button"
            type="button"
            onClick={onResetBattle}
          >
            <span aria-hidden="true">↺</span>
            Reset
          </button>

          <button
            className="quick-action-button"
            type="button"
            onClick={onLoadExample}
          >
            <span aria-hidden="true">★</span>
            Example
          </button>
        </div>

        <div className="quick-actions-primary">
          <button
            className="quick-luck-button"
            type="button"
            onClick={onAnalyzeLuck}
          >
            Analyze Luck
          </button>

          <button
            className="quick-simulate-button"
            type="button"
            onClick={onSimulate}
          >
            Simulate Battle
          </button>
        </div>
      </div>

      <div className="quick-summary-side quick-summary-defender">
        <div className="quick-summary-side-title">
          <span className="quick-summary-marker" />

          <div>
            <small>DEFENDER</small>
            <strong>
              {numberFormatter.format(
                defenderSummary.units,
              )}{' '}
              units
            </strong>
          </div>
        </div>

        <div className="quick-summary-values">
          <span>
            <strong>
              {numberFormatter.format(
                defenderSummary.provisions,
              )}
            </strong>
            provisions
          </span>

          <span>
            <strong>
              {defenderSummary.activeTypes}
            </strong>
            troop types
          </span>

          <span>
            <strong>
              Lv. {defenderModifiers.wallLevel}
            </strong>
            wall
          </span>

          <span>
            <strong>
              Lv. {defenderModifiers.churchLevel}
            </strong>
            church
          </span>
        </div>
      </div>
    </section>
  )
}

export default BattleQuickActions