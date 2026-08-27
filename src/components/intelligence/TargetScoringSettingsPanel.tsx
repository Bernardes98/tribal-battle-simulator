import {
  useState,
} from 'react'

import {
  loadTargetScoringSettings,
  resetTargetScoringSettings,
  saveTargetScoringSettings,
} from '../../domain/intelligence/targetScoring'

import type {
  TargetScoringSettings,
} from '../../domain/intelligence/targetScoring'

import './TargetScoringSettingsPanel.css'

interface NumberFieldProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (
    value: number,
  ) => void
}

function NumberField({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
}: NumberFieldProps) {
  return (
    <label className="target-scoring-field">
      <span>{label}</span>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) =>
          onChange(
            Number(event.target.value),
          )
        }
      />
    </label>
  )
}

function TargetScoringSettingsPanel() {
  const [
    settings,
    setSettings,
  ] = useState(
    loadTargetScoringSettings,
  )

  const [
    expanded,
    setExpanded,
  ] = useState(false)

  const [
    saved,
    setSaved,
  ] = useState(false)

  const update = (
    key: keyof TargetScoringSettings,
    value: number,
  ) => {
    setSettings(
      (current) => ({
        ...current,
        [key]: value,
      }),
    )
  }

  const save = () => {
    saveTargetScoringSettings(settings)
    setSaved(true)

    window.setTimeout(
      () => setSaved(false),
      1600,
    )
  }

  const reset = () => {
    setSettings(
      resetTargetScoringSettings(),
    )
  }

  return (
    <section className="target-scoring-settings">
      <div className="target-scoring-settings-header">
        <div>
          <span>Target Scoring</span>
          <strong>Configure score weights</strong>
          <small>
            Score starts at 50 and is clamped between 0 and 100.
          </small>
        </div>

        <button
          type="button"
          onClick={() =>
            setExpanded(
              (value) => !value,
            )
          }
        >
          {expanded
            ? 'Hide Settings'
            : 'Configure'}
        </button>
      </div>

      {expanded && (
        <div className="target-scoring-settings-body">
          <div className="target-scoring-settings-section">
            <strong>Tags</strong>

            <div className="target-scoring-settings-grid">
              <NumberField
                label="Priority bonus"
                value={settings.priorityTagBonus}
                onChange={(value) =>
                  update('priorityTagBonus', value)
                }
              />
              <NumberField
                label="Target bonus"
                value={settings.targetTagBonus}
                onChange={(value) =>
                  update('targetTagBonus', value)
                }
              />
              <NumberField
                label="Noble Target bonus"
                value={settings.nobleTargetTagBonus}
                onChange={(value) =>
                  update('nobleTargetTagBonus', value)
                }
              />
              <NumberField
                label="Farm bonus"
                value={settings.farmTagBonus}
                onChange={(value) =>
                  update('farmTagBonus', value)
                }
              />
              <NumberField
                label="Avoid penalty"
                value={settings.avoidTagPenalty}
                onChange={(value) =>
                  update('avoidTagPenalty', value)
                }
              />
              <NumberField
                label="Strong Defense penalty"
                value={settings.strongDefenseTagPenalty}
                onChange={(value) =>
                  update('strongDefenseTagPenalty', value)
                }
              />
            </div>
          </div>

          <div className="target-scoring-settings-section">
            <strong>Intel & defense</strong>

            <div className="target-scoring-settings-grid">
              <NumberField
                label="Fresh spy bonus"
                value={settings.freshSpyBonus}
                onChange={(value) =>
                  update('freshSpyBonus', value)
                }
              />
              <NumberField
                label="Recent spy bonus"
                value={settings.recentSpyBonus}
                onChange={(value) =>
                  update('recentSpyBonus', value)
                }
              />
              <NumberField
                label="Stale intel penalty"
                value={settings.staleIntelPenalty}
                onChange={(value) =>
                  update('staleIntelPenalty', value)
                }
              />
              <NumberField
                label="Defense decrease bonus"
                value={settings.defenseDecreaseBonus}
                onChange={(value) =>
                  update('defenseDecreaseBonus', value)
                }
              />
              <NumberField
                label="Defense increase penalty"
                value={settings.defenseIncreasePenalty}
                onChange={(value) =>
                  update('defenseIncreasePenalty', value)
                }
              />
              <NumberField
                label="Preferred max defense"
                value={settings.preferredMaxDefense}
                max={500000}
                step={100}
                onChange={(value) =>
                  update('preferredMaxDefense', value)
                }
              />
            </div>
          </div>

          <div className="target-scoring-settings-section">
            <strong>Wall</strong>

            <div className="target-scoring-settings-grid">
              <NumberField
                label="Low wall bonus"
                value={settings.lowWallBonus}
                onChange={(value) =>
                  update('lowWallBonus', value)
                }
              />
              <NumberField
                label="Low wall level"
                value={settings.lowWallLevel}
                max={20}
                onChange={(value) =>
                  update('lowWallLevel', value)
                }
              />
              <NumberField
                label="High wall penalty"
                value={settings.highWallPenalty}
                onChange={(value) =>
                  update('highWallPenalty', value)
                }
              />
              <NumberField
                label="High wall level"
                value={settings.highWallLevel}
                max={20}
                onChange={(value) =>
                  update('highWallLevel', value)
                }
              />
            </div>
          </div>

          <div className="target-scoring-settings-actions">
            <button
              type="button"
              className="primary"
              onClick={save}
            >
              {saved
                ? 'Saved ✓'
                : 'Save Scoring'}
            </button>

            <button
              type="button"
              onClick={reset}
            >
              Reset Defaults
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default TargetScoringSettingsPanel
