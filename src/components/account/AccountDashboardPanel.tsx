import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  ATTACK_PLAN_CHANGED_EVENT,
  loadAttackPlans,
} from '../../domain/planning/attackPlan'

import {
  VILLAGE_WATCHLIST_CHANGED_EVENT,
  loadVillageWatchlistSettings,
} from '../../domain/intelligence/villageWatchlist'

import {
  VILLAGE_ANNOTATIONS_CHANGED_EVENT,
  loadVillageAnnotations,
} from '../../domain/intelligence/villageAnnotations'

import {
  AUTH_SESSION_CHANGED_EVENT,
  clearAuthSession,
  loadAuthSession,
} from '../../domain/auth/authSession'

import {
  CLOUD_SYNC_CHANGED_EVENT,
  collectLocalCloudSnapshot,
  formatApproximateBytes,
  loadCloudSyncMetadata,
} from '../../domain/cloud/cloudSync'

import {
  getCloudState,
} from '../../services/cloudSyncApi'

import {
  listSimulationHistory,
} from '../../services/simulationHistoryApi'

import {
  changeAccountPassword,
  listAccountSessions,
  revokeAccountSession,
  revokeAllAccountSessions,
  revokeOtherAccountSessions,
} from '../../services/authApi'

import type {
  AuthSessionInfo,
} from '../../services/authApi'

import type {
  CloudStateResponse,
} from '../../services/cloudSyncApi'

import './AccountDashboardPanel.css'

interface DashboardSnapshot {
  watchedVillages: number
  annotatedVillages: number
  attackPlans: number
  activeAttackPlans: number
  totalWaves: number
  recentHistory: number
}

const emptySnapshot =
  (): DashboardSnapshot => ({
    watchedVillages:
      0,
    annotatedVillages:
      0,
    attackPlans:
      0,
    activeAttackPlans:
      0,
    totalWaves:
      0,
    recentHistory:
      0,
  })

const formatDateTime =
  (
    value:
      string | null,
  ): string => {
    if (
      !value
    ) {
      return 'Never'
    }

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
        timeStyle:
          'short',
      },
    ).format(
      date,
    )
  }

const describeUserAgent =
  (
    userAgent:
      string | null,
  ): {
    browser: string
    platform: string
  } => {
    if (
      !userAgent
    ) {
      return {
        browser:
          'Unknown browser',
        platform:
          'Unknown device',
      }
    }

    const browser =
      userAgent.includes(
        'Edg/',
      )
        ? 'Microsoft Edge'
        : userAgent.includes(
              'Firefox/',
            )
          ? 'Firefox'
          : userAgent.includes(
                'Chrome/',
              )
            ? 'Chrome'
            : userAgent.includes(
                  'Safari/',
                )
              ? 'Safari'
              : 'Browser'

    const platform =
      userAgent.includes(
        'Windows',
      )
        ? 'Windows'
        : userAgent.includes(
              'Macintosh',
            )
          ? 'macOS'
          : userAgent.includes(
                'Android',
              )
            ? 'Android'
            : userAgent.includes(
                  'iPhone',
                ) ||
                userAgent.includes(
                  'iPad',
                )
              ? 'iOS'
              : userAgent.includes(
                    'Linux',
                  )
                ? 'Linux'
                : 'Device'

    return {
      browser,
      platform,
    }
  }

function AccountDashboardPanel() {
  const [
    session,
    setSession,
  ] = useState(
    () =>
      loadAuthSession(),
  )

  const [
    dashboard,
    setDashboard,
  ] = useState<
    DashboardSnapshot
  >(
    () =>
      emptySnapshot(),
  )

  const [
    sessions,
    setSessions,
  ] = useState<
    AuthSessionInfo[]
  >([])

  const [
    cloud,
    setCloud,
  ] = useState<
    CloudStateResponse | null
  >(null)

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    mutatingSessionId,
    setMutatingSessionId,
  ] = useState<
    string | null
  >(null)

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
  >(null)

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState('')

  const [
    newPassword,
    setNewPassword,
  ] = useState('')

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false)

  const localSnapshot =
    useMemo(
      () =>
        collectLocalCloudSnapshot(),
      [
        dashboard,
        cloud,
      ],
    )

  const syncMetadata =
    useMemo(
      () =>
        loadCloudSyncMetadata(),
      [
        dashboard,
        cloud,
      ],
    )

  const refresh =
    useCallback(
      async () => {
        const current =
          loadAuthSession()

        setSession(
          current,
        )

        if (
          !current
        ) {
          setDashboard(
            emptySnapshot(),
          )

          setSessions(
            [],
          )

          setCloud(
            null,
          )

          return
        }

        try {
          setLoading(
            true,
          )

          setMessage(
            null,
          )

          const watchlist =
            loadVillageWatchlistSettings()

          const annotations =
            loadVillageAnnotations()

          const plans =
            loadAttackPlans()

          const [
            history,
            accountSessions,
            cloudState,
          ] =
            await Promise.all([
              listSimulationHistory(),
              listAccountSessions(
                current.token,
              ),
              getCloudState(),
            ])

          setDashboard({
            watchedVillages:
              watchlist
                .watchedVillageKeys
                .length,

            annotatedVillages:
              Object.values(
                annotations,
              ).filter(
                (annotation) =>
                  annotation.tags.length >
                    0 ||
                  annotation.note.trim()
                    .length >
                    0,
              ).length,

            attackPlans:
              plans.length,

            activeAttackPlans:
              plans.filter(
                (plan) =>
                  plan.status !==
                    'COMPLETED' &&
                  plan.status !==
                    'CANCELLED',
              ).length,

            totalWaves:
              plans.reduce(
                (
                  total,
                  plan,
                ) =>
                  total +
                  plan.waves.length,
                0,
              ),

            recentHistory:
              history.length,
          })

          setSessions(
            accountSessions,
          )

          setCloud(
            cloudState,
          )
        } catch (
          error
        ) {
          setMessage({
            type:
              'error',
            text:
              error instanceof Error
                ? error.message
                : 'Could not load the account dashboard.',
          })
        } finally {
          setLoading(
            false,
          )
        }
      },
      [],
    )

  useEffect(
    () => {
      void refresh()

      const handleChange =
        () =>
          void refresh()

      const events = [
        AUTH_SESSION_CHANGED_EVENT,
        CLOUD_SYNC_CHANGED_EVENT,
        VILLAGE_WATCHLIST_CHANGED_EVENT,
        VILLAGE_ANNOTATIONS_CHANGED_EVENT,
        ATTACK_PLAN_CHANGED_EVENT,
      ]

      events.forEach(
        (eventName) =>
          window.addEventListener(
            eventName,
            handleChange,
          ),
      )

      return () => {
        events.forEach(
          (eventName) =>
            window.removeEventListener(
              eventName,
              handleChange,
            ),
        )
      }
    },
    [
      refresh,
    ],
  )

  const revokeSession =
    async (
      target:
        AuthSessionInfo,
    ) => {
      const current =
        loadAuthSession()

      if (
        !current
      ) {
        return
      }

      const description =
        describeUserAgent(
          target.userAgent,
        )

      if (
        !window.confirm(
          target.current
            ? 'Revoke the current session and sign out from this browser?'
            : `Revoke ${description.browser} on ${description.platform}?`,
        )
      ) {
        return
      }

      try {
        setMutatingSessionId(
          target.id,
        )

        await revokeAccountSession(
          current.token,
          target.id,
        )

        if (
          target.current
        ) {
          clearAuthSession()

          setMessage({
            type:
              'success',
            text:
              'Current session revoked.',
          })

          return
        }

        setMessage({
          type:
            'success',
          text:
            'Session revoked.',
        })

        await refresh()
      } catch (
        error
      ) {
        setMessage({
          type:
            'error',
          text:
            error instanceof Error
              ? error.message
              : 'Could not revoke the session.',
        })
      } finally {
        setMutatingSessionId(
          null,
        )
      }
    }

  const revokeOthers =
    async () => {
      const current =
        loadAuthSession()

      if (
        !current
      ) {
        return
      }

      if (
        !window.confirm(
          'Sign out every other active session while keeping this browser signed in?',
        )
      ) {
        return
      }

      try {
        setMutatingSessionId(
          'others',
        )

        const result =
          await revokeOtherAccountSessions(
            current.token,
          )

        setMessage({
          type:
            'success',
          text:
            `${result.revokedCount} other session${result.revokedCount === 1 ? '' : 's'} revoked.`,
        })

        await refresh()
      } catch (
        error
      ) {
        setMessage({
          type:
            'error',
          text:
            error instanceof Error
              ? error.message
              : 'Could not revoke the other sessions.',
        })
      } finally {
        setMutatingSessionId(
          null,
        )
      }
    }

  const changePassword =
    async (
      event:
        React.FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault()

      const current =
        loadAuthSession()

      if (
        !current ||
        changingPassword
      ) {
        return
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        setMessage({
          type:
            'error',
          text:
            'New password and confirmation do not match.',
        })

        return
      }

      if (
        newPassword.length < 8
      ) {
        setMessage({
          type:
            'error',
          text:
            'New password must contain at least 8 characters.',
        })

        return
      }

      try {
        setChangingPassword(
          true,
        )

        setMessage(
          null,
        )

        const result =
          await changeAccountPassword(
            current.token,
            {
              currentPassword,
              newPassword,
            },
          )

        setCurrentPassword(
          '',
        )

        setNewPassword(
          '',
        )

        setConfirmPassword(
          '',
        )

        setMessage({
          type:
            'success',
          text:
            `Password changed. ${result.revokedSessions} other session${result.revokedSessions === 1 ? '' : 's'} signed out.`,
        })

        await refresh()
      } catch (
        error
      ) {
        setMessage({
          type:
            'error',
          text:
            error instanceof Error
              ? error.message
              : 'Could not change the password.',
        })
      } finally {
        setChangingPassword(
          false,
        )
      }
    }

  const revokeAllSessions =
    async () => {
      const current =
        loadAuthSession()

      if (
        !current
      ) {
        return
      }

      if (
        !window.confirm(
          'Sign out every active session, including this browser?',
        )
      ) {
        return
      }

      try {
        setMutatingSessionId(
          'all',
        )

        const result =
          await revokeAllAccountSessions(
            current.token,
          )

        setMessage({
          type:
            'success',
          text:
            `${result.revokedCount} session${result.revokedCount === 1 ? '' : 's'} signed out.`,
        })

        clearAuthSession()
      } catch (
        error
      ) {
        setMessage({
          type:
            'error',
          text:
            error instanceof Error
              ? error.message
              : 'Could not sign out all sessions.',
        })
      } finally {
        setMutatingSessionId(
          null,
        )
      }
    }

  if (
    !session
  ) {
    return (
      <section
        id="account-dashboard"
        className="account-dashboard-panel"
      >
        <div className="account-dashboard-header">
          <div>
            <span>
              Account Dashboard
            </span>

            <strong>
              Intelligence & sessions
            </strong>

            <small>
              Sign in to see cloud, history and active-session information.
            </small>
          </div>

          <span className="account-dashboard-state guest">
            Guest
          </span>
        </div>

        {message && (
          <div className={`account-dashboard-message ${message.type}`}>
            {
              message.text
            }
          </div>
        )}

        <div className="account-dashboard-guest">
          Account statistics and session management become available after sign in.
        </div>
      </section>
    )
  }

  return (
    <section
      id="account-dashboard"
      className="account-dashboard-panel"
    >
      <div className="account-dashboard-header">
        <div>
          <span>
            Account Dashboard
          </span>

          <strong>
            {
              session.user
                .displayName
            }
            {' · '}
            Intelligence & sessions
          </strong>

          <small>
            One place to check browser intelligence, account history, cloud state and connected sessions.
          </small>
        </div>

        <button
          type="button"
          disabled={
            loading
          }
          onClick={() =>
            void refresh()
          }
        >
          {loading
            ? 'Refreshing...'
            : 'Refresh'}
        </button>
      </div>

      {message && (
        <div className={`account-dashboard-message ${message.type}`}>
          {
            message.text
          }
        </div>
      )}

      <div className="account-dashboard-stats">
        <div>
          <span>
            Watched Villages
          </span>

          <strong>
            {
              dashboard
                .watchedVillages
            }
          </strong>

          <small>
            local-first watchlist
          </small>
        </div>

        <div>
          <span>
            Annotated Villages
          </span>

          <strong>
            {
              dashboard
                .annotatedVillages
            }
          </strong>

          <small>
            notes or tags
          </small>
        </div>

        <div>
          <span>
            Attack Plans
          </span>

          <strong>
            {
              dashboard
                .activeAttackPlans
            }
            {' / '}
            {
              dashboard
                .attackPlans
            }
          </strong>

          <small>
            active / total · {dashboard.totalWaves} waves
          </small>
        </div>

        <div>
          <span>
            Recent History
          </span>

          <strong>
            {
              dashboard
                .recentHistory
            }
          </strong>

          <small>
            latest account rows, max 50
          </small>
        </div>

        <div>
          <span>
            Cloud
          </span>

          <strong>
            {cloud
              ? `Revision ${cloud.revision}`
              : 'No snapshot'}
          </strong>

          <small>
            {cloud
              ? `updated ${formatDateTime(cloud.updatedAt)}`
              : 'use Cloud Sync to create one'}
          </small>
        </div>

        <div>
          <span>
            Browser Data
          </span>

          <strong>
            {
              localSnapshot
                .keyCount
            }{' '}
            keys
          </strong>

          <small>
            {formatApproximateBytes(
              localSnapshot
                .approximateBytes,
            )}
            {' · synced '}
            {formatDateTime(
              syncMetadata
                .lastSyncedAt,
            )}
          </small>
        </div>
      </div>

      <div className="account-dashboard-section-heading">
        <div>
          <span>
            Account Security
          </span>

          <strong>
            Password & account access
          </strong>

          <small>
            Changing your password keeps this browser signed in and revokes every other session.
          </small>
        </div>
      </div>

      <div className="account-security-grid">
        <form
          className="account-password-form"
          onSubmit={
            (event) =>
              void changePassword(
                event,
              )
          }
        >
          <div className="account-security-card-heading">
            <strong>
              Change Password
            </strong>

            <small>
              Your current password is required.
            </small>
          </div>

          <label>
            <span>
              Current password
            </span>

            <input
              type="password"
              autoComplete="current-password"
              minLength={8}
              maxLength={72}
              required
              value={
                currentPassword
              }
              onChange={
                (event) =>
                  setCurrentPassword(
                    event.target.value,
                  )
              }
            />
          </label>

          <label>
            <span>
              New password
            </span>

            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              value={
                newPassword
              }
              onChange={
                (event) =>
                  setNewPassword(
                    event.target.value,
                  )
              }
            />
          </label>

          <label>
            <span>
              Confirm new password
            </span>

            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              value={
                confirmPassword
              }
              onChange={
                (event) =>
                  setConfirmPassword(
                    event.target.value,
                  )
              }
            />
          </label>

          <button
            type="submit"
            disabled={
              changingPassword ||
              mutatingSessionId !==
                null
            }
          >
            {changingPassword
              ? 'Changing...'
              : 'Change Password'}
          </button>
        </form>

        <div className="account-security-danger">
          <div className="account-security-card-heading">
            <strong>
              Sign Out Everywhere
            </strong>

            <small>
              Immediately revoke every active session, including this browser.
            </small>
          </div>

          <p>
            Use this if you think your account is open on a device you no longer control. You will need to sign in again here afterward.
          </p>

          <button
            type="button"
            className="danger"
            disabled={
              mutatingSessionId !==
                null ||
              changingPassword
            }
            onClick={() =>
              void revokeAllSessions()
            }
          >
            {mutatingSessionId ===
            'all'
              ? 'Signing Out...'
              : 'Sign Out Everywhere'}
          </button>
        </div>
      </div>

      <div className="account-dashboard-section-heading">
        <div>
          <span>
            Sessions
          </span>

          <strong>
            Active Sessions
          </strong>

          <small>
            {
              sessions.length
            }{' '}
            valid session{
              sessions.length ===
              1
                ? ''
                : 's'
            }
          </small>
        </div>

        <button
          type="button"
          className="danger-soft"
          disabled={
            sessions.filter(
              (item) =>
                !item.current,
            ).length ===
              0 ||
            mutatingSessionId !==
              null
          }
          onClick={() =>
            void revokeOthers()
          }
        >
          {mutatingSessionId ===
          'others'
            ? 'Revoking...'
            : 'Sign Out Other Sessions'}
        </button>
      </div>

      <div className="account-dashboard-sessions">
        {sessions.map(
          (item) => {
            const device =
              describeUserAgent(
                item.userAgent,
              )

            return (
              <article
                key={
                  item.id
                }
                className={
                  item.current
                    ? 'current'
                    : undefined
                }
              >
                <div className="account-session-device">
                  <span className="account-session-icon">
                    {device.platform ===
                    'Android' ||
                    device.platform ===
                    'iOS'
                      ? '▯'
                      : '▣'}
                  </span>

                  <div>
                    <strong>
                      {
                        device.browser
                      }
                      {' on '}
                      {
                        device.platform
                      }
                    </strong>

                    <small>
                      {item.current
                        ? 'This session'
                        : 'Other session'}
                    </small>
                  </div>
                </div>

                <dl>
                  <div>
                    <dt>
                      Created
                    </dt>

                    <dd>
                      {formatDateTime(
                        item.createdAt,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Expires
                    </dt>

                    <dd>
                      {formatDateTime(
                        item.expiresAt,
                      )}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  className={
                    item.current
                      ? 'danger'
                      : 'danger-soft'
                  }
                  disabled={
                    mutatingSessionId !==
                    null
                  }
                  onClick={() =>
                    void revokeSession(
                      item,
                    )
                  }
                >
                  {mutatingSessionId ===
                  item.id
                    ? 'Revoking...'
                    : item.current
                      ? 'Revoke & Sign Out'
                      : 'Revoke'}
                </button>
              </article>
            )
          },
        )}

        {!loading &&
          sessions.length ===
            0 && (
            <div className="account-dashboard-empty">
              No active sessions returned by the API.
            </div>
          )}
      </div>

      <div className="account-dashboard-note">
        <strong>
          Session privacy
        </strong>

        <span>
          V52 stores only the browser User-Agent string for a friendly device label. It does not add IP-address tracking or precise device fingerprinting.
        </span>
      </div>
    </section>
  )
}

export default AccountDashboardPanel
