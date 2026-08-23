import {
  createWorker,
  OEM,
  PSM,
} from 'tesseract.js'

import {
  cropTextRegion,
  loadReportImage,
  readArmyRow,
} from './reportNumberReader'

import type {
  ReportRowTemplate,
} from './reportNumberReader'

import type {
  ReportConfidence,
  ReportScreenshotAnalysis,
  TribalReportType,
} from './reportTypes'

export interface ReportAnalysisProgress {
  phase: string
  percent: number
}

interface AnalyzeOptions {
  onProgress?: (
    progress: ReportAnalysisProgress,
  ) => void
}

const SPY_DEFENDER_TOTAL_ROW: ReportRowTemplate = {
  leftRatio: 0.083,
  rightRatio: 0.978,
  centerYByWidth: 0.506,
  heightByWidth: 0.034,
}

const BATTLE_ATTACKER_INITIAL_ROW: ReportRowTemplate = {
  leftRatio: 0.083,
  rightRatio: 0.973,
  centerYByWidth: 0.482,
  heightByWidth: 0.035,
}

const BATTLE_DEFENDER_INITIAL_ROW: ReportRowTemplate = {
  leftRatio: 0.083,
  rightRatio: 0.973,
  centerYByWidth: 0.724,
  heightByWidth: 0.035,
}

const normalizeText = (
  value: string,
): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const setProgress = (
  options: AnalyzeOptions,
  phase: string,
  percent: number,
) => {
  options.onProgress?.({
    phase,
    percent: Math.max(
      0,
      Math.min(100, Math.round(percent)),
    ),
  })
}

const detectReportTypeFromText = (
  rawText: string,
): TribalReportType | null => {
  const text = normalizeText(rawText)

  if (
    text.includes('relatorio de espionagem') ||
    text.includes('espionagem') ||
    text.includes('spy report')
  ) {
    return 'spy'
  }

  if (
    text.includes('relatorio de batalha') ||
    text.includes('batalha') ||
    text.includes('battle report')
  ) {
    return 'battle'
  }

  return null
}

const fallbackReportTypeFromShape = (
  width: number,
  height: number,
): TribalReportType => {
  const heightToWidth = height / width

  return heightToWidth < 0.82
    ? 'spy'
    : 'battle'
}

const readWallLevel = async (
  worker: Awaited<ReturnType<typeof createWorker>>,
  source: Awaited<ReturnType<typeof loadReportImage>>,
): Promise<number | null> => {
  await worker.setParameters({
    tessedit_char_whitelist: '',
    tessedit_pageseg_mode: PSM.SINGLE_LINE,
  })

  const wallRegion = cropTextRegion(
    source,
    {
      leftRatio: 0.08,
      topByWidth: 0.765,
      widthRatio: 0.88,
      heightByWidth: 0.064,
    },
    2.5,
  )

  const result = await worker.recognize(wallRegion)
  const text = normalizeText(result.data.text)

  const matches = [
    ...text.matchAll(/nivel\s*(\d{1,2})/g),
  ]

  if (matches.length > 0) {
    const level = Number(matches[0][1])

    if (
      Number.isInteger(level) &&
      level >= 0 &&
      level <= 30
    ) {
      return level
    }
  }

  const fallbackMatch = text.match(
    /muralha[^0-9]{0,40}(\d{1,2})/,
  )

  if (fallbackMatch?.[1]) {
    const level = Number(fallbackMatch[1])

    if (
      Number.isInteger(level) &&
      level >= 0 &&
      level <= 30
    ) {
      return level
    }
  }

  return null
}

const confidenceFromScore = (
  score: number,
): ReportConfidence => {
  if (score >= 78) {
    return 'high'
  }

  if (score >= 55) {
    return 'medium'
  }

  return 'low'
}

