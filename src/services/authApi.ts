import {
  API_BASE_URL,
} from '../config/apiConfig'

import {
  readApiError,
} from './apiError'

export interface AuthUser {
  id: string
  email: string
  displayName: string
  createdAt: string
}

export interface AuthSessionResponse {
  token: string
  expiresAt: string
  user: AuthUser
}

export interface AuthSessionInfo {
  id: string
  userAgent: string | null
  createdAt: string
  expiresAt: string
  current: boolean
}

export interface RevokeOtherSessionsResponse {
  revokedCount: number
}

export interface RevokeAllSessionsResponse {
  revokedCount: number
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface ChangePasswordResponse {
  revokedSessions: number
}

export interface RegisterAccountRequest {
  displayName: string
  email: string
  password: string
}

export interface LoginAccountRequest {
  email: string
  password: string
}

export interface ForgotPasswordResponse {
  message: string
}

export interface ResetPasswordResponse {
  revokedSessions: number
  message: string
}

const AUTH_API_URL =
  `${API_BASE_URL}/api/v1/auth`

const request = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response =
    await fetch(
      `${AUTH_API_URL}${path}`,
      {
        ...init,
        headers: {
          'Content-Type':
            'application/json',
          ...(init?.headers ??
            {}),
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

  if (
    response.status ===
    204
  ) {
    return undefined as T
  }

  return await response.json() as T
}

const bearerHeaders =
  (
    token: string,
  ): Record<string, string> => ({
    Authorization:
      `Bearer ${token}`,
  })

export const registerAccount =
  (
    body:
      RegisterAccountRequest,
  ): Promise<AuthSessionResponse> => {
    return request<AuthSessionResponse>(
      '/register',
      {
        method:
          'POST',
        body:
          JSON.stringify(
            body,
          ),
      },
    )
  }

export const loginAccount =
  (
    body:
      LoginAccountRequest,
  ): Promise<AuthSessionResponse> => {
    return request<AuthSessionResponse>(
      '/login',
      {
        method:
          'POST',
        body:
          JSON.stringify(
            body,
          ),
      },
    )
  }

export const getCurrentAccount =
  (
    token: string,
  ): Promise<AuthUser> => {
    return request<AuthUser>(
      '/me',
      {
        method:
          'GET',
        headers:
          bearerHeaders(
            token,
          ),
      },
    )
  }

export const logoutAccount =
  (
    token: string,
  ): Promise<void> => {
    return request<void>(
      '/logout',
      {
        method:
          'POST',
        headers:
          bearerHeaders(
            token,
          ),
      },
    )
  }

export const listAccountSessions =
  (
    token: string,
  ): Promise<AuthSessionInfo[]> => {
    return request<AuthSessionInfo[]>(
      '/sessions',
      {
        method:
          'GET',
        headers:
          bearerHeaders(
            token,
          ),
      },
    )
  }

export const revokeAccountSession =
  (
    token: string,
    sessionId: string,
  ): Promise<void> => {
    return request<void>(
      `/sessions/${encodeURIComponent(
        sessionId,
      )}`,
      {
        method:
          'DELETE',
        headers:
          bearerHeaders(
            token,
          ),
      },
    )
  }

export const revokeOtherAccountSessions =
  (
    token: string,
  ): Promise<RevokeOtherSessionsResponse> => {
    return request<RevokeOtherSessionsResponse>(
      '/sessions/revoke-others',
      {
        method:
          'POST',
        headers:
          bearerHeaders(
            token,
          ),
      },
    )
  }

export const changeAccountPassword =
  (
    token: string,
    body: ChangePasswordRequest,
  ): Promise<ChangePasswordResponse> => {
    return request<ChangePasswordResponse>(
      '/password/change',
      {
        method:
          'POST',
        headers:
          bearerHeaders(
            token,
          ),
        body:
          JSON.stringify(
            body,
          ),
      },
    )
  }

export const revokeAllAccountSessions =
  (
    token: string,
  ): Promise<RevokeAllSessionsResponse> => {
    return request<RevokeAllSessionsResponse>(
      '/sessions/revoke-all',
      {
        method:
          'POST',
        headers:
          bearerHeaders(
            token,
          ),
      },
    )
  }

export const requestPasswordReset =
  (
    email: string,
  ): Promise<ForgotPasswordResponse> => {
    return request<ForgotPasswordResponse>(
      '/password/forgot',
      {
        method: 'POST',
        body: JSON.stringify({
          email,
        }),
      },
    )
  }

export const resetAccountPassword =
  (
    token: string,
    newPassword: string,
  ): Promise<ResetPasswordResponse> => {
    return request<ResetPasswordResponse>(
      '/password/reset',
      {
        method: 'POST',
        body: JSON.stringify({
          token,
          newPassword,
        }),
      },
    )
  }
