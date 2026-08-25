import {
  buildDefenseTrendData,
} from '../../domain/intelligence/defenseTrend'

import type {
  VillageIntelligence,
} from '../../domain/intelligence/playerVillageIntelligence'

import './DefenseTrendPanel.css'

interface DefenseTrendPanelProps {
  village: VillageIntelligence
}

const formatter =
  new Intl.NumberFormat(
    'en-US',
  )

const signed = (
  value: number,
): string => {
  if (value > 0) {
    return `+${formatter.format(
      value,
    )}`
  }

  return formatter.format(
    value,
  )
}

const formatDate = (
  value: string,
): string => {
  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date)
}

const linePoints = (
  values: number[],
  width: number,
  height: number,
): string => {
  if (
    values.length === 0
  ) {
    return ''
  }

  const max =
    Math.max(
      ...values,
      1,
    )

  const min =
    Math.min(
      ...values,
    )

  const range =
    Math.max(
      max - min,
      1,
    )

  return values
    .map(
      (
        value,
        index,
      ) => {
        const x =
          values.length === 1
            ? width / 2
            : (index /
                (values.length - 1)) *
              width

        const normalized =
          (value - min) /
          range

        const y =
          height -
          normalized *
            (height - 10) -
          5

        return `${x.toFixed(
          1,
        )},${y.toFixed(
          1,
        )}`
      },
    )
    .join(' ')
}

function DefenseTrendPanel({
  village,
}: DefenseTrendPanelProps) {
  const trend =
    buildDefenseTrendData(
      village,
    )

  if (
    trend.points.length < 2
  ) {
    return (
      <div className="defense-trend-empty">
        A second saved report is required to build a defense trend.
      </div>
    )
  }

  const totalValues =
    trend.points.map(
      (point) =>
        point.totalTroops,
    )

  const totalClass =
    trend.totalDelta > 0
      ? 'positive'
      : trend.totalDelta < 0
        ? 'negative'
        : ''

  const wallClass =
    trend.wallDelta > 0
      ? 'positive'
      : trend.wallDelta < 0
        ? 'negative'
        : ''

  return (
    <section className="defense-trend">
      <div className="defense-trend-header">
        <div>
          <span>
            Defense Trend
          </span>

          <strong>
            {
              trend.points.length
            } saved reports
          </strong>
        </div>

        <span className={`defense-trend-total-change ${totalClass}`}>
          {signed(
            trend.totalDelta,
          )} troops
          {trend.totalDeltaPercent !== null && (
            <>
              {' · '}
              {trend.totalDeltaPercent > 0
                ? '+'
                : ''}
              {trend.totalDeltaPercent.toFixed(
                1,
              )}
              %
            </>
          )}
        </span>
      </div>

      <div className="defense-trend-summary">
        <div>
          <span>
            First Seen
          </span>

          <strong>
            {formatter.format(
              trend.oldestTotal,
            )}
          </strong>
        </div>

        <div>
          <span>
            Latest
          </span>

          <strong>
            {formatter.format(
              trend.latestTotal,
            )}
          </strong>
        </div>

        <div>
          <span>
            Lowest
          </span>

          <strong>
            {formatter.format(
              trend.lowestTotal,
            )}
          </strong>
        </div>

        <div>
          <span>
            Highest
          </span>

          <strong>
            {formatter.format(
              trend.highestTotal,
            )}
          </strong>
        </div>

        <div className={wallClass}>
          <span>
            Wall
          </span>

          <strong>
            {trend.oldestWall}
            {' → '}
            {trend.latestWall}
          </strong>
        </div>
      </div>

      <div className="defense-trend-chart-card">
        <div className="defense-trend-chart-title">
          <strong>
            Total Defense
          </strong>

          <span>
            Oldest → Latest
          </span>
        </div>

        <svg
          className="defense-trend-chart"
          viewBox="0 0 600 150"
          role="img"
          aria-label="Defense troop trend"
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            y1="145"
            x2="600"
            y2="145"
            className="defense-trend-axis"
          />

          <polyline
            points={linePoints(
              totalValues,
              600,
              145,
            )}
            className="defense-trend-line"
          />
        </svg>

        <div className="defense-trend-dates">
          <span>
            {formatDate(
              trend.points[0]
                .createdAt,
            )}
          </span>

          <span>
            {formatDate(
              trend.points[
                trend.points.length - 1
              ].createdAt,
            )}
          </span>
        </div>
      </div>

      <div className="defense-trend-units">
        <div className="defense-trend-units-header">
          <strong>
            Unit Evolution
          </strong>

          <span>
            Latest change compares the two newest reports.
          </span>
        </div>

        <div className="defense-trend-unit-grid">
          {trend.unitSeries.map(
            (series) => {
              const changeClass =
                (series.delta ?? 0) > 0
                  ? 'positive'
                  : (series.delta ?? 0) < 0
                    ? 'negative'
                    : ''

              return (
                <div
                  key={
                    series.unitId
                  }
                  className="defense-trend-unit"
                >
                  <div className="defense-trend-unit-info">
                    <span>
                      {
                        series.unitName
                      }
                    </span>

                    <strong>
                      {formatter.format(
                        series.latest,
                      )}
                    </strong>

                    <small className={changeClass}>
                      Latest change:{' '}
                      {series.delta === null
                        ? '—'
                        : signed(
                            series.delta,
                          )}
                    </small>
                  </div>

                  <svg
                    viewBox="0 0 180 52"
                    role="img"
                    aria-label={`${series.unitName} trend`}
                    preserveAspectRatio="none"
                  >
                    <polyline
                      points={linePoints(
                        series.values,
                        180,
                        52,
                      )}
                      className="defense-trend-unit-line"
                    />
                  </svg>
                </div>
              )
            },
          )}
        </div>
      </div>

      <div className="defense-trend-timeline">
        {trend.points.map(
          (
            point,
            index,
          ) => (
            <div
              key={
                point.id
              }
              className="defense-trend-timeline-row"
            >
              <span>
                #{index + 1}
              </span>

              <time
                dateTime={
                  point.createdAt
                }
              >
                {formatDate(
                  point.createdAt,
                )}
              </time>

              <strong>
                {formatter.format(
                  point.totalTroops,
                )} troops
              </strong>

              <span>
                Wall{' '}
                {
                  point.wallLevel
                }
              </span>

              <span>
                {point.source === 'SPY_REPORT'
                  ? 'Spy Report'
                  : point.source === 'BATTLE_REPORT'
                    ? 'Battle Report'
                    : 'Manual'}
              </span>
            </div>
          ),
        )}
      </div>
    </section>
  )
}

export default DefenseTrendPanel