export const analyzeReportScreenshot = async (
  file: File,
  options: AnalyzeOptions = {},
): Promise<ReportScreenshotAnalysis> => {
  setProgress(
    options,
    'Loading screenshot',
    2,
  )

  const source = await loadReportImage(file)

  if (
    source.width < 500 ||
    source.height < 300
  ) {
    source.dispose()

    throw new Error(
      'The screenshot is too small. Upload the complete Tribal Wars report window.',
    )
  }

  let worker:
    Awaited<ReturnType<typeof createWorker>> | null = null

  try {
    setProgress(
      options,
      'Starting OCR',
      5,
    )

    worker = await createWorker(
      ['por', 'eng'],
      OEM.LSTM_ONLY,
    )

    setProgress(
      options,
      'Detecting report type',
      10,
    )

    const headerRegion = cropTextRegion(
      source,
      {
        leftRatio: 0.01,
        topByWidth: 0.01,
        widthRatio: 0.94,
        heightByWidth: 0.19,
      },
      2,
    )

    const headerResult =
      await worker.recognize(headerRegion)

    const detectedByText =
      detectReportTypeFromText(
        headerResult.data.text,
      )

    const reportType =
      detectedByText ??
      fallbackReportTypeFromShape(
        source.width,
        source.height,
      )

    await worker.setParameters({
      tessedit_char_whitelist:
        '0123456789.',
      tessedit_pageseg_mode: PSM.SINGLE_WORD,
    })

    if (reportType === 'spy') {
      setProgress(
        options,
        'Reading defender troops',
        18,
      )

      const defender = await readArmyRow(
        worker,
        source,
        SPY_DEFENDER_TOTAL_ROW,
        (completed, total) => {
          setProgress(
            options,
            `Reading defender troops ${completed}/${total}`,
            18 +
              (completed / total) * 72,
          )
        },
      )

      const suspiciousUnits = defender.units.filter(
        (unit) =>
          unit.assumedZero &&
          unit.confidence < 45,
      )

      const warnings: string[] = []

      if (!detectedByText) {
        warnings.push(
          'The report type was inferred from the screenshot layout because the title could not be read clearly.',
        )
      }

      if (suspiciousUnits.length > 0) {
        warnings.push(
          `${suspiciousUnits.length} troop cells were difficult to read and were interpreted as zero. Review the preview before applying.`,
        )
      }

      setProgress(
        options,
        'Analysis complete',
        100,
      )

      const headerConfidence =
        detectedByText
          ? Math.max(
              60,
              Math.round(
                headerResult.data.confidence ?? 0,
              ),
            )
          : 45

      const score =
        headerConfidence * 0.35 +
        defender.averageConfidence * 0.65

      return {
        reportType,
        confidence:
          confidenceFromScore(score),
        attacker: null,
        defender,
        defenderWallLevel: null,
        warnings,
        sourceWidth: source.width,
        sourceHeight: source.height,
      }
    }

    setProgress(
      options,
      'Reading attacker troops',
      16,
    )

    const attacker = await readArmyRow(
      worker,
      source,
      BATTLE_ATTACKER_INITIAL_ROW,
      (completed, total) => {
        setProgress(
          options,
          `Reading attacker troops ${completed}/${total}`,
          16 +
            (completed / total) * 34,
        )
      },
    )

    setProgress(
      options,
      'Reading defender troops',
      52,
    )

    const defender = await readArmyRow(
      worker,
      source,
      BATTLE_DEFENDER_INITIAL_ROW,
      (completed, total) => {
        setProgress(
          options,
          `Reading defender troops ${completed}/${total}`,
          52 +
            (completed / total) * 34,
        )
      },
    )

    setProgress(
      options,
      'Reading wall level',
      89,
    )

    const defenderWallLevel =
      await readWallLevel(
        worker,
        source,
      )

    const warnings: string[] = []

    if (!detectedByText) {
      warnings.push(
        'The report type was inferred from the screenshot layout because the title could not be read clearly.',
      )
    }

    const suspiciousCells = [
      ...attacker.units,
      ...defender.units,
    ].filter(
      (unit) =>
        unit.assumedZero &&
        unit.confidence < 45,
    )

    if (suspiciousCells.length > 0) {
      warnings.push(
        `${suspiciousCells.length} troop cells were difficult to read and were interpreted as zero. Review both armies before applying.`,
      )
    }

    if (defenderWallLevel === null) {
      warnings.push(
        'The initial wall level could not be read. The current wall setting will be kept.',
      )
    }

    const headerConfidence =
      detectedByText
        ? Math.max(
            60,
            Math.round(
              headerResult.data.confidence ?? 0,
            ),
          )
        : 45

    const score =
      headerConfidence * 0.2 +
      attacker.averageConfidence * 0.35 +
      defender.averageConfidence * 0.45

    setProgress(
      options,
      'Analysis complete',
      100,
    )

    return {
      reportType,
      confidence:
        confidenceFromScore(score),
      attacker,
      defender,
      defenderWallLevel,
      warnings,
      sourceWidth: source.width,
      sourceHeight: source.height,
    }
  } finally {
    if (worker) {
      await worker.terminate()
    }

    source.dispose()
  }
}
