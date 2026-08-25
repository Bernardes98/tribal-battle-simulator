import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { units } from '../../data/units'

import {
  createArmyPreset,
  deleteArmyPreset,
  listArmyPresets,
} from '../../services/armyPresetApi'

import type {
  ArmyPresetItem,
  ArmyPresetType,
} from '../../services/armyPresetApi'

import type {
  Army,
} from '../../types/Battle'

import type {
  ReportMetadata,
  ReportPartyMetadata,
} from '../../types/ReportMetadata'

import './ArmyLibraryPanel.css'

interface ArmyLibraryPanelProps {
  attacker: Army
  defender: Army
  reportMetadata?: ReportMetadata | null
  onApplyAttacker: (
    army: Army,
  ) => void
  onApplyDefender: (
    army: Army,
  ) => void
}

const numberFormatter =
  new Intl.NumberFormat(
    'en-US',
  )

const getArmyTotal = (
  army: Army,
): number => {
  return units.reduce(
    (total, unit) =>
      total +
      (army[unit.id] ?? 0),
    0,
  )
}

const getArmyProvisions = (
  army: Army,
): number => {
  return units.reduce(
    (total, unit) =>
      total +
      (army[unit.id] ?? 0) *
        unit.provisions,
    0,
  )
}

const getArmySummary = (
  army: Army,
): string => {
  const active = units
    .filter(
      (unit) =>
        (army[unit.id] ?? 0) > 0,
    )
    .map(
      (unit) =>
        `${numberFormatter.format(
          army[unit.id] ?? 0,
        )} ${unit.name}`,
    )

  if (active.length === 0) {
    return 'Empty army'
  }

  if (active.length <= 3) {
    return active.join(' · ')
  }

  return `${active
    .slice(0, 3)
    .join(' · ')} · +${
    active.length - 3
  } more`
}

const formatPresetContext = (
  context: ReportPartyMetadata | null | undefined,
): string | null => {
  if (!context) {
    return null
  }

  const identity = [
    context.playerName,
    context.villageName,
  ]
    .filter(Boolean)
    .join(' · ')

  const coordinates =
    context.coordinates
      ? `(${context.coordinates.x}|${context.coordinates.y})`
      : ''

  return [
    identity,
    coordinates,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || null
}

function ArmyLibraryPanel({
  attacker,
  defender,
  reportMetadata,
  onApplyAttacker,
  onApplyDefender,
}: ArmyLibraryPanelProps) {
  const [
    presets,
    setPresets,
  ] = useState<ArmyPresetItem[]>([])

  const [
    name,
    setName,
  ] = useState('')

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    savingType,
    setSavingType,
  ] = useState<ArmyPresetType | null>(
    null,
  )

  const [
    deletingId,
    setDeletingId,
  ] = useState<string | null>(
    null,
  )

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  )

  const [
    message,
    setMessage,
  ] = useState<string | null>(
    null,
  )

  const attackerPresets =
    useMemo(
      () =>
        presets.filter(
          (preset) =>
            preset.type ===
            'ATTACKER',
        ),
      [presets],
    )

  const defenderPresets =
    useMemo(
      () =>
        presets.filter(
          (preset) =>
            preset.type ===
            'DEFENDER',
        ),
      [presets],
    )

  const loadPresets = async () => {
    try {
      setLoading(true)
      setError(null)

      setPresets(
        await listArmyPresets(),
      )
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load army presets.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPresets()
  }, [])

  const handleSave = async (
    type: ArmyPresetType,
  ) => {
    const normalizedName =
      name.trim()

    if (!normalizedName) {
      setError(
        'Enter a name before saving the army.',
      )
      return
    }

    try {
      setSavingType(type)
      setError(null)
      setMessage(null)

      const created =
        await createArmyPreset(
          normalizedName,
          type,
          type === 'ATTACKER'
            ? attacker
            : defender,
          type === 'ATTACKER'
            ? reportMetadata?.attacker ?? null
            : reportMetadata?.defender ?? null,
        )

      setPresets(
        (current) => [
          created,
          ...current,
        ],
      )

      setName('')
      setMessage(
        `${created.name} saved to the ${
          type === 'ATTACKER'
            ? 'attacker'
            : 'defender'
        } library.`,
      )
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save army preset.',
      )
    } finally {
      setSavingType(null)
    }
  }

  const handleDelete = async (
    preset: ArmyPresetItem,
  ) => {
    try {
      setDeletingId(
        preset.id,
      )
      setError(null)
      setMessage(null)

      await deleteArmyPreset(
        preset.id,
      )

      setPresets(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              preset.id,
          ),
      )

      setMessage(
        `${preset.name} deleted.`,
      )
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not delete army preset.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  const renderPreset = (
    preset: ArmyPresetItem,
  ) => {
    const total =
      getArmyTotal(
        preset.army,
      )

    const provisions =
      getArmyProvisions(
        preset.army,
      )

    return (
      <article
        className="army-library-preset"
        key={preset.id}
      >
        <div className="army-library-preset-top">
          <div>
            <strong>
              {preset.name}
            </strong>

            <p>
              {getArmySummary(
                preset.army,
              )}
            </p>

            {formatPresetContext(
              preset.context,
            ) && (
              <small className="army-library-context">
                {formatPresetContext(
                  preset.context,
                )}
              </small>
            )}
          </div>

          <span className="army-library-type-badge">
            {preset.type ===
            'ATTACKER'
              ? 'Attack'
              : 'Defense'}
          </span>
        </div>

        <div className="army-library-stats">
          <span>
            <small>
              Troops
            </small>

            <strong>
              {numberFormatter.format(
                total,
              )}
            </strong>
          </span>

          <span>
            <small>
              Provisions
            </small>

            <strong>
              {numberFormatter.format(
                provisions,
              )}
            </strong>
          </span>
        </div>

        <div className="army-library-actions">
          <button
            type="button"
            className="army-library-apply"
            onClick={() => {
              if (
                preset.type ===
                'ATTACKER'
              ) {
                onApplyAttacker(
                  preset.army,
                )
              } else {
                onApplyDefender(
                  preset.army,
                )
              }

              setMessage(
                `${preset.name} applied to the ${
                  preset.type ===
                  'ATTACKER'
                    ? 'attacker'
                    : 'defender'
                }.`,
              )
            }}
          >
            Apply
          </button>

          <button
            type="button"
            className="army-library-delete"
            disabled={
              deletingId ===
              preset.id
            }
            onClick={() => {
              void handleDelete(
                preset,
              )
            }}
          >
            {deletingId ===
            preset.id
              ? 'Deleting...'
              : 'Delete'}
          </button>
        </div>
      </article>
    )
  }

  return (
    <section
      className="army-library-card"
      id="army-library"
    >
      <div className="army-library-header">
        <div>
          <span className="army-library-kicker">
            Army Presets
          </span>

          <h3>
            Attack & Defense Library
          </h3>

          <p>
            Save useful army compositions in PostgreSQL and reuse them with one click.
          </p>
        </div>

        <div className="army-library-counter">
          <strong>
            {presets.length}
          </strong>

          <span>
            Saved armies
          </span>
        </div>
      </div>

      <div className="army-library-save">
        <label
          htmlFor="army-library-name"
        >
          Preset name
        </label>

        <div className="army-library-save-row">
          <input
            id="army-library-name"
            type="text"
            maxLength={80}
            placeholder="Example: Off Axe, Nuke LC, Spear/Sword Defense"
            value={name}
            onChange={(event) => {
              setName(
                event.target.value,
              )
            }}
            onKeyDown={(event) => {
              if (
                event.key ===
                'Enter'
              ) {
                event.preventDefault()
                void handleSave(
                  'ATTACKER',
                )
              }
            }}
          />

          <button
            type="button"
            disabled={
              savingType !== null
            }
            onClick={() => {
              void handleSave(
                'ATTACKER',
              )
            }}
          >
            {savingType ===
            'ATTACKER'
              ? 'Saving...'
              : 'Save Attacker'}
          </button>

          <button
            type="button"
            disabled={
              savingType !== null
            }
            onClick={() => {
              void handleSave(
                'DEFENDER',
              )
            }}
          >
            {savingType ===
            'DEFENDER'
              ? 'Saving...'
              : 'Save Defender'}
          </button>
        </div>
      </div>

      {error && (
        <div className="army-library-feedback army-library-error">
          {error}
        </div>
      )}

      {message && (
        <div className="army-library-feedback army-library-success">
          {message}
        </div>
      )}

      {loading ? (
        <div className="army-library-empty">
          Loading army library...
        </div>
      ) : (
        <div className="army-library-columns">
          <div className="army-library-column">
            <div className="army-library-column-title">
              <div>
                <span>
                  Offensive
                </span>

                <h4>
                  Attacker Presets
                </h4>
              </div>

              <strong>
                {attackerPresets.length}
              </strong>
            </div>

            <div className="army-library-list">
              {attackerPresets.length >
              0 ? (
                attackerPresets.map(
                  renderPreset,
                )
              ) : (
                <div className="army-library-empty">
                  Save your current attacker to build an offensive library.
                </div>
              )}
            </div>
          </div>

          <div className="army-library-column">
            <div className="army-library-column-title">
              <div>
                <span>
                  Defensive
                </span>

                <h4>
                  Defender Presets
                </h4>
              </div>

              <strong>
                {defenderPresets.length}
              </strong>
            </div>

            <div className="army-library-list">
              {defenderPresets.length >
              0 ? (
                defenderPresets.map(
                  renderPreset,
                )
              ) : (
                <div className="army-library-empty">
                  Save your current defender to build a defensive library.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default ArmyLibraryPanel
