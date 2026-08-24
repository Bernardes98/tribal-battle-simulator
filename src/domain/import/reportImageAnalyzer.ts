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
  ReportArmyReading,
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

/*
 * Regular battle report layout.
 * This is the compact report variant used by the first calibration image.
 */
const BATTLE_ATTACKER_INITIAL_ROW: ReportRowTemplate = {
  leftRatio: 0.083,
  rightRatio: 0.968,
  centerYByWidth: 0.478,
  heightByWidth: 0.020,
}

const BATTLE_DEFENDER_INITIAL_ROW: ReportRowTemplate = {
  leftRatio: 0.083,
  rightRatio: 0.968,
  centerYByWidth: 0.718,
  heightByWidth: 0.020,
}

/*
 * "Relatório Detalhado" adds an extra bar to the report and pushes both
 * troop rows downward. The user's 713x781 example is this variant.
 */
const DETAILED_BATTLE_ATTACKER_INITIAL_ROW: ReportRowTemplate = {
  leftRatio: 0.079,
  rightRatio: 0.965,
  centerYByWidth: 0.552,
  heightByWidth: 0.020,
}

const DETAILED_BATTLE_DEFENDER_INITIAL_ROW: ReportRowTemplate = {
  leftRatio: 0.079,
  rightRatio: 0.965,
  centerYByWidth: 0.770,
  heightByWidth: 0.020,
}

const SPY_DEFENDER_TOTAL_ROW: ReportRowTemplate = {
  leftRatio: 0.083,
  rightRatio: 0.978,
  centerYByWidth: 0.500,
  heightByWidth: 0.026,
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

const isDetailedBattleReport = (
  rawText: string,
): boolean => {
  const text = normalizeText(rawText)

  return (
    text.includes('relatorio detalhado') ||
    text.includes('detailed report')
  )
}

/*
 * The detailed battle report has a distinctive blue/steel horizontal bar
 * below the report header. OCR frequently misses the text inside that bar,
 * especially after the screenshot has been scaled by the browser. Detecting
 * the bar from its pixels is considerably more reliable than using OCR to
 * decide which troop-row coordinates must be used.
 */
const hasDetailedBattleLayoutBar = (
  source: Awaited<ReturnType<typeof loadReportImage>>,
): boolean => {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height

  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  if (!context) {
    return false
  }

  context.drawImage(source.image, 0, 0)

  const left = Math.round(source.width * 0.08)
  const right = Math.round(source.width * 0.92)

  /*
   * Restrict the search to the vertical band where "Relatório Detalhado"
   * appears. This deliberately excludes the normal blue title bar at the top
   * of every Tribal Wars report.
   */
  const top = Math.max(0, Math.round(source.width * 0.14))
  const bottom = Math.min(
    source.height,
    Math.round(source.width * 0.24),
  )

  if (right <= left || bottom <= top) {
    return false
  }

  const width = right - left
  const height = bottom - top
  const imageData = context.getImageData(
    left,
    top,
    width,
    height,
  )

  let bestRowRatio = 0
  let consecutiveRows = 0
  let bestConsecutiveRows = 0

  for (let y = 0; y < height; y++) {
    let blueSteelPixels = 0

    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      const red = imageData.data[index]
      const green = imageData.data[index + 1]
      const blue = imageData.data[index + 2]

      const brightness =
        red * 0.299 +
        green * 0.587 +
        blue * 0.114

      const isBlueSteel =
        brightness >= 38 &&
        brightness <= 125 &&
        green >= red + 6 &&
        blue >= red + 12 &&
        blue >= green + 4

      if (isBlueSteel) {
        blueSteelPixels += 1
      }
    }

    const rowRatio = blueSteelPixels / width
    bestRowRatio = Math.max(bestRowRatio, rowRatio)

    if (rowRatio >= 0.48) {
      consecutiveRows += 1
      bestConsecutiveRows = Math.max(
        bestConsecutiveRows,
        consecutiveRows,
      )
    } else {
      consecutiveRows = 0
    }
  }

  return (
    bestRowRatio >= 0.62 &&
    bestConsecutiveRows >= Math.max(3, Math.round(source.width * 0.006))
  )
}


interface BattleDetectedRows {
  attacker: ReportRowTemplate
  defender: ReportRowTemplate
  dynamic: boolean
}

const getSourceImageData = (
  source: Awaited<ReturnType<typeof loadReportImage>>,
): ImageData | null => {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height

  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  if (!context) {
    return null
  }

  context.drawImage(source.image, 0, 0)

  return context.getImageData(
    0,
    0,
    source.width,
    source.height,
  )
}

const isRedLossPixel = (
  red: number,
  green: number,
  blue: number,
): boolean => {
  return (
    red >= 85 &&
    red - green >= 28 &&
    red - blue >= 24 &&
    red >= green * 1.28
  )
}

const isDarkQuantityPixel = (
  red: number,
  green: number,
  blue: number,
): boolean => {
  const brightness =
    red * 0.299 +
    green * 0.587 +
    blue * 0.114

  const spread =
    Math.max(red, green, blue) -
    Math.min(red, green, blue)

  return (
    brightness <= 108 &&
    spread <= 78
  )
}

const getCellRowCounts = (
  imageData: ImageData,
  sourceWidth: number,
  y: number,
  leftRatio: number,
  rightRatio: number,
  predicate: (
    red: number,
    green: number,
    blue: number,
  ) => boolean,
): number[] => {
  const result: number[] = []
  const totalWidth = rightRatio - leftRatio
  const cellWidth = totalWidth / 13

  for (let index = 0; index < 13; index++) {
    const left = Math.max(
      0,
      Math.round(
        sourceWidth *
          (
            leftRatio +
            cellWidth * index +
            cellWidth * 0.16
          ),
      ),
    )

    const right = Math.min(
      sourceWidth,
      Math.round(
        sourceWidth *
          (
            leftRatio +
            cellWidth * (index + 1) -
            cellWidth * 0.16
          ),
      ),
    )

    let count = 0

    for (let x = left; x < right; x++) {
      const offset =
        (y * sourceWidth + x) * 4

      if (
        predicate(
          imageData.data[offset],
          imageData.data[offset + 1],
          imageData.data[offset + 2],
        )
      ) {
        count += 1
      }
    }

    result.push(count)
  }

  return result
}

const groupScoredRows = (
  scoredRows: {
    y: number
    score: number
  }[],
): {
  center: number
  score: number
}[] => {
  const groups: {
    rows: { y: number; score: number }[]
  }[] = []

  for (const row of scoredRows) {
    if (row.score <= 0) {
      continue
    }

    const current = groups[groups.length - 1]

    if (
      current &&
      row.y <=
        current.rows[current.rows.length - 1].y + 2
    ) {
      current.rows.push(row)
    } else {
      groups.push({
        rows: [row],
      })
    }
  }

  return groups.map((group) => {
    const totalScore = group.rows.reduce(
      (sum, row) => sum + row.score,
      0,
    )

    const weightedCenter = group.rows.reduce(
      (sum, row) => sum + row.y * row.score,
      0,
    ) / Math.max(1, totalScore)

    return {
      center: weightedCenter,
      score: totalScore,
    }
  })
}

const findLossRowCenter = (
  imageData: ImageData,
  sourceWidth: number,
  sourceHeight: number,
  leftRatio: number,
  rightRatio: number,
  minimumYByWidth: number,
  maximumYByWidth: number,
): number | null => {
  const start = Math.max(
    0,
    Math.round(sourceWidth * minimumYByWidth),
  )

  const end = Math.min(
    sourceHeight - 1,
    Math.round(sourceWidth * maximumYByWidth),
  )

  const scoredRows: {
    y: number
    score: number
  }[] = []

  for (let y = start; y <= end; y++) {
    const counts = getCellRowCounts(
      imageData,
      sourceWidth,
      y,
      leftRatio,
      rightRatio,
      isRedLossPixel,
    )

    const activeCells = counts.filter(
      (count) => count >= 1 && count <= 18,
    ).length

    const redPixels = counts.reduce(
      (sum, count) => sum + Math.min(count, 18),
      0,
    )

    const oversizedCells = counts.filter(
      (count) => count > 18,
    ).length

    const score =
      activeCells * 14 +
      redPixels -
      oversizedCells * 20

    scoredRows.push({
      y,
      score:
        activeCells > 0
          ? Math.max(0, score)
          : 0,
    })
  }

  const candidates = groupScoredRows(
    scoredRows,
  ).sort(
    (left, right) => right.score - left.score,
  )

  return candidates[0]?.center ?? null
}

const findQuantityRowCenter = (
  imageData: ImageData,
  sourceWidth: number,
  sourceHeight: number,
  leftRatio: number,
  rightRatio: number,
  lossRowCenter: number,
): number | null => {
  const start = Math.max(
    0,
    Math.round(
      lossRowCenter - sourceWidth * 0.040,
    ),
  )

  const end = Math.min(
    sourceHeight - 1,
    Math.round(
      lossRowCenter - sourceWidth * 0.020,
    ),
  )

  const scoredRows: {
    y: number
    score: number
  }[] = []

  for (let y = start; y <= end; y++) {
    const counts = getCellRowCounts(
      imageData,
      sourceWidth,
      y,
      leftRatio,
      rightRatio,
      isDarkQuantityPixel,
    )

    const activeCells = counts.filter(
      (count) => count >= 1 && count <= 17,
    ).length

    const darkPixels = counts.reduce(
      (sum, count) =>
        sum +
        (count <= 17
          ? count
          : 0),
      0,
    )

    const oversizedCells = counts.filter(
      (count) => count > 17,
    ).length

    const score =
      activeCells * 22 +
      darkPixels -
      oversizedCells * 28

    scoredRows.push({
      y,
      score:
        activeCells > 0
          ? Math.max(0, score)
          : 0,
    })
  }

  const targetCenter =
    lossRowCenter - sourceWidth * 0.030

  const candidates = groupScoredRows(
    scoredRows,
  ).sort(
    (left, right) => {
      const leftDistance = Math.abs(
        left.center - targetCenter,
      )

      const rightDistance = Math.abs(
        right.center - targetCenter,
      )

      const leftRank =
        left.score - leftDistance * 18

      const rightRank =
        right.score - rightDistance * 18

      return rightRank - leftRank
    },
  )

  return candidates[0]?.center ?? null
}

const detectBattleRowsFromLossText = (
  source: Awaited<ReturnType<typeof loadReportImage>>,
  detailedLayout: boolean,
): BattleDetectedRows => {
  const fallbackAttacker = detailedLayout
    ? DETAILED_BATTLE_ATTACKER_INITIAL_ROW
    : BATTLE_ATTACKER_INITIAL_ROW

  const fallbackDefender = detailedLayout
    ? DETAILED_BATTLE_DEFENDER_INITIAL_ROW
    : BATTLE_DEFENDER_INITIAL_ROW

  const imageData = getSourceImageData(source)

  if (!imageData) {
    return {
      attacker: fallbackAttacker,
      defender: fallbackDefender,
      dynamic: false,
    }
  }

  const leftRatio = detailedLayout
    ? 0.079
    : 0.083

  const rightRatio = detailedLayout
    ? 0.965
    : 0.968

  const attackerLossCenter = findLossRowCenter(
    imageData,
    source.width,
    source.height,
    leftRatio,
    rightRatio,
    detailedLayout ? 0.56 : 0.49,
    detailedLayout ? 0.61 : 0.54,
  )

  const defenderLossCenter = findLossRowCenter(
    imageData,
    source.width,
    source.height,
    leftRatio,
    rightRatio,
    detailedLayout ? 0.78 : 0.73,
    detailedLayout ? 0.83 : 0.78,
  )

  const attackerQuantityCenter =
    attackerLossCenter === null
      ? null
      : findQuantityRowCenter(
          imageData,
          source.width,
          source.height,
          leftRatio,
          rightRatio,
          attackerLossCenter,
        )

  const defenderQuantityCenter =
    defenderLossCenter === null
      ? null
      : findQuantityRowCenter(
          imageData,
          source.width,
          source.height,
          leftRatio,
          rightRatio,
          defenderLossCenter,
        )

  const attacker =
    attackerQuantityCenter === null
      ? fallbackAttacker
      : {
          leftRatio,
          rightRatio,
          centerYByWidth:
            attackerQuantityCenter / source.width,
          heightByWidth: 0.020,
        }

  const defender =
    defenderQuantityCenter === null
      ? fallbackDefender
      : {
          leftRatio,
          rightRatio,
          centerYByWidth:
            defenderQuantityCenter / source.width,
          heightByWidth: 0.020,
        }

  return {
    attacker,
    defender,
    dynamic:
      attackerQuantityCenter !== null &&
      defenderQuantityCenter !== null,
  }
}

interface SpyDetectedRow {
  template: ReportRowTemplate
  dynamic: boolean
}

