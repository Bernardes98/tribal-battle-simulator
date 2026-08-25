import {
  compareDefenses,
  defenseChangeStatus,
} from '../../domain/intelligence/defenseComparison'

import type {
  VillageIntelligence,
} from '../../domain/intelligence/playerVillageIntelligence'

import './DefenseComparisonPanel.css'

interface DefenseComparisonPanelProps {
  village: VillageIntelligence
}

const formatter =
  new Intl.NumberFormat(
    'en-US',
  )

const signed = (
  value: number,
): string => {
  if (
    value > 0
  ) {
    return `+${formatter.format(
      value,
    )}`
  }

  return formatter.format(
    value,
  )
}

function DefenseComparisonPanel({
  village,
}: DefenseComparisonPanelProps) {
  if (
    !village.previous
  ) {
    return (
      <div className="defense-comparison-empty">
        A second report is required to compare this village.
      </div>
    )
  }

  const summary =
    compareDefenses(
      village.previous.army,
      village.latest.army,
    )

  const status =
    defenseChangeStatus(
      summary,
    )

  const wallDelta =
    village.latest.wallLevel -
    village.previous.wallLevel

  return (
    <section className="defense-comparison">
      <div className="defense-comparison-header">
        <div>
          <span>
            Defense Change Analyzer
          </span>

          <strong>
            Latest report vs previous report
          </strong>
        </div>

        <span
          className={`defense-comparison-status ${status}`}
        >
          {status ===
          'reinforced'
            ? 'Defense Reinforced'
            : status ===
                'reduced'
              ? 'Defense Reduced'
              : 'No Total Change'}
        </span>
      </div>

      <div className="defense-comparison-summary">
        <div>
          <span>
            Previous
          </span>

          <strong>
            {formatter.format(
              summary.previousTotal,
            )}
          </strong>
        </div>

        <div>
          <span>
            Latest
          </span>

          <strong>
            {formatter.format(
              summary.currentTotal,
            )}
          </strong>
        </div>

        <div
          className={
            summary.totalDelta >
            0
              ? 'positive'
              : summary.totalDelta <
                  0
                ? 'negative'
                : ''
          }
        >
          <span>
            Troop Change
          </span>

          <strong>
            {signed(
              summary.totalDelta,
            )}
          </strong>
        </div>

        <div
          className={
            wallDelta >
            0
              ? 'positive'
              : wallDelta <
                  0
                ? 'negative'
                : ''
          }
        >
          <span>
            Wall Change
          </span>

          <strong>
            {signed(
              wallDelta,
            )}
          </strong>
        </div>
      </div>

      <div className="defense-comparison-table-wrap">
        <table className="defense-comparison-table">
          <thead>
            <tr>
              <th>
                Unit
              </th>

              <th>
                Previous
              </th>

              <th>
                Latest
              </th>

              <th>
                Change
              </th>
            </tr>
          </thead>

          <tbody>
            {summary.changes.map(
              (change) => (
                <tr
                  key={
                    change.unitId
                  }
                >
                  <td>
                    {
                      change.unitName
                    }
                  </td>

                  <td>
                    {formatter.format(
                      change.previous,
                    )}
                  </td>

                  <td>
                    {formatter.format(
                      change.current,
                    )}
                  </td>

                  <td
                    className={
                      change.delta >
                      0
                        ? 'positive'
                        : change.delta <
                            0
                          ? 'negative'
                          : ''
                    }
                  >
                    {signed(
                      change.delta,
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className="defense-comparison-footer">
        <span>
          <strong>
            {
              summary.increasedUnits
            }
          </strong>{' '}
          unit types increased
        </span>

        <span>
          <strong>
            {
              summary.decreasedUnits
            }
          </strong>{' '}
          decreased
        </span>

        <span>
          <strong>
            {
              summary.unchangedUnits
            }
          </strong>{' '}
          unchanged
        </span>
      </div>
    </section>
  )
}

export default DefenseComparisonPanel
