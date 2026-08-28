import {
  invalidateAuthSession,
} from '../domain/auth/authSession'

export interface ApiErrorPayload {
  code?: string | null
  message?: string
  detail?: string
  error?: string
}

export class ApiRequestError extends Error {
  readonly status: number
  readonly code: string | null

  constructor(
    status: number,
    code: string | null,
    message: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }
}

const sessionInvalidCodes =
  new Set([
    'SESSION_EXPIRED',
    'SESSION_REVOKED',
  ])

export const readApiError = async (
  response: Response,
): Promise<ApiRequestError> => {
  let payload: ApiErrorPayload = {}

  try {
    payload =
      await response.json() as ApiErrorPayload
  } catch {
    // Keep the fallback below for non-JSON errors.
  }

  const message =
    payload.message ||
    payload.detail ||
    payload.error ||
    `Request failed (${response.status}).`

  const code =
    payload.code ??
    null

  if (
    response.status === 401 &&
    code &&
    sessionInvalidCodes.has(code)
  ) {
    invalidateAuthSession(
      message,
    )
  }

  return new ApiRequestError(
    response.status,
    code,
    message,
  )
}
