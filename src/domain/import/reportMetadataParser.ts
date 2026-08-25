import type {
  ReportCoordinates,
  ReportPartyMetadata,
} from '../../types/ReportMetadata'

export type ReportPartyRole =
  | 'attacker'
  | 'defender'

const normalizeWhitespace = (
  value: string,
): string => {
  return value
    .replace(/\s+/g, ' ')
    .trim()
}

const normalizeComparable = (
  value: string,
): string => {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const genericLinePatterns = [
  /^atacante$/i,
  /^defensor$/i,
  /^attacker$/i,
  /^defender$/i,
  /^aldeia do atacante$/i,
  /^aldeia do defensor$/i,
  /^attacker village$/i,
  /^defender village$/i,
  /^jogador$/i,
  /^player$/i,
  /^village$/i,
]

const isGenericLine = (
  value: string,
): boolean => {
  const normalized = normalizeWhitespace(value)

  return genericLinePatterns.some(
    (pattern) => pattern.test(normalized),
  )
}

const stripRoleLabels = (
  value: string,
): string => {
  return normalizeWhitespace(
    value
      .replace(/aldeia\s+do\s+atacante/gi, ' ')
      .replace(/aldeia\s+do\s+defensor/gi, ' ')
      .replace(/attacker\s+village/gi, ' ')
      .replace(/defender\s+village/gi, ' ')
      .replace(/\batacante\b/gi, ' ')
      .replace(/\bdefensor\b/gi, ' ')
      .replace(/\battacker\b/gi, ' ')
      .replace(/\bdefender\b/gi, ' '),
  )
}

const coordinatePatterns = [
  /* Normal Tribal Wars coordinate: (499|511). */
  /\(?\s*(\d{1,3})\s*[|]\s*(\d{1,3})\s*\)?/,

  /* Common OCR substitutions for the vertical separator. */
  /\(?\s*(\d{1,3})\s*[Il!]\s*(\d{1,3})\s*\)?/,
  /\(?\s*(\d{1,3})\s*[/\\]\s*(\d{1,3})\s*\)?/,
  /\(?\s*(\d{1,3})\s*[[\]{}]\s*(\d{1,3})\s*\)?/,

  /*
   * Some OCR passes lose the vertical bar completely and leave only a
   * space, for example:
   *
   *   (501|516) -> (501 516)
   */
  /\(\s*(\d{3})\s+(\d{3})\s*\)/,

  /*
   * In other passes the separator disappears without leaving whitespace:
   *
   *   (501|516) -> (501516)
   *
   * Keep this fallback restricted to values inside parentheses so an
   * unrelated six-digit number is not interpreted as a coordinate.
   */
  /\(\s*(\d{3})(\d{3})\s*\)/,

  /*
   * Tesseract frequently reads the separator itself as the digit 1:
   *
   *   (499|511) -> (4991511)
   *   (501|516) -> (5011516)
   *
   * Requiring three digits on both sides keeps this fallback narrow and
   * prevents ordinary troop quantities from being interpreted as coords.
   */
  /\(?\s*(\d{3})\s*1\s*(\d{3})\s*\)?/,
]

const readCoordinates = (
  value: string,
): ReportCoordinates | null => {
  for (const pattern of coordinatePatterns) {
    const match = value.match(pattern)

    if (!match) {
      continue
    }

    const x = Number(match[1])
    const y = Number(match[2])

    if (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 0 &&
      x <= 999 &&
      y >= 0 &&
      y <= 999
    ) {
      return {
        x,
        y,
      }
    }
  }

  return null
}

const removeCoordinates = (
  value: string,
): string => {
  let result = value

  for (const pattern of coordinatePatterns) {
    result = result.replace(
      new RegExp(pattern.source, 'g'),
      ' ',
    )
  }

  return normalizeWhitespace(result)
}

const cleanCandidate = (
  value: string,
): string | null => {
  const cleaned = normalizeWhitespace(
    stripRoleLabels(
      removeCoordinates(value),
    )
      .replace(/^[\-:|]+/, '')
      .replace(/[\-:|]+$/, ''),
  )

  if (
    !cleaned ||
    isGenericLine(cleaned)
  ) {
    return null
  }

  const comparable = normalizeComparable(
    cleaned,
  )

  if (
    comparable.includes('relatorio') ||
    comparable.includes('report') ||
    comparable.includes('vitoria') ||
    comparable.includes('victory') ||
    comparable.includes('unidades') ||
    comparable.includes('units') ||
    comparable.includes('perdas') ||
    comparable.includes('losses')
  ) {
    return null
  }

  return cleaned
}

const isVillageLabel = (
  value: string,
  role: ReportPartyRole,
): boolean => {
  const comparable = normalizeComparable(value)

  if (role === 'attacker') {
    return (
      comparable.includes('aldeia do atacante') ||
      comparable.includes('attacker village')
    )
  }

  return (
    comparable.includes('aldeia do defensor') ||
    comparable.includes('defender village')
  )
}

const isRoleLabel = (
  value: string,
  role: ReportPartyRole,
): boolean => {
  const comparable = normalizeComparable(value)

  if (role === 'attacker') {
    return (
      comparable === 'atacante' ||
      comparable === 'attacker'
    )
  }

  return (
    comparable === 'defensor' ||
    comparable === 'defender'
  )
}

const findVillageName = (
  lines: string[],
  role: ReportPartyRole,
): string | null => {
  /*
   * Coordinates are the strongest village signal. Prefer that line even if
   * Tesseract did not preserve the village label beside it.
   */
  const lineWithCoordinates =
    lines.find((line) =>
      Boolean(readCoordinates(line)),
    ) ?? null

  if (lineWithCoordinates) {
    const candidate = cleanCandidate(
      lineWithCoordinates,
    )

    if (candidate) {
      return candidate
    }
  }

  const labelIndex = lines.findIndex(
    (line) => isVillageLabel(line, role),
  )

  if (labelIndex >= 0) {
    /*
     * OCR often returns the two report columns in reading order:
     *
     *   Atacante
     *   Aldeia do atacante
     *   FelipeG98
     *   [001] F (499|511)
     *
     * Therefore scan a few following lines and prefer the first one that
     * contains coordinates. If coordinates were lost, the last useful line
     * in the small window is normally the village name.
     */
    const window = lines.slice(
      labelIndex + 1,
      labelIndex + 5,
    )

    const coordinateLine = window.find(
      (line) => Boolean(readCoordinates(line)),
    )

    if (coordinateLine) {
      return cleanCandidate(coordinateLine)
    }

    const candidates = window
      .map(cleanCandidate)
      .filter(
        (candidate): candidate is string =>
          Boolean(candidate),
      )

    if (candidates.length >= 2) {
      return candidates[candidates.length - 1]
    }
  }

  return null
}

const isPlausiblePlayerName = (
  value: string,
): boolean => {
  const candidate = cleanCandidate(value)

  if (!candidate) {
    return false
  }

  if (
    candidate.length < 2 ||
    candidate.length > 32 ||
    candidate.includes('(') ||
    candidate.includes(')')
  ) {
    return false
  }

  const comparable = normalizeComparable(candidate)

  /* Avoid short OCR debris around the shield/building icons. */
  if (
    comparable.length <= 3 &&
    !/[0-9]/.test(comparable)
  ) {
    return false
  }

  return true
}

const findPlayerName = (
  lines: string[],
  role: ReportPartyRole,
  villageName: string | null,
): string | null => {
  const villageComparable =
    villageName
      ? normalizeComparable(villageName)
      : null

  const villageLabelIndex =
    lines.findIndex(
      (line) => isVillageLabel(line, role),
    )

  const roleLabelIndex =
    lines.findIndex(
      (line) => isRoleLabel(line, role),
    )

  /*
   * Do not pick the first arbitrary OCR fragment from the crop. Shield and
   * building icons can become text such as "Hot TSS" or "Le :". Anchor the
   * player search after the actual Tribal Wars labels instead.
   */
  const startIndex =
    villageLabelIndex >= 0
      ? villageLabelIndex + 1
      : roleLabelIndex >= 0
        ? roleLabelIndex + 1
        : 0

  const endIndex = Math.min(
    lines.length,
    startIndex + 6,
  )

  for (
    let index = startIndex;
    index < endIndex;
    index += 1
  ) {
    const line = lines[index]

    if (
      readCoordinates(line) ||
      isVillageLabel(line, role) ||
      isRoleLabel(line, role)
    ) {
      continue
    }

    const candidate = cleanCandidate(line)

    if (
      !candidate ||
      !isPlausiblePlayerName(candidate)
    ) {
      continue
    }

    const comparable = normalizeComparable(candidate)

    if (
      villageComparable &&
      comparable === villageComparable
    ) {
      continue
    }

    return candidate
  }

  /* Last-resort fallback for reports where the role labels were not OCRed. */
  for (const line of lines) {
    if (readCoordinates(line)) {
      continue
    }

    const candidate = cleanCandidate(line)

    if (
      candidate &&
      isPlausiblePlayerName(candidate)
    ) {
      const comparable = normalizeComparable(candidate)

      if (
        !villageComparable ||
        comparable !== villageComparable
      ) {
        return candidate
      }
    }
  }

  return null
}

export const parseReportPartyMetadata = (
  rawText: string,
  role: ReportPartyRole,
): ReportPartyMetadata | null => {
  const lines = rawText
    .split(/[\r\n]+/)
    .map(normalizeWhitespace)
    .filter(Boolean)

  if (lines.length === 0) {
    return null
  }

  const coordinates =
    readCoordinates(rawText)

  const villageName =
    findVillageName(
      lines,
      role,
    )

  const playerName =
    findPlayerName(
      lines,
      role,
      villageName,
    )

  if (
    !playerName &&
    !villageName &&
    !coordinates
  ) {
    return null
  }

  return {
    playerName,
    villageName,
    coordinates,
  }
}