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

interface ArmyPreviewProps {
  title: string
  reading: ReportArmyReading
}

function ArmyPreview({
  title,
  reading,
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
        {reading.units.map((unit) => (
          <div
            className="report-unit-preview"
            key={unit.unitId}
          >
            <span>{unit.label}</span>

            <strong>
              {formatter.format(
                unit.quantity,
              )}
            </strong>

            {unit.assumedZero &&
              unit.confidence < 45 && (
                <small title="This value was difficult to read and was interpreted as zero.">
                  review
                </small>
              )}
          </div>
        ))}
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

  const resetAnalysis = () => {
    setAnalysis(null)
    setProgress({
      phase: 'Waiting for screenshot',
      percent: 0,
    })
    setError(null)
    setAppliedMessage(null)
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

  const defenderPatch =
    (): Partial<DefenderModifiers> => {
      if (
        analysis?.defenderWallLevel === null ||
        analysis?.defenderWallLevel === undefined
      ) {
        return {}
      }

      return {
        wallLevel:
          analysis.defenderWallLevel,
      }
    }

  const handleApplyDefender = () => {
    if (!analysis) {
      return
    }

    onApplyDefender(
      analysis.defender.army,
      defenderPatch(),
    )

    setAppliedMessage(
      'Defender imported successfully.',
    )
  }

  const handleApplyAttacker = () => {
    if (!analysis?.attacker) {
      return
    }

    onApplyAttacker(
      analysis.attacker.army,
    )

    setAppliedMessage(
      'Attacker imported successfully.',
    )
  }

  const handleApplyBoth = () => {
    if (
      !analysis?.attacker
    ) {
      return
    }

    onApplyBoth(
      analysis.attacker.army,
      analysis.defender.army,
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
            Upload a Tribal Wars spy report or battle report screenshot. The unit grid is read automatically and mapped to the simulator.
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
            Use the complete game report window, like the battle and spy screenshots used to calibrate this importer. Avoid browser zoom or cropped troop columns.
          </p>

          {error && (
            <div className="report-import-error">
              {error}
            </div>
          )}
        </div>

        <div className="report-import-preview">
          {!analysis ? (
            <div className="report-empty-preview">
              <span className="section-label">
                PREVIEW
              </span>

              <strong>
                No report analyzed yet
              </strong>

              <p>
                After OCR finishes, the detected armies will appear here before anything is applied to the simulator.
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

                <span
                  className={`report-confidence report-confidence-${analysis.confidence}`}
                >
                  {confidenceLabel(
                    analysis.confidence,
                  )}
                </span>
              </div>

              {analysis.attacker && (
                <ArmyPreview
                  title="Attacker"
                  reading={analysis.attacker}
                />
              )}

              <ArmyPreview
                title="Defender"
                reading={analysis.defender}
              />

              {analysis.defenderWallLevel !== null && (
                <div className="report-wall-result">
                  <span>
                    Initial defender wall
                  </span>

                  <strong>
                    Level {analysis.defenderWallLevel}
                  </strong>
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
                {analysis.attacker && (
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

                {analysis.attacker && (
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
                  Battle reports use the initial troop row, not the red loss row. When detected, the wall level is taken from the value before the ram reduction.
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
