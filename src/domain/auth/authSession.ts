import type {
  AuthSessionResponse,
  AuthUser,
} from '../../services/authApi'

export const AUTH_SESSION_CHANGED_EVENT =
  'tribal-battle-auth-session-changed'

const TOKEN_KEY =
  'tribal-battle-auth-token-v1'

const USER_KEY =
  'tribal-battle-auth-user-v1'

const EXPIRES_AT_KEY =
  'tribal-battle-auth-expires-at-v1'

export interface StoredAuthSession {
  token: string
  expiresAt: string
  user: AuthUser
}

const dispatchChange =
  (): void => {
    window.dispatchEvent(
      new CustomEvent(
        AUTH_SESSION_CHANGED_EVENT,
      ),
    )
  }

export const loadAuthSession =
  (): StoredAuthSession | null => {
    if (
      typeof window ===
      'undefined'
    ) {
      return null
    }

    const token =
      window.sessionStorage.getItem(
        TOKEN_KEY,
      )

    const userJson =
      window.sessionStorage.getItem(
        USER_KEY,
      )

    const expiresAt =
      window.sessionStorage.getItem(
        EXPIRES_AT_KEY,
      )

    if (
      !token ||
      !userJson ||
      !expiresAt
    ) {
      return null
    }

    if (
      new Date(
        expiresAt,
      ).getTime() <=
      Date.now()
    ) {
      clearAuthSession()

      return null
    }

    try {
      const user =
        JSON.parse(
          userJson,
        ) as AuthUser

      return {
        token,
        expiresAt,
        user,
      }
    } catch {
      clearAuthSession()

      return null
    }
  }

export const getAuthToken =
  (): string | null => {
    return (
      loadAuthSession()
        ?.token ??
      null
    )
  }

export const saveAuthSession =
  (
    session:
      AuthSessionResponse,
  ): void => {
    window.sessionStorage.setItem(
      TOKEN_KEY,
      session.token,
    )

    window.sessionStorage.setItem(
      USER_KEY,
      JSON.stringify(
        session.user,
      ),
    )

    window.sessionStorage.setItem(
      EXPIRES_AT_KEY,
      session.expiresAt,
    )

    dispatchChange()
  }

export const updateStoredAuthUser =
  (
    user: AuthUser,
  ): void => {
    const current =
      loadAuthSession()

    if (
      !current
    ) {
      return
    }

    window.sessionStorage.setItem(
      USER_KEY,
      JSON.stringify(
        user,
      ),
    )

    dispatchChange()
  }

export const clearAuthSession =
  (): void => {
    if (
      typeof window ===
      'undefined'
    ) {
      return
    }

    window.sessionStorage.removeItem(
      TOKEN_KEY,
    )

    window.sessionStorage.removeItem(
      USER_KEY,
    )

    window.sessionStorage.removeItem(
      EXPIRES_AT_KEY,
    )

    dispatchChange()
  }
