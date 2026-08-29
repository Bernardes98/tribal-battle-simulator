import type {
  AttackerModifiers,
  DefenderModifiers,
} from '../../types/Battle'

import type {
  TribalReportType,
} from './reportTypes'

export interface ParsedReportModifiers {
  attacker:
    Partial<AttackerModifiers>

  defender:
    Partial<DefenderModifiers>

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
  const wallText = text.replace(
    /\b(?:iron wall|muralha de ferro)\b[^\n]*/g,
    ' ',
  )

  return readBoundedNumber(
    wallText,
    [
      /\b(?:wall|muralha)\b[^\n]{0,100}?\b(?:level|nivel)\b\s*(\d{1,2})\b/,
      /\b(?:wall|muralha)\b[^0-9\n]{0,35}(\d{1,2})\b/,
    ],
    0,
    20,
  )
}

const readHospitalLevel = (
  text: string,
): number | null => {
  return readBoundedNumber(
    text,
    [
      /\b(?:hospital)\b[^0-9\n]{0,45}(?:level|nivel|lv\.?)?\s*[:\-]?\s*(\d{1,2})\b/,
      /\b(?:level|nivel)\b[^0-9\n]{0,18}\bhospital\b[^0-9\n]{0,18}(\d{1,2})\b/,
    ],
    0,
    10,
  )
}

const readClinicLevel = (
  text: string,
): number | null => {
  return readBoundedNumber(
    text,
    [
      /\b(?:clinic|clinica)\b[^0-9\n]{0,45}(?:level|nivel|lv\.?)?\s*[:\-]?\s*(\d{1,2})\b/,
      /\b(?:level|nivel)\b[^0-9\n]{0,18}\b(?:clinic|clinica)\b[^0-9\n]{0,18}(\d{1,2})\b/,
    ],
    0,
    10,
  )
}

const readIronWallLevel = (
  text: string,
): number | null => {
  return readBoundedNumber(
    text,
    [
      /\b(?:iron wall|muralha de ferro)\b[^0-9\n]{0,45}(?:level|nivel|lv\.?)?\s*[:\-]?\s*(\d{1,2})\b/,
      /\b(?:level|nivel)\b[^0-9\n]{0,18}\b(?:iron wall|muralha de ferro)\b[^0-9\n]{0,18}(\d{1,2})\b/,
    ],
    0,
    5,
  )
}

const readWeaponMasteryLevel = (
  text: string,
): number | null => {
  const explicitLevel = readBoundedNumber(
    text,
    [
      /\b(?:weapon mastery|maestria em armas)\b[^0-9\n]{0,50}(?:level|nivel|lv\.?)?\s*[:\-]?\s*(\d{1,2})\b/,
      /\b(?:level|nivel)\b[^0-9\n]{0,18}\b(?:weapon mastery|maestria em armas)\b[^0-9\n]{0,18}(\d{1,2})\b/,
    ],
    0,
    5,
  )

  if (
    explicitLevel !==
    null
  ) {
    return explicitLevel
  }

  const percentage = readBoundedNumber(
    text,
    [
      /\b(?:weapon mastery|maestria em armas)\b[^0-9\n]{0,50}(\d{1,2})\s*%/,
    ],
    0,
    10,
  )

  if (
    percentage !== null &&
    percentage % 2 === 0
  ) {
    return percentage / 2
  }

  return null
}

const containsAny = (
  text: string,
  patterns: RegExp[],
): boolean => {
  return patterns.some(
    (pattern) => pattern.test(text),
  )
}

const hasGrandmaster = (
  text: string,
): boolean => {
  return containsAny(
    text,
    [
      /\bgrandmaster\b/,
      /\bgrao[ -]?mestre\b/,
    ],
  )
}

const hasMedic = (
  text: string,
): boolean => {
  return containsAny(
    text,
    [
      /\bmedic\b/,
      /\bmedico\b/,
    ],
  )
}

const hasMedicus = (
  text: string,
): boolean => {
  return /\bmedicus\b/.test(text)
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

    const attackerSection =
      findSideSection(
        text,
        'attacker',
      ) || text

    const morale =
      readMorale(
        text,
      )

    const wallLevel =
      readWallLevel(
        text,
      )

    const hospitalLevel =
      readHospitalLevel(
        text,
      )

    const clinicLevel =
      readClinicLevel(
        text,
      )

    const ironWallLevel =
      readIronWallLevel(
        text,
      )

    const weaponMasteryLevel =
      readWeaponMasteryLevel(
        attackerSection,
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

        ...(hasGrandmaster(
          attackerSection,
        )
          ? {
              grandmaster: true,
            }
          : {}),

        ...(weaponMasteryLevel !==
        null
          ? {
              weaponMasteryLevel,
            }
          : {}),

        ...(hasMedic(
          attackerSection,
        )
          ? {
              medicLevel: 1,
            }
          : {}),

        ...(hasMedicus(
          attackerSection,
        )
          ? {
              medicusLevel: 1,
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

        ...(hospitalLevel !==
        null
          ? {
              hospitalLevel,
            }
          : {}),

        ...(clinicLevel !==
        null
          ? {
              clinicLevel,
            }
          : {}),

        ...(ironWallLevel !==
        null
          ? {
              ironWallLevel,
            }
          : {}),
      },

      rawText,
    }
  }
