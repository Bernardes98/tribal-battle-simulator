import {
  API_BASE_URL,
} from '../config/apiConfig'

import {
  readApiError,
} from './apiError'

import {
  getAuthToken,
} from '../domain/auth/authSession'

export interface CloudStateResponse {
  revision: number
  updatedAt: string
  payload: Record<string, string>
}

export interface CloudStateVersionResponse {
  revision: number
  snapshotAt: string
  current: boolean
}

export interface SaveCloudStateRequest {
  expectedRevision: number
  payload: Record<string, string>
}

export interface RestoreCloudStateRequest {
  expectedRevision: number
}

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
      throw await readApiError(
        response,
      )
    }

    return await response.json() as CloudStateResponse
  }

export const listCloudStateVersions =
  async (): Promise<CloudStateVersionResponse[]> => {
    const response =
      await fetch(
        `${CLOUD_API_URL}/versions`,
        {
          method: 'GET',
          headers: {
            Authorization:
              `Bearer ${requireToken()}`,
          },
        },
      )

    if (!response.ok) {
      throw await readApiError(
        response,
      )
    }

    return await response.json() as CloudStateVersionResponse[]
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
      throw await readApiError(
        response,
      )
    }

    return await response.json() as CloudStateResponse
  }

export const restoreCloudStateVersion =
  async (
    revision: number,
    body: RestoreCloudStateRequest,
  ): Promise<CloudStateResponse> => {
    const response =
      await fetch(
        `${CLOUD_API_URL}/versions/${revision}/restore`,
        {
          method: 'POST',
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
      throw await readApiError(
        response,
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
      throw await readApiError(
        response,
      )
    }
  }
