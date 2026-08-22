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
  input:
    BattleSimulationInput

  onLoad: (
    input:
      BattleSimulationInput,
  ) => void
}

type FeedbackType =
  | 'success'
  | 'error'

interface Feedback {
  type: FeedbackType
  message: string
}

const formatDate = (
  value: string,
): string => {
  const date =
    new Date(value)

  return new Intl.DateTimeFormat(
    'en-US',
    {
      dateStyle:
        'medium',

      timeStyle:
        'short',
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
  ] =
    useState('')

  const [
    presets,
    setPresets,
  ] =
    useState<
      SimulationPreset[]
    >([])

  const [
    feedback,
    setFeedback,
  ] =
    useState<Feedback | null>(
      null,
    )

  const [
    isSharing,
    setIsSharing,
  ] =
    useState(false)

  useEffect(() => {
    setPresets(
      getSimulationPresets(),
    )
  }, [])

  const showFeedback = (
    type:
      FeedbackType,

    message:
      string,
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

  const handleSavePreset =
    () => {
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

  const handleDeletePreset =
    (
      presetId:
        string,
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

  const handleLoadPreset =
    (
      preset:
        SimulationPreset,
    ) => {
      onLoad(
        preset.input,
      )

      showFeedback(
        'success',

        `Preset "${preset.name}" loaded.`,
      )
    }

  const handleShare =
    async () => {
      if (isSharing) {
        return
      }

      try {
        setIsSharing(true)

        /*
         * 1. Envia toda a configuração
         *    para o Spring Boot.
         *
         * 2. Backend salva no
         *    PostgreSQL.
         *
         * 3. Recebemos apenas um
         *    código curto.
         */
        const code =
          await createSharedSimulation(
            input,
          )

        /*
         * Exemplo:
         *
         * http://localhost:5173/?s=K8QD3A7X
         */
        const url =
          createShortShareUrl(
            code,
          )

        await copyTextToClipboard(
          url,
        )

        showFeedback(
          'success',

          `Share link ${code} copied to clipboard.`,
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
            Save battle presets in
            your browser or generate
            a short shareable link
            stored by the Tribal Battle
            API.
          </p>
        </div>

        <div className="simulation-tools-badge">
          SHARE
        </div>
      </div>

      {feedback && (
        <div
          className={`simulation-feedback ${
            feedback.type ===
            'success'
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
              <h4>
                Battle Presets
              </h4>

              <p>
                Presets are saved in
                this browser using
                local storage.
              </p>
            </div>

            <span>
              {presets.length}{' '}
              saved
            </span>
          </div>

          <div className="preset-create-row">
            <input
              type="text"
              value={
                presetName
              }
              maxLength={60}
              placeholder="Example: Full Off vs HC Defense"
              onChange={(
                event,
              ) =>
                setPresetName(
                  event.target
                    .value,
                )
              }
              onKeyDown={(
                event,
              ) => {
                if (
                  event.key ===
                  'Enter'
                ) {
                  handleSavePreset()
                }
              }}
            />

            <button
              className="save-preset-button"
              type="button"
              onClick={
                handleSavePreset
              }
            >
              Save Preset
            </button>
          </div>

          {presets.length ===
          0 ? (
            <div className="preset-empty-state">
              <strong>
                No presets yet
              </strong>

              <span>
                Configure a battle and
                save it here for quick
                access later.
              </span>
            </div>
          ) : (
            <div className="preset-list">
              {presets.map(
                (preset) => (
                  <div
                    className="preset-item"
                    key={
                      preset.id
                    }
                  >
                    <div className="preset-info">
                      <strong>
                        {
                          preset.name
                        }
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
              <h4>
                Share Battle
              </h4>

              <p>
                Create a short link
                containing a reference
                to this complete battle
                configuration.
              </p>
            </div>
          </div>

          <div className="share-preview">
            <div className="share-icon">
              ↗
            </div>

            <div>
              <strong>
                Short share link
              </strong>

              <span>
                Armies, modifiers,
                Paladin weapons and
                siege settings are
                stored by the API.
              </span>
            </div>
          </div>

          <button
            className="share-battle-button"
            type="button"
            disabled={
              isSharing
            }
            onClick={
              handleShare
            }
          >
            {isSharing
              ? 'Creating Link...'
              : 'Copy Share Link'}
          </button>

          <div className="share-note">
            <strong>
              Short URL
            </strong>

            <p>
              The battle configuration
              is stored by the API and
              shared using a short
              simulation code instead
              of placing the entire
              battle inside the URL.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SimulationToolsPanel