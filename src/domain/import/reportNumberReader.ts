import type { Worker } from 'tesseract.js'

import type { Army } from '../../types/Battle'
import type { UnitId } from '../../types/Unit'

import {
  REPORT_UNIT_LABELS,
  REPORT_UNIT_ORDER,
} from './reportTypes'

import type {
  ReportArmyReading,
  ReportUnitReading,
} from './reportTypes'

export interface LoadedReportImage {
  image: HTMLImageElement
  width: number
  height: number
  dispose: () => void
}

export interface ReportRowTemplate {
  leftRatio: number
  rightRatio: number
  centerYByWidth: number
  heightByWidth: number
}

interface NormalizedCrop {
  leftRatio: number
  topByWidth: number
  widthRatio: number
  heightByWidth: number
}

interface OcrCandidate {
  quantity: number | null
  rawText: string
  confidence: number
}

const CELL_HORIZONTAL_INSET = 0.055

/*
 * Battle-report quantities sit very close to the lower edge of the row.
 * The original 2%-of-width crop was clipping the bottom pixels of glyphs
 * such as TW2's 3, which made Tesseract read 3.171 as 2.171 and 34 as 24.
 *
 * Keep the detected row center, but expand the OCR window mostly downward.
 * At a 713px-wide report this adds about 0.7px above and 4.3px below.
 * The red loss row remains outside the crop, while the complete black digit
 * glyph is preserved. Spy rows are already taller and are left unchanged.
 */
const BATTLE_CELL_TOP_PADDING_BY_WIDTH = 0.001
const BATTLE_CELL_BOTTOM_PADDING_BY_WIDTH = 0.006
const BATTLE_ROW_MAX_HEIGHT_BY_WIDTH = 0.025

const PRIMARY_OCR_SCALE = 12
const SECONDARY_OCR_SCALE = 14
const TERTIARY_OCR_SCALE = 14
const BINARY_OCR_SCALE = 14

const clamp = (
  value: number,
  minimum: number,
  maximum: number,
): number => {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  )
}

export const createEmptyReportArmy = (): Army => ({
  spearman: 0,
  swordsman: 0,
  axe: 0,
  archer: 0,
  lightCavalry: 0,
  mountedArcher: 0,
  heavyCavalry: 0,
  ram: 0,
  catapult: 0,
  berserker: 0,
  trebuchet: 0,
  nobleman: 0,
  paladin: 0,
})

export const loadReportImage = (
  file: File,
): Promise<LoadedReportImage> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      resolve({
        image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        dispose: () => {
          URL.revokeObjectURL(objectUrl)
        },
      })
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(
        new Error('Could not load the selected screenshot.'),
      )
    }

    image.src = objectUrl
  })
}

const cropToCanvas = (
  source: LoadedReportImage,
  crop: NormalizedCrop,
  scale = 1,
  smooth = false,
): HTMLCanvasElement => {
  const sourceX = clamp(
    Math.round(source.width * crop.leftRatio),
    0,
    source.width - 1,
  )

  const sourceY = clamp(
    Math.round(source.width * crop.topByWidth),
    0,
    source.height - 1,
  )

  const sourceWidth = clamp(
    Math.round(source.width * crop.widthRatio),
    1,
    source.width - sourceX,
  )

  const sourceHeight = clamp(
    Math.round(source.width * crop.heightByWidth),
    1,
    source.height - sourceY,
  )

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, sourceWidth * scale)
  canvas.height = Math.max(1, sourceHeight * scale)

  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  if (!context) {
    throw new Error('Canvas is not available in this browser.')
  }

  context.imageSmoothingEnabled = smooth

  if (smooth) {
    context.imageSmoothingQuality = 'high'
  }

  context.drawImage(
    source.image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  return canvas
}

const getPixelMetrics = (
  red: number,
  green: number,
  blue: number,
) => {
  const brightness =
    red * 0.299 +
    green * 0.587 +
    blue * 0.114

  const spread =
    Math.max(red, green, blue) -
    Math.min(red, green, blue)

  return {
    brightness,
    spread,
  }
}

/**
 * Quantities in Tribal Wars battle reports are rendered as very dark text on
 * a light brown background. Empty battle slots have no printed zero at all.
 * Detecting real digit ink before OCR prevents cell textures from becoming
 * fake values such as "4" or "52".
 */
const hasNumberInk = (
  canvas: HTMLCanvasElement,
): boolean => {
  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  if (!context) {
    return true
  }

  const imageData = context.getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  )

  let darkPixels = 0
  let veryDarkPixels = 0

  for (
    let index = 0;
    index < imageData.data.length;
    index += 4
  ) {
    const red = imageData.data[index]
    const green = imageData.data[index + 1]
    const blue = imageData.data[index + 2]

    const {
      brightness,
      spread,
    } = getPixelMetrics(red, green, blue)

    const neutralDark =
      brightness <= 112 &&
      spread <= 78

    if (neutralDark) {
      darkPixels += 1
    }

    if (
      brightness <= 72 &&
      spread <= 82
    ) {
      veryDarkPixels += 1
    }
  }

  /*
   * A one-digit quantity still contains a handful of dark source pixels. The
   * dual threshold keeps antialiasing while rejecting the tan checker texture.
   */
  return (
    veryDarkPixels >= 2 ||
    darkPixels >= 5
  )
}

interface LeadingGlyphShape {
  width: number
  height: number
  pixels: Uint8Array
}

/**
 * The report debug view showed that the crop itself is correct, but Tesseract
 * reads the TW2 bitmap glyph "3" as "2" (3.171 -> 2.171 and 34 -> 24).
 *
 * Instead of asking OCR to classify that same tiny glyph again, detect the
 * glyph geometry directly. A 3 has ink on the right side of the lower-middle
 * area and essentially no ink on the lower-left. A 2 has the opposite lower
 * stroke pattern. This keeps real values beginning with 2 intact.
 */
const findLeadingGlyphShape = (
  canvas: HTMLCanvasElement,
): LeadingGlyphShape | null => {
  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  if (!context) {
    return null
  }

  const imageData = context.getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  )

  const width = canvas.width
  const height = canvas.height
  const dark = new Uint8Array(width * height)
  const rowCounts = new Uint16Array(height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      const red = imageData.data[index]
      const green = imageData.data[index + 1]
      const blue = imageData.data[index + 2]

      const {
        brightness,
        spread,
      } = getPixelMetrics(red, green, blue)

      const isDigitInk =
        brightness <= 122 &&
        spread <= 92

      if (isDigitInk) {
        dark[y * width + x] = 1
        rowCounts[y] += 1
      }
    }
  }

  /*
   * Find the lowest compact horizontal text band. This deliberately ignores
   * the unit icon / cell border above the quantity. A troop number normally
   * occupies 4-8 source pixels vertically in the calibrated screenshots.
   */
  const maximumUsefulRowInk = Math.max(
    8,
    Math.floor(width * 0.45),
  )

  const bands: Array<{
    top: number
    bottom: number
  }> = []

  let y = 0

  while (y < height) {
    const useful =
      rowCounts[y] >= 1 &&
      rowCounts[y] <= maximumUsefulRowInk

    if (!useful) {
      y += 1
      continue
    }

    const top = y

    while (
      y + 1 < height &&
      rowCounts[y + 1] >= 1 &&
      rowCounts[y + 1] <= maximumUsefulRowInk
    ) {
      y += 1
    }

    const bottom = y

    if (bottom - top + 1 >= 3) {
      bands.push({
        top,
        bottom,
      })
    }

    y += 1
  }

  if (bands.length === 0) {
    return null
  }

  const band = bands[bands.length - 1]
  const bandHeight = band.bottom - band.top + 1
  const columnCounts = new Uint16Array(width)

  for (let x = 0; x < width; x++) {
    for (
      let currentY = band.top;
      currentY <= band.bottom;
      currentY++
    ) {
      columnCounts[x] += dark[currentY * width + x]
    }
  }

  /*
   * A thousands separator has only one dark pixel vertically. Requiring two
   * pixels makes the first run correspond to the first digit, not the dot.
   */
  let left = -1
  let right = -1

  for (let x = 0; x < width; x++) {
    if (columnCounts[x] < 2) {
      continue
    }

    left = x
    right = x

    while (
      right + 1 < width &&
      columnCounts[right + 1] >= 2
    ) {
      right += 1
    }

    break
  }

  if (left < 0 || right < left) {
    return null
  }

  const glyphWidth = right - left + 1

  if (
    glyphWidth < 2 ||
    bandHeight < 4
  ) {
    return null
  }

  const pixels = new Uint8Array(
    glyphWidth * bandHeight,
  )

  for (let glyphY = 0; glyphY < bandHeight; glyphY++) {
    for (let glyphX = 0; glyphX < glyphWidth; glyphX++) {
      pixels[glyphY * glyphWidth + glyphX] =
        dark[(band.top + glyphY) * width + left + glyphX]
    }
  }

  return {
    width: glyphWidth,
    height: bandHeight,
    pixels,
  }
}

const looksLikeTw2Three = (
  canvas: HTMLCanvasElement,
): boolean => {
  const glyph = findLeadingGlyphShape(canvas)

  if (!glyph) {
    return false
  }

  /*
   * Ignore the final row because both 2 and 3 can have a bottom horizontal
   * stroke. The decisive part is the lower-middle: 3 stays on the right,
   * while 2 moves to the left.
   */
  const startY = Math.max(
    1,
    Math.floor(glyph.height * 0.50),
  )
  const endYExclusive = Math.max(
    startY + 1,
    glyph.height - 1,
  )
  const splitX = Math.max(
    1,
    Math.floor(glyph.width / 2),
  )

  let lowerLeftInk = 0
  let lowerRightInk = 0

  for (
    let y = startY;
    y < endYExclusive;
    y++
  ) {
    for (let x = 0; x < glyph.width; x++) {
      const value = glyph.pixels[y * glyph.width + x]

      if (!value) {
        continue
      }

      if (x < splitX) {
        lowerLeftInk += 1
      } else {
        lowerRightInk += 1
      }
    }
  }

  return (
    lowerRightInk >= 2 &&
    lowerLeftInk === 0
  )
}

const verifyLeadingTwoOrThree = (
  detectionCanvas: HTMLCanvasElement,
  candidate: OcrCandidate,
): OcrCandidate => {
  if (candidate.quantity === null) {
    return candidate
  }

  const quantityText = String(candidate.quantity)

  if (!quantityText.startsWith('2')) {
    return candidate
  }

  /*
   * Prefer deterministic pixel geometry over a second OCR pass. The debug
   * crops supplied by the UI prove the source glyph is a clear 3 even when
   * Tesseract reports 2.
   */
  if (looksLikeTw2Three(detectionCanvas)) {
    const correctedText = `3${quantityText.slice(1)}`
    const correctedQuantity = Number(correctedText)

    if (Number.isSafeInteger(correctedQuantity)) {
      return {
        quantity: correctedQuantity,
        rawText:
          `${candidate.rawText} [TW2 glyph geometry corrected leading 2 -> 3]`,
        confidence: Math.max(
          candidate.confidence,
          92,
        ),
      }
    }
  }

  return candidate
}

const grayscaleCanvas = (
  canvas: HTMLCanvasElement,
  contrast = 1,
): HTMLCanvasElement => {
  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  if (!context) {
    return canvas
  }

  const imageData = context.getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  )

  for (
    let index = 0;
    index < imageData.data.length;
    index += 4
  ) {
    const red = imageData.data[index]
    const green = imageData.data[index + 1]
    const blue = imageData.data[index + 2]

    const grayscale =
      red * 0.299 +
      green * 0.587 +
      blue * 0.114

    const adjusted = clamp(
      (grayscale - 128) * contrast + 128,
      0,
      255,
    )

    imageData.data[index] = adjusted
    imageData.data[index + 1] = adjusted
    imageData.data[index + 2] = adjusted
    imageData.data[index + 3] = 255
  }

  context.putImageData(
    imageData,
    0,
    0,
  )

  return canvas
}

const binaryNumberCanvas = (
  canvas: HTMLCanvasElement,
): HTMLCanvasElement => {
  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  if (!context) {
    return canvas
  }

  const imageData = context.getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  )

  for (
    let index = 0;
    index < imageData.data.length;
    index += 4
  ) {
    const red = imageData.data[index]
    const green = imageData.data[index + 1]
    const blue = imageData.data[index + 2]

    const {
      brightness,
      spread,
    } = getPixelMetrics(red, green, blue)

    const digitPixel =
      brightness <= 128 &&
      spread <= 88

    const value = digitPixel
      ? 0
      : 255

    imageData.data[index] = value
    imageData.data[index + 1] = value
    imageData.data[index + 2] = value
    imageData.data[index + 3] = 255
  }

  context.putImageData(
    imageData,
    0,
    0,
  )

  return canvas
}

const parseTroopQuantity = (
  rawText: string,
): number | null => {
  const digits = rawText.replace(/\D/g, '')

  if (!digits) {
    return null
  }

  const parsed = Number(digits)

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 0
  ) {
    return null
  }

  return parsed
}

const recognizeQuantity = async (
  worker: Worker,
  canvas: HTMLCanvasElement,
): Promise<OcrCandidate> => {
  const result = await worker.recognize(canvas)
  const rawText = result.data.text.trim()

  return {
    quantity: parseTroopQuantity(rawText),
    rawText,
    confidence: Math.max(
      0,
      Math.round(result.data.confidence ?? 0),
    ),
  }
}

const chooseCandidate = (
  candidates: OcrCandidate[],
): OcrCandidate => {
  const valid = candidates.filter(
    (candidate) => candidate.quantity !== null,
  )

  if (valid.length === 0) {
    return candidates.reduce<OcrCandidate>(
      (best, candidate) =>
        candidate.confidence > best.confidence
          ? candidate
          : best,
      {
        quantity: null,
        rawText: '',
        confidence: 0,
      },
    )
  }

  const votes = new Map<
    number,
    {
      count: number
      confidence: number
      candidate: OcrCandidate
    }
  >()

  for (const candidate of valid) {
    const quantity = candidate.quantity as number
    const current = votes.get(quantity)

    if (!current) {
      votes.set(quantity, {
        count: 1,
        confidence: candidate.confidence,
        candidate,
      })

      continue
    }

    current.count += 1
    current.confidence += candidate.confidence

    if (
      candidate.confidence >
      current.candidate.confidence
    ) {
      current.candidate = candidate
    }
  }

  const ranked = [...votes.values()].sort(
    (left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count
      }

      return (
        right.confidence -
        left.confidence
      )
    },
  )

  const winner = ranked[0]

  return {
    ...winner.candidate,
    confidence: Math.round(
      winner.confidence /
        winner.count,
    ),
  }
}

const readNumberCell = async (
  worker: Worker,
  source: LoadedReportImage,
  crop: NormalizedCrop,
  unitId: UnitId,
  verifyBattleLeadingGlyph: boolean,
): Promise<ReportUnitReading> => {
  const detectionCanvas = cropToCanvas(
    source,
    crop,
    1,
    false,
  )

  const debugCanvas = cropToCanvas(
    source,
    crop,
    6,
    false,
  )

  const debugCropDataUrl =
    debugCanvas.toDataURL('image/png')

  if (!hasNumberInk(detectionCanvas)) {
    return {
      unitId,
      label: REPORT_UNIT_LABELS[unitId],
      quantity: 0,
      confidence: 100,
      rawText: '',
      assumedZero: true,
      debugCropDataUrl,
    }
  }

  const primaryCanvas = grayscaleCanvas(
    cropToCanvas(
      source,
      crop,
      PRIMARY_OCR_SCALE,
      false,
    ),
    1.05,
  )

  const secondaryCanvas = grayscaleCanvas(
    cropToCanvas(
      source,
      crop,
      SECONDARY_OCR_SCALE,
      true,
    ),
    1.0,
  )

  const tertiaryCanvas = grayscaleCanvas(
    cropToCanvas(
      source,
      crop,
      TERTIARY_OCR_SCALE,
      true,
    ),
    1.55,
  )

  const firstAttempt = await recognizeQuantity(
    worker,
    primaryCanvas,
  )

  const secondAttempt = await recognizeQuantity(
    worker,
    secondaryCanvas,
  )

  const thirdAttempt = await recognizeQuantity(
    worker,
    tertiaryCanvas,
  )

  let candidates = [
    firstAttempt,
    secondAttempt,
    thirdAttempt,
  ]

  const validQuantities = candidates
    .map((candidate) => candidate.quantity)
    .filter((quantity): quantity is number => quantity !== null)

  const hasConsensus = validQuantities.some(
    (quantity, index) =>
      validQuantities.indexOf(quantity) !== index,
  )

  if (!hasConsensus) {
    const binaryCanvas = binaryNumberCanvas(
      cropToCanvas(
        source,
        crop,
        BINARY_OCR_SCALE,
        false,
      ),
    )

    const binaryAttempt = await recognizeQuantity(
      worker,
      binaryCanvas,
    )

    candidates = [
      ...candidates,
      binaryAttempt,
    ]
  }

  const selected = chooseCandidate(candidates)

  const verified = verifyBattleLeadingGlyph
    ? verifyLeadingTwoOrThree(
        detectionCanvas,
        selected,
      )
    : selected

  if (verified.quantity !== null) {
    return {
      unitId,
      label: REPORT_UNIT_LABELS[unitId],
      quantity: verified.quantity,
      confidence: verified.confidence,
      rawText: verified.rawText,
      assumedZero: false,
      debugCropDataUrl,
    }
  }

  return {
    unitId,
    label: REPORT_UNIT_LABELS[unitId],
    quantity: 0,
    confidence: selected.confidence,
    rawText: selected.rawText,
    assumedZero: true,
    debugCropDataUrl,
  }
}

export const readArmyRow = async (
  worker: Worker,
  source: LoadedReportImage,
  template: ReportRowTemplate,
  onCellRead?: (
    completed: number,
    total: number,
  ) => void,
): Promise<ReportArmyReading> => {
  const army = createEmptyReportArmy()
  const readings: ReportUnitReading[] = []
  const totalWidth =
    template.rightRatio - template.leftRatio
  const cellWidth = totalWidth / REPORT_UNIT_ORDER.length

  for (
    let index = 0;
    index < REPORT_UNIT_ORDER.length;
    index++
  ) {
    const unitId = REPORT_UNIT_ORDER[index]
    const cellLeft =
      template.leftRatio + index * cellWidth

    const isCompactBattleRow =
      template.heightByWidth <=
      BATTLE_ROW_MAX_HEIGHT_BY_WIDTH

    const topPadding =
      isCompactBattleRow
        ? BATTLE_CELL_TOP_PADDING_BY_WIDTH
        : 0

    const bottomPadding =
      isCompactBattleRow
        ? BATTLE_CELL_BOTTOM_PADDING_BY_WIDTH
        : 0

    const crop: NormalizedCrop = {
      leftRatio:
        cellLeft +
        cellWidth * CELL_HORIZONTAL_INSET,
      topByWidth:
        template.centerYByWidth -
        template.heightByWidth / 2 -
        topPadding,
      widthRatio:
        cellWidth *
        (1 - CELL_HORIZONTAL_INSET * 2),
      heightByWidth:
        template.heightByWidth +
        topPadding +
        bottomPadding,
    }

    const reading = await readNumberCell(
      worker,
      source,
      crop,
      unitId,
      isCompactBattleRow,
    )

    army[unitId] = reading.quantity
    readings.push(reading)

    onCellRead?.(
      index + 1,
      REPORT_UNIT_ORDER.length,
    )
  }

  const meaningfulReadings = readings.filter(
    (reading) => !reading.assumedZero,
  )

  const averageConfidence =
    meaningfulReadings.length === 0
      ? 100
      : Math.round(
          meaningfulReadings.reduce(
            (sum, reading) =>
              sum + reading.confidence,
            0,
          ) / meaningfulReadings.length,
        )

  return {
    army,
    units: readings,
    averageConfidence,
  }
}

export const cropTextRegion = (
  source: LoadedReportImage,
  crop: NormalizedCrop,
  scale = 2,
): HTMLCanvasElement => {
  return cropToCanvas(
    source,
    crop,
    scale,
    true,
  )
}
