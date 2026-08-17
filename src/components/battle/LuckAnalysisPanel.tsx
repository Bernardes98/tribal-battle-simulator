import type {
  LuckAnalysisResult,
  LuckScenarioResult,
} from '../../domain/battle/luckAnalysis'

import './LuckAnalysisPanel.css'

interface LuckAnalysisPanelProps {
  analysis: LuckAnalysisResult
}

const numberFormatter = new Intl.NumberFormat('en-US')

const formatLuck = (luck: number): string => {
  if (luck > 0) {
    return `+${luck}%`
  }

  return `${luck}%`
}

const getWinnerLabel = (
  scenario: LuckScenarioResult,
): string => {
  if (scenario.winner === 'attacker') {
    return 'Victory'
  }

  if (scenario.winner === 'defender') {
    return 'Defeat'
  }

  return 'Draw'
}

const getWinnerClass = (
  scenario: LuckScenarioResult,
): string => {
  if (scenario.winner === 'attacker') {
    return 'luck-victory'
  }

  if (scenario.winner === 'defender') {
    return 'luck-defeat'
  }

  return 'luck-draw'
}

function LuckAnalysisPanel({
  analysis,
}: LuckAnalysisPanelProps) {
  const victoryPercentage =
    (analysis.attackerVictories /
      analysis.scenarios.length) *
    100

  return (
    <section
      className="luck-analysis-card"
      id="luck-analysis"
    >
      <div className="luck-analysis-header">
        <div>
          <span className="section-label">
            STRATEGY ANALYSIS
          </span>

          <h3>Luck Analysis</h3>

          <p>
            Battle results for every possible luck value from
            -15% to +15%.
          </p>
        </div>

        <div className="luck-range-badge">
          -15% → +15%
        </div>
      </div>

      <div className="luck-summary">
        <div className="luck-summary-card">
          <span>Scenarios</span>

          <strong>
            {analysis.scenarios.length}
          </strong>
        </div>

        <div className="luck-summary-card luck-summary-success">
          <span>Victories</span>

          <strong>
            {analysis.attackerVictories}
          </strong>
        </div>

        <div className="luck-summary-card luck-summary-danger">
          <span>Defeats</span>

          <strong>
            {analysis.defenderVictories}
          </strong>
        </div>

        <div className="luck-summary-card">
          <span>Draws</span>

          <strong>
            {analysis.draws}
          </strong>
        </div>

        <div className="luck-summary-card">
          <span>Victory Rate</span>

          <strong>
            {victoryPercentage.toFixed(1)}%
          </strong>
        </div>

        <div className="luck-summary-card">
          <span>Minimum Luck to Win</span>

          <strong>
            {analysis.minimumLuckToWin === null
              ? 'No victory'
              : formatLuck(
                  analysis.minimumLuckToWin,
                )}
          </strong>
        </div>
      </div>

      <div className="luck-extremes">
        <div className="luck-extreme-card worst-case-card">
          <div className="luck-extreme-heading">
            <div>
              <span>WORST CASE</span>

              <strong>
                {formatLuck(
                  analysis.worstScenario.luck,
                )}
              </strong>
            </div>

            <span
              className={`luck-result-badge ${getWinnerClass(
                analysis.worstScenario,
              )}`}
            >
              {getWinnerLabel(
                analysis.worstScenario,
              )}
            </span>
          </div>

          <div className="luck-extreme-stats">
            <div>
              <span>Attacker survivors</span>

              <strong>
                {numberFormatter.format(
                  analysis.worstScenario
                    .attackerSurvivingUnits,
                )}
              </strong>
            </div>

            <div>
              <span>Survivor provisions</span>

              <strong>
                {numberFormatter.format(
                  analysis.worstScenario
                    .attackerSurvivingProvisions,
                )}
              </strong>
            </div>

            <div>
              <span>Defender survivors</span>

              <strong>
                {numberFormatter.format(
                  analysis.worstScenario
                    .defenderSurvivingUnits,
                )}
              </strong>
            </div>

            <div>
              <span>Attacker losses</span>

              <strong>
                {numberFormatter.format(
                  analysis.worstScenario
                    .attackerLostUnits,
                )}
              </strong>
            </div>
          </div>
        </div>

        <div className="luck-extreme-card best-case-card">
          <div className="luck-extreme-heading">
            <div>
              <span>BEST CASE</span>

              <strong>
                {formatLuck(
                  analysis.bestScenario.luck,
                )}
              </strong>
            </div>

            <span
              className={`luck-result-badge ${getWinnerClass(
                analysis.bestScenario,
              )}`}
            >
              {getWinnerLabel(
                analysis.bestScenario,
              )}
            </span>
          </div>

          <div className="luck-extreme-stats">
            <div>
              <span>Attacker survivors</span>

              <strong>
                {numberFormatter.format(
                  analysis.bestScenario
                    .attackerSurvivingUnits,
                )}
              </strong>
            </div>

            <div>
              <span>Survivor provisions</span>

              <strong>
                {numberFormatter.format(
                  analysis.bestScenario
                    .attackerSurvivingProvisions,
                )}
              </strong>
            </div>

            <div>
              <span>Defender survivors</span>

              <strong>
                {numberFormatter.format(
                  analysis.bestScenario
                    .defenderSurvivingUnits,
                )}
              </strong>
            </div>

            <div>
              <span>Attacker losses</span>

              <strong>
                {numberFormatter.format(
                  analysis.bestScenario
                    .attackerLostUnits,
                )}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="luck-table-section">
        <div className="luck-table-title">
          <h4>All scenarios</h4>

          <p>
            Each row represents one complete battle
            simulation.
          </p>
        </div>

        <div className="luck-table-wrapper">
          <table className="luck-table">
            <thead>
              <tr>
                <th>Luck</th>
                <th>Result</th>
                <th>Attack Strength</th>
                <th>Attacker Lost</th>
                <th>Attacker Final</th>
                <th>Defender Lost</th>
                <th>Defender Final</th>
              </tr>
            </thead>

            <tbody>
              {analysis.scenarios.map(
                (scenario) => (
                  <tr
                    key={scenario.luck}
                    className={
                      scenario.winner === 'attacker'
                        ? 'luck-table-victory'
                        : scenario.winner === 'defender'
                          ? 'luck-table-defeat'
                          : 'luck-table-draw'
                    }
                  >
                    <td className="luck-value-cell">
                      {formatLuck(
                        scenario.luck,
                      )}
                    </td>

                    <td>
                      <span
                        className={`luck-result-badge ${getWinnerClass(
                          scenario,
                        )}`}
                      >
                        {getWinnerLabel(
                          scenario,
                        )}
                      </span>
                    </td>

                    <td>
                      {numberFormatter.format(
                        Math.round(
                          scenario.attackStrength,
                        ),
                      )}
                    </td>

                    <td>
                      {numberFormatter.format(
                        scenario.attackerLostUnits,
                      )}
                    </td>

                    <td>
                      {numberFormatter.format(
                        scenario.attackerSurvivingUnits,
                      )}
                    </td>

                    <td>
                      {numberFormatter.format(
                        scenario.defenderLostUnits,
                      )}
                    </td>

                    <td>
                      {numberFormatter.format(
                        scenario.defenderSurvivingUnits,
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default LuckAnalysisPanel