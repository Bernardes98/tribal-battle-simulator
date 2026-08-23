import type {
  Army,
} from '../../types/Battle'

import type {
  UnitId,
} from '../../types/Unit'

export interface DetectedSpyUnit {
  unitId: UnitId
  label: string
  quantity: number
  sourceLine: string
}

export interface SpyReportParseResult {
  army: Army
  detectedUnits: DetectedSpyUnit[]
  wallLevel: number | null
  churchLevel: number | null
  warnings: string[]
}

interface UnitAliasDefinition {
  unitId: UnitId
  label: string
  aliases: string[]
}

const unitDefinitions: UnitAliasDefinition[] = [
  {
    unitId: 'spearman',
    label: 'Spearman',
    aliases: [
      'lanceiro',
      'lanceiros',
      'spearman',
      'spearmen',
      'spear',
    ],
  },
  {
    unitId: 'swordsman',
    label: 'Swordsman',
    aliases: [
      'espadachim',
      'espadachins',
      'swordsman',
      'swordsmen',
      'sword fighter',
    ],
  },
  {
    unitId: 'axe',
    label: 'Axe Fighter',
    aliases: [
      'viking',
      'vikings',
      'axe fighter',
      'axe fighters',
      'axeman',
      'axemen',
    ],
  },
  {
    unitId: 'archer',
    label: 'Archer',
    aliases: [
      'arqueiro',
      'arqueiros',
      'archer',
      'archers',
    ],
  },
  {
    unitId: 'lightCavalry',
    label: 'Light Cavalry',
    aliases: [
      'cavalaria leve',
      'light cavalry',
      'light cav',
    ],
  },
  {
    unitId: 'mountedArcher',
    label: 'Mounted Archer',
    aliases: [
      'arqueiro montado',
      'arqueiros montados',
      'mounted archer',
      'mounted archers',
    ],
  },
  {
    unitId: 'heavyCavalry',
    label: 'Heavy Cavalry',
    aliases: [
      'cavalaria pesada',
      'heavy cavalry',
      'heavy cav',
    ],
  },
  {
    unitId: 'ram',
    label: 'Ram',
    aliases: [
      'ariete',
      'arietes',
      'battering ram',
      'battering rams',
      'ram',
      'rams',
    ],
  },
  {
    unitId: 'catapult',
    label: 'Catapult',
    aliases: [
      'catapulta',
      'catapultas',
      'catapult',
      'catapults',
    ],
  },
  {
    unitId: 'berserker',
    label: 'Berserker',
    aliases: [
      'berserker',
      'berserkers',
    ],
  },
  {
    unitId: 'trebuchet',
    label: 'Trebuchet',
    aliases: [
      'trabuco',
      'trabucos',
      'trebuchet',
      'trebuchets',
    ],
  },
  {
    unitId: 'nobleman',
    label: 'Nobleman',
    aliases: [
      'nobre',
      'nobres',
      'nobleman',
      'noblemen',
    ],
  },
  {
    unitId: 'paladin',
    label: 'Paladin',
    aliases: [
      'paladino',
      'paladinos',
      'paladin',
      'paladins',
    ],
  },
]

const emptyArmy = (): Army => ({
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

const normalize = (
  value: string,
): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const escapeRegExp = (
  value: string,
): string => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  )
}

const parseTroopNumber = (
  rawValue: string,
): number | null => {
  const digits = rawValue.replace(
    /\D/g,
    '',
  )

  if (!digits) {
    return null
  }

  const parsed = Number(digits)

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return null
  }

  return Math.floor(parsed)
}

const findQuantityNearAlias = (
  normalizedLine: string,
  alias: string,
): number | null => {
  const escapedAlias =
    escapeRegExp(alias)

  const afterAlias =
    new RegExp(
      `(?:^|\\b)${escapedAlias}(?:\\b|$)[^0-9]{0,30}([0-9][0-9.,\\s]*)`,
      'i',
    )

  const afterMatch =
    normalizedLine.match(
      afterAlias,
    )

  if (afterMatch?.[1]) {
    return parseTroopNumber(
      afterMatch[1],
    )
  }

  const beforeAlias =
    new RegExp(
      `([0-9][0-9.,\\s]*)[^0-9]{0,20}(?:^|\\b)${escapedAlias}(?:\\b|$)`,
      'i',
    )

  const beforeMatch =
    normalizedLine.match(
      beforeAlias,
    )

  if (beforeMatch?.[1]) {
    return parseTroopNumber(
      beforeMatch[1],
    )
  }

  return null
}

const findLevel = (
  lines: string[],
  aliases: string[],
  maximum: number,
): number | null => {
  for (const line of lines) {
    const normalizedLine =
      normalize(line)

    for (const alias of aliases) {
      if (
        !normalizedLine.includes(
          normalize(alias),
        )
      ) {
        continue
      }

      const quantity =
        findQuantityNearAlias(
          normalizedLine,
          normalize(alias),
        )

      if (quantity !== null) {
        return Math.min(
          maximum,
          quantity,
        )
      }
    }
  }

  return null
}

export const parseSpyReportText = (
  rawText: string,
): SpyReportParseResult => {
  const army = emptyArmy()

  const lines = rawText
    .replace(/\r/g, '')
    .split('\n')
    .map((line) =>
      line.trim(),
    )
    .filter(Boolean)

  const detectedUnits:
    DetectedSpyUnit[] = []

  for (
    const definition of
      unitDefinitions
  ) {
    let detectedQuantity:
      number | null = null

    let sourceLine = ''

    for (const line of lines) {
      const normalizedLine =
        normalize(line)

      for (
        const alias of
          definition.aliases
      ) {
        const normalizedAlias =
          normalize(alias)

        const quantity =
          findQuantityNearAlias(
            normalizedLine,
            normalizedAlias,
          )

        if (quantity === null) {
          continue
        }

        detectedQuantity =
          quantity

        sourceLine = line

        break
      }

      if (
        detectedQuantity !== null
      ) {
        break
      }
    }

    if (
      detectedQuantity === null
    ) {
      continue
    }

    army[definition.unitId] =
      detectedQuantity

    detectedUnits.push({
      unitId: definition.unitId,
      label: definition.label,
      quantity:
        detectedQuantity,
      sourceLine,
    })
  }

  const wallLevel = findLevel(
    lines,
    [
      'muralha',
      'wall',
      'wall level',
      'nivel da muralha',
      'nível da muralha',
    ],
    20,
  )

  const churchLevel = findLevel(
    lines,
    [
      'capela',
      'igreja',
      'church',
      'chapel',
    ],
    3,
  )

  const warnings: string[] = []

  if (
    rawText.trim() &&
    detectedUnits.length === 0
  ) {
    warnings.push(
      'No troop rows were recognized. Try a clearer screenshot or paste the report text directly.',
    )
  }

  if (
    detectedUnits.length > 0 &&
    detectedUnits.length < 4
  ) {
    warnings.push(
      'Only a few troop types were recognized. Review the values before applying them.',
    )
  }

  return {
    army,
    detectedUnits,
    wallLevel,
    churchLevel,
    warnings,
  }
}