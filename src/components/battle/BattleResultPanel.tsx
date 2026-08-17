import { units } from '../../data/units'

import type {
  ArmyValueSummary,
  BattleResult,
} from '../../types/Battle'

import './BattleResultPanel.css'

interface BattleResultPanelProps {
  result: BattleResult
}

interface ArmyValueTableProps {
  title: string
  side: 'attacker' | 'defender'

  initial: ArmyValueSummary
  lost: ArmyValueSummary
  revived: ArmyValueSummary
  final: ArmyValueSummary
}

const numberFormatter = new Intl.NumberFormat(
  'en-US',
  {
    maximumFractionDigits: 2,
  },
)

const percentageFormatter =
  new Intl.NumberFormat(
    'en-US',
    {
      style: 'percent',
      maximumFractionDigits: 1,
    },
  )

function ArmyValueTable({
  title,
  side,
  initial,
  lost,
  revived,
  final,
}: ArmyValueTableProps) {
  const rows = [
    {
      label: 'Initial',
      className: 'value-row-initial',
      value: initial,
    },
    {
      label: 'Lost',
      className: 'value-row-lost',
      value: lost,
    },
    {
      label: 'Revived',
      className: 'value-row-revived',
      value: revived,
    },
    {
      label: 'Final',
      className: 'value-row-final',
      value: final,
    },
  ]

  return (
    <div className="army-value-side">
      <div
        className={`army-value-side-heading ${
          side === 'attacker'
            ? 'army-value-attacker-heading'
            : 'army-value-defender-heading'
        }`}
      >
        {title}
      </div>

      <div className="army-value-table-wrapper">
        <table className="army-value-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Provisions</th>
              <th>Bash</th>
              <th>Wood</th>
              <th>Clay</th>
              <th>Iron</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className={row.className}
              >
                <td>
                  <strong>
                    {row.label}
                  </strong>
                </td>

                <td>
                  {numberFormatter.format(
                    row.value.provisions,
                  )}
                </td>

                <td>
                  {numberFormatter.format(
                    row.value.bashPoints,
                  )}
                </td>

                <td>
                  {numberFormatter.format(
                    row.value.resources.wood,
                  )}
                </td>

                <td>
                  {numberFormatter.format(
                    row.value.resources.clay,
                  )}
                </td>

                <td>
                  {numberFormatter.format(
                    row.value.resources.iron,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BattleResultPanel({
  result,
}: BattleResultPanelProps) {
  const winnerText =
    result.winner === 'attacker'
      ? 'Attacker Victory'
      : result.winner === 'defender'
        ? 'Defender Victory'
        : 'Draw'

  const winnerClass =
    result.winner === 'attacker'
      ? 'result-attacker-win'
      : result.winner === 'defender'
        ? 'result-defender-win'
        : 'result-draw'

  return (
    <section
      className="battle-result-card"
      id="battle-result"
    >
      <div className="result-header">
        <div>
          <span className="section-label">
            BATTLE RESULT
          </span>

          <h3>
            Simulation result
          </h3>

          <p>
            Combat, siege, troop
            recovery and resource
            results.
          </p>
        </div>

        <div
          className={`winner-badge ${winnerClass}`}
        >
          {winnerText}
        </div>
      </div>

      <div className="strength-summary">
        <div className="strength-card attacker-strength">
          <span>
            Attack Strength
          </span>

          <strong>
            {numberFormatter.format(
              result.attackStrength,
            )}
          </strong>
        </div>

        <div className="strength-versus">
          VS
        </div>

        <div className="strength-card defender-strength">
          <span>
            Defense Strength
          </span>

          <strong>
            {numberFormatter.format(
              result.defenseStrength,
            )}
          </strong>
        </div>
      </div>

      <div className="siege-result-section">
        <div className="result-section-heading">
          <span className="section-label">
            SIEGE RESULT
          </span>

          <h4>
            Wall & Catapult
          </h4>

          <p>
            Result of the siege
            equipment after combat.
          </p>
        </div>

        <div className="siege-result-grid">
          <div className="siege-result-card">
            <div className="siege-card-title">
              Wall
            </div>

            <div className="level-flow">
              <div>
                <span>
                  Starting
                </span>

                <strong>
                  {
                    result.siege.wall
                      .startingLevel
                  }
                </strong>
              </div>

              <b>→</b>

              <div>
                <span>
                  Pre-battle
                </span>

                <strong>
                  {
                    result.siege.wall
                      .preBattleLevel
                  }
                </strong>
              </div>

              <b>→</b>

              <div>
                <span>
                  Post-battle
                </span>

                <strong>
                  {
                    result.siege.wall
                      .postBattleLevel
                  }
                </strong>
              </div>

              <b>→</b>

              <div>
                <span>
                  Final
                </span>

                <strong>
                  {
                    result.siege.wall
                      .finalLevel
                  }
                </strong>
              </div>
            </div>
          </div>

          <div className="siege-result-card">
            <div className="siege-card-title">
              Catapult
            </div>

            <strong className="siege-building-name">
              {
                result.siege.catapult
                  .targetName
              }
            </strong>

            <div className="catapult-level-result">
              <div>
                <span>
                  Starting
                </span>

                <strong>
                  {
                    result.siege.catapult
                      .startingLevel
                  }
                </strong>
              </div>

              <b>→</b>

              <div>
                <span>
                  Final
                </span>

                <strong>
                  {
                    result.siege.catapult
                      .postLevel
                  }
                </strong>
              </div>
            </div>

            <div className="siege-calculation-details">
              <span>
                Catapult Power
                <strong>
                  {numberFormatter.format(
                    result.siege
                      .catapult
                      .attackStrength,
                  )}
                </strong>
              </span>

              <span>
                Damage
                <strong>
                  {numberFormatter.format(
                    result.siege
                      .catapult
                      .damageLevels,
                  )}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="army-value-section">
        <div className="result-section-heading">
          <span className="section-label">
            ARMY VALUE
          </span>

          <h4>
            Resources & Bash Points
          </h4>

          <p>
            Resource value and bash
            points for each stage of
            the battle.
          </p>
        </div>

        <div className="army-value-columns">
          <ArmyValueTable
            title="ATTACKER"
            side="attacker"
            initial={
              result.attacker
                .initialValue
            }
            lost={
              result.attacker
                .lostValue
            }
            revived={
              result.attacker
                .revivedValue
            }
            final={
              result.attacker
                .survivingValue
            }
          />

          <ArmyValueTable
            title="DEFENDER"
            side="defender"
            initial={
              result.defender
                .initialValue
            }
            lost={
              result.defender
                .lostValue
            }
            revived={
              result.defender
                .revivedValue
            }
            final={
              result.defender
                .survivingValue
            }
          />
        </div>
      </div>

      <div className="result-sides">
        <div className="result-side">
          <div className="result-side-title attacker-result-title">
            ATTACKER
          </div>

          <div className="result-stat-grid">
            <div>
              <span>
                Initial Troops
              </span>

              <strong>
                {numberFormatter.format(
                  result.attacker
                    .initialUnits,
                )}
              </strong>
            </div>

            <div>
              <span>
                Troops Lost
              </span>

              <strong className="loss-value">
                {numberFormatter.format(
                  result.attacker
                    .lostUnits,
                )}
              </strong>
            </div>

            <div>
              <span>
                Revived
              </span>

              <strong className="revived-value">
                {numberFormatter.format(
                  result.attacker
                    .revivedUnits,
                )}
              </strong>
            </div>

            <div>
              <span>
                Final Survivors
              </span>

              <strong>
                {numberFormatter.format(
                  result.attacker
                    .survivingUnits,
                )}
              </strong>
            </div>
          </div>

          <div className="provision-summary">
            <div>
              <span>
                Initial Provisions
              </span>

              <strong>
                {numberFormatter.format(
                  result.attacker
                    .initialProvisions,
                )}
              </strong>
            </div>

            <div>
              <span>
                Provisions Lost
              </span>

              <strong className="loss-value">
                {numberFormatter.format(
                  result.attacker
                    .lostProvisions,
                )}
              </strong>
            </div>

            <div>
              <span>
                Revived Provisions
              </span>

              <strong className="revived-value">
                {numberFormatter.format(
                  result.attacker
                    .revivedProvisions,
                )}
              </strong>
            </div>

            <div>
              <span>
                Final Provisions
              </span>

              <strong>
                {numberFormatter.format(
                  result.attacker
                    .survivingProvisions,
                )}
              </strong>
            </div>
          </div>

          <div className="result-unit-list">
            <div className="result-unit-header">
              <span>Unit</span>
              <span>Lost</span>
              <span>Revived</span>
              <span>Final</span>
            </div>

            {units
              .filter(
                (unit) =>
                  result.attacker
                    .initialArmy[
                    unit.id
                  ] > 0,
              )
              .map((unit) => (
                <div
                  className="result-unit-row"
                  key={unit.id}
                >
                  <span>
                    {unit.name}
                  </span>

                  <strong className="loss-value">
                    {numberFormatter.format(
                      result.attacker
                        .losses[
                        unit.id
                      ],
                    )}
                  </strong>

                  <strong className="revived-value">
                    {numberFormatter.format(
                      result.attacker
                        .revived[
                        unit.id
                      ],
                    )}
                  </strong>

                  <strong>
                    {numberFormatter.format(
                      result.attacker
                        .survivors[
                        unit.id
                      ],
                    )}
                  </strong>
                </div>
              ))}
          </div>
        </div>

        <div className="result-side">
          <div className="result-side-title defender-result-title">
            DEFENDER
          </div>

          <div className="result-stat-grid">
            <div>
              <span>
                Initial Troops
              </span>

              <strong>
                {numberFormatter.format(
                  result.defender
                    .initialUnits,
                )}
              </strong>
            </div>

            <div>
              <span>
                Troops Lost
              </span>

              <strong className="loss-value">
                {numberFormatter.format(
                  result.defender
                    .lostUnits,
                )}
              </strong>
            </div>

            <div>
              <span>
                Revived
              </span>

              <strong className="revived-value">
                {numberFormatter.format(
                  result.defender
                    .revivedUnits,
                )}
              </strong>
            </div>

            <div>
              <span>
                Final Survivors
              </span>

              <strong>
                {numberFormatter.format(
                  result.defender
                    .survivingUnits,
                )}
              </strong>
            </div>
          </div>

          <div className="provision-summary">
            <div>
              <span>
                Initial Provisions
              </span>

              <strong>
                {numberFormatter.format(
                  result.defender
                    .initialProvisions,
                )}
              </strong>
            </div>

            <div>
              <span>
                Provisions Lost
              </span>

              <strong className="loss-value">
                {numberFormatter.format(
                  result.defender
                    .lostProvisions,
                )}
              </strong>
            </div>

            <div>
              <span>
                Revived Provisions
              </span>

              <strong className="revived-value">
                {numberFormatter.format(
                  result.defender
                    .revivedProvisions,
                )}
              </strong>
            </div>

            <div>
              <span>
                Final Provisions
              </span>

              <strong>
                {numberFormatter.format(
                  result.defender
                    .survivingProvisions,
                )}
              </strong>
            </div>
          </div>

          <div className="result-unit-list">
            <div className="result-unit-header">
              <span>Unit</span>
              <span>Lost</span>
              <span>Revived</span>
              <span>Final</span>
            </div>

            {units
              .filter(
                (unit) =>
                  result.defender
                    .initialArmy[
                    unit.id
                  ] > 0,
              )
              .map((unit) => (
                <div
                  className="result-unit-row"
                  key={unit.id}
                >
                  <span>
                    {unit.name}
                  </span>

                  <strong className="loss-value">
                    {numberFormatter.format(
                      result.defender
                        .losses[
                        unit.id
                      ],
                    )}
                  </strong>

                  <strong className="revived-value">
                    {numberFormatter.format(
                      result.defender
                        .revived[
                        unit.id
                      ],
                    )}
                  </strong>

                  <strong>
                    {numberFormatter.format(
                      result.defender
                        .survivors[
                        unit.id
                      ],
                    )}
                  </strong>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="combat-groups">
        <div className="result-section-heading">
          <span className="section-label">
            COMBAT DETAILS
          </span>

          <h4>
            Combat groups
          </h4>

          <p>
            Strength and casualty
            rate by attack group.
          </p>
        </div>

        <div className="combat-group-grid">
          {result.groups.map(
            (group) => (
              <div
                className="combat-group-card"
                key={group.group}
              >
                <strong>
                  {group.group ===
                  'infantry'
                    ? 'Infantry'
                    : group.group ===
                        'cavalry'
                      ? 'Cavalry'
                      : 'Archer'}
                </strong>

                <div>
                  <span>
                    Attack
                  </span>

                  <b>
                    {numberFormatter.format(
                      group.attackStrength,
                    )}
                  </b>
                </div>

                <div>
                  <span>
                    Defense
                  </span>

                  <b>
                    {numberFormatter.format(
                      group.defenseStrength,
                    )}
                  </b>
                </div>

                <div>
                  <span>
                    Attacker Loss Rate
                  </span>

                  <b>
                    {percentageFormatter.format(
                      group.attackerLossRate,
                    )}
                  </b>
                </div>

                <div>
                  <span>
                    Defender Loss Rate
                  </span>

                  <b>
                    {percentageFormatter.format(
                      group.defenderLossRate,
                    )}
                  </b>
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      {result.warnings.length > 0 && (
        <div className="result-warning">
          <strong>
            Simulation Notes
          </strong>

          {result.warnings.map(
            (warning) => (
              <p key={warning}>
                {warning}
              </p>
            ),
          )}
        </div>
      )}
    </section>
  )
}

export default BattleResultPanel