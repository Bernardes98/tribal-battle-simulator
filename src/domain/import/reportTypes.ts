import type { Army } from '../../types/Battle'
import type { UnitId } from '../../types/Unit'

export type TribalReportType =
  | 'spy'
  | 'battle'

export type ReportConfidence =
  | 'high'
  | 'medium'
  | 'low'

export interface ReportUnitReading {
  unitId: UnitId
  label: string
  quantity: number
  confidence: number
  rawText: string
  assumedZero: boolean
}

export interface ReportArmyReading {
  army: Army
  units: ReportUnitReading[]
  averageConfidence: number
}

export interface ReportScreenshotAnalysis {
  reportType: TribalReportType
  confidence: ReportConfidence
  attacker: ReportArmyReading | null
  defender: ReportArmyReading
  defenderWallLevel: number | null
  warnings: string[]
  sourceWidth: number
  sourceHeight: number
}

export const REPORT_UNIT_ORDER: UnitId[] = [
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
  'trebuchet',
  'nobleman',
  'paladin',
]

export const REPORT_UNIT_LABELS: Record<UnitId, string> = {
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
  trebuchet: 'Trebuchet',
  nobleman: 'Nobleman',
  paladin: 'Paladin',
}
