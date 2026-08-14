import {
  buildings,
  getBuilding,
} from '../../data/buildings'

import type {
  SiegeSettings,
} from '../../types/Battle'

import type {
  BuildingId,
} from '../../types/Building'

import './SiegeSettingsPanel.css'

interface SiegeSettingsPanelProps {
  settings: SiegeSettings
  wallLevel: number

  onChange: (
    settings: SiegeSettings,
  ) => void
}

function SiegeSettingsPanel({
  settings,
  wallLevel,
  onChange,
}: SiegeSettingsPanelProps) {
  const selectedBuilding =
    getBuilding(
      settings.catapultTarget,
    )

  const effectiveLevel =
    settings.catapultTarget ===
    'wall'
      ? wallLevel
      : settings.catapultTargetLevel

  const updateTarget = (
    target: BuildingId,
  ) => {
    const building =
      getBuilding(target)

    const nextLevel =
      target === 'wall'
        ? wallLevel
        : Math.min(
            settings.catapultTargetLevel,
            building.maxLevel,
          )

    onChange({
      catapultTarget: target,
      catapultTargetLevel:
        nextLevel,
    })
  }

  const updateLevel = (
    level: number,
  ) => {
    onChange({
      ...settings,

      catapultTargetLevel:
        Math.min(
          selectedBuilding.maxLevel,
          Math.max(
            0,
            level,
          ),
        ),
    })
  }

  return (
    <section className="siege-settings-card">
      <div className="settings-title">
        <div>
          <span className="section-label">
            SIEGE
          </span>

          <h3>
            Siege settings
          </h3>

          <p>
            Configure the building
            targeted by catapults.
            Rams automatically attack
            the wall.
          </p>
        </div>
      </div>

      <div className="siege-settings-content">
        <div className="siege-setting-field">
          <label htmlFor="catapult-target">
            Catapult target
          </label>

          <select
            id="catapult-target"
            value={
              settings.catapultTarget
            }
            onChange={(event) =>
              updateTarget(
                event.target
                  .value as BuildingId,
              )
            }
          >
            {buildings.map(
              (building) => (
                <option
                  key={building.id}
                  value={building.id}
                >
                  {building.name}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="siege-setting-field">
          <label htmlFor="catapult-level">
            Starting level
          </label>

          <select
            id="catapult-level"
            value={effectiveLevel}
            disabled={
              settings.catapultTarget ===
              'wall'
            }
            onChange={(event) =>
              updateLevel(
                Number(
                  event.target.value,
                ),
              )
            }
          >
            {Array.from(
              {
                length:
                  selectedBuilding.maxLevel +
                  1,
              },
              (_, level) => (
                <option
                  value={level}
                  key={level}
                >
                  Level {level}
                </option>
              ),
            )}
          </select>

          {settings.catapultTarget ===
            'wall' && (
            <span className="siege-field-help">
              Wall level is calculated
              automatically after the
              Ram assault.
            </span>
          )}
        </div>

        <div className="siege-info">
          <div>
            <span>
              Ram target
            </span>

            <strong>
              Wall
            </strong>
          </div>

          <div>
            <span>
              Catapult target
            </span>

            <strong>
              {selectedBuilding.name}
            </strong>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SiegeSettingsPanel