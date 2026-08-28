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

export interface SimulationHistoryItem {
  id: string
  clientId: string
  source: SimulationHistorySource
  payload: BattleSimulationInput
  result: BattleResult | null
  reportMetadata: ReportMetadata | null
  createdAt: string
  ownedByAccount?: boolean
}

export interface ClaimSimulationHistoryResponse {
  claimedCount: number
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

const readErrorMessage = async (
  response: Response,
): Promise<string> => {
  try {
    const body =
      await response.json() as {
        message?: string
        detail?: string
        error?: string
      }

    return (
      body.message ||
      body.detail ||
      body.error ||
      `Request failed with status ${response.status}`
    )
  } catch {
    return `Request failed with status ${response.status}`
  }
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
    throw new Error(
      await readErrorMessage(
        response,
      ),
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
      throw new Error(
        await readErrorMessage(
          response,
        ),
      )
    }

    return await response.json() as SimulationHistoryItem[]
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
      throw new Error(
        await readErrorMessage(
          response,
        ),
      )
    }
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
      throw new Error(
        await readErrorMessage(
          response,
        ),
      )
    }

    return await response.json() as ClaimSimulationHistoryResponse
  }
