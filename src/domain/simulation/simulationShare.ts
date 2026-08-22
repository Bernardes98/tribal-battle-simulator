import type {
  BattleSimulationInput,
} from '../../types/Battle'

const LEGACY_SHARE_PARAMETER =
  'battle'

const SHORT_SHARE_PARAMETER =
  's'

const encodeUtf8ToBase64Url = (
  value: string,
): string => {
  const bytes =
    new TextEncoder().encode(
      value,
    )

  let binary = ''

  bytes.forEach((byte) => {
    binary +=
      String.fromCharCode(
        byte,
      )
  })

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

const decodeBase64UrlToUtf8 = (
  value: string,
): string => {
  const normalized =
    value
      .replace(/-/g, '+')
      .replace(/_/g, '/')

  const padding =
    '='.repeat(
      (
        4 -
        (
          normalized.length %
          4
        )
      ) %
        4,
    )

  const binary =
    atob(
      normalized +
        padding,
    )

  const bytes =
    Uint8Array.from(
      binary,
      (character) =>
        character.charCodeAt(
          0,
        ),
    )

  return new TextDecoder()
    .decode(bytes)
}

const isSimulationInput = (
  value: unknown,
): value is BattleSimulationInput => {
  if (
    !value ||
    typeof value !==
      'object'
  ) {
    return false
  }

  const candidate =
    value as Partial<BattleSimulationInput>

  return Boolean(
    candidate.attacker &&
      candidate.defender &&
      candidate.attackerModifiers &&
      candidate.defenderModifiers &&
      candidate.attackerPaladinWeapons &&
      candidate.defenderPaladinWeapons &&
      candidate.siegeSettings,
  )
}

/*
 * Mantido para compatibilidade
 * com links antigos em Base64.
 */
export const encodeSimulation = (
  input: BattleSimulationInput,
): string => {
  return encodeUtf8ToBase64Url(
    JSON.stringify(input),
  )
}

/*
 * Mantido para compatibilidade
 * com links antigos em Base64.
 */
export const decodeSimulation = (
  value: string,
): BattleSimulationInput | null => {
  try {
    const json =
      decodeBase64UrlToUtf8(
        value,
      )

    const parsed: unknown =
      JSON.parse(json)

    if (
      !isSimulationInput(
        parsed,
      )
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

/*
 * Novo formato:
 *
 * http://localhost:5173/?s=K8QD3A7X
 */
export const createShortShareUrl = (
  code: string,
): string => {
  const url =
    new URL(
      window.location.href,
    )

  url.searchParams.delete(
    LEGACY_SHARE_PARAMETER,
  )

  url.searchParams.set(
    SHORT_SHARE_PARAMETER,
    code
      .trim()
      .toUpperCase(),
  )

  url.hash = ''

  return url.toString()
}

export const readSharedSimulationCodeFromUrl =
  (): string | null => {
    const url =
      new URL(
        window.location.href,
      )

    const code =
      url.searchParams.get(
        SHORT_SHARE_PARAMETER,
      )

    if (!code) {
      return null
    }

    const normalized =
      code
        .trim()
        .toUpperCase()

    if (!normalized) {
      return null
    }

    return normalized
  }

/*
 * Compatibilidade com os links
 * que já existiam:
 *
 * ?battle=eyJhdHRhY2tlciI6...
 */
export const readLegacySimulationFromUrl =
  (): BattleSimulationInput | null => {
    const url =
      new URL(
        window.location.href,
      )

    const value =
      url.searchParams.get(
        LEGACY_SHARE_PARAMETER,
      )

    if (!value) {
      return null
    }

    return decodeSimulation(
      value,
    )
  }

export const clearSharedSimulationFromUrl =
  () => {
    const url =
      new URL(
        window.location.href,
      )

    url.searchParams.delete(
      SHORT_SHARE_PARAMETER,
    )

    url.searchParams.delete(
      LEGACY_SHARE_PARAMETER,
    )

    window.history.replaceState(
      {},
      '',
      url.toString(),
    )
  }

export const copyTextToClipboard =
  async (
    value: string,
  ): Promise<void> => {
    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(
        value,
      )

      return
    }

    const textarea =
      document.createElement(
        'textarea',
      )

    textarea.value =
      value

    textarea.style.position =
      'fixed'

    textarea.style.left =
      '-9999px'

    textarea.style.opacity =
      '0'

    document.body.appendChild(
      textarea,
    )

    textarea.focus()
    textarea.select()

    document.execCommand(
      'copy',
    )

    document.body.removeChild(
      textarea,
    )
  }