import type {
  TargetScoreResult,
} from '../../domain/intelligence/targetScoring'

import './TargetScoreDetails.css'

interface TargetScoreDetailsProps {
  result: TargetScoreResult
}

const signed = (
  value: number,
): string => {
  return value > 0
    ? `+${value}`
    : `${value}`
}

function TargetScoreDetails({
  result,
}: TargetScoreDetailsProps) {
  return (
    <section className="target-score-details">
      <div className="target-score-details-header">
        <div>
          <span>
            Score Breakdown
          </span>

          <strong>
            {result.score}/100 · {result.label}
          </strong>
        </div>

        <small>
          Base score: 50
        </small>
      </div>

      <div className="target-score-factors">
        {result.factors.length === 0 ? (
          <div className="target-score-factor-empty">
            No score modifiers applied.
          </div>
        ) : (
          result.factors.map(
            (factor) => (
              <div
                key={factor.key}
                className="target-score-factor"
              >
                <div>
                  <strong>
                    {factor.label}
                  </strong>

                  <small>
                    {factor.description}
                  </small>
                </div>

                <span
                  className={
                    factor.value > 0
                      ? 'positive'
                      : 'negative'
                  }
                >
                  {signed(factor.value)}
                </span>
              </div>
            ),
          )
        )}
      </div>

      <div className="target-score-disclaimer">
        Planning heuristic based on your tags, preferences and saved reports. It does not guarantee a battle outcome.
      </div>
    </section>
  )
}

export default TargetScoreDetails
