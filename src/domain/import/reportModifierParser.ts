import type {
  AttackerModifiers,
  DefenderModifiers,
} from '../../types/Battle'

import type {
  TribalReportType,
} from './reportTypes'

export interface ParsedReportModifiers {
  attacker:
    Partial<
      Pick<
        AttackerModifiers,
        | 'churchLevel'
        | 'morale'
      >
    >

  defender:
    Partial<
      Pick<
        DefenderModifiers,
        | 'churchLevel'
        | 'wallLevel'
      >
    >

  rawText: string
}

const normalizeText = (
  value: string,
): string => {
  return value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .toLowerCase()
    .replace(
      /\r/g,
      '\n',
    )
    .replace(
      /[ \t]+/g,
      ' ',
    )
}

const readBoundedNumber = (
  text: string,
  patterns: RegExp[],
  minimum: number,
  maximum: number,
): number | null => {
  for (
    const pattern
    of patterns
  ) {
    const match =
      text.match(
        pattern,
      )

    if (
      !match?.[1]
    ) {
      continue
    }

    const value =
      Number(
        match[1],
      )

    if (
      Number.isInteger(
        value,
      ) &&
      value >=
        minimum &&
      value <=
        maximum
    ) {
      return value
    }
  }

  return null
}

const findSideSection = (
  text: string,
  side:
    | 'attacker'
    | 'defender',
): string => {
  const startPatterns =
    side ===
    'attacker'
      ? [
          /\battacker\b/,
          /\batacante\b/,
        ]
      : [
          /\bdefender\b/,
          /\bdefensor\b/,
        ]

  const endPatterns =
    side ===
    'attacker'
      ? [
          /\bdefender\b/,
          /\bdefensor\b/,
        ]
      : [
          /\battacker\b/,
          /\batacante\b/,
        ]

  let start =
    -1

  for (
    const pattern
    of startPatterns
  ) {
    const match =
      pattern.exec(
        text,
      )

    if (
      match &&
      (
        start ===
          -1 ||
        match.index <
          start
      )
    ) {
      start =
        match.index
    }
  }

  if (
    start <
    0
  ) {
    return ''
  }

  let end =
    text.length

  for (
    const pattern
    of endPatterns
  ) {
    const expression =
      new RegExp(
        pattern.source,
        pattern.flags,
      )

    expression.lastIndex =
      0

    const remainder =
      text.slice(
        start + 1,
      )

    const match =
      expression.exec(
        remainder,
      )

    if (
      match
    ) {
      const resolved =
        start +
        1 +
        match.index

      if (
        resolved >
          start &&
        resolved <
          end
      ) {
        end =
          resolved
      }
    }
  }

  return text.slice(
    start,
    end,
  )
}

const readChurchLevel = (
  text: string,
): number | null => {
  return readBoundedNumber(
    text,
    [
      /\b(?:church|igreja)\b[^0-9\n]{0,35}(?:level|nivel|lv\.?)?\s*[:\-]?\s*(\d{1,2})\b/,
      /\b(?:level|nivel)\b[^0-9\n]{0,20}\b(?:church|igreja)\b[^0-9\n]{0,15}(\d{1,2})\b/,
    ],
    0,
    3,
  )
}

const readMorale = (
  text: string,
): number | null => {
  return readBoundedNumber(
    text,
    [
      /\b(?:morale|moral)\b[^0-9\n]{0,25}(\d{1,3})\s*%?/,
      /(\d{2,3})\s*%\s*\b(?:morale|moral)\b/,
    ],
    1,
    100,
  )
}

const readWallLevel = (
  text: string,
): number | null => {
  return readBoundedNumber(
    text,
    [
      /*
       * Battle event:
       * "Wall was reduced from level 6 to level 0"
       * "Muralha foi reduzida do nivel 6 para o nivel 0"
       *
       * We intentionally capture the first level = initial wall.
       */
      /\b(?:wall|muralha)\b[^\n]{0,100}?\b(?:level|nivel)\b\s*(\d{1,2})\b/,

      /*
       * Spy/building summary:
       * "Wall level 8"
       * "Muralha nível 8"
       * "Wall: 8"
       */
      /\b(?:wall|muralha)\b[^0-9\n]{0,35}(\d{1,2})\b/,
    ],
    0,
    20,
  )
}

const churchContext = (
  text: string,
  side:
    | 'attacker'
    | 'defender',
  reportType:
    TribalReportType,
): number | null => {
  const section =
    findSideSection(
      text,
      side,
    )

  const fromSection =
    section
      ? readChurchLevel(
          section,
        )
      : null

  if (
    fromSection !==
    null
  ) {
    return fromSection
  }

  /*
   * A spy report contains only the defender side in the calibrated importer.
   * If there is exactly one church reading, assigning it to the defender is
   * substantially safer than guessing a side in battle reports.
   */
  if (
    reportType ===
      'spy' &&
    side ===
      'defender'
  ) {
    return readChurchLevel(
      text,
    )
  }

  return null
}

export const parseReportModifiers =
  (
    rawText: string,
    reportType:
      TribalReportType,
  ): ParsedReportModifiers => {
    const text =
      normalizeText(
        rawText,
      )

    const morale =
      readMorale(
        text,
      )

    const wallLevel =
      readWallLevel(
        text,
      )

    const attackerChurchLevel =
      churchContext(
        text,
        'attacker',
        reportType,
      )

    const defenderChurchLevel =
      churchContext(
        text,
        'defender',
        reportType,
      )

    return {
      attacker: {
        ...(attackerChurchLevel !==
        null
          ? {
              churchLevel:
                attackerChurchLevel,
            }
          : {}),

        ...(morale !==
        null
          ? {
              morale,
            }
          : {}),
      },

      defender: {
        ...(defenderChurchLevel !==
        null
          ? {
              churchLevel:
                defenderChurchLevel,
            }
          : {}),

        ...(wallLevel !==
        null
          ? {
              wallLevel,
            }
          : {}),
      },

      rawText,
    }
  }
