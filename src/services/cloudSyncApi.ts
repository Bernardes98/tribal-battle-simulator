import {
  getAuthToken,
} from '../domain/auth/authSession'

export interface CloudStateResponse {
  revision: number
  updatedAt: string
  payload: Record<string, string>
}

export interface SaveCloudStateRequest {
  expectedRevision: number
  payload: Record<string, string>
}

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080'
).replace(/\/$/, '')

const CLOUD_API_URL =
  `${API_BASE_URL}/api/v1/cloud/state`

const requireToken = (): string => {
  const token =
    getAuthToken()

  if (!token) {
    throw new Error(
      'Sign in before using cloud sync.',
    )
  }

  return token
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
      `Request failed (${response.status}).`
    )
  } catch {
    return `Request failed (${response.status}).`
  }
}

export const getCloudState =
  async (): Promise<CloudStateResponse | null> => {
    const response =
      await fetch(
        CLOUD_API_URL,
        {
          method: 'GET',
          headers: {
            Authorization:
              `Bearer ${requireToken()}`,
          },
        },
      )

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response),
      )
    }

    return await response.json() as CloudStateResponse
  }

export const saveCloudState =
  async (
    body: SaveCloudStateRequest,
  ): Promise<CloudStateResponse> => {
    const response =
      await fetch(
        CLOUD_API_URL,
        {
          method: 'PUT',
          headers: {
            'Content-Type':
              'application/json',
            Authorization:
              `Bearer ${requireToken()}`,
          },
          body:
            JSON.stringify(body),
        },
      )

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response),
      )
    }

    return await response.json() as CloudStateResponse
  }

export const deleteCloudState =
  async (): Promise<void> => {
    const response =
      await fetch(
        CLOUD_API_URL,
        {
          method: 'DELETE',
          headers: {
            Authorization:
              `Bearer ${requireToken()}`,
          },
        },
      )

    if (
      !response.ok &&
      response.status !== 404
    ) {
      throw new Error(
        await readErrorMessage(response),
      )
    }
  }