/*
 * Spy reports render three numeric rows below the unit icons. The last row is
 * the total army we want to import. A fixed Y coordinate worked only while the
 * report used exactly the same browser/UI scale; on taller report windows the
 * OCR crop landed too low and cut values such as 160/164/19.
 *
 * Detect the actual digit bands instead. Every spy row prints a number (even
 * zero) in all 13 unit columns, which makes the numeric bands easy to
 * distinguish from icons, grid borders and the "Espiões" label below.
 */
const detectSpyTotalRow = (
  source: Awaited<ReturnType<typeof loadReportImage>>,
): SpyDetectedRow => {
  const imageData = getSourceImageData(source)

  if (!imageData) {
    return {
      template: SPY_DEFENDER_TOTAL_ROW,
      dynamic: false,
    }
  }

  const leftRatio = SPY_DEFENDER_TOTAL_ROW.leftRatio
  const rightRatio = SPY_DEFENDER_TOTAL_ROW.rightRatio
  const start = Math.max(
    0,
    Math.round(source.width * 0.41),
  )
  const end = Math.min(
    source.height - 1,
    Math.round(source.width * 0.55),
  )

  const scoredRows: Array<{
    y: number
    score: number
  }> = []

  for (let y = start; y <= end; y++) {
    const counts = getCellRowCounts(
      imageData,
      source.width,
      y,
      leftRatio,
      rightRatio,
      isDarkQuantityPixel,
    )

    const activeCells = counts.filter(
      (count) => count >= 1 && count <= 17,
    ).length

    const darkPixels = counts.reduce(
      (sum, count) =>
        sum + (count <= 17 ? count : 0),
      0,
    )

    scoredRows.push({
      y,
      score:
        activeCells >= 9
          ? activeCells * 24 + darkPixels
          : 0,
    })
  }

  /*
   * Bitmap digits can form two dark bands separated by a few antialiased rows.
   * Merge gaps up to 8px so each printed number row becomes one candidate.
   */
  const groups: Array<{
    top: number
    bottom: number
    score: number
  }> = []

  let current: {
    top: number
    bottom: number
    score: number
  } | null = null

  for (const row of scoredRows) {
    if (row.score <= 0) {
      continue
    }

    if (
      current &&
      row.y <= current.bottom + 8
    ) {
      current.bottom = row.y
      current.score += row.score
      continue
    }

    if (current) {
      groups.push(current)
    }

    current = {
      top: row.y,
      bottom: row.y,
      score: row.score,
    }
  }

  if (current) {
    groups.push(current)
  }

  const candidates = groups.filter(
    (group) =>
      group.bottom - group.top + 1 >= 5 &&
      group.score >= 700,
  )

  if (candidates.length === 0) {
    return {
      template: SPY_DEFENDER_TOTAL_ROW,
      dynamic: false,
    }
  }

  /*
   * The report lists stationed / away / total. Select the lowest full
   * 13-column numeric row, which is the total used by the simulator.
   */
  const totalRow = candidates.reduce(
    (lowest, candidate) =>
      candidate.bottom > lowest.bottom
        ? candidate
        : lowest,
  )

  const center =
    (totalRow.top + totalRow.bottom) / 2

  return {
    template: {
      leftRatio,
      rightRatio,
      centerYByWidth: center / source.width,
      /* Keep the full glyph but stay clear of the neighboring number row. */
      heightByWidth: 0.026,
    },
    dynamic: true,
  }
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

const parseInitialWallLevel = (
  rawText: string,
): number | null => {
  const text = normalizeText(rawText)

  /*
   * PT-BR examples:
   *   "Ariete: Muralha foi reduzido do nivel 6 para o nivel 0"
   *
   * EN examples:
   *   "Wall was reduced from level 6 to level 0"
   *
   * We always want the INITIAL level, therefore the first level mentioned in
   * the wall sentence, never the final post-battle level.
   */
  const patterns = [
    /muralha[^\n]{0,100}?nivel\s*(\d{1,2})/,
    /wall[^\n]{0,100}?level\s*(\d{1,2})/,
    /muralha[^0-9\n]{0,80}?(\d{1,2})/,
    /wall[^0-9\n]{0,80}?(\d{1,2})/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)

    if (!match?.[1]) {
      continue
    }

    const level = Number(match[1])

    if (
      Number.isInteger(level) &&
      level >= 0 &&
      level <= 20
    ) {
      return level
    }
  }

  return null
}

const readWallLevel = async (
  worker: Awaited<ReturnType<typeof createWorker>>,
  source: Awaited<ReturnType<typeof loadReportImage>>,
  defenderRow: ReportRowTemplate,
): Promise<number | null> => {
  /*
   * The wall event is not always present. Tribal Wars normally renders it
   * below the defender troop/loss rows only when rams actually changed the
   * wall. Rather than depending on one fixed screenshot Y coordinate, scan
   * the lower report area relative to the defender quantity row.
   */
  const dynamicTop = Math.max(
    0,
    defenderRow.centerYByWidth + 0.025,
  )

  const remainingHeightByWidth =
    source.height / source.width - dynamicTop

  const dynamicHeight = Math.max(
    0.10,
    Math.min(0.30, remainingHeightByWidth - 0.015),
  )

  const regions = [
    {
      leftRatio: 0.035,
      topByWidth: dynamicTop,
      widthRatio: 0.93,
      heightByWidth: dynamicHeight,
    },
    /*
     * Broad fallback for report variants where loyalty/loot rows move the wall
     * sentence slightly farther from the defender grid.
     */
    {
      leftRatio: 0.025,
      topByWidth: Math.max(0.60, dynamicTop - 0.04),
      widthRatio: 0.95,
      heightByWidth: Math.min(
        0.38,
        Math.max(
          0.16,
          source.height / source.width -
            Math.max(0.60, dynamicTop - 0.04) -
            0.01,
        ),
      ),
    },
  ]

  const pageModes = [
    PSM.SINGLE_BLOCK,
    PSM.SPARSE_TEXT,
  ]

  for (const region of regions) {
    const wallRegion = cropTextRegion(
      source,
      region,
      3.5,
    )

    for (const pageMode of pageModes) {
      await worker.setParameters({
        tessedit_char_whitelist: '',
        tessedit_pageseg_mode: pageMode,
      })

      const result = await worker.recognize(
        wallRegion,
      )

      const level = parseInitialWallLevel(
        result.data.text,
      )

      if (level !== null) {
        return level
      }
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


const scoreArmyReading = (
  reading: ReportArmyReading,
): number => {
  const recognized = reading.units.filter(
    (unit) =>
      !unit.assumedZero &&
      unit.quantity > 0,
  )

  const suspicious = reading.units.filter(
    (unit) =>
      unit.assumedZero &&
      unit.confidence < 45,
  )

  return (
    recognized.length * 35 +
    reading.averageConfidence * 0.7 -
    suspicious.length * 18
  )
}

const scoreBattleLayout = (
  attacker: ReportArmyReading,
  defender: ReportArmyReading,
): number => {
  return (
    scoreArmyReading(attacker) * 0.62 +
    scoreArmyReading(defender) * 0.38
  )
}

const shouldTryAlternateBattleLayout = (
  attacker: ReportArmyReading,
  defender: ReportArmyReading,
): boolean => {
  const recognizedAttacker = attacker.units.filter(
    (unit) =>
      !unit.assumedZero &&
      unit.quantity > 0,
  ).length

  const suspicious = [
    ...attacker.units,
    ...defender.units,
  ].filter(
    (unit) =>
      unit.assumedZero &&
      unit.confidence < 45,
  ).length

  return (
    recognizedAttacker <= 1 ||
    suspicious >= 3 ||
    attacker.averageConfidence < 55
  )
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

    /*
     * Read enough of the upper report to identify both the report type and
     * whether the optional "Relatório Detalhado" bar is present.
     */
    const headerRegion = cropTextRegion(
      source,
      {
        leftRatio: 0.01,
        topByWidth: 0.01,
        widthRatio: 0.96,
        heightByWidth: 0.29,
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

    const detailedLayoutDetectedByText =
      reportType === 'battle' &&
      isDetailedBattleReport(
        headerResult.data.text,
      )

    const detailedLayoutDetectedByPixels =
      reportType === 'battle' &&
      hasDetailedBattleLayoutBar(source)

    const detailedBattleLayout =
      detailedLayoutDetectedByText ||
      detailedLayoutDetectedByPixels

    await worker.setParameters({
      tessedit_char_whitelist:
        '0123456789.',
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
    })

    if (reportType === 'spy') {
      setProgress(
        options,
        'Locating spy total row',
        16,
      )

      const spyRow = detectSpyTotalRow(source)

      setProgress(
        options,
        'Reading defender troops',
        18,
      )

      const defender = await readArmyRow(
        worker,
        source,
        spyRow.template,
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

      if (spyRow.dynamic) {
        warnings.push(
          'The spy-report total troop row was located automatically from the 13 numeric columns, preventing clipped values when the report window height changes.',
        )
      }

      if (!detectedByText) {
        warnings.push(
          'The report type was inferred from the screenshot layout because the title could not be read clearly.',
        )
      }

      if (suspiciousUnits.length > 0) {
        warnings.push(
          `${suspiciousUnits.length} troop cells contained visible content but could not be read confidently. Review the preview before applying.`,
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
      detailedBattleLayout
        ? 'Reading detailed-report attacker troops'
        : 'Reading attacker troops',
      16,
    )

    let resolvedDetailedBattleLayout =
      detailedBattleLayout

    const detectedBattleRows =
      detectBattleRowsFromLossText(
        source,
        resolvedDetailedBattleLayout,
      )

    let attacker = await readArmyRow(
      worker,
      source,
      detectedBattleRows.attacker,
      (completed, total) => {
        setProgress(
          options,
          `Reading attacker troops ${completed}/${total}`,
          16 +
            (completed / total) * 28,
        )
      },
    )

    setProgress(
      options,
      'Reading defender troops',
      46,
    )

    let defender = await readArmyRow(
      worker,
      source,
      detectedBattleRows.defender,
      (completed, total) => {
        setProgress(
          options,
          `Reading defender troops ${completed}/${total}`,
          46 +
            (completed / total) * 28,
        )
      },
    )

    /*
     * Real Tribal Wars battle reports currently appear in two troop-grid
     * positions: the regular report and the "Relatório Detalhado" variant.
     * OCR of the blue detailed-report label is not reliable enough to choose
     * the layout by itself. When the first reading is weak or noisy we also
     * read the alternate row position and keep the layout with the strongest
     * numeric evidence.
     */
    if (
      !detectedBattleRows.dynamic &&
      !detailedBattleLayout &&
      shouldTryAlternateBattleLayout(
        attacker,
        defender,
      )
    ) {
      setProgress(
        options,
        resolvedDetailedBattleLayout
          ? 'Checking regular battle-report layout'
          : 'Checking detailed battle-report layout',
        76,
      )

      const alternateAttacker = await readArmyRow(
        worker,
        source,
        resolvedDetailedBattleLayout
          ? BATTLE_ATTACKER_INITIAL_ROW
          : DETAILED_BATTLE_ATTACKER_INITIAL_ROW,
      )

      const alternateDefender = await readArmyRow(
        worker,
        source,
        resolvedDetailedBattleLayout
          ? BATTLE_DEFENDER_INITIAL_ROW
          : DETAILED_BATTLE_DEFENDER_INITIAL_ROW,
      )

      const currentScore = scoreBattleLayout(
        attacker,
        defender,
      )

      const alternateScore = scoreBattleLayout(
        alternateAttacker,
        alternateDefender,
      )

      if (alternateScore > currentScore + 5) {
        resolvedDetailedBattleLayout =
          !resolvedDetailedBattleLayout

        attacker = alternateAttacker
        defender = alternateDefender
      }
    }

    setProgress(
      options,
      'Reading wall level',
      91,
    )

    const defenderWallLevel =
      await readWallLevel(
        worker,
        source,
        detectedBattleRows.defender,
      )

    const warnings: string[] = []

    if (!detectedByText) {
      warnings.push(
        'The report type was inferred from the screenshot layout because the title could not be read clearly.',
      )
    }

    if (detectedBattleRows.dynamic) {
      warnings.push(
        'The initial troop rows were located automatically from the red loss rows instead of fixed screenshot coordinates.',
      )
    }

    if (resolvedDetailedBattleLayout) {
      warnings.push(
        detailedLayoutDetectedByPixels &&
        !detailedLayoutDetectedByText
          ? 'Detailed battle-report layout detected from the blue report bar. Empty troop slots are treated as zero because Tribal Wars leaves those cells blank.'
          : detailedBattleLayout
            ? 'Detailed battle-report layout detected. Empty troop slots are treated as zero because Tribal Wars leaves those cells blank.'
            : 'Detailed battle-report layout was selected automatically from the troop-row position. Empty troop slots are treated as zero.',
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
        `${suspiciousCells.length} troop cells contained visible content but could not be read confidently. Review both armies before applying.`,
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
