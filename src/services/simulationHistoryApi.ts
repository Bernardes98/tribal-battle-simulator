import type {
  BattleResult,
  BattleSimulationInput,
} from '../types/Battle'

import {
  getSimulationHistoryClientId,
} from '../domain/history/simulationHistoryClient'

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
  createdAt: string
}

const API_URL = (
  import.meta.env.VITE_API_URL ??
  'http://localhost:8080'
).replace(/\/$/, '')

const readErrorMessage = async (
  response: Response,
): Promise<string> => {
  try {
    const body = await response.json()

    if (
      body &&
      typeof body === 'object' &&
      'message' in body &&
      typeof body.message === 'string'
    ) {
      return body.message
    }
  } catch {
    // Response may not contain JSON.
  }

  return `Request failed with status ${response.status}`
}

export const createSimulationHistory = async (
  source: SimulationHistorySource,
  payload: BattleSimulationInput,
  result: BattleResult | null,
): Promise<SimulationHistoryItem> => {
  const response = await fetch(
    `${API_URL}/api/v1/simulation-history`,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify({
        clientId:
          getSimulationHistoryClientId(),
        source,
        payload,
        result,
      }),
    },
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response),
    )
  }

  return (await response.json()) as
    SimulationHistoryItem
}

export const listSimulationHistory =
  async (): Promise<
    SimulationHistoryItem[]
  > => {
    const clientId =
      getSimulationHistoryClientId()

    const response = await fetch(
      `${API_URL}/api/v1/simulation-history?clientId=${encodeURIComponent(
        clientId,
      )}`,
    )

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response),
      )
    }

    return (await response.json()) as
      SimulationHistoryItem[]
  }

export const deleteSimulationHistory =
  async (
    id: string,
  ): Promise<void> => {
    const clientId =
      getSimulationHistoryClientId()

    const response = await fetch(
      `${API_URL}/api/v1/simulation-history/${encodeURIComponent(
        id,
      )}?clientId=${encodeURIComponent(
        clientId,
      )}`,
      {
        method: 'DELETE',
      },
    )

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response),
      )
    }
  }
