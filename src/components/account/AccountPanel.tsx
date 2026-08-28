import {
  useEffect,
  useState,
} from 'react'

import {
  getCurrentAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
} from '../../services/authApi'

import type {
  AuthUser,
} from '../../services/authApi'

import {
  AUTH_SESSION_CHANGED_EVENT,
  AUTH_SESSION_INVALID_EVENT,
  clearAuthSession,
  consumeAuthSessionNotice,
  loadAuthSession,
  saveAuthSession,
  updateStoredAuthUser,
} from '../../domain/auth/authSession'

import './AccountPanel.css'

type AccountMode =
  | 'login'
  | 'register'

const formatDate = (
  value: string,
): string => {
  const date =
    new Date(
      value,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle:
        'medium',
    },
  ).format(
    date,
  )
}

function AccountPanel() {
  const [
    user,
    setUser,
  ] = useState<
    AuthUser | null
  >(
    () =>
      loadAuthSession()
        ?.user ??
      null,
  )

  const [
    expiresAt,
    setExpiresAt,
  ] = useState(
    () =>
      loadAuthSession()
        ?.expiresAt ??
      '',
  )

  const [
    mode,
    setMode,
  ] = useState<AccountMode>(
    'login',
  )

  const [
    displayName,
    setDisplayName,
  ] = useState('')

  const [
    email,
    setEmail,
  ] = useState('')

  const [
    password,
    setPassword,
  ] = useState('')

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    checking,
    setChecking,
  ] = useState(false)

  const [
    message,
    setMessage,
  ] = useState<
    {
      type:
        | 'success'
        | 'error'
      text: string
    } | null
  >(
    () => {
      const notice =
        consumeAuthSessionNotice()

      return notice
        ? {
            type:
              'error' as const,
            text:
              notice,
          }
        : null
    },
  )

  const syncFromStorage =
    () => {
      const session =
        loadAuthSession()

      setUser(
        session?.user ??
        null,
      )

      setExpiresAt(
        session?.expiresAt ??
        '',
      )
    }

  useEffect(
    () => {
      const handleInvalidSession =
        (event: Event) => {
          const customEvent =
            event as CustomEvent<{
              message?: string
            }>

          consumeAuthSessionNotice()

          showMessage(
            'error',
            customEvent.detail?.message ||
              'Your session is no longer active. Please sign in again.',
          )
        }

      window.addEventListener(
        AUTH_SESSION_CHANGED_EVENT,
        syncFromStorage,
      )

      window.addEventListener(
        AUTH_SESSION_INVALID_EVENT,
        handleInvalidSession,
      )

      return () => {
        window.removeEventListener(
          AUTH_SESSION_CHANGED_EVENT,
          syncFromStorage,
        )

        window.removeEventListener(
          AUTH_SESSION_INVALID_EVENT,
          handleInvalidSession,
        )
      }
    },
    [],
  )

  useEffect(
    () => {
      const session =
        loadAuthSession()

      if (
        !session
      ) {
        return
      }

      const verify =
        async () => {
          try {
            setChecking(
              true,
            )

            const current =
              await getCurrentAccount(
                session.token,
              )

            updateStoredAuthUser(
              current,
            )
          } catch (
            error
          ) {
            if (
              loadAuthSession()
            ) {
              showMessage(
                'error',
                error instanceof Error
                  ? error.message
                  : 'Could not verify the current session.',
              )
            }
          } finally {
            setChecking(
              false,
            )
          }
        }

      void verify()
    },
    [],
  )

  const showMessage =
    (
      type:
        | 'success'
        | 'error',
      text: string,
    ) => {
      setMessage({
        type,
        text,
      })
    }

  const handleSubmit =
    async (
      event:
        React.FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault()

      if (
        loading
      ) {
        return
      }

      try {
        setLoading(
          true,
        )

        setMessage(
          null,
        )

        const session =
          mode ===
          'register'
            ? await registerAccount({
                displayName:
                  displayName.trim(),
                email:
                  email.trim(),
                password,
              })
            : await loginAccount({
                email:
                  email.trim(),
                password,
              })

        saveAuthSession(
          session,
        )

        setPassword(
          '',
        )

        showMessage(
          'success',
          mode ===
          'register'
            ? 'Account created. You are signed in.'
            : 'Signed in successfully.',
        )
      } catch (
        error
      ) {
        showMessage(
          'error',
          error instanceof Error
            ? error.message
            : 'Authentication failed.',
        )
      } finally {
        setLoading(
          false,
        )
      }
    }

  const handleLogout =
    async () => {
      const session =
        loadAuthSession()

      try {
        setLoading(
          true,
        )

        if (
          session
        ) {
          await logoutAccount(
            session.token,
          )
        }
      } catch (
        error
      ) {
        console.error(
          'Could not invalidate remote session:',
          error,
        )
      } finally {
        clearAuthSession()

        setLoading(
          false,
        )

        showMessage(
          'success',
          'Signed out.',
        )
      }
    }

  return (
    <section
      id="account"
      className="account-panel"
    >
      <div className="account-panel-header">
        <div>
          <span>
            Account
          </span>

          <strong>
            Player Profile & Authentication
          </strong>

          <small>
            Guest mode remains available. Sign in to establish the identity that cloud intelligence will use next.
          </small>
        </div>

        <span className={`account-status ${user ? 'signed-in' : 'guest'}`}>
          {checking
            ? 'Checking...'
            : user
              ? 'Signed In'
              : 'Guest'}
        </span>
      </div>

      {message && (
        <div className={`account-message ${message.type}`}>
          {
            message.text
          }
        </div>
      )}

      {user ? (
        <div className="account-signed-in">
          <div className="account-avatar">
            {
              user.displayName
                .slice(
                  0,
                  2,
                )
                .toUpperCase()
            }
          </div>

          <div className="account-profile">
            <span>
              Welcome back
            </span>

            <strong>
              {
                user.displayName
              }
            </strong>

            <small>
              {
                user.email
              }
            </small>
          </div>

          <div className="account-metadata">
            <div>
              <span>
                Account Created
              </span>

              <strong>
                {formatDate(
                  user.createdAt,
                )}
              </strong>
            </div>

            <div>
              <span>
                Current Session
              </span>

              <strong>
                {expiresAt
                  ? `Until ${formatDate(expiresAt)}`
                  : 'Active'}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="account-logout"
            disabled={
              loading
            }
            onClick={() =>
              void handleLogout()
            }
          >
            {loading
              ? 'Signing Out...'
              : 'Sign Out'}
          </button>

          <div className="account-cloud-note">
            <strong>
              Account identity is ready.
            </strong>

            <span>
              Your account now powers cloud synchronization and account-owned simulation history. Use the Account Dashboard to review intelligence statistics and active sessions.
            </span>
          </div>
        </div>
      ) : (
        <div className="account-guest-layout">
          <div className="account-guest-info">
            <span>
              Guest Mode
            </span>

            <strong>
              The simulator still works without an account.
            </strong>

            <p>
              Reports, plans, tags and intelligence still work in guest mode. Signing in additionally enables cloud synchronization, account-owned history and session management.
            </p>

            <div className="account-security-list">
              <div>
                <strong>
                  BCrypt password hashing
                </strong>

                <span>
                  The backend never stores plain-text passwords.
                </span>
              </div>

              <div>
                <strong>
                  Revocable opaque sessions
                </strong>

                <span>
                  Only a SHA-256 hash of the session token is stored server-side.
                </span>
              </div>

              <div>
                <strong>
                  Tab-scoped token storage
                </strong>

                <span>
                  The browser keeps the raw token in sessionStorage, not persistent localStorage.
                </span>
              </div>
            </div>
          </div>

          <form
            className="account-form"
            onSubmit={
              handleSubmit
            }
          >
            <div className="account-form-tabs">
              <button
                type="button"
                className={
                  mode ===
                  'login'
                    ? 'active'
                    : undefined
                }
                onClick={() => {
                  setMode(
                    'login',
                  )

                  setMessage(
                    null,
                  )
                }}
              >
                Sign In
              </button>

              <button
                type="button"
                className={
                  mode ===
                  'register'
                    ? 'active'
                    : undefined
                }
                onClick={() => {
                  setMode(
                    'register',
                  )

                  setMessage(
                    null,
                  )
                }}
              >
                Create Account
              </button>
            </div>

            {mode ===
              'register' && (
              <label>
                <span>
                  Display Name
                </span>

                <input
                  type="text"
                  required
                  minLength={
                    2
                  }
                  maxLength={
                    50
                  }
                  autoComplete="nickname"
                  placeholder="Your player name"
                  value={
                    displayName
                  }
                  onChange={(
                    event,
                  ) =>
                    setDisplayName(
                      event.target.value,
                    )
                  }
                />
              </label>
            )}

            <label>
              <span>
                Email
              </span>

              <input
                type="email"
                required
                maxLength={
                  254
                }
                autoComplete="email"
                placeholder="you@example.com"
                value={
                  email
                }
                onChange={(
                  event,
                ) =>
                  setEmail(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>
                Password
              </span>

              <input
                type="password"
                required
                minLength={
                  8
                }
                maxLength={
                  72
                }
                autoComplete={
                  mode ===
                  'register'
                    ? 'new-password'
                    : 'current-password'
                }
                placeholder="Minimum 8 characters"
                value={
                  password
                }
                onChange={(
                  event,
                ) =>
                  setPassword(
                    event.target.value,
                  )
                }
              />
            </label>

            <button
              type="submit"
              className="account-submit"
              disabled={
                loading
              }
            >
              {loading
                ? 'Please wait...'
                : mode ===
                    'register'
                  ? 'Create Account'
                  : 'Sign In'}
            </button>

            <small className="account-form-note">
              V49 uses the Tribal Battle API authentication endpoints. If your backend is not running with the V49 patch yet, the account form will show a connection error while guest mode continues to work.
            </small>
          </form>
        </div>
      )}
    </section>
  )
}

export default AccountPanel
