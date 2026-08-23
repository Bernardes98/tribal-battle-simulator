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

const CELL_HORIZONTAL_INSET = 0.1
const OCR_SCALE = 4

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
  scale = OCR_SCALE,
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

  context.imageSmoothingEnabled = false
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

const percentile = (
  sortedValues: number[],
  percentileValue: number,
): number => {
  if (sortedValues.length === 0) {
    return 0
  }

  const index = clamp(
    Math.floor(
      (sortedValues.length - 1) * percentileValue,
    ),
    0,
    sortedValues.length - 1,
  )

  return sortedValues[index]
}

const preprocessNumberCanvas = (
  canvas: HTMLCanvasElement,
): {
  canvas: HTMLCanvasElement
  contentDetected: boolean
} => {
  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  if (!context) {
    return {
      canvas,
      contentDetected: true,
    }
  }

  const imageData = context.getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  )

  const grayscaleValues: number[] = []

  for (
    let index = 0;
    index < imageData.data.length;
    index += 4
  ) {
    const red = imageData.data[index]
    const green = imageData.data[index + 1]
    const blue = imageData.data[index + 2]

    grayscaleValues.push(
      Math.round(
        red * 0.299 +
          green * 0.587 +
          blue * 0.114,
      ),
    )
  }

  const sorted = [...grayscaleValues].sort(
    (left, right) => left - right,
  )

  const low = percentile(sorted, 0.12)
  const high = percentile(sorted, 0.88)
  const contrastRange = Math.max(24, high - low)
  const threshold = low + contrastRange * 0.46

  let darkPixels = 0

  for (
    let pixelIndex = 0;
    pixelIndex < grayscaleValues.length;
    pixelIndex++
  ) {
    const grayscale = grayscaleValues[pixelIndex]
    const normalized = clamp(
      (grayscale - low) / contrastRange,
      0,
      1,
    )

    const isDark =
      grayscale <= threshold &&
      normalized < 0.55

    const value = isDark ? 0 : 255

    if (isDark) {
      darkPixels += 1
    }

    const dataIndex = pixelIndex * 4

    imageData.data[dataIndex] = value
    imageData.data[dataIndex + 1] = value
    imageData.data[dataIndex + 2] = value
    imageData.data[dataIndex + 3] = 255
  }

  context.putImageData(
    imageData,
    0,
    0,
  )

  const darkPixelRatio =
    darkPixels / Math.max(1, grayscaleValues.length)

  return {
    canvas,
    contentDetected:
      darkPixelRatio >= 0.008 &&
      darkPixelRatio <= 0.32,
  }
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

const readNumberCell = async (
  worker: Worker,
  source: LoadedReportImage,
  crop: NormalizedCrop,
  unitId: UnitId,
): Promise<ReportUnitReading> => {
  const rawCanvas = cropToCanvas(
    source,
    crop,
  )

  const {
    canvas,
    contentDetected,
  } = preprocessNumberCanvas(rawCanvas)

  if (!contentDetected) {
    return {
      unitId,
      label: REPORT_UNIT_LABELS[unitId],
      quantity: 0,
      confidence: 100,
      rawText: '',
      assumedZero: true,
    }
  }

  const result = await worker.recognize(canvas)
  const rawText = result.data.text.trim()
  const quantity = parseTroopQuantity(rawText)

  if (quantity === null) {
    return {
      unitId,
      label: REPORT_UNIT_LABELS[unitId],
      quantity: 0,
      confidence: Math.max(
        0,
        Math.round(result.data.confidence ?? 0),
      ),
      rawText,
      assumedZero: true,
    }
  }

  return {
    unitId,
    label: REPORT_UNIT_LABELS[unitId],
    quantity,
    confidence: Math.max(
      0,
      Math.round(result.data.confidence ?? 0),
    ),
    rawText,
    assumedZero: false,
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

    const crop: NormalizedCrop = {
      leftRatio:
        cellLeft +
        cellWidth * CELL_HORIZONTAL_INSET,
      topByWidth:
        template.centerYByWidth -
        template.heightByWidth / 2,
      widthRatio:
        cellWidth *
        (1 - CELL_HORIZONTAL_INSET * 2),
      heightByWidth: template.heightByWidth,
    }

    const reading = await readNumberCell(
      worker,
      source,
      crop,
      unitId,
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
  )
}
