import {
  API_BASE_URL,
} from '../config/apiConfig'

import {
  getAuthToken,
  loadAuthSession,
} from '../domain/auth/authSession'

import {
  readApiError,
} from './apiError'

import {
  listSimulationHistory,
} from './simulationHistoryApi'

import type {
  SimulationHistoryItem,
} from './simulationHistoryApi'

export interface ServerIntelligencePlayer {
  id: string
  name: string
  villageCount: number
  reportCount: number
  lastSeenAt: string
}

export interface ServerIntelligenceVillage {
  id: string
  playerId: string
  villageKey: string
  playerName: string
  villageName: string
  x: number | null
  y: number | null
  reportCount: number
  lastSeenAt: string
}

export interface ServerIntelligenceWatchlist {
  watchedVillageKeys: string[]
  alertThresholdPercent: number
}

export interface ServerIntelligenceAnnotation {
  villageKey: string
  tags: string[]
  note: string
  updatedAt: string
}

const INTELLIGENCE_API_URL =
  `${API_BASE_URL}/api/v1/intelligence`

const WATCHLIST_STORAGE_KEY =
  'tribal-battle-village-watchlist-v1'

const ANNOTATIONS_STORAGE_KEY =
  'tribal-battle-village-annotations-v1'

const WATCHLIST_CHANGED_EVENT =
  'tribal-battle-village-watchlist-changed'

const ANNOTATIONS_CHANGED_EVENT =
  'tribal-battle-village-annotations-changed'

const SERVER_CACHE_OWNER_KEY =
  'tribal-battle-intelligence-server-owner-v1'

let hydratedToken: string | null = null
let hydratedAt = 0

const requireToken = (): string => {
  const token =
    getAuthToken()

  if (!token) {
    throw new Error(
      'Sign in before using server-side intelligence.',
    )
  }

  return token
}

const authHeaders = (
  token: string,
): Record<string, string> => ({
  Authorization:
    `Bearer ${token}`,
})

const readLocalWatchlist =
  (): ServerIntelligenceWatchlist => {
    try {
      const raw =
        window.localStorage.getItem(
          WATCHLIST_STORAGE_KEY,
        )

      if (!raw) {
        return {
          watchedVillageKeys: [],
          alertThresholdPercent: 25,
        }
      }

      const parsed =
        JSON.parse(raw) as Partial<ServerIntelligenceWatchlist>

      return {
        watchedVillageKeys:
          Array.isArray(
            parsed.watchedVillageKeys,
          )
            ? parsed.watchedVillageKeys.filter(
                (
                  value,
                ): value is string =>
                  typeof value === 'string',
              )
            : [],
        alertThresholdPercent:
          typeof parsed.alertThresholdPercent === 'number'
            ? parsed.alertThresholdPercent
            : 25,
      }
    } catch {
      return {
        watchedVillageKeys: [],
        alertThresholdPercent: 25,
      }
    }
  }

const readLocalAnnotations =
  (): Record<string, ServerIntelligenceAnnotation> => {
    try {
      const raw =
        window.localStorage.getItem(
          ANNOTATIONS_STORAGE_KEY,
        )

      if (!raw) {
        return {}
      }

      return JSON.parse(raw) as Record<
        string,
        ServerIntelligenceAnnotation
      >
    } catch {
      return {}
    }
  }

const cacheWatchlist = (
  value: ServerIntelligenceWatchlist,
): void => {
  window.localStorage.setItem(
    WATCHLIST_STORAGE_KEY,
    JSON.stringify(value),
  )

  window.dispatchEvent(
    new CustomEvent(
      WATCHLIST_CHANGED_EVENT,
    ),
  )
}

const cacheAnnotations = (
  values: ServerIntelligenceAnnotation[],
): void => {
  const record =
    Object.fromEntries(
      values.map(
        (annotation) => [
          annotation.villageKey,
          annotation,
        ],
      ),
    )

  window.localStorage.setItem(
    ANNOTATIONS_STORAGE_KEY,
    JSON.stringify(record),
  )

  window.dispatchEvent(
    new CustomEvent(
      ANNOTATIONS_CHANGED_EVENT,
    ),
  )
}

export const getServerIntelligenceWatchlist =
  async (): Promise<ServerIntelligenceWatchlist> => {
    const token = requireToken()

    const response =
      await fetch(
        `${INTELLIGENCE_API_URL}/watchlist`,
        {
          headers:
            authHeaders(token),
        },
      )

    if (!response.ok) {
      throw await readApiError(response)
    }

    return await response.json() as ServerIntelligenceWatchlist
  }

export const saveServerIntelligenceWatchlist =
  async (
    value: ServerIntelligenceWatchlist,
  ): Promise<ServerIntelligenceWatchlist | null> => {
    const token = getAuthToken()

    if (!token) {
      return null
    }

    const response =
      await fetch(
        `${INTELLIGENCE_API_URL}/watchlist`,
        {
          method: 'PUT',
          headers: {
            'Content-Type':
              'application/json',
            ...authHeaders(token),
          },
          body:
            JSON.stringify(value),
        },
      )

    if (!response.ok) {
      throw await readApiError(response)
    }

    return await response.json() as ServerIntelligenceWatchlist
  }

export const listServerIntelligenceAnnotations =
  async (): Promise<ServerIntelligenceAnnotation[]> => {
    const token = requireToken()

    const response =
      await fetch(
        `${INTELLIGENCE_API_URL}/annotations`,
        {
          headers:
            authHeaders(token),
        },
      )

    if (!response.ok) {
      throw await readApiError(response)
    }

    return await response.json() as ServerIntelligenceAnnotation[]
  }

export const saveServerIntelligenceAnnotation =
  async (
    value: Pick<
      ServerIntelligenceAnnotation,
      'villageKey' | 'tags' | 'note'
    >,
  ): Promise<ServerIntelligenceAnnotation | null> => {
    const token = getAuthToken()

    if (!token) {
      return null
    }

    const response =
      await fetch(
        `${INTELLIGENCE_API_URL}/annotations`,
        {
          method: 'PUT',
          headers: {
            'Content-Type':
              'application/json',
            ...authHeaders(token),
          },
          body:
            JSON.stringify(value),
        },
      )

    if (!response.ok) {
      throw await readApiError(response)
    }

    return await response.json() as ServerIntelligenceAnnotation
  }

export const deleteServerIntelligenceAnnotation =
  async (
    villageKey: string,
  ): Promise<void> => {
    const token = getAuthToken()

    if (!token) {
      return
    }

    const params =
      new URLSearchParams({
        villageKey,
      })

    const response =
      await fetch(
        `${INTELLIGENCE_API_URL}/annotations?${params.toString()}`,
        {
          method: 'DELETE',
          headers:
            authHeaders(token),
        },
      )

    if (!response.ok) {
      throw await readApiError(response)
    }
  }

export const hydrateServerIntelligenceState =
  async (): Promise<void> => {
    const session =
      loadAuthSession()

    const token =
      session?.token ?? null

    if (
      !session ||
      !token
    ) {
      return
    }

    if (
      hydratedToken === token &&
      Date.now() - hydratedAt < 2_000
    ) {
      return
    }

    const cachedOwner =
      window.localStorage.getItem(
        SERVER_CACHE_OWNER_KEY,
      )

    const canMigrateLocal =
      !cachedOwner ||
      cachedOwner === session.user.id

    const [
      serverWatchlist,
      serverAnnotations,
    ] = await Promise.all([
      getServerIntelligenceWatchlist(),
      listServerIntelligenceAnnotations(),
    ])

    const localWatchlist =
      readLocalWatchlist()

    let resolvedWatchlist =
      serverWatchlist

    if (
      canMigrateLocal &&
      serverWatchlist.watchedVillageKeys.length === 0 &&
      (
        localWatchlist.watchedVillageKeys.length > 0 ||
        localWatchlist.alertThresholdPercent !== 25
      )
    ) {
      resolvedWatchlist =
        await saveServerIntelligenceWatchlist(
          localWatchlist,
        ) ?? serverWatchlist
    }

    let resolvedAnnotations =
      serverAnnotations

    const localAnnotations =
      readLocalAnnotations()

    if (
      canMigrateLocal &&
      serverAnnotations.length === 0 &&
      Object.keys(localAnnotations).length > 0
    ) {
      const migrated =
        await Promise.all(
          Object.values(
            localAnnotations,
          ).map(
            async (annotation) => {
              try {
                return await saveServerIntelligenceAnnotation({
                  villageKey:
                    annotation.villageKey,
                  tags:
                    annotation.tags,
                  note:
                    annotation.note,
                })
              } catch (error) {
                console.warn(
                  'Could not migrate a local intelligence annotation:',
                  error,
                )
                return null
              }
            },
          ),
        )

      resolvedAnnotations =
        migrated.filter(
          (
            value,
          ): value is ServerIntelligenceAnnotation =>
            value !== null,
        )
    }

    cacheWatchlist(
      resolvedWatchlist,
    )

    cacheAnnotations(
      resolvedAnnotations,
    )

    window.localStorage.setItem(
      SERVER_CACHE_OWNER_KEY,
      session.user.id,
    )

    hydratedToken = token
    hydratedAt = Date.now()
  }

export const listIntelligenceHistory =
  async (): Promise<SimulationHistoryItem[]> => {
    const token = getAuthToken()

    if (!token) {
      return await listSimulationHistory()
    }

    await hydrateServerIntelligenceState()

    const response =
      await fetch(
        `${INTELLIGENCE_API_URL}/reports`,
        {
          headers:
            authHeaders(token),
        },
      )

    if (!response.ok) {
      throw await readApiError(response)
    }

    return await response.json() as SimulationHistoryItem[]
  }

export const listServerIntelligencePlayers =
  async (): Promise<ServerIntelligencePlayer[]> => {
    const token = requireToken()

    const response =
      await fetch(
        `${INTELLIGENCE_API_URL}/players`,
        {
          headers:
            authHeaders(token),
        },
      )

    if (!response.ok) {
      throw await readApiError(response)
    }

    return await response.json() as ServerIntelligencePlayer[]
  }

export const listServerIntelligenceVillages =
  async (
    search = '',
  ): Promise<ServerIntelligenceVillage[]> => {
    const token = requireToken()
    const params =
      new URLSearchParams()

    if (search.trim()) {
      params.set(
        'search',
        search.trim(),
      )
    }

    const suffix =
      params.size > 0
        ? `?${params.toString()}`
        : ''

    const response =
      await fetch(
        `${INTELLIGENCE_API_URL}/villages${suffix}`,
        {
          headers:
            authHeaders(token),
        },
      )

    if (!response.ok) {
      throw await readApiError(response)
    }

    return await response.json() as ServerIntelligenceVillage[]
  }
