import {
  API_BASE_URL,
} from '../config/apiConfig'

import type {
  BattleSimulationInput,
} from '../types/Battle'

interface CreateSharedSimulationResponse {
  code: string
}


const readErrorMessage = async (
  response: Response,
): Promise<string> => {
  try {
    const body = await response.json()

    if (
      body &&
      typeof body === 'object'
    ) {
      if (
        'detail' in body &&
        typeof body.detail === 'string'
      ) {
        return body.detail
      }

      if (
        'message' in body &&
        typeof body.message === 'string'
      ) {
        return body.message
      }
    }
  } catch {
    // A resposta pode não possuir JSON.
  }

  return `Request failed with status ${response.status}`
}

export const createSharedSimulation = async (
  input: BattleSimulationInput,
): Promise<string> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/shared-simulations`,
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body: JSON.stringify(
        input,
      ),
    },
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
      ),
    )
  }

  const data =
    (await response.json()) as
      CreateSharedSimulationResponse

  if (
    !data.code ||
    typeof data.code !== 'string'
  ) {
    throw new Error(
      'Backend did not return a simulation code.',
    )
  }

  return data.code
}

export const getSharedSimulation = async (
  code: string,
): Promise<BattleSimulationInput> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/shared-simulations/${encodeURIComponent(
      code,
    )}`,
    {
      method: 'GET',

      headers: {
        Accept:
          'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
      ),
    )
  }

  return (await response.json()) as
    BattleSimulationInput
}