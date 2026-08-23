import {
  useEffect,
  useRef,
  useState,
} from 'react'

import type {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
} from 'react'

import {
  analyzeReportScreenshot,
} from '../../domain/import/reportImageAnalyzer'

import type {
  ReportAnalysisProgress,
} from '../../domain/import/reportImageAnalyzer'

import type {
  ReportArmyReading,
  ReportScreenshotAnalysis,
} from '../../domain/import/reportTypes'

import type {
  Army,
  DefenderModifiers,
} from '../../types/Battle'

import type {
  UnitId,
} from '../../types/Unit'

import './ReportScreenshotImportPanel.css'

interface ReportScreenshotImportPanelProps {
  onApplyAttacker: (
    army: Army,
  ) => void

  onApplyDefender: (
    army: Army,
    modifierPatch: Partial<DefenderModifiers>,
  ) => void

  onApplyBoth: (
    attacker: Army,
    defender: Army,
    modifierPatch: Partial<DefenderModifiers>,
  ) => void
}

const MAX_IMAGE_SIZE =
  12 * 1024 * 1024

const MAX_TROOP_QUANTITY =
  999_999_999

const formatter =
  new Intl.NumberFormat('en-US')

const confidenceLabel = (
  confidence: ReportScreenshotAnalysis['confidence'],
): string => {
  if (confidence === 'high') {
    return 'High confidence'
  }

  if (confidence === 'medium') {
    return 'Medium confidence'
  }

  return 'Low confidence'
}

const clampQuantity = (
  value: number,
): number => {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(
    MAX_TROOP_QUANTITY,
    Math.max(0, Math.trunc(value)),
  )
}

interface ArmyPreviewProps {
  title: string
  reading: ReportArmyReading
  army: Army
  debugMode: boolean
  onQuantityChange: (
    unitId: UnitId,
    quantity: number,
  ) => void
}

function ArmyPreview({
  title,
  reading,
  army,
  debugMode,
  onQuantityChange,
}: ArmyPreviewProps) {
  return (
    <div className="report-army-preview">
      <div className="report-army-preview-heading">
        <strong>{title}</strong>

        <span>
          OCR {reading.averageConfidence}%
        </span>
      </div>

      <div className="report-army-preview-grid">
        {reading.units.map((unit) => {
          const editedQuantity =
            army[unit.unitId]

          const wasEdited =
            editedQuantity !== unit.quantity

          return (
            <div
              className={`report-unit-preview ${
                wasEdited
                  ? 'report-unit-preview-edited'
                  : ''
              }`}
              key={unit.unitId}
            >
              <label
                htmlFor={`${title}-${unit.unitId}`}
              >
                {unit.label}
              </label>

              <div className="report-unit-editor">
                <input
                  id={`${title}-${unit.unitId}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_TROOP_QUANTITY}
                  step={1}
                  value={editedQuantity}
                  onChange={(event) => {
                    onQuantityChange(
                      unit.unitId,
                      clampQuantity(
                        Number(event.target.value),
                      ),
                    )
                  }}
                />

                {wasEdited && (
                  <small className="report-manual-value">
                    OCR: {formatter.format(unit.quantity)}
                  </small>
                )}
              </div>

              {unit.assumedZero &&
                unit.confidence < 45 && (
                  <small
                    className="report-review-label"
                    title="This value was difficult to read and was interpreted as zero."
                  >
                    review
                  </small>
                )}

              {debugMode && (
                <div className="report-unit-debug">
                  <div className="report-unit-debug-image">
                    {unit.debugCropDataUrl ? (
                      <img
                        src={unit.debugCropDataUrl}
                        alt={`${unit.label} OCR crop`}
                      />
                    ) : (
                      <span>No crop</span>
                    )}
                  </div>

                  <div className="report-unit-debug-data">
                    <span>
                      OCR result
                      <strong>
                        {formatter.format(unit.quantity)}
                      </strong>
                    </span>

                    <span>
                      Raw text
                      <strong>
                        {unit.rawText.trim() || '(blank)'}
                      </strong>
                    </span>

                    <span>
                      Confidence
                      <strong>
                        {unit.confidence}%
                      </strong>
                    </span>

                    <span>
                      Empty slot
                      <strong>
                        {unit.assumedZero
                          ? 'yes'
                          : 'no'}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ReportScreenshotImportPanel({
  onApplyAttacker,
  onApplyDefender,
  onApplyBoth,
}: ReportScreenshotImportPanelProps) {
  const fileInputRef =
    useRef<HTMLInputElement | null>(null)

  const [
    imageFile,
    setImageFile,
  ] = useState<File | null>(null)

  const [
    imagePreview,
    setImagePreview,
  ] = useState<string | null>(null)

  const [
    analysis,
    setAnalysis,
  ] = useState<ReportScreenshotAnalysis | null>(
    null,
  )

  const [
    editableAttacker,
    setEditableAttacker,
  ] = useState<Army | null>(null)

  const [
    editableDefender,
    setEditableDefender,
  ] = useState<Army | null>(null)

  const [
    editableWallLevel,
    setEditableWallLevel,
  ] = useState<number | null>(null)

  const [
    showDebug,
    setShowDebug,
  ] = useState(false)

  const [
    progress,
    setProgress,
  ] = useState<ReportAnalysisProgress>({
    phase: 'Waiting for screenshot',
    percent: 0,
  })

  const [
    isAnalyzing,
    setIsAnalyzing,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState<string | null>(null)

  const [
    appliedMessage,
    setAppliedMessage,
  ] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  useEffect(() => {
    if (!analysis) {
      setEditableAttacker(null)
      setEditableDefender(null)
      setEditableWallLevel(null)
      return
    }

    setEditableAttacker(
      analysis.attacker
        ? { ...analysis.attacker.army }
        : null,
    )

    setEditableDefender({
      ...analysis.defender.army,
    })

    setEditableWallLevel(
      analysis.defenderWallLevel,
    )
  }, [analysis])

  const resetAnalysis = () => {
    setAnalysis(null)
    setProgress({
      phase: 'Waiting for screenshot',
      percent: 0,
    })
    setError(null)
    setAppliedMessage(null)
    setShowDebug(false)
  }

  const clearImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }

    setImageFile(null)
    setImagePreview(null)
    resetAnalysis()

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const selectImage = (
    file: File,
  ) => {
    setError(null)
    setAppliedMessage(null)

    if (
      ![
        'image/png',
        'image/jpeg',
        'image/webp',
      ].includes(file.type)
    ) {
      setError(
        'Use a PNG, JPG/JPEG or WEBP screenshot.',
      )
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError(
        'The screenshot must be smaller than 12 MB.',
      )
      return
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }

    setImageFile(file)
    setImagePreview(
      URL.createObjectURL(file),
    )
    setAnalysis(null)
    setProgress({
      phase: 'Ready to analyze',
      percent: 0,
    })
  }

  const handleFileInput = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0]

    if (file) {
      selectImage(file)
    }
  }

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault()

    const file =
      event.dataTransfer.files?.[0]

    if (file) {
      selectImage(file)
    }
  }

  const handleDropZoneKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    if (
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault()
      fileInputRef.current?.click()
    }
  }

  const handleAnalyze = async () => {
    if (
      !imageFile ||
      isAnalyzing
    ) {
      return
    }

    setIsAnalyzing(true)
    setAnalysis(null)
    setError(null)
    setAppliedMessage(null)

    try {
      const result =
        await analyzeReportScreenshot(
          imageFile,
          {
            onProgress: setProgress,
          },
        )

      setAnalysis(result)
    } catch (analysisError) {
      console.error(
        'Report screenshot analysis failed:',
        analysisError,
      )

      setError(
        analysisError instanceof Error
          ? analysisError.message
          : 'Could not analyze the screenshot.',
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleResetDetectedValues = () => {
    if (!analysis) {
      return
    }

    setEditableAttacker(
      analysis.attacker
        ? { ...analysis.attacker.army }
        : null,
    )

    setEditableDefender({
      ...analysis.defender.army,
    })

    setEditableWallLevel(
      analysis.defenderWallLevel,
    )

    setAppliedMessage(null)
  }

  const updateAttackerQuantity = (
    unitId: UnitId,
    quantity: number,
  ) => {
    setEditableAttacker((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        [unitId]: quantity,
      }
    })
  }

  const updateDefenderQuantity = (
    unitId: UnitId,
    quantity: number,
  ) => {
    setEditableDefender((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        [unitId]: quantity,
      }
    })
  }

  const defenderPatch =
    (): Partial<DefenderModifiers> => {
      if (
        editableWallLevel === null ||
        editableWallLevel === undefined
      ) {
        return {}
      }

      return {
        wallLevel:
          Math.max(
            0,
            Math.min(
              20,
              Math.trunc(editableWallLevel),
            ),
          ),
      }
    }

  const handleApplyDefender = () => {
    if (
      !analysis ||
      !editableDefender
    ) {
      return
    }

    onApplyDefender(
      editableDefender,
      defenderPatch(),
    )

    setAppliedMessage(
      'Defender imported successfully.',
    )
  }

  const handleApplyAttacker = () => {
    if (
      !analysis?.attacker ||
      !editableAttacker
    ) {
      return
    }

    onApplyAttacker(
      editableAttacker,
    )

    setAppliedMessage(
      'Attacker imported successfully.',
    )
  }

  const handleApplyBoth = () => {
    if (
      !analysis?.attacker ||
      !editableAttacker ||
      !editableDefender
    ) {
      return
    }

    onApplyBoth(
      editableAttacker,
      editableDefender,
      defenderPatch(),
    )

    setAppliedMessage(
      'Both armies imported successfully.',
    )
  }

  return (
    <section
      className="report-import-card"
      id="report-screenshot-import"
    >
      <div className="report-import-header">
        <div>
          <span className="section-label">
            REPORT IMPORT
          </span>

          <h3>
            Import from Screenshot
          </h3>

          <p>
            Upload a Tribal Wars spy report or battle report screenshot. Review or correct every detected quantity before applying it to the simulator.
          </p>
        </div>

        <div className="report-import-badge">
          OCR
        </div>
      </div>

      <div className="report-import-body">
        <div className="report-import-source">
          <input
            ref={fileInputRef}
            className="report-file-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileInput}
          />

          <div
            className={`report-drop-zone ${
              imagePreview
                ? 'has-image'
                : ''
            }`}
            role="button"
            tabIndex={0}
            onClick={() =>
              fileInputRef.current?.click()
            }
            onKeyDown={handleDropZoneKeyDown}
            onDragOver={(event) =>
              event.preventDefault()
            }
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Selected Tribal Wars report screenshot"
              />
            ) : (
              <div className="report-drop-zone-empty">
                <strong>
                  Drop report screenshot here
                </strong>

                <span>
                  or click to select PNG, JPG or WEBP
                </span>

                <small>
                  Supported: Spy Report and Battle Report
                </small>
              </div>
            )}
          </div>

          <div className="report-source-actions">
            <button
              className="report-primary-button"
              type="button"
              disabled={
                !imageFile ||
                isAnalyzing
              }
              onClick={handleAnalyze}
            >
              {isAnalyzing
                ? `${progress.phase} ${progress.percent}%`
                : analysis
                  ? 'Analyze Again'
                  : 'Analyze Screenshot'}
            </button>

            {imageFile && (
              <button
                className="report-secondary-button"
                type="button"
                disabled={isAnalyzing}
                onClick={clearImage}
              >
                Remove
              </button>
            )}
          </div>

          {(isAnalyzing ||
            progress.percent > 0) && (
            <div className="report-progress-wrap">
              <div className="report-progress-label">
                <span>{progress.phase}</span>
                <strong>
                  {progress.percent}%
                </strong>
              </div>

              <div className="report-progress">
                <div
                  style={{
                    width: `${progress.percent}%`,
                  }}
                />
              </div>
            </div>
          )}

          <p className="report-import-help">
            Use the complete game report window. If OCR misses a digit, correct the value in the preview. Enable Debug OCR to see the exact image crop that was sent to the number reader.
          </p>

          {error && (
            <div className="report-import-error">
              {error}
            </div>
          )}
        </div>

        <div className="report-import-preview">
          {!analysis || !editableDefender ? (
            <div className="report-empty-preview">
              <span className="section-label">
                PREVIEW
              </span>

              <strong>
                No report analyzed yet
              </strong>

              <p>
                After OCR finishes, every detected quantity becomes editable before anything is applied to the simulator.
              </p>
            </div>
          ) : (
            <>
              <div className="report-detection-summary">
                <div>
                  <span className="section-label">
                    DETECTED REPORT
                  </span>

                  <h4>
                    {analysis.reportType === 'spy'
                      ? 'Spy Report'
                      : 'Battle Report'}
                  </h4>

                  <small>
                    Source {analysis.sourceWidth} × {analysis.sourceHeight}
                  </small>
                </div>

                <div className="report-detection-actions">
                  <span
                    className={`report-confidence report-confidence-${analysis.confidence}`}
                  >
                    {confidenceLabel(
                      analysis.confidence,
                    )}
                  </span>

                  <button
                    className={`report-debug-toggle ${
                      showDebug
                        ? 'is-active'
                        : ''
                    }`}
                    type="button"
                    onClick={() =>
                      setShowDebug((current) => !current)
                    }
                  >
                    {showDebug
                      ? 'Hide OCR Debug'
                      : 'Debug OCR'}
                  </button>
                </div>
              </div>

              <div className="report-edit-hint">
                <strong>Editable preview</strong>
                <span>
                  OCR values are suggestions. Fix any wrong number here before clicking Apply.
                </span>

                <button
                  type="button"
                  onClick={handleResetDetectedValues}
                >
                  Reset to OCR
                </button>
              </div>

              {analysis.attacker &&
                editableAttacker && (
                  <ArmyPreview
                    title="Attacker"
                    reading={analysis.attacker}
                    army={editableAttacker}
                    debugMode={showDebug}
                    onQuantityChange={updateAttackerQuantity}
                  />
                )}

              <ArmyPreview
                title="Defender"
                reading={analysis.defender}
                army={editableDefender}
                debugMode={showDebug}
                onQuantityChange={updateDefenderQuantity}
              />

              {analysis.reportType === 'battle' && (
                <div className="report-wall-result">
                  <span>
                    Initial defender wall
                  </span>

                  <div className="report-wall-editor">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={1}
                      placeholder="Not detected"
                      value={
                        editableWallLevel ?? ''
                      }
                      onChange={(event) => {
                        const raw = event.target.value

                        setEditableWallLevel(
                          raw === ''
                            ? null
                            : Math.max(
                                0,
                                Math.min(
                                  20,
                                  Math.trunc(
                                    Number(raw),
                                  ),
                                ),
                              ),
                        )
                      }}
                    />

                    {analysis.defenderWallLevel !== null &&
                      editableWallLevel !==
                        analysis.defenderWallLevel && (
                        <small>
                          OCR: level {analysis.defenderWallLevel}
                        </small>
                      )}
                  </div>
                </div>
              )}

              {analysis.warnings.length > 0 && (
                <div className="report-warning-list">
                  {analysis.warnings.map(
                    (warning) => (
                      <p key={warning}>
                        {warning}
                      </p>
                    ),
                  )}
                </div>
              )}

              <div className="report-apply-actions">
                {analysis.attacker &&
                  editableAttacker && (
                    <button
                      className="report-secondary-button"
                      type="button"
                      onClick={handleApplyAttacker}
                    >
                      Apply Attacker
                    </button>
                  )}

                <button
                  className="report-secondary-button"
                  type="button"
                  onClick={handleApplyDefender}
                >
                  Apply Defender
                </button>

                {analysis.attacker &&
                  editableAttacker && (
                    <button
                      className="report-primary-button"
                      type="button"
                      onClick={handleApplyBoth}
                    >
                      Apply Both Armies
                    </button>
                  )}
              </div>

              {analysis.reportType === 'spy' && (
                <p className="report-apply-note">
                  Spy reports only populate the defender because the report contains the scouted village army.
                </p>
              )}

              {analysis.reportType === 'battle' && (
                <p className="report-apply-note">
                  Battle reports use the initial troop row, not the red loss row. Correct any OCR mistake directly in the fields above before applying.
                </p>
              )}

              {appliedMessage && (
                <div className="report-import-success">
                  {appliedMessage}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default ReportScreenshotImportPanel
