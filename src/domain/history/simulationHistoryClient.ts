const CLIENT_ID_STORAGE_KEY =
  'tribal-battle-simulation-history-client-id'

const createClientId = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(
      /[xy]/g,
      (character) => {
        const random =
          Math.floor(
            Math.random() * 16,
          )

        const value =
          character === 'x'
            ? random
            : (random & 0x3) | 0x8

        return value.toString(16)
      },
    )
}

export const getSimulationHistoryClientId =
  (): string => {
    const existing =
      window.localStorage.getItem(
        CLIENT_ID_STORAGE_KEY,
      )

    if (existing) {
      return existing
    }

    const clientId =
      createClientId()

    window.localStorage.setItem(
      CLIENT_ID_STORAGE_KEY,
      clientId,
    )

    return clientId
  }
