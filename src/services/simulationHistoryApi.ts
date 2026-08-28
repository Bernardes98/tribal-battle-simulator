import {
  readApiError,
} from './apiError'

import type {
  BattleResult,
  BattleSimulationInput,
} from '../types/Battle'

import {
  getSimulationHistoryClientId,
} from '../domain/history/simulationHistoryClient'

import {
  getAuthToken,
} from '../domain/auth/authSession'

import type {
  ReportMetadata,
} from '../types/ReportMetadata'

export type SimulationHistorySource =
  | 'MANUAL'
  | 'SPY_REPORT'
  | 'BATTLE_REPORT'

export type SimulationHistorySort =
  | 'createdAt'
  | 'source'
  | 'player'
  | 'village'
  | 'favorite'

export type SimulationHistorySortDirection =
  | 'asc'
  | 'desc'

export interface SimulationHistoryItem {
  id: string
  clientId: string
  source: SimulationHistorySource
  payload: BattleSimulationInput
  result: BattleResult | null
  reportMetadata: ReportMetadata | null
  favorite?: boolean
  createdAt: string
  ownedByAccount?: boolean
}

export interface SimulationHistoryPage {
  content: SimulationHistoryItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface SimulationHistoryQuery {
  page?: number
  size?: number
  source?: SimulationHistorySource | null
  player?: string
  village?: string
  from?: string
  to?: string
  favorite?: boolean | null
  search?: string
  sort?: SimulationHistorySort
  direction?: SimulationHistorySortDirection
}

export interface ClaimSimulationHistoryResponse {
  claimedCount: number
}

export interface BulkDeleteSimulationHistoryResponse {
  deletedCount: number
}

const API_URL = (
  import.meta.env.VITE_API_URL ??
  'http://localhost:8080'
).replace(
  /\/$/,
  '',
)

const authHeaders =
  (): Record<string, string> => {
    const token =
      getAuthToken()

    return token
      ? {
          Authorization:
            `Bearer ${token}`,
        }
      : {}
  }

const appendIfPresent = (
  params: URLSearchParams,
  key: string,
  value: string | number | boolean | null | undefined,
): void => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return
  }

  params.set(
    key,
    String(value),
  )
}

export const createSimulationHistory = async (
  source: SimulationHistorySource,
  payload: BattleSimulationInput,
  result: BattleResult | null,
  reportMetadata: ReportMetadata | null = null,
): Promise<SimulationHistoryItem> => {
  const response =
    await fetch(
      `${API_URL}/api/v1/simulation-history`,
      {
        method:
          'POST',
        headers: {
          'Content-Type':
            'application/json',
          ...authHeaders(),
        },
        body:
          JSON.stringify({
            clientId:
              getSimulationHistoryClientId(),
            source,
            payload,
            result,
            reportMetadata,
          }),
      },
    )

  if (
    !response.ok
  ) {
    throw await readApiError(
      response,
    )
  }

  return await response.json() as SimulationHistoryItem
}

export const listSimulationHistory =
  async (): Promise<
    SimulationHistoryItem[]
  > => {
    const clientId =
      getSimulationHistoryClientId()

    const response =
      await fetch(
        `${API_URL}/api/v1/simulation-history?clientId=${encodeURIComponent(
          clientId,
        )}`,
        {
          headers: {
            ...authHeaders(),
          },
        },
      )

    if (
      !response.ok
    ) {
      throw await readApiError(
        response,
      )
    }

    return await response.json() as SimulationHistoryItem[]
  }

export const searchSimulationHistory =
  async (
    query: SimulationHistoryQuery = {},
  ): Promise<SimulationHistoryPage> => {
    const params =
      new URLSearchParams()

    params.set(
      'clientId',
      getSimulationHistoryClientId(),
    )

    appendIfPresent(
      params,
      'page',
      query.page ?? 0,
    )
    appendIfPresent(
      params,
      'size',
      query.size ?? 10,
    )
    appendIfPresent(
      params,
      'source',
      query.source,
    )
    appendIfPresent(
      params,
      'player',
      query.player?.trim(),
    )
    appendIfPresent(
      params,
      'village',
      query.village?.trim(),
    )
    appendIfPresent(
      params,
      'from',
      query.from,
    )
    appendIfPresent(
      params,
      'to',
      query.to,
    )
    appendIfPresent(
      params,
      'favorite',
      query.favorite,
    )
    appendIfPresent(
      params,
      'search',
      query.search?.trim(),
    )
    appendIfPresent(
      params,
      'sort',
      query.sort ?? 'createdAt',
    )
    appendIfPresent(
      params,
      'direction',
      query.direction ?? 'desc',
    )

    const response =
      await fetch(
        `${API_URL}/api/v1/simulation-history/search?${params.toString()}`,
        {
          headers: {
            ...authHeaders(),
          },
        },
      )

    if (
      !response.ok
    ) {
      throw await readApiError(
        response,
      )
    }

    return await response.json() as SimulationHistoryPage
  }

export const updateSimulationHistoryFavorite =
  async (
    id: string,
    favorite: boolean,
  ): Promise<SimulationHistoryItem> => {
    const clientId =
      getSimulationHistoryClientId()

    const response =
      await fetch(
        `${API_URL}/api/v1/simulation-history/${encodeURIComponent(
          id,
        )}/favorite?clientId=${encodeURIComponent(
          clientId,
        )}`,
        {
          method:
            'PATCH',
          headers: {
            'Content-Type':
              'application/json',
            ...authHeaders(),
          },
          body:
            JSON.stringify({
              favorite,
            }),
        },
      )

    if (
      !response.ok
    ) {
      throw await readApiError(
        response,
      )
    }

    return await response.json() as SimulationHistoryItem
  }

export const deleteSimulationHistory =
  async (
    id: string,
  ): Promise<void> => {
    const clientId =
      getSimulationHistoryClientId()

    const response =
      await fetch(
        `${API_URL}/api/v1/simulation-history/${encodeURIComponent(
          id,
        )}?clientId=${encodeURIComponent(
          clientId,
        )}`,
        {
          method:
            'DELETE',
          headers: {
            ...authHeaders(),
          },
        },
      )

    if (
      !response.ok
    ) {
      throw await readApiError(
        response,
      )
    }
  }

export const bulkDeleteSimulationHistory =
  async (
    ids: string[],
  ): Promise<BulkDeleteSimulationHistoryResponse> => {
    const clientId =
      getSimulationHistoryClientId()

    const response =
      await fetch(
        `${API_URL}/api/v1/simulation-history/bulk-delete?clientId=${encodeURIComponent(
          clientId,
        )}`,
        {
          method:
            'POST',
          headers: {
            'Content-Type':
              'application/json',
            ...authHeaders(),
          },
          body:
            JSON.stringify({
              ids,
            }),
        },
      )

    if (
      !response.ok
    ) {
      throw await readApiError(
        response,
      )
    }

    return await response.json() as BulkDeleteSimulationHistoryResponse
  }

export const claimBrowserSimulationHistory =
  async (): Promise<
    ClaimSimulationHistoryResponse
  > => {
    const token =
      getAuthToken()

    if (
      !token
    ) {
      throw new Error(
        'Sign in before importing browser history.',
      )
    }

    const response =
      await fetch(
        `${API_URL}/api/v1/simulation-history/claim`,
        {
          method:
            'POST',
          headers: {
            'Content-Type':
              'application/json',
            Authorization:
              `Bearer ${token}`,
          },
          body:
            JSON.stringify({
              clientId:
                getSimulationHistoryClientId(),
            }),
        },
      )

    if (
      !response.ok
    ) {
      throw await readApiError(
        response,
      )
    }

    return await response.json() as ClaimSimulationHistoryResponse
  }
