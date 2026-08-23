import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  createWorker,
  OEM,
} from 'tesseract.js'

import {
  parseSpyReportText,
} from '../../domain/import/spyReportParser'

import type {
  Army,
  DefenderModifiers,
} from '../../types/Battle'

import './SpyReportImportPanel.css'

interface SpyReportImportPanelProps {
  defender: Army
  defenderModifiers: DefenderModifiers

  onApply: (
    army: Army,
    modifierPatch: Partial<DefenderModifiers>,
  ) => void

  onMerge: (
    army: Army,
    modifierPatch: Partial<DefenderModifiers>,
  ) => void
}

type ImportMode =
  | 'text'
  | 'image'

const numberFormatter =
  new Intl.NumberFormat(
    'en-US',
  )

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024

function SpyReportImportPanel({
  onApply,
  onMerge,
}: SpyReportImportPanelProps) {
  const [
    mode,
    setMode,
  ] = useState<ImportMode>(
    'text',
  )

  const [
    rawText,
    setRawText,
  ] = useState('')

  const [
    imageFile,
    setImageFile,
  ] = useState<File | null>(
    null,
  )

  const [
    imagePreview,
    setImagePreview,
  ] = useState<string | null>(
    null,
  )

  const [
    isReadingImage,
    setIsReadingImage,
  ] = useState(false)

  const [
    ocrProgress,
    setOcrProgress,
  ] = useState(0)

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  )

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    )

  const parseResult = useMemo(
    () =>
      parseSpyReportText(
        rawText,
      ),
    [rawText],
  )

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(
          imagePreview,
        )
      }
    }
  }, [imagePreview])

  const resetImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview,
      )
    }

    setImageFile(null)
    setImagePreview(null)
    setOcrProgress(0)
    setError(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const selectImage = (
    file: File,
  ) => {
    setError(null)

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

    if (
      file.size > MAX_IMAGE_SIZE
    ) {
      setError(
        'The screenshot must be smaller than 10 MB.',
      )

      return
    }

    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview,
      )
    }

    setImageFile(file)
    setImagePreview(
      URL.createObjectURL(file),
    )
    setOcrProgress(0)
  }

  const handleImageInput = (
    event:
      React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0]

    if (file) {
      selectImage(file)
    }
  }

  const handleDrop = (
    event:
      React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault()

    const file =
      event.dataTransfer.files?.[0]

    if (file) {
      selectImage(file)
    }
  }

  const handleReadScreenshot =
    async () => {
      if (
        !imageFile ||
        isReadingImage
      ) {
        return
      }

      setIsReadingImage(true)
      setOcrProgress(0)
      setError(null)

      let worker:
        Awaited<
          ReturnType<
            typeof createWorker
          >
        > | null = null

      try {
        worker =
          await createWorker(
            [
              'eng',
              'por',
            ],
            OEM.LSTM_ONLY,
            {
              logger: (
                message,
              ) => {
                if (
                  message.status ===
                    'recognizing text' &&
                  typeof message.progress ===
                    'number'
                ) {
                  setOcrProgress(
                    Math.round(
                      message.progress *
                        100,
                    ),
                  )
                }
              },
            },
          )

        const result =
          await worker.recognize(
            imageFile,
          )

        const text =
          result.data.text.trim()

        if (!text) {
          setError(
            'No text was detected in the screenshot.',
          )

          return
        }

        setRawText(text)
        setOcrProgress(100)
      } catch (ocrError) {
        console.error(
          'Spy report OCR failed:',
          ocrError,
        )

        setError(
          'Could not read the screenshot. Try a cropped image focused on the troop table.',
        )
      } finally {
        if (worker) {
          await worker.terminate()
        }

        setIsReadingImage(false)
      }
    }

  const buildModifierPatch =
    (): Partial<DefenderModifiers> => {
      const patch:
        Partial<DefenderModifiers> = {}

      if (
        parseResult.wallLevel !==
        null
      ) {
        patch.wallLevel =
          parseResult.wallLevel
      }

      if (
        parseResult.churchLevel !==
        null
      ) {
        patch.churchLevel =
          parseResult.churchLevel
      }

      return patch
    }

  const handleApply = () => {
    onApply(
      parseResult.army,
      buildModifierPatch(),
    )
  }

  const handleMerge = () => {
    onMerge(
      parseResult.army,
      buildModifierPatch(),
    )
  }

  const hasDetectedUnits =
    parseResult.detectedUnits
      .length > 0

  return (
    <section
      className="spy-import-card"
      id="spy-report-import"
    >
      <div className="spy-import-header">
        <div>
          <span className="section-label">
            DEFENDER INTELLIGENCE
          </span>

          <h3>
            Import Spy Report
          </h3>

          <p>
            Paste a spy report or upload a screenshot. Detected enemy troops can be applied directly to the defender army.
          </p>
        </div>

        <div className="spy-import-badge">
          SPY
        </div>
      </div>

      <div className="spy-import-tabs">
        <button
          type="button"
          className={
            mode === 'text'
              ? 'active'
              : ''
          }
          onClick={() =>
            setMode('text')
          }
        >
          Paste Report
        </button>

        <button
          type="button"
          className={
            mode === 'image'
              ? 'active'
              : ''
          }
          onClick={() =>
            setMode('image')
          }
        >
          Screenshot OCR
        </button>
      </div>

      <div className="spy-import-grid">
        <div className="spy-import-source">
          {mode === 'text' ? (
            <>
              <label
                className="spy-import-label"
                htmlFor="spy-report-text"
              >
                Spy report text
              </label>

              <textarea
                id="spy-report-text"
                value={rawText}
                rows={13}
                placeholder={`Example:\nLanceiro 12.450\nEspadachim 8.100\nViking 1.250\nCavalaria Leve 350\nMuralha 14`}
                onChange={(event) =>
                  setRawText(
                    event.target.value,
                  )
                }
              />

              <p className="spy-import-help">
                The parser updates automatically while you paste or edit the report.
              </p>
            </>
          ) : (
            <>
              <input
                ref={fileInputRef}
                className="spy-import-file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageInput}
              />

              <div
                className={`spy-drop-zone ${
                  imagePreview
                    ? 'has-image'
                    : ''
                }`}
                role="button"
                tabIndex={0}
                onDragOver={(event) =>
                  event.preventDefault()
                }
                onDrop={handleDrop}
                onClick={() =>
                  fileInputRef.current?.click()
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' ||
                    event.key === ' '
                  ) {
                    fileInputRef.current?.click()
                  }
                }}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Selected spy report screenshot"
                  />
                ) : (
                  <div className="spy-drop-zone-empty">
                    <strong>
                      Drop screenshot here
                    </strong>

                    <span>
                      or click to choose PNG, JPG or WEBP
                    </span>
                  </div>
                )}
              </div>

              <div className="spy-image-actions">
                <button
                  type="button"
                  className="spy-primary-button"
                  disabled={
                    !imageFile ||
                    isReadingImage
                  }
                  onClick={handleReadScreenshot}
                >
                  {isReadingImage
                    ? `Reading ${ocrProgress}%`
                    : 'Read Screenshot'}
                </button>

                {imageFile && (
                  <button
                    type="button"
                    className="spy-secondary-button"
                    disabled={isReadingImage}
                    onClick={resetImage}
                  >
                    Remove
                  </button>
                )}
              </div>

              {isReadingImage && (
                <div
                  className="spy-progress"
                  aria-label={`OCR progress ${ocrProgress}%`}
                >
                  <div
                    style={{
                      width: `${ocrProgress}%`,
                    }}
                  />
                </div>
              )}

              <p className="spy-import-help">
                For better OCR, crop the screenshot around the troop names and quantities before uploading it.
              </p>
            </>
          )}

          {error && (
            <div className="spy-import-error">
              {error}
            </div>
          )}

          {mode === 'image' &&
            rawText && (
              <details className="spy-ocr-text">
                <summary>
                  View detected OCR text
                </summary>

                <textarea
                  value={rawText}
                  rows={8}
                  onChange={(event) =>
                    setRawText(
                      event.target.value,
                    )
                  }
                />
              </details>
            )}
        </div>

        <div className="spy-import-preview">
          <div className="spy-preview-title">
            <div>
              <span className="section-label">
                DETECTED
              </span>

              <h4>
                Defender Preview
              </h4>
            </div>

            <strong>
              {
                parseResult
                  .detectedUnits
                  .length
              }{' '}
              troop types
            </strong>
          </div>

          {!hasDetectedUnits ? (
            <div className="spy-empty-preview">
              <strong>
                Waiting for report
              </strong>

              <span>
                Detected troop quantities will appear here before they are applied.
              </span>
            </div>
          ) : (
            <div className="spy-detected-list">
              {parseResult.detectedUnits.map(
                (unit) => (
                  <div
                    className="spy-detected-row"
                    key={unit.unitId}
                  >
                    <span>
                      {unit.label}
                    </span>

                    <strong>
                      {numberFormatter.format(
                        unit.quantity,
                      )}
                    </strong>
                  </div>
                ),
              )}
            </div>
          )}

          {(parseResult.wallLevel !==
            null ||
            parseResult.churchLevel !==
              null) && (
            <div className="spy-detected-settings">
              {parseResult.wallLevel !==
                null && (
                <div>
                  <span>
                    Wall
                  </span>
                  <strong>
                    Level{' '}
                    {
                      parseResult.wallLevel
                    }
                  </strong>
                </div>
              )}

              {parseResult.churchLevel !==
                null && (
                <div>
                  <span>
                    Church
                  </span>
                  <strong>
                    Level{' '}
                    {
                      parseResult.churchLevel
                    }
                  </strong>
                </div>
              )}
            </div>
          )}

          {parseResult.warnings.map(
            (warning) => (
              <div
                className="spy-import-warning"
                key={warning}
              >
                {warning}
              </div>
            ),
          )}

          <div className="spy-apply-actions">
            <button
              type="button"
              className="spy-primary-button"
              disabled={!hasDetectedUnits}
              onClick={handleApply}
            >
              Apply to Defender
            </button>

            <button
              type="button"
              className="spy-secondary-button"
              disabled={!hasDetectedUnits}
              onClick={handleMerge}
              title="Keeps current values for troop types that were not detected."
            >
              Merge with Current
            </button>
          </div>

          <p className="spy-apply-note">
            “Apply” replaces the defender army with the detected report. “Merge” only overwrites troop types that were detected.
          </p>
        </div>
      </div>
    </section>
  )
}

export default SpyReportImportPanel