import { units } from '../../data/units'

import type {
  BattleResult,
} from '../../types/Battle'

import './BattleResultPanel.css'

interface BattleResultPanelProps {
  result: BattleResult
}

const numberFormatter =
  new Intl.NumberFormat(
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

function BattleResultPanel({
  result,
}: BattleResultPanelProps) {
  const winnerText =
    result.winner ===
    'attacker'
      ? 'Attacker Victory'
      : result.winner ===
          'defender'
        ? 'Defender Victory'
        : 'Draw'

  const winnerClass =
    result.winner ===
    'attacker'
      ? 'result-attacker-win'
      : result.winner ===
          'defender'
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
            Combat, revival and
            siege result.
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
        <div className="siege-result-header">
          <span className="section-label">
            SIEGE RESULT
          </span>

          <h4>
            Wall & Catapult
          </h4>
        </div>

        <div className="siege-result-grid">
          <div className="siege-result-card">
            <span className="siege-result-label">
              Wall
            </span>

            <div className="level-flow">
              <div>
                <span>
                  Starting
                </span>

                <strong>
                  {
                    result.siege
                      .wall
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
                    result.siege
                      .wall
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
                    result.siege
                      .wall
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
                    result.siege
                      .wall
                      .finalLevel
                  }
                </strong>
              </div>
            </div>
          </div>

          <div className="siege-result-card">
            <span className="siege-result-label">
              Catapult
            </span>

            <strong className="siege-building-name">
              {
                result.siege
                  .catapult
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
                    result.siege
                      .catapult
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
                    result.siege
                      .catapult
                      .postLevel
                  }
                </strong>
              </div>
            </div>

            <div className="siege-calculation-details">
              <span>
                Catapult power:{' '}
                <strong>
                  {numberFormatter.format(
                    result.siege
                      .catapult
                      .attackStrength,
                  )}
                </strong>
              </span>

              <span>
                Damage:{' '}
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

      <div className="result-sides">
        <div className="result-side">
          <div className="result-side-title attacker-result-title">
            ATTACKER
          </div>

          <div className="result-stat-grid">
            <div>
              <span>
                Initial troops
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
                Troops lost
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
                Final survivors
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
                Initial provisions
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
                Provisions lost
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
                Revived provisions
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
                Final provisions
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
                Initial troops
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
                Troops lost
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
                Final survivors
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
                Initial provisions
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
                Provisions lost
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
                Revived provisions
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
                Final provisions
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
        <h4>
          Combat groups
        </h4>

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
                    Attacker loss rate
                  </span>

                  <b>
                    {percentageFormatter.format(
                      group.attackerLossRate,
                    )}
                  </b>
                </div>

                <div>
                  <span>
                    Defender loss rate
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
    </section>
  )
}

export default BattleResultPanel