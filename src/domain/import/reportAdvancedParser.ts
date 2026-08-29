import type {
  PaladinWeaponLevels,
} from '../../types/Battle'

import type {
  ReportTimestampMetadata,
} from '../../types/ReportMetadata'

import type {
  ReportConfidence,
  TribalReportType,
} from './reportTypes'

export type ReportDetectionSide =
  | 'attacker'
  | 'defender'
  | 'report'

export interface ReportAdvancedDetection {
  key: string
  label: string
  side: ReportDetectionSide
  value: string
  confidence: ReportConfidence
  autoApplied: boolean
}

export interface ReportDetectedBonus {
  label: string
  side: ReportDetectionSide
  percent: number
  confidence: ReportConfidence
}

export interface ReportPaladinWeaponDetection {
  side: Exclude<ReportDetectionSide, 'report'>
  unitId: keyof PaladinWeaponLevels | 'nobleman'
  weaponName: string
  level: number | null
  confidence: ReportConfidence
}

export interface ParsedReportAdvancedData {
  timestamp: ReportTimestampMetadata | null
  attackerPaladinWeaponPatch: Partial<PaladinWeaponLevels>
  defenderPaladinWeaponPatch: Partial<PaladinWeaponLevels>
  paladinWeapons: ReportPaladinWeaponDetection[]
  bonuses: ReportDetectedBonus[]
  detections: ReportAdvancedDetection[]
}

const normalizeText = (
  value: string,
): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
}

const monthNumbers: Record<string, string> = {
  jan: '01',
  janeiro: '01',
  january: '01',
  fev: '02',
  feb: '02',
  fevereiro: '02',
  february: '02',
  mar: '03',
  marco: '03',
  march: '03',
  abr: '04',
  apr: '04',
  abril: '04',
  april: '04',
  mai: '05',
  may: '05',
  maio: '05',
  jun: '06',
  junho: '06',
  june: '06',
  jul: '07',
  julho: '07',
  july: '07',
  ago: '08',
  aug: '08',
  agosto: '08',
  august: '08',
  set: '09',
  sep: '09',
  sept: '09',
  setembro: '09',
  september: '09',
  out: '10',
  oct: '10',
  outubro: '10',
  october: '10',
  nov: '11',
  novembro: '11',
  november: '11',
  dez: '12',
  dec: '12',
  dezembro: '12',
  december: '12',
}

const pad2 = (
  value: string,
): string => {
  return value.padStart(2, '0')
}

const timezoneFromText = (
  value: string,
): string | null => {
  const match = value.match(
    /\b(?:utc|gmt)\s*([+\-]\s*\d{1,2}(?::?\d{2})?)\b/i,
  )

  if (!match?.[1]) {
    return null
  }

  return match[0]
    .replace(/\s+/g, '')
    .toUpperCase()
}

export const parseReportTimestamp = (
  rawText: string,
): ReportTimestampMetadata | null => {
  const text = normalizeText(rawText)

  const ptPattern =
    /\b(\d{1,2})\s+de\s+([a-z]{3,10})(?:\s+de)?\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/i

  const ptMatch = text.match(ptPattern)

  if (ptMatch) {
    const month = monthNumbers[ptMatch[2]]

    if (month) {
      return {
        localDateTime:
          `${ptMatch[3]}-${month}-${pad2(ptMatch[1])}T${pad2(ptMatch[4])}:${ptMatch[5]}:${ptMatch[6] ?? '00'}`,
        rawText: ptMatch[0],
        timezone: timezoneFromText(rawText),
      }
    }
  }

  const dayFirstPattern =
    /\b(\d{1,2})\s+([a-z]{3,10})\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/i

  const dayFirstMatch = text.match(dayFirstPattern)

  if (dayFirstMatch) {
    const month = monthNumbers[dayFirstMatch[2]]

    if (month) {
      return {
        localDateTime:
          `${dayFirstMatch[3]}-${month}-${pad2(dayFirstMatch[1])}T${pad2(dayFirstMatch[4])}:${dayFirstMatch[5]}:${dayFirstMatch[6] ?? '00'}`,
        rawText: dayFirstMatch[0],
        timezone: timezoneFromText(rawText),
      }
    }
  }

  const monthFirstPattern =
    /\b([a-z]{3,10})\s+(\d{1,2})(?:,)?\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/i

  const monthFirstMatch = text.match(monthFirstPattern)

  if (monthFirstMatch) {
    const month = monthNumbers[monthFirstMatch[1]]

    if (month) {
      return {
        localDateTime:
          `${monthFirstMatch[3]}-${month}-${pad2(monthFirstMatch[2])}T${pad2(monthFirstMatch[4])}:${monthFirstMatch[5]}:${monthFirstMatch[6] ?? '00'}`,
        rawText: monthFirstMatch[0],
        timezone: timezoneFromText(rawText),
      }
    }
  }

  const numericPattern =
    /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/i

  const numericMatch = text.match(numericPattern)

  if (numericMatch) {
    const day = Number(numericMatch[1])
    const month = Number(numericMatch[2])

    if (
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12
    ) {
      return {
        localDateTime:
          `${numericMatch[3]}-${pad2(numericMatch[2])}-${pad2(numericMatch[1])}T${pad2(numericMatch[4])}:${numericMatch[5]}:${numericMatch[6] ?? '00'}`,
        rawText: numericMatch[0],
        timezone: timezoneFromText(rawText),
      }
    }
  }

  return null
}

interface WeaponDefinition {
  unitId: keyof PaladinWeaponLevels | 'nobleman'
  canonicalName: string
  aliases: string[]
}

const weaponDefinitions: WeaponDefinition[] = [
  {
    unitId: 'spearman',
    canonicalName: 'Halberd of Guan Yu',
    aliases: [
      'halberd of guan yu',
      'guan yu',
      'spearman weapon',
      'arma de lanceiro',
    ],
  },
  {
    unitId: 'swordsman',
    canonicalName: "Paracelsus' Longsword",
    aliases: [
      "paracelsus' longsword",
      'paracelsus longsword',
      'paracelsus',
      'swordsman weapon',
      'arma de espadachim',
    ],
  },
  {
    unitId: 'axe',
    canonicalName: "Thorgard's Battle Axe",
    aliases: [
      "thorgard's battle axe",
      'thorgard battle axe',
      'thorgard',
      'axe fighter weapon',
      'arma de guerreiro de machado',
    ],
  },
  {
    unitId: 'archer',
    canonicalName: "Nimrod's Longbow",
    aliases: [
      "nimrod's longbow",
      'nimrod longbow',
      'archer weapon',
      'arma de arqueiro',
    ],
  },
  {
    unitId: 'lightCavalry',
    canonicalName: "Mieszko's Lance",
    aliases: [
      "mieszko's lance",
      'mieszko lance',
      'mieszko',
      'light cavalry weapon',
      'arma de cavalaria leve',
    ],
  },
  {
    unitId: 'mountedArcher',
    canonicalName: "Nimrod's Composite Bow",
    aliases: [
      "nimrod's composite bow",
      'nimrod composite bow',
      'mounted archer weapon',
      'arma de arqueiro montado',
    ],
  },
  {
    unitId: 'heavyCavalry',
    canonicalName: "Baptiste's Banner",
    aliases: [
      "baptiste's banner",
      'baptiste banner',
      'baptiste',
      'heavy cavalry weapon',
      'arma de cavalaria pesada',
    ],
  },
  {
    unitId: 'ram',
    canonicalName: "Carol's Morning Star",
    aliases: [
      "carol's morning star",
      'carol morning star',
      'morning star',
      'ram weapon',
      'arma de ariete',
    ],
  },
  {
    unitId: 'catapult',
    canonicalName: "Aletheia's Bonfire",
    aliases: [
      "aletheia's bonfire",
      'aletheia bonfire',
      'aletheia',
      'catapult weapon',
      'arma de catapulta',
    ],
  },
  {
    unitId: 'berserker',
    canonicalName: 'Berserker weapon',
    aliases: [
      'berserker weapon',
      'arma de berserker',
    ],
  },
  {
    unitId: 'nobleman',
    canonicalName: "Vasco's Scepter",
    aliases: [
      "vasco's scepter",
      'vasco scepter',
      'vasco',
      'nobleman weapon',
      'arma de nobre',
    ],
  },
]

const sideSection = (
  text: string,
  side: 'attacker' | 'defender',
  reportType: TribalReportType,
): string => {
  if (
    reportType === 'spy' &&
    side === 'defender'
  ) {
    return text
  }

  const startLabels =
    side === 'attacker'
      ? ['attacker', 'atacante']
      : ['defender', 'defensor']

  const endLabels =
    side === 'attacker'
      ? ['defender', 'defensor']
      : []

  let start = -1

  for (const label of startLabels) {
    const index = text.indexOf(label)

    if (
      index >= 0 &&
      (start < 0 || index < start)
    ) {
      start = index
    }
  }

  if (start < 0) {
    return ''
  }

  let end = text.length

  for (const label of endLabels) {
    const index = text.indexOf(
      label,
      start + 1,
    )

    if (
      index > start &&
      index < end
    ) {
      end = index
    }
  }

  return text.slice(start, end)
}

const readNearbyWeaponLevel = (
  section: string,
  aliasIndex: number,
  aliasLength: number,
): number | null => {
  const start = Math.max(0, aliasIndex - 45)
  const end = Math.min(
    section.length,
    aliasIndex + aliasLength + 55,
  )

  const nearby = section.slice(start, end)
  const match = nearby.match(
    /(?:level|nivel|lv\.?)\s*[:\-]?\s*([1-3])\b|\b([1-3])\s*(?:level|nivel)\b/i,
  )

  const value = Number(
    match?.[1] ??
    match?.[2] ??
    0,
  )

  return value >= 1 && value <= 3
    ? value
    : null
}

const parsePaladinWeapons = (
  text: string,
  reportType: TribalReportType,
): ReportPaladinWeaponDetection[] => {
  const detections: ReportPaladinWeaponDetection[] = []

  const sides: Array<'attacker' | 'defender'> =
    reportType === 'spy'
      ? ['defender']
      : ['attacker', 'defender']

  for (const side of sides) {
    const section = sideSection(
      text,
      side,
      reportType,
    )

    if (!section) {
      continue
    }

    for (const weapon of weaponDefinitions) {
      let matchedAlias: string | null = null
      let aliasIndex = -1

      for (const alias of weapon.aliases) {
        const index = section.indexOf(alias)

        if (index >= 0) {
          matchedAlias = alias
          aliasIndex = index
          break
        }
      }

      if (
        !matchedAlias ||
        aliasIndex < 0
      ) {
        continue
      }

      const level = readNearbyWeaponLevel(
        section,
        aliasIndex,
        matchedAlias.length,
      )

      detections.push({
        side,
        unitId: weapon.unitId,
        weaponName: weapon.canonicalName,
        level,
        confidence:
          level === null
            ? 'low'
            : 'high',
      })
    }
  }

  return detections
}

const bonusDefinitions: Array<{
  label: string
  aliases: string[]
  side: ReportDetectionSide
}> = [
  {
    label: 'Morale',
    aliases: ['morale', 'moral'],
    side: 'attacker',
  },
  {
    label: 'Weapon Mastery',
    aliases: ['weapon mastery', 'maestria em armas'],
    side: 'attacker',
  },
  {
    label: 'Attack modifier',
    aliases: ['attack modifier', 'modificador de ataque'],
    side: 'attacker',
  },
  {
    label: 'Defense modifier',
    aliases: ['defense modifier', 'defence modifier', 'modificador de defesa'],
    side: 'defender',
  },
  {
    label: 'Loot bonus',
    aliases: ['loot bonus', 'plunder bonus', 'bonus de saque', 'bonus saque'],
    side: 'attacker',
  },
]

const parseBonuses = (
  text: string,
): ReportDetectedBonus[] => {
  const bonuses: ReportDetectedBonus[] = []

  for (const definition of bonusDefinitions) {
    for (const alias of definition.aliases) {
      const index = text.indexOf(alias)

      if (index < 0) {
        continue
      }

      const nearby = text.slice(
        Math.max(0, index - 25),
        Math.min(
          text.length,
          index + alias.length + 45,
        ),
      )

      const after = nearby.match(
        new RegExp(
          `${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^0-9+\\-]{0,24}([+\\-]?\\d{1,3})\\s*%`,
          'i',
        ),
      )

      const before = nearby.match(
        new RegExp(
          `([+\\-]?\\d{1,3})\\s*%[^a-z]{0,12}${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
          'i',
        ),
      )

      const percent = Number(
        after?.[1] ??
        before?.[1] ??
        Number.NaN,
      )

      if (
        Number.isFinite(percent) &&
        percent >= -100 &&
        percent <= 300
      ) {
        bonuses.push({
          label: definition.label,
          side: definition.side,
          percent,
          confidence: 'high',
        })
      }

      break
    }
  }

  return bonuses
}

const patchFromWeapons = (
  detections: ReportPaladinWeaponDetection[],
  side: 'attacker' | 'defender',
): Partial<PaladinWeaponLevels> => {
  const patch: Partial<PaladinWeaponLevels> = {}

  for (const detection of detections) {
    if (
      detection.side !== side ||
      detection.level === null ||
      detection.unitId === 'nobleman'
    ) {
      continue
    }

    patch[detection.unitId] = detection.level
  }

  return patch
}

export const parseReportAdvancedData = (
  rawText: string,
  reportType: TribalReportType,
): ParsedReportAdvancedData => {
  const text = normalizeText(rawText)
  const timestamp = parseReportTimestamp(rawText)
  const paladinWeapons = parsePaladinWeapons(
    text,
    reportType,
  )
  const bonuses = parseBonuses(text)

  const detections: ReportAdvancedDetection[] = []

  if (timestamp) {
    detections.push({
      key: 'timestamp',
      label: 'Report timestamp',
      side: 'report',
      value: timestamp.localDateTime.replace('T', ' '),
      confidence: 'high',
      autoApplied: true,
    })
  }

  for (const weapon of paladinWeapons) {
    detections.push({
      key: `paladin-${weapon.side}-${weapon.unitId}`,
      label: 'Paladin weapon',
      side: weapon.side,
      value:
        weapon.level === null
          ? `${weapon.weaponName} · level not readable`
          : `${weapon.weaponName} · Lv. ${weapon.level}`,
      confidence: weapon.confidence,
      autoApplied: weapon.level !== null && weapon.unitId !== 'nobleman',
    })
  }

  for (const bonus of bonuses) {
    detections.push({
      key: `bonus-${bonus.side}-${bonus.label}-${bonus.percent}`,
      label: bonus.label,
      side: bonus.side,
      value: `${bonus.percent}%`,
      confidence: bonus.confidence,
      autoApplied:
        bonus.label === 'Morale' ||
        bonus.label === 'Weapon Mastery',
    })
  }

  return {
    timestamp,
    attackerPaladinWeaponPatch:
      patchFromWeapons(
        paladinWeapons,
        'attacker',
      ),
    defenderPaladinWeaponPatch:
      patchFromWeapons(
        paladinWeapons,
        'defender',
      ),
    paladinWeapons,
    bonuses,
    detections,
  }
}
