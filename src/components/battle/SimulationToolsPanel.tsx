import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  copyTextToClipboard,
} from '../../domain/simulation/simulationShare'

import {
  createAdvancedShareText,
  createAdvancedShareUrl,
  presentationLabel,
} from '../../domain/simulation/advancedSimulationShare'

import type {
  SharedSimulationPresentation,
} from '../../domain/simulation/advancedSimulationShare'

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
  BattleResult,
  BattleSimulationInput,
} from '../../types/Battle'

import './SimulationToolsPanel.css'

interface SimulationToolsPanelProps {
  input: BattleSimulationInput
  result: BattleResult | null

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
}

const formatDate = (
  value: string,
): string => {
  const date =
    new Date(
      value,
    )

  return new Intl.DateTimeFormat(
    'en-US',
    {
      dateStyle:
        'medium',
      timeStyle:
        'short',
    },
  ).format(
    date,
  )
}

const resultTitle = (
  result:
    BattleResult | null,
): string => {
  if (
    !result
  ) {
    return 'Not simulated yet'
  }

  if (
    result.winner ===
    'attacker'
  ) {
    return 'Attacker Victory'
  }

  if (
    result.winner ===
    'defender'
  ) {
    return 'Defender Victory'
  }

  return 'Draw'
}

const percentage = (
  surviving: number,
  initial: number,
): number => {
  if (
    initial <=
    0
  ) {
    return 0
  }

  return Math.max(
    0,
    Math.min(
      100,
      (
        (
          initial -
          surviving
        ) /
        initial
      ) *
        100,
    ),
  )
}

function SimulationToolsPanel({
  input,
  result,
  onLoad,
}: SimulationToolsPanelProps) {
  const [
    presetName,
    setPresetName,
  ] = useState('')

  const [
    presets,
    setPresets,
  ] = useState<
    SimulationPreset[]
  >([])

  const [
    feedback,
    setFeedback,
  ] = useState<
    Feedback | null
  >(null)

  const [
    isSharing,
    setIsSharing,
  ] = useState(false)

  const [
    createdShare,
    setCreatedShare,
  ] = useState<
    CreatedShare | null
  >(null)

  const [
    presentation,
    setPresentation,
  ] = useState<
    SharedSimulationPresentation
  >('setup')

  useEffect(
    () => {
      setPresets(
        getSimulationPresets(),
      )
    },
    [],
  )

  const shareUrl =
    useMemo(
      () =>
        createdShare
          ? createAdvancedShareUrl(
              createdShare.code,
              presentation,
            )
          : null,
      [
        createdShare,
        presentation,
      ],
    )

  const shareMessage =
    useMemo(
      () => {
        if (
          !createdShare ||
          !shareUrl
        ) {
          return ''
        }

        return createAdvancedShareText(
          createdShare.code,
          shareUrl,
          presentation,
          result,
        )
      },
      [
        createdShare,
        shareUrl,
        presentation,
        result,
      ],
    )

  const showFeedback =
    (
      type:
        FeedbackType,
      message: string,
    ) => {
      setFeedback({
        type,
        message,
      })

      window.setTimeout(
        () => {
          setFeedback(
            null,
          )
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

      setPresetName(
        '',
      )

      showFeedback(
        'success',
        'Preset saved successfully.',
      )
    }

  const handleDeletePreset =
    (
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

  const handleCreateShare =
    async () => {
      if (
        isSharing
      ) {
        return
      }

      try {
        setIsSharing(
          true,
        )

        const code =
          await createSharedSimulation(
            input,
          )

        const url =
          createAdvancedShareUrl(
            code,
            presentation,
          )

        setCreatedShare({
          code,
        })

        await copyTextToClipboard(
          url,
        )

        showFeedback(
          'success',
          `${presentationLabel(presentation)} link ${code} created and copied.`,
        )
      } catch (
        error
      ) {
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
        setIsSharing(
          false,
        )
      }
    }

  const handleCopyUrl =
    async () => {
      if (
        !shareUrl
      ) {
        return
      }

      try {
        await copyTextToClipboard(
          shareUrl,
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

  const handleCopyCode =
    async () => {
      if (
        !createdShare
      ) {
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

  const handleCopyMessage =
    async () => {
      if (
        !shareMessage
      ) {
        return
      }

      try {
        await copyTextToClipboard(
          shareMessage,
        )

        showFeedback(
          'success',
          'Battle share message copied.',
        )
      } catch {
        showFeedback(
          'error',
          'Could not copy the battle share message.',
        )
      }
    }

  const handleOpenShare =
    () => {
      if (
        !shareUrl
      ) {
        return
      }

      window.open(
        shareUrl,
        '_blank',
        'noopener,noreferrer',
      )
    }

  const handleNativeShare =
    async () => {
      if (
        !createdShare ||
        !shareUrl ||
        !navigator.share
      ) {
        return
      }

      try {
        await navigator.share({
          title:
            presentationLabel(
              presentation,
            ),
          text:
            shareMessage,
          url:
            shareUrl,
        })
      } catch (
        error
      ) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            'AbortError'
        ) {
          return
        }

        showFeedback(
          'error',
          'Could not open the share menu.',
        )
      }
    }

  const attackerLoss =
    result
      ? percentage(
          result.attacker
            .survivingProvisions,
          result.attacker
            .initialProvisions,
        )
      : null

  const defenderLoss =
    result
      ? percentage(
          result.defender
            .survivingProvisions,
          result.defender
            .initialProvisions,
        )
      : null

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
            Keep useful battle setups in this browser or create a share link that opens the setup or the simulated battle result directly.
          </p>
        </div>

        <div className="simulation-tools-badge">
          SHARE V48
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
          {
            feedback.message
          }
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
              {
                presets.length
              }{' '}
              saved
            </span>
          </div>

          <div className="preset-create-row">
            <input
              type="text"
              value={
                presetName
              }
              maxLength={
                60
              }
              placeholder="Example: Full Off vs Heavy Cavalry"
              aria-label="Preset name"
              onChange={(
                event,
              ) =>
                setPresetName(
                  event
                    .target
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
                Configure a battle and save it here for quick access later.
              </span>
            </div>
          ) : (
            <div className="preset-list">
              {presets.map(
                (
                  preset,
                ) => (
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
              <span className="simulation-tools-kicker">
                ADVANCED SHARE
              </span>

              <h4>
                Share Battle
              </h4>

              <p>
                The same short simulation code can now open either the editable setup or a ready-to-view battle report.
              </p>
            </div>
          </div>

          <div className="advanced-share-presentation">
            <span>
              Shared View
            </span>

            <div>
              <button
                type="button"
                className={
                  presentation ===
                  'setup'
                    ? 'active'
                    : undefined
                }
                onClick={() =>
                  setPresentation(
                    'setup',
                  )
                }
              >
                <strong>
                  Setup
                </strong>

                <small>
                  Load configuration only
                </small>
              </button>

              <button
                type="button"
                className={
                  presentation ===
                  'result-summary'
                    ? 'active'
                    : undefined
                }
                onClick={() =>
                  setPresentation(
                    'result-summary',
                  )
                }
              >
                <strong>
                  Result
                </strong>

                <small>
                  Open battle report
                </small>
              </button>

              <button
                type="button"
                className={
                  presentation ===
                  'result-full'
                    ? 'active'
                    : undefined
                }
                onClick={() =>
                  setPresentation(
                    'result-full',
                  )
                }
              >
                <strong>
                  Full Report
                </strong>

                <small>
                  Open army composition
                </small>
              </button>
            </div>
          </div>

          {presentation !==
            'setup' && (
            <div className="advanced-share-result-preview">
              <div>
                <span>
                  Shared Result Preview
                </span>

                <strong>
                  {resultTitle(
                    result,
                  )}
                </strong>
              </div>

              {result ? (
                <dl>
                  <div>
                    <dt>
                      Attack
                    </dt>

                    <dd>
                      {Math.round(
                        result.attackStrength,
                      ).toLocaleString()}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Defense
                    </dt>

                    <dd>
                      {Math.round(
                        result.defenseStrength,
                      ).toLocaleString()}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Attacker Loss
                    </dt>

                    <dd>
                      {attackerLoss?.toFixed(
                        1,
                      )}
                      %
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Defender Loss
                    </dt>

                    <dd>
                      {defenderLoss?.toFixed(
                        1,
                      )}
                      %
                    </dd>
                  </div>
                </dl>
              ) : (
                <p>
                  No local result yet. The receiver will automatically run the shared setup through the battle engine when opening this result link.
                </p>
              )}
            </div>
          )}

          {!createdShare ? (
            <div className="share-create-state">
              <div className="share-preview">
                <div
                  className="share-icon"
                  aria-hidden="true"
                >
                  ↗
                </div>

                <div>
                  <strong>
                    {presentationLabel(
                      presentation,
                    )}
                  </strong>

                  <span>
                    {presentation ===
                    'setup'
                      ? 'Armies, modifiers, Paladin weapons and siege settings are loaded for editing.'
                      : 'The shared setup is loaded, simulated automatically and the receiver is taken directly to the battle result.'}
                  </span>
                </div>
              </div>

              <div className="share-example">
                <span>
                  Example
                </span>

                <code>
                  {presentation ===
                  'setup'
                    ? '?s=K8QD3A7X'
                    : presentation ===
                        'result-full'
                      ? '?s=K8QD3A7X&view=result&report=full'
                      : '?s=K8QD3A7X&view=result&report=summary'}
                </code>
              </div>

              <button
                className="share-battle-button"
                type="button"
                disabled={
                  isSharing
                }
                onClick={
                  handleCreateShare
                }
              >
                {isSharing
                  ? 'Creating Link...'
                  : `Create & Copy ${presentationLabel(presentation)} Link`}
              </button>
            </div>
          ) : (
            <div className="share-created-state">
              <div className="share-success-heading">
                <span
                  className="share-success-mark"
                  aria-hidden="true"
                >
                  ✓
                </span>

                <div>
                  <strong>
                    {
                      presentationLabel(
                        presentation,
                      )
                    }{' '}
                    link ready
                  </strong>

                  <span>
                    Switch Shared View above without creating a new API simulation code.
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
                  onClick={
                    handleCopyCode
                  }
                >
                  {
                    createdShare.code
                  }
                </button>
              </div>

              <label className="share-url-field">
                <span>
                  Share URL
                </span>

                <input
                  type="text"
                  readOnly
                  value={
                    shareUrl ??
                    ''
                  }
                  onFocus={(
                    event,
                  ) =>
                    event.currentTarget.select()
                  }
                />
              </label>

              <div className="share-action-grid advanced">
                <button
                  type="button"
                  className="share-action-primary"
                  onClick={
                    handleCopyUrl
                  }
                >
                  Copy Link
                </button>

                <button
                  type="button"
                  className="share-action-secondary"
                  onClick={
                    handleCopyMessage
                  }
                >
                  Copy Summary
                </button>

                <button
                  type="button"
                  className="share-action-secondary"
                  onClick={
                    handleOpenShare
                  }
                >
                  Open Link
                </button>

                {typeof navigator.share ===
                  'function' && (
                  <button
                    type="button"
                    className="share-action-secondary"
                    onClick={() =>
                      void handleNativeShare()
                    }
                  >
                    Share...
                  </button>
                )}
              </div>

              <div className="advanced-share-message-preview">
                <span>
                  Message Preview
                </span>

                <pre>
                  {
                    shareMessage
                  }
                </pre>
              </div>

              <button
                type="button"
                className="share-create-another"
                disabled={
                  isSharing
                }
                onClick={
                  handleCreateShare
                }
              >
                {isSharing
                  ? 'Creating...'
                  : 'Generate New Code for Current Battle'}
              </button>
            </div>
          )}

          <div className="share-note">
            <strong>
              How V48 sharing works
            </strong>

            <p>
              The API still stores only the battle setup behind the short code. Result links add presentation parameters to the URL. When opened, the receiver loads the setup and runs the same battle engine locally, so no backend migration is required.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SimulationToolsPanel
