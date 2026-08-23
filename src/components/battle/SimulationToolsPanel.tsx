import {
  useEffect,
  useState,
} from 'react'

import {
  copyTextToClipboard,
  createShortShareUrl,
} from '../../domain/simulation/simulationShare'

import {
  deleteSimulationPreset,
  getSimulationPresets,
  saveSimulationPreset,
} from '../../domain/simulation/simulationPresets'

import type {
  SimulationPreset,
} from '../../domain/simulation/simulationPresets'

import {
  createSharedSimulation,
} from '../../services/sharedSimulationApi'

import type {
  BattleSimulationInput,
} from '../../types/Battle'

import './SimulationToolsPanel.css'

interface SimulationToolsPanelProps {
  input: BattleSimulationInput

  onLoad: (
    input: BattleSimulationInput,
  ) => void
}

type FeedbackType =
  | 'success'
  | 'error'

interface Feedback {
  type: FeedbackType
  message: string
}

interface CreatedShare {
  code: string
  url: string
}

const formatDate = (
  value: string,
): string => {
  const date = new Date(value)

  return new Intl.DateTimeFormat(
    'en-US',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(date)
}

function SimulationToolsPanel({
  input,
  onLoad,
}: SimulationToolsPanelProps) {
  const [
    presetName,
    setPresetName,
  ] = useState('')

  const [
    presets,
    setPresets,
  ] = useState<SimulationPreset[]>([])

  const [
    feedback,
    setFeedback,
  ] = useState<Feedback | null>(null)

  const [
    isSharing,
    setIsSharing,
  ] = useState(false)

  const [
    createdShare,
    setCreatedShare,
  ] = useState<CreatedShare | null>(null)

  useEffect(() => {
    setPresets(
      getSimulationPresets(),
    )
  }, [])

  const showFeedback = (
    type: FeedbackType,
    message: string,
  ) => {
    setFeedback({
      type,
      message,
    })

    window.setTimeout(
      () => {
        setFeedback(null)
      },
      3000,
    )
  }

  const handleSavePreset = () => {
    const name =
      presetName.trim()

    if (!name) {
      showFeedback(
        'error',
        'Enter a name for the preset.',
      )

      return
    }

    saveSimulationPreset(
      name,
      input,
    )

    setPresets(
      getSimulationPresets(),
    )

    setPresetName('')

    showFeedback(
      'success',
      'Preset saved successfully.',
    )
  }

  const handleDeletePreset = (
    presetId: string,
  ) => {
    deleteSimulationPreset(
      presetId,
    )

    setPresets(
      getSimulationPresets(),
    )

    showFeedback(
      'success',
      'Preset removed.',
    )
  }

  const handleLoadPreset = (
    preset: SimulationPreset,
  ) => {
    onLoad(
      preset.input,
    )

    showFeedback(
      'success',
      `Preset "${preset.name}" loaded.`,
    )
  }

  const handleCreateShare = async () => {
    if (isSharing) {
      return
    }

    try {
      setIsSharing(true)

      const code =
        await createSharedSimulation(
          input,
        )

      const url =
        createShortShareUrl(
          code,
        )

      setCreatedShare({
        code,
        url,
      })

      await copyTextToClipboard(
        url,
      )

      showFeedback(
        'success',
        `Share link ${code} created and copied.`,
      )
    } catch (error) {
      console.error(
        'Could not create shared simulation:',
        error,
      )

      showFeedback(
        'error',
        error instanceof Error
          ? error.message
          : 'Could not create the share link.',
      )
    } finally {
      setIsSharing(false)
    }
  }

  const handleCopyUrl = async () => {
    if (!createdShare) {
      return
    }

    try {
      await copyTextToClipboard(
        createdShare.url,
      )

      showFeedback(
        'success',
        'Share link copied.',
      )
    } catch {
      showFeedback(
        'error',
        'Could not copy the share link.',
      )
    }
  }

  const handleCopyCode = async () => {
    if (!createdShare) {
      return
    }

    try {
      await copyTextToClipboard(
        createdShare.code,
      )

      showFeedback(
        'success',
        'Simulation code copied.',
      )
    } catch {
      showFeedback(
        'error',
        'Could not copy the simulation code.',
      )
    }
  }

  const handleOpenShare = () => {
    if (!createdShare) {
      return
    }

    window.open(
      createdShare.url,
      '_blank',
      'noopener,noreferrer',
    )
  }

  const handleNativeShare = async () => {
    if (
      !createdShare ||
      !navigator.share
    ) {
      return
    }

    try {
      await navigator.share({
        title: 'Tribal Battle Simulation',
        text: `Battle simulation ${createdShare.code}`,
        url: createdShare.url,
      })
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        return
      }

      showFeedback(
        'error',
        'Could not open the share menu.',
      )
    }
  }

  return (
    <section
      className="simulation-tools-card"
      id="simulation-tools"
    >
      <div className="simulation-tools-header">
        <div>
          <span className="section-label">
            BATTLE LIBRARY
          </span>

          <h3>
            Save & Share
          </h3>

          <p>
            Keep useful battle setups in this browser or generate a short link that can be opened on another device.
          </p>
        </div>

        <div className="simulation-tools-badge">
          SHARE
        </div>
      </div>

      {feedback && (
        <div
          className={`simulation-feedback ${
            feedback.type === 'success'
              ? 'simulation-feedback-success'
              : 'simulation-feedback-error'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="simulation-tools-content">
        <div className="simulation-presets-section">
          <div className="simulation-tools-section-title">
            <div>
              <span className="simulation-tools-kicker">
                LOCAL
              </span>

              <h4>
                Battle Presets
              </h4>

              <p>
                Save configurations for repeated tests without creating a public share code.
              </p>
            </div>

            <span className="preset-count">
              {presets.length} saved
            </span>
          </div>

          <div className="preset-create-row">
            <input
              type="text"
              value={presetName}
              maxLength={60}
              placeholder="Example: Full Off vs Heavy Cavalry"
              aria-label="Preset name"
              onChange={(event) =>
                setPresetName(
                  event.target.value,
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter'
                ) {
                  handleSavePreset()
                }
              }}
            />

            <button
              className="save-preset-button"
              type="button"
              onClick={handleSavePreset}
            >
              Save Preset
            </button>
          </div>

          {presets.length === 0 ? (
            <div className="preset-empty-state">
              <strong>
                No presets yet
              </strong>

              <span>
                Configure a battle and save it here for quick access later.
              </span>
            </div>
          ) : (
            <div className="preset-list">
              {presets.map(
                (preset) => (
                  <div
                    className="preset-item"
                    key={preset.id}
                  >
                    <div className="preset-info">
                      <strong>
                        {preset.name}
                      </strong>

                      <span>
                        {formatDate(
                          preset.createdAt,
                        )}
                      </span>
                    </div>

                    <div className="preset-actions">
                      <button
                        className="preset-load-button"
                        type="button"
                        onClick={() =>
                          handleLoadPreset(
                            preset,
                          )
                        }
                      >
                        Load
                      </button>

                      <button
                        className="preset-delete-button"
                        type="button"
                        onClick={() =>
                          handleDeletePreset(
                            preset.id,
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        <div className="simulation-share-section">
          <div className="simulation-tools-section-title">
            <div>
              <span className="simulation-tools-kicker">
                API
              </span>

              <h4>
                Share Battle
              </h4>

              <p>
                Store the current setup in the API and get a compact code instead of a huge URL.
              </p>
            </div>
          </div>

          {!createdShare ? (
            <div className="share-create-state">
              <div className="share-preview">
                <div className="share-icon" aria-hidden="true">
                  ↗
                </div>

                <div>
                  <strong>
                    Short battle link
                  </strong>

                  <span>
                    Armies, modifiers, Paladin weapons and siege settings are saved together.
                  </span>
                </div>
              </div>

              <div className="share-example">
                <span>
                  Example
                </span>

                <code>
                  ?s=K8QD3A7X
                </code>
              </div>

              <button
                className="share-battle-button"
                type="button"
                disabled={isSharing}
                onClick={handleCreateShare}
              >
                {isSharing
                  ? 'Creating Link...'
                  : 'Create & Copy Share Link'}
              </button>
            </div>
          ) : (
            <div className="share-created-state">
              <div className="share-success-heading">
                <span className="share-success-mark" aria-hidden="true">
                  ✓
                </span>

                <div>
                  <strong>
                    Battle link ready
                  </strong>

                  <span>
                    Anyone with this link can load this exact configuration.
                  </span>
                </div>
              </div>

              <div className="share-code-card">
                <span className="share-code-label">
                  SIMULATION CODE
                </span>

                <button
                  type="button"
                  className="share-code-value"
                  title="Copy simulation code"
                  onClick={handleCopyCode}
                >
                  {createdShare.code}
                </button>
              </div>

              <label className="share-url-field">
                <span>
                  Share URL
                </span>

                <input
                  type="text"
                  readOnly
                  value={createdShare.url}
                  onFocus={(event) =>
                    event.currentTarget.select()
                  }
                />
              </label>

              <div className="share-action-grid">
                <button
                  type="button"
                  className="share-action-primary"
                  onClick={handleCopyUrl}
                >
                  Copy Link
                </button>

                <button
                  type="button"
                  className="share-action-secondary"
                  onClick={handleOpenShare}
                >
                  Open Link
                </button>

                {typeof navigator.share === 'function' && (
                  <button
                    type="button"
                    className="share-action-secondary"
                    onClick={handleNativeShare}
                  >
                    Share...
                  </button>
                )}
              </div>

              <button
                type="button"
                className="share-create-another"
                disabled={isSharing}
                onClick={handleCreateShare}
              >
                {isSharing
                  ? 'Creating...'
                  : 'Generate New Link for Current Battle'}
              </button>
            </div>
          )}

          <div className="share-note">
            <strong>
              How it works
            </strong>

            <p>
              The URL only carries the short code. The complete configuration is retrieved from the Tribal Battle API when the link is opened.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SimulationToolsPanel
