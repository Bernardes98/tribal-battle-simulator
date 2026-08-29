import {
  useEffect,
  useMemo,
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

import {
  REPORT_UNIT_ORDER,
} from '../../domain/import/reportTypes'

import type {
  ReportArmyReading,
  ReportScreenshotAnalysis,
} from '../../domain/import/reportTypes'

import type {
  Army,
  AttackerModifiers,
  DefenderModifiers,
  PaladinWeaponLevels,
} from '../../types/Battle'

import type {
  UnitId,
} from '../../types/Unit'

import {
  cloneReportMetadata,
  hasReportPartyMetadata,
} from '../../types/ReportMetadata'

import type {
  ReportMetadata,
  ReportPartyMetadata,
} from '../../types/ReportMetadata'

import './ReportScreenshotImportPanel.css'

interface ReportScreenshotImportPanelProps {
  onApplyAttacker: (
    army: Army,
    modifierPatch: Partial<AttackerModifiers>,
    paladinWeaponPatch: Partial<PaladinWeaponLevels>,
  ) => void

  onApplyDefender: (
    army: Army,
    modifierPatch: Partial<DefenderModifiers>,
    paladinWeaponPatch: Partial<PaladinWeaponLevels>,
  ) => void

  onApplyBoth: (
    attacker: Army,
    defender: Army,
    attackerModifierPatch: Partial<AttackerModifiers>,
    defenderModifierPatch: Partial<DefenderModifiers>,
    attackerPaladinWeaponPatch: Partial<PaladinWeaponLevels>,
    defenderPaladinWeaponPatch: Partial<PaladinWeaponLevels>,
  ) => void

  onImportApplied?: (
    source:
      | 'SPY_REPORT'
      | 'BATTLE_REPORT',
    metadata: ReportMetadata,
  ) => void
}

const MAX_IMAGE_SIZE =
  12 * 1024 * 1024

const MAX_TROOP_QUANTITY =
  999_999_999

const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
]

const PALADIN_WEAPON_KEYS: Array<keyof PaladinWeaponLevels> = [
  'spearman',
  'swordsman',
  'axe',
  'archer',
  'lightCavalry',
  'mountedArcher',
  'heavyCavalry',
  'ram',
  'catapult',
  'berserker',
]

const PALADIN_WEAPON_LABELS: Record<keyof PaladinWeaponLevels, string> = {
  spearman: 'Spearman',
  swordsman: 'Swordsman',
  axe: 'Axe Fighter',
  archer: 'Archer',
  lightCavalry: 'Light Cavalry',
  mountedArcher: 'Mounted Archer',
  heavyCavalry: 'Heavy Cavalry',
  ram: 'Ram',
  catapult: 'Catapult',
  berserker: 'Berserker',
}

const isEditableTarget = (
  target: EventTarget | null,
): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

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

const armyTotal = (
  army: Army,
): number => {
  return REPORT_UNIT_ORDER.reduce(
    (total, unitId) => total + (army[unitId] ?? 0),
    0,
  )
}

const nonZeroUnitCount = (
  army: Army,
): number => {
  return REPORT_UNIT_ORDER.filter(
    (unitId) => (army[unitId] ?? 0) > 0,
  ).length
}

interface ArmyPreviewProps {
  title: string
  reading: ReportArmyReading
  army: Army
  debugMode: boolean
  showAllUnits: boolean
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
  showAllUnits,
  onQuantityChange,
}: ArmyPreviewProps) {
  const visibleUnits = reading.units.filter(
    (unit) => {
      if (showAllUnits || debugMode) {
        return true
      }

      return (
        army[unit.unitId] > 0 ||
        unit.quantity > 0
      )
    },
  )

  const total = armyTotal(army)
  const populatedUnits = nonZeroUnitCount(army)

  return (
    <div className="report-army-preview">
      <div className="report-army-preview-heading">
        <div>
          <strong>{title}</strong>
          <small>
            {formatter.format(total)} troops · {populatedUnits} active unit {populatedUnits === 1 ? 'type' : 'types'}
          </small>
        </div>

        <span>
          OCR {reading.averageConfidence}%
        </span>
      </div>

      {visibleUnits.length === 0 ? (
        <div className="report-no-troops">
          No non-zero troops were detected for this side.
        </div>
      ) : (
        <div className="report-army-preview-grid">
          {visibleUnits.map((unit) => {
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
      )}
    </div>
  )
}

interface ReportIdentityEditorProps {
  title: string
  metadata: ReportPartyMetadata | null
  onChange: (
    metadata: ReportPartyMetadata,
  ) => void
}

function ReportIdentityEditor({
  title,
  metadata,
  onChange,
}: ReportIdentityEditorProps) {
  const value: ReportPartyMetadata =
    metadata ?? {
      playerName: null,
      villageName: null,
      coordinates: null,
    }

  const updateText = (
    key: 'playerName' | 'villageName',
    nextValue: string,
  ) => {
    onChange({
      ...value,
      [key]: nextValue.trimStart() || null,
    })
  }

  const updateCoordinate = (
    axis: 'x' | 'y',
    nextValue: string,
  ) => {
    const numeric = Number(nextValue)

    const coordinates = {
      x: value.coordinates?.x ?? 0,
      y: value.coordinates?.y ?? 0,
    }

    coordinates[axis] =
      Number.isFinite(numeric)
        ? Math.max(
            0,
            Math.min(
              999,
              Math.trunc(numeric),
            ),
          )
        : 0

    onChange({
      ...value,
      coordinates,
    })
  }

  return (
    <div className="report-identity-side">
      <div className="report-identity-title">
        <strong>{title}</strong>

        <span>
          {hasReportPartyMetadata(metadata)
            ? 'Detected'
            : 'Not detected'}
        </span>
      </div>

      <div className="report-identity-fields">
        <label>
          <span>Player</span>
          <input
            type="text"
            maxLength={32}
            value={value.playerName ?? ''}
            placeholder="Player name"
            onChange={(event) =>
              updateText(
                'playerName',
                event.target.value,
              )
            }
          />
        </label>

        <label>
          <span>Village</span>
          <input
            type="text"
            maxLength={80}
            value={value.villageName ?? ''}
            placeholder="Village name"
            onChange={(event) =>
              updateText(
                'villageName',
                event.target.value,
              )
            }
          />
        </label>

        <div className="report-coordinate-fields">
          <label>
            <span>X</span>
            <input
              type="number"
              min={0}
              max={999}
              step={1}
              value={
                value.coordinates?.x ?? ''
              }
              placeholder="000"
              onChange={(event) =>
                updateCoordinate(
                  'x',
                  event.target.value,
                )
              }
            />
          </label>

          <span className="report-coordinate-separator">
            |
          </span>

          <label>
            <span>Y</span>
            <input
              type="number"
              min={0}
              max={999}
              step={1}
              value={
                value.coordinates?.y ?? ''
              }
              placeholder="000"
              onChange={(event) =>
                updateCoordinate(
                  'y',
                  event.target.value,
                )
              }
            />
          </label>
        </div>
      </div>
    </div>
  )
}

function ReportScreenshotImportPanel({
  onApplyAttacker,
  onApplyDefender,
  onApplyBoth,
  onImportApplied,
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
    editableAttackerModifierPatch,
    setEditableAttackerModifierPatch,
  ] = useState<
    Partial<AttackerModifiers>
  >({})

  const [
    editableDefenderModifierPatch,
    setEditableDefenderModifierPatch,
  ] = useState<
    Partial<DefenderModifiers>
  >({})

  const [
    editableAttackerPaladinWeaponPatch,
    setEditableAttackerPaladinWeaponPatch,
  ] = useState<Partial<PaladinWeaponLevels>>({})

  const [
    editableDefenderPaladinWeaponPatch,
    setEditableDefenderPaladinWeaponPatch,
  ] = useState<Partial<PaladinWeaponLevels>>({})

  const [
    editableMetadata,
    setEditableMetadata,
  ] = useState<ReportMetadata | null>(null)

  const [
    showDebug,
    setShowDebug,
  ] = useState(false)

  const [
    showAllUnits,
    setShowAllUnits,
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

  const [
    importSource,
    setImportSource,
  ] = useState<'file' | 'drop' | 'clipboard' | null>(null)

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
      setEditableAttackerModifierPatch({})
      setEditableDefenderModifierPatch({})
      setEditableAttackerPaladinWeaponPatch({})
      setEditableDefenderPaladinWeaponPatch({})
      setEditableMetadata(null)
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

    setEditableAttackerModifierPatch({
      ...analysis.attackerModifierPatch,
    })

    setEditableDefenderModifierPatch({
      ...analysis.defenderModifierPatch,
    })

    setEditableAttackerPaladinWeaponPatch({
      ...analysis.attackerPaladinWeaponPatch,
    })

    setEditableDefenderPaladinWeaponPatch({
      ...analysis.defenderPaladinWeaponPatch,
    })

    setEditableMetadata(
      cloneReportMetadata(
        analysis.metadata,
      ),
    )

    setShowAllUnits(false)
  }, [analysis])

  const attackerTotal = useMemo(
    () => editableAttacker
      ? armyTotal(editableAttacker)
      : 0,
    [editableAttacker],
  )

  const defenderTotal = useMemo(
    () => editableDefender
      ? armyTotal(editableDefender)
      : 0,
    [editableDefender],
  )

  const resetAnalysis = () => {
    setAnalysis(null)
    setEditableMetadata(null)
    setProgress({
      phase: 'Waiting for screenshot',
      percent: 0,
    })
    setError(null)
    setAppliedMessage(null)
    setShowDebug(false)
    setShowAllUnits(false)
  }

  const clearImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }

    setImageFile(null)
    setImagePreview(null)
    setImportSource(null)
    resetAnalysis()

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const analyzeFile = async (
    file: File,
  ) => {
    if (isAnalyzing) {
      return
    }

    setIsAnalyzing(true)
    setAnalysis(null)
    setError(null)
    setAppliedMessage(null)
    setShowDebug(false)

    try {
      const result =
        await analyzeReportScreenshot(
          file,
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

  const selectImage = (
    file: File,
    source: 'file' | 'drop' | 'clipboard',
    autoAnalyze = true,
  ) => {
    setError(null)
    setAppliedMessage(null)

    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
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
    setImportSource(source)
    setAnalysis(null)
    setShowDebug(false)
    setShowAllUnits(false)
    setProgress({
      phase: autoAnalyze
        ? 'Preparing screenshot'
        : 'Ready to analyze',
      percent: 0,
    })

    if (autoAnalyze) {
      window.setTimeout(() => {
        void analyzeFile(file)
      }, 0)
    }
  }

  const handleFileInput = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0]

    if (file) {
      selectImage(file, 'file')
    }
  }

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault()

    const file =
      event.dataTransfer.files?.[0]

    if (file) {
      selectImage(file, 'drop')
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

    await analyzeFile(imageFile)
  }

  useEffect(() => {
    const handlePaste = (
      event: ClipboardEvent,
    ) => {
      if (isAnalyzing || isEditableTarget(event.target)) {
        return
      }

      const items =
        Array.from(event.clipboardData?.items ?? [])

      const imageItem = items.find((item) =>
        item.kind === 'file' &&
        item.type.startsWith('image/'),
      )

      if (!imageItem) {
        return
      }

      const blob = imageItem.getAsFile()

      if (!blob) {
        return
      }

      event.preventDefault()

      const extension =
        blob.type === 'image/jpeg'
          ? 'jpg'
          : blob.type === 'image/webp'
            ? 'webp'
            : 'png'

      const file = new File(
        [blob],
        `tribal-wars-report-${Date.now()}.${extension}`,
        {
          type: blob.type || 'image/png',
        },
      )

      selectImage(
        file,
        'clipboard',
      )
    }

    window.addEventListener(
      'paste',
      handlePaste,
    )

    return () => {
      window.removeEventListener(
        'paste',
        handlePaste,
      )
    }
  }, [isAnalyzing, imagePreview])

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

    setEditableAttackerModifierPatch({
      ...analysis.attackerModifierPatch,
    })

    setEditableDefenderModifierPatch({
      ...analysis.defenderModifierPatch,
    })

    setEditableAttackerPaladinWeaponPatch({
      ...analysis.attackerPaladinWeaponPatch,
    })

    setEditableDefenderPaladinWeaponPatch({
      ...analysis.defenderPaladinWeaponPatch,
    })

    setEditableMetadata(
      cloneReportMetadata(
        analysis.metadata,
      ),
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

  const updateMetadataParty = (
    side: 'attacker' | 'defender',
    metadata: ReportPartyMetadata,
  ) => {
    setEditableMetadata(
      (current) => ({
        attacker:
          side === 'attacker'
            ? metadata
            : current?.attacker ?? null,
        defender:
          side === 'defender'
            ? metadata
            : current?.defender ?? null,
        timestamp: current?.timestamp ?? null,
      }),
    )
  }

  const currentMetadata =
    (): ReportMetadata => {
      return (
        editableMetadata ?? {
          attacker: null,
          defender: null,
        }
      )
    }

  const clampLevel = (
    value: number,
    maximum: number,
  ): number => {
    if (
      !Number.isFinite(
        value,
      )
    ) {
      return 0
    }

    return Math.max(
      0,
      Math.min(
        maximum,
        Math.trunc(
          value,
        ),
      ),
    )
  }

  const attackerPatch =
    (): Partial<AttackerModifiers> => {
      return {
        ...(editableAttackerModifierPatch.churchLevel !== undefined
          ? { churchLevel: clampLevel(editableAttackerModifierPatch.churchLevel, 3) }
          : {}),
        ...(editableAttackerModifierPatch.morale !== undefined
          ? { morale: Math.max(1, Math.min(100, Math.trunc(editableAttackerModifierPatch.morale))) }
          : {}),
        ...(editableAttackerModifierPatch.grandmaster !== undefined
          ? { grandmaster: editableAttackerModifierPatch.grandmaster }
          : {}),
        ...(editableAttackerModifierPatch.weaponMasteryLevel !== undefined
          ? { weaponMasteryLevel: clampLevel(editableAttackerModifierPatch.weaponMasteryLevel, 5) }
          : {}),
        ...(editableAttackerModifierPatch.medicLevel !== undefined
          ? { medicLevel: clampLevel(editableAttackerModifierPatch.medicLevel, 1) }
          : {}),
        ...(editableAttackerModifierPatch.medicusLevel !== undefined
          ? { medicusLevel: clampLevel(editableAttackerModifierPatch.medicusLevel, 1) }
          : {}),
      }
    }

  const defenderPatch =
    (): Partial<DefenderModifiers> => {
      return {
        ...(editableDefenderModifierPatch.churchLevel !== undefined
          ? { churchLevel: clampLevel(editableDefenderModifierPatch.churchLevel, 3) }
          : {}),
        ...(editableWallLevel !== null && editableWallLevel !== undefined
          ? { wallLevel: clampLevel(editableWallLevel, 20) }
          : {}),
        ...(editableDefenderModifierPatch.hospitalLevel !== undefined
          ? { hospitalLevel: clampLevel(editableDefenderModifierPatch.hospitalLevel, 10) }
          : {}),
        ...(editableDefenderModifierPatch.clinicLevel !== undefined
          ? { clinicLevel: clampLevel(editableDefenderModifierPatch.clinicLevel, 10) }
          : {}),
        ...(editableDefenderModifierPatch.ironWallLevel !== undefined
          ? { ironWallLevel: clampLevel(editableDefenderModifierPatch.ironWallLevel, 5) }
          : {}),
      }
    }

  const paladinPatch = (
    patch: Partial<PaladinWeaponLevels>,
  ): Partial<PaladinWeaponLevels> => {
    const result: Partial<PaladinWeaponLevels> = {}

    for (const key of PALADIN_WEAPON_KEYS) {
      const value = patch[key]

      if (value === undefined) {
        continue
      }

      result[key] = clampLevel(value, 3)
    }

    return result
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
      paladinPatch(
        editableDefenderPaladinWeaponPatch,
      ),
    )

    onImportApplied?.(
      analysis.reportType === 'spy'
        ? 'SPY_REPORT'
        : 'BATTLE_REPORT',
      currentMetadata(),
    )

    setAppliedMessage(
      `Defender imported successfully — ${formatter.format(defenderTotal)} troops applied.`,
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
      attackerPatch(),
      paladinPatch(
        editableAttackerPaladinWeaponPatch,
      ),
    )

    onImportApplied?.(
      'BATTLE_REPORT',
      currentMetadata(),
    )

    setAppliedMessage(
      `Attacker imported successfully — ${formatter.format(attackerTotal)} troops applied.`,
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
      attackerPatch(),
      defenderPatch(),
      paladinPatch(
        editableAttackerPaladinWeaponPatch,
      ),
      paladinPatch(
        editableDefenderPaladinWeaponPatch,
      ),
    )

    onImportApplied?.(
      'BATTLE_REPORT',
      currentMetadata(),
    )

    setAppliedMessage(
      `Both armies imported successfully — ${formatter.format(attackerTotal)} attacker troops and ${formatter.format(defenderTotal)} defender troops applied.`,
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
            Paste, drop or select a Tribal Wars spy or battle report screenshot. Analysis starts automatically and every detected value can still be reviewed before applying it.
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
                  Paste, drop or select a report screenshot
                </strong>

                <span>
                  Press Ctrl+V anywhere on the page after using Win + Shift + S, or click here to choose an image.
                </span>

                <small>
                  PNG, JPG and WEBP · Spy Report and Battle Report
                </small>
              </div>
            )}
          </div>

          {imageFile && (
            <div className="report-import-source-status">
              <span>
                {importSource === 'clipboard'
                  ? 'Pasted from clipboard'
                  : importSource === 'drop'
                    ? 'Dropped screenshot'
                    : 'Selected screenshot'}
              </span>

              <strong>
                {isAnalyzing
                  ? 'Analyzing automatically…'
                  : analysis
                    ? 'Analysis complete'
                    : 'Ready'}
              </strong>
            </div>
          )}

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
            Fastest workflow: Win + Shift + S → select the complete report → return here → Ctrl+V. The screenshot is analyzed automatically. OCR diagnostics remain available under Advanced OCR Debug.
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
                The importer will detect the report type and display the troops found in the screenshot before changing your simulation.
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

                  {analysis.metadata.timestamp && (
                    <small className="report-timestamp">
                      Report time {analysis.metadata.timestamp.localDateTime.replace('T', ' ')}
                      {analysis.metadata.timestamp.timezone
                        ? ` ${analysis.metadata.timestamp.timezone}`
                        : ''}
                    </small>
                  )}
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
                      : 'Advanced OCR Debug'}
                  </button>
                </div>
              </div>

              <div className="report-import-overview">
                {analysis.attacker && editableAttacker && (
                  <div className="report-overview-side">
                    <span>Attacker</span>
                    <strong>{formatter.format(attackerTotal)}</strong>
                    <small>
                      {nonZeroUnitCount(editableAttacker)} active unit {nonZeroUnitCount(editableAttacker) === 1 ? 'type' : 'types'}
                    </small>
                  </div>
                )}

                <div className="report-overview-side">
                  <span>Defender</span>
                  <strong>{formatter.format(defenderTotal)}</strong>
                  <small>
                    {nonZeroUnitCount(editableDefender)} active unit {nonZeroUnitCount(editableDefender) === 1 ? 'type' : 'types'}
                  </small>
                </div>

                {analysis.reportType === 'battle' && (
                  <div className="report-overview-side report-overview-wall">
                    <span>Initial wall</span>
                    <strong>
                      {editableWallLevel === null
                        ? '—'
                        : `Lv. ${editableWallLevel}`}
                    </strong>
                    <small>
                      {editableWallLevel === null
                        ? 'Not detected'
                        : 'Defender setting'}
                    </small>
                  </div>
                )}
              </div>

              <div className="report-identity-card">
                <div className="report-identity-heading">
                  <div>
                    <strong>
                      Report identity
                    </strong>
                    <span>
                      Player, village and coordinates are read from the screenshot and can be corrected before import.
                    </span>
                  </div>

                  <span className="report-identity-badge">
                    OCR metadata
                  </span>
                </div>

                <div className="report-identity-grid">
                  {analysis.attacker && (
                    <ReportIdentityEditor
                      title="Attacker"
                      metadata={
                        editableMetadata?.attacker ?? null
                      }
                      onChange={(metadata) =>
                        updateMetadataParty(
                          'attacker',
                          metadata,
                        )
                      }
                    />
                  )}

                  <ReportIdentityEditor
                    title="Defender"
                    metadata={
                      editableMetadata?.defender ?? null
                    }
                    onChange={(metadata) =>
                      updateMetadataParty(
                        'defender',
                        metadata,
                      )
                    }
                  />
                </div>
              </div>

              <div className="report-settings-card">
                <div className="report-settings-heading">
                  <div>
                    <strong>
                      Detected report settings
                    </strong>

                    <span>
                      V58 only auto-applies values with explicit labels and readable levels. Low-confidence detections stay informational and never overwrite your current setup.
                    </span>
                  </div>

                  <span className="report-settings-badge">
                    V58 OCR
                  </span>
                </div>

                <div className="report-settings-grid">
                  {analysis.attacker && (
                    <div className="report-settings-side">
                      <strong>
                        Attacker
                      </strong>

                      <div className="report-settings-fields">
                        <label>
                          <span>Church</span>
                          <input
                            type="number"
                            min={0}
                            max={3}
                            step={1}
                            aria-label="Attacker church level"
                            placeholder="Not detected"
                            value={editableAttackerModifierPatch.churchLevel ?? ''}
                            onChange={(event) => {
                              const raw = event.target.value
                              setEditableAttackerModifierPatch((current) => ({
                                ...current,
                                churchLevel: raw === ''
                                  ? undefined
                                  : clampLevel(Number(raw), 3),
                              }))
                            }}
                          />
                        </label>

                        <label>
                          <span>Morale</span>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            step={1}
                            aria-label="Attacker morale"
                            placeholder="Not detected"
                            value={editableAttackerModifierPatch.morale ?? ''}
                            onChange={(event) => {
                              const raw = event.target.value
                              setEditableAttackerModifierPatch((current) => ({
                                ...current,
                                morale: raw === ''
                                  ? undefined
                                  : Math.max(1, Math.min(100, Math.trunc(Number(raw)))),
                              }))
                            }}
                          />
                        </label>

                        <label>
                          <span>Weapon Mastery</span>
                          <input
                            type="number"
                            min={0}
                            max={5}
                            step={1}
                            aria-label="Attacker weapon mastery level"
                            placeholder="Not detected"
                            value={editableAttackerModifierPatch.weaponMasteryLevel ?? ''}
                            onChange={(event) => {
                              const raw = event.target.value
                              setEditableAttackerModifierPatch((current) => ({
                                ...current,
                                weaponMasteryLevel: raw === ''
                                  ? undefined
                                  : clampLevel(Number(raw), 5),
                              }))
                            }}
                          />
                        </label>

                        <label>
                          <span>Grandmaster</span>
                          <select
                            aria-label="Attacker Grandmaster officer"
                            value={editableAttackerModifierPatch.grandmaster === undefined
                              ? ''
                              : editableAttackerModifierPatch.grandmaster
                                ? '1'
                                : '0'}
                            onChange={(event) => {
                              const raw = event.target.value
                              setEditableAttackerModifierPatch((current) => ({
                                ...current,
                                grandmaster: raw === ''
                                  ? undefined
                                  : raw === '1',
                              }))
                            }}
                          >
                            <option value="">Not detected</option>
                            <option value="1">Enabled</option>
                            <option value="0">Disabled</option>
                          </select>
                        </label>

                        <label>
                          <span>Medic</span>
                          <select
                            aria-label="Attacker Medic officer"
                            value={editableAttackerModifierPatch.medicLevel === undefined
                              ? ''
                              : String(editableAttackerModifierPatch.medicLevel)}
                            onChange={(event) => {
                              const raw = event.target.value
                              setEditableAttackerModifierPatch((current) => ({
                                ...current,
                                medicLevel: raw === ''
                                  ? undefined
                                  : clampLevel(Number(raw), 1),
                              }))
                            }}
                          >
                            <option value="">Not detected</option>
                            <option value="1">Enabled</option>
                            <option value="0">Disabled</option>
                          </select>
                        </label>

                        <label>
                          <span>Medicus</span>
                          <select
                            aria-label="Attacker Medicus bonus"
                            value={editableAttackerModifierPatch.medicusLevel === undefined
                              ? ''
                              : String(editableAttackerModifierPatch.medicusLevel)}
                            onChange={(event) => {
                              const raw = event.target.value
                              setEditableAttackerModifierPatch((current) => ({
                                ...current,
                                medicusLevel: raw === ''
                                  ? undefined
                                  : clampLevel(Number(raw), 1),
                              }))
                            }}
                          >
                            <option value="">Not detected</option>
                            <option value="1">Enabled</option>
                            <option value="0">Disabled</option>
                          </select>
                        </label>
                      </div>

                      {PALADIN_WEAPON_KEYS.some(
                        (weapon) => editableAttackerPaladinWeaponPatch[weapon] !== undefined,
                      ) && (
                        <div className="report-paladin-detections">
                          <strong>Paladin weapon</strong>
                          {PALADIN_WEAPON_KEYS
                            .filter((weapon) => editableAttackerPaladinWeaponPatch[weapon] !== undefined)
                            .map((weapon) => (
                              <label key={`attacker-${weapon}`}>
                                <span>{PALADIN_WEAPON_LABELS[weapon]}</span>
                                <select
                                  aria-label={`Attacker ${PALADIN_WEAPON_LABELS[weapon]} Paladin weapon level`}
                                  value={editableAttackerPaladinWeaponPatch[weapon] ?? 0}
                                  onChange={(event) =>
                                    setEditableAttackerPaladinWeaponPatch((current) => ({
                                      ...current,
                                      [weapon]: clampLevel(Number(event.target.value), 3),
                                    }))
                                  }
                                >
                                  <option value={0}>None</option>
                                  <option value={1}>Level 1</option>
                                  <option value={2}>Level 2</option>
                                  <option value={3}>Level 3</option>
                                </select>
                              </label>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="report-settings-side">
                    <strong>
                      Defender
                    </strong>

                    <div className="report-settings-fields">
                      <label>
                        <span>Church</span>
                        <input
                          type="number"
                          min={0}
                          max={3}
                          step={1}
                          aria-label="Defender church level"
                          placeholder="Not detected"
                          value={editableDefenderModifierPatch.churchLevel ?? ''}
                          onChange={(event) => {
                            const raw = event.target.value
                            setEditableDefenderModifierPatch((current) => ({
                              ...current,
                              churchLevel: raw === ''
                                ? undefined
                                : clampLevel(Number(raw), 3),
                            }))
                          }}
                        />
                      </label>

                      <label>
                        <span>Wall</span>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          step={1}
                          aria-label="Detected defender wall level"
                          placeholder="Not detected"
                          value={editableWallLevel ?? ''}
                          onChange={(event) => {
                            const raw = event.target.value
                            setEditableWallLevel(
                              raw === ''
                                ? null
                                : clampLevel(Number(raw), 20),
                            )
                          }}
                        />
                      </label>

                      <label>
                        <span>Hospital</span>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={1}
                          aria-label="Defender hospital level"
                          placeholder="Not detected"
                          value={editableDefenderModifierPatch.hospitalLevel ?? ''}
                          onChange={(event) => {
                            const raw = event.target.value
                            setEditableDefenderModifierPatch((current) => ({
                              ...current,
                              hospitalLevel: raw === ''
                                ? undefined
                                : clampLevel(Number(raw), 10),
                            }))
                          }}
                        />
                      </label>

                      <label>
                        <span>Clinic</span>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={1}
                          aria-label="Defender clinic level"
                          placeholder="Not detected"
                          value={editableDefenderModifierPatch.clinicLevel ?? ''}
                          onChange={(event) => {
                            const raw = event.target.value
                            setEditableDefenderModifierPatch((current) => ({
                              ...current,
                              clinicLevel: raw === ''
                                ? undefined
                                : clampLevel(Number(raw), 10),
                            }))
                          }}
                        />
                      </label>

                      <label>
                        <span>Iron Wall</span>
                        <input
                          type="number"
                          min={0}
                          max={5}
                          step={1}
                          aria-label="Defender iron wall level"
                          placeholder="Not detected"
                          value={editableDefenderModifierPatch.ironWallLevel ?? ''}
                          onChange={(event) => {
                            const raw = event.target.value
                            setEditableDefenderModifierPatch((current) => ({
                              ...current,
                              ironWallLevel: raw === ''
                                ? undefined
                                : clampLevel(Number(raw), 5),
                            }))
                          }}
                        />
                      </label>
                    </div>

                    {PALADIN_WEAPON_KEYS.some(
                      (weapon) => editableDefenderPaladinWeaponPatch[weapon] !== undefined,
                    ) && (
                      <div className="report-paladin-detections">
                        <strong>Paladin weapon</strong>
                        {PALADIN_WEAPON_KEYS
                          .filter((weapon) => editableDefenderPaladinWeaponPatch[weapon] !== undefined)
                          .map((weapon) => (
                            <label key={`defender-${weapon}`}>
                              <span>{PALADIN_WEAPON_LABELS[weapon]}</span>
                              <select
                                aria-label={`Defender ${PALADIN_WEAPON_LABELS[weapon]} Paladin weapon level`}
                                value={editableDefenderPaladinWeaponPatch[weapon] ?? 0}
                                onChange={(event) =>
                                  setEditableDefenderPaladinWeaponPatch((current) => ({
                                    ...current,
                                    [weapon]: clampLevel(Number(event.target.value), 3),
                                  }))
                                }
                              >
                                <option value={0}>None</option>
                                <option value={1}>Level 1</option>
                                <option value={2}>Level 2</option>
                                <option value={3}>Level 3</option>
                              </select>
                            </label>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {analysis.advancedDetections.length > 0 && (
                  <div className="report-advanced-detections">
                    <div className="report-advanced-detections-heading">
                      <strong>OCR 2.0 detections</strong>
                      <span>
                        Low confidence = review only; it is not auto-applied.
                      </span>
                    </div>

                    <div className="report-advanced-detection-list">
                      {analysis.advancedDetections.map((detection) => (
                        <div
                          className={`report-advanced-detection report-confidence-${detection.confidence}`}
                          key={detection.key}
                        >
                          <div>
                            <span>{detection.side}</span>
                            <strong>{detection.label}</strong>
                          </div>
                          <span>{detection.value}</span>
                          <small>
                            {detection.confidence} · {detection.autoApplied
                              ? 'auto apply'
                              : 'review only'}
                          </small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="report-preview-toolbar">
                <div>
                  <strong>Detected troops</strong>
                  <span>
                    {showAllUnits
                      ? 'Showing all 13 unit slots.'
                      : 'Showing only units with a detected quantity.'}
                  </span>
                </div>

                <div className="report-preview-toolbar-actions">
                  <button
                    className="report-secondary-button report-small-button"
                    type="button"
                    onClick={() =>
                      setShowAllUnits((current) => !current)
                    }
                  >
                    {showAllUnits
                      ? 'Hide Zero Units'
                      : 'Show All Units'}
                  </button>

                  <button
                    className="report-secondary-button report-small-button"
                    type="button"
                    onClick={handleResetDetectedValues}
                  >
                    Reset to OCR
                  </button>
                </div>
              </div>

              {analysis.attacker &&
                editableAttacker && (
                  <ArmyPreview
                    title="Attacker"
                    reading={analysis.attacker}
                    army={editableAttacker}
                    debugMode={showDebug}
                    showAllUnits={showAllUnits}
                    onQuantityChange={updateAttackerQuantity}
                  />
                )}

              <ArmyPreview
                title="Defender"
                reading={analysis.defender}
                army={editableDefender}
                debugMode={showDebug}
                showAllUnits={showAllUnits}
                onQuantityChange={updateDefenderQuantity}
              />

              {(analysis.reportType === 'battle' ||
                analysis.defenderWallLevel !== null) && (
                <div className="report-wall-result">
                  <div>
                    <span>
                      Initial defender wall
                    </span>
                    <small>
                      Applied together with the defender when a level is available.
                    </small>
                  </div>

                  <div className="report-wall-editor">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={1}
                      aria-label="Initial defender wall level"
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
                <details className="report-warning-list">
                  <summary>
                    {analysis.warnings.length} analysis {analysis.warnings.length === 1 ? 'note' : 'notes'}
                  </summary>

                  <div>
                    {analysis.warnings.map(
                      (warning) => (
                        <p key={warning}>
                          {warning}
                        </p>
                      ),
                    )}
                  </div>
                </details>
              )}

              <div className="report-apply-footer">
                <div>
                  <strong>Ready to apply</strong>
                  <span>
                    Review the visible values, then import the army into the simulator.
                  </span>
                </div>

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
                    className={
                      analysis.reportType === 'spy'
                        ? 'report-primary-button'
                        : 'report-secondary-button'
                    }
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
              </div>

              {appliedMessage && (
                <div
                  className="report-import-success"
                  role="status"
                >
                  <strong>✓ Imported</strong>
                  <span>{appliedMessage}</span>
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
