import {
  API_BASE_URL,
} from '../config/apiConfig'

import type {
  Army,
} from '../types/Battle'

import {
  getSimulationHistoryClientId,
} from '../domain/history/simulationHistoryClient'

import type {
  ReportPartyMetadata,
} from '../types/ReportMetadata'

export type ArmyPresetType =
  | 'ATTACKER'
  | 'DEFENDER'

export interface ArmyPresetItem {
  id: string
  clientId: string
  name: string
  type: ArmyPresetType
  army: Army
  context: ReportPartyMetadata | null
  createdAt: string
  updatedAt: string
}


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

export const createArmyPreset = async (
  name: string,
  type: ArmyPresetType,
  army: Army,
  context: ReportPartyMetadata | null = null,
): Promise<ArmyPresetItem> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/army-presets`,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify({
        clientId:
          getSimulationHistoryClientId(),
        name,
        type,
        army,
        context,
      }),
    },
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response),
    )
  }

  return (await response.json()) as
    ArmyPresetItem
}

export const listArmyPresets =
  async (): Promise<
    ArmyPresetItem[]
  > => {
    const clientId =
      getSimulationHistoryClientId()

    const response = await fetch(
      `${API_BASE_URL}/api/v1/army-presets?clientId=${encodeURIComponent(
        clientId,
      )}`,
    )

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response),
      )
    }

    return (await response.json()) as
      ArmyPresetItem[]
  }

export const deleteArmyPreset = async (
  id: string,
): Promise<void> => {
  const clientId =
    getSimulationHistoryClientId()

  const response = await fetch(
    `${API_BASE_URL}/api/v1/army-presets/${encodeURIComponent(
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
