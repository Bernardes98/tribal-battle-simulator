import {
  useEffect,
  useRef,
} from 'react'

import {
  AUTH_SESSION_CHANGED_EVENT,
  loadAuthSession,
} from '../../domain/auth/authSession'

import {
  AUTO_CLOUD_SYNC_SETTINGS_CHANGED_EVENT,
  loadAutoCloudSyncSettings,
  publishAutoCloudSyncStatus,
} from '../../domain/cloud/autoCloudSync'

import {
  applyCloudPayload,
  collectLocalCloudSnapshot,
  decideSmartSync,
  loadCloudSyncMetadata,
  markCloudSyncComplete,
} from '../../domain/cloud/cloudSync'

import {
  getCloudState,
  saveCloudState,
} from '../../services/cloudSyncApi'

function AutoCloudSyncAgent() {
  const runningRef =
    useRef(false)

  const stoppedRef =
    useRef(false)

  const reloadScheduledRef =
    useRef(false)

  const lastObservedFingerprintRef =
    useRef(
      collectLocalCloudSnapshot()
        .fingerprint,
    )

  const debounceTimerRef =
    useRef<
      number | null
    >(null)

  const localPollTimerRef =
    useRef<
      number | null
    >(null)

  const cloudPollTimerRef =
    useRef<
      number | null
    >(null)

  useEffect(
    () => {
      stoppedRef.current =
        false

      const clearTimers =
        () => {
          if (
            debounceTimerRef.current !==
            null
          ) {
            window.clearTimeout(
              debounceTimerRef.current,
            )

            debounceTimerRef.current =
              null
          }

          if (
            localPollTimerRef.current !==
            null
          ) {
            window.clearInterval(
              localPollTimerRef.current,
            )

            localPollTimerRef.current =
              null
          }

          if (
            cloudPollTimerRef.current !==
            null
          ) {
            window.clearInterval(
              cloudPollTimerRef.current,
            )

            cloudPollTimerRef.current =
              null
          }
        }

      const publishDisabledState =
        () => {
          const session =
            loadAuthSession()

          const settings =
            loadAutoCloudSyncSettings()

          if (
            !session
          ) {
            publishAutoCloudSyncStatus({
              state:
                'disabled',
              message:
                'Automatic sync waits until you sign in.',
              cloudRevision:
                null,
            })

            return true
          }

          if (
            !settings.enabled
          ) {
            publishAutoCloudSyncStatus({
              state:
                'disabled',
              message:
                'Automatic cloud sync is disabled.',
              cloudRevision:
                null,
            })

            return true
          }

          if (
            typeof navigator !==
              'undefined' &&
            !navigator.onLine
          ) {
            publishAutoCloudSyncStatus({
              state:
                'offline',
              message:
                'Offline. Changes remain local and will sync when the connection returns.',
              cloudRevision:
                loadCloudSyncMetadata()
                  .lastCloudRevision ||
                null,
            })

            return true
          }

          return false
        }

      const performSync =
        async (
          reason: string,
        ) => {
          if (
            stoppedRef.current ||
            runningRef.current ||
            reloadScheduledRef.current
          ) {
            return
          }

          if (
            publishDisabledState()
          ) {
            return
          }

          if (
            document.visibilityState ===
            'hidden'
          ) {
            publishAutoCloudSyncStatus({
              state:
                'waiting',
              message:
                'Automatic sync is waiting for this tab to become active.',
              cloudRevision:
                loadCloudSyncMetadata()
                  .lastCloudRevision ||
                null,
            })

            return
          }

          try {
            runningRef.current =
              true

            publishAutoCloudSyncStatus({
              state:
                'checking',
              message:
                `Checking cloud changes (${reason})...`,
              cloudRevision:
                loadCloudSyncMetadata()
                  .lastCloudRevision ||
                null,
            })

            const cloud =
              await getCloudState()

            if (
              stoppedRef.current
            ) {
              return
            }

            const local =
              collectLocalCloudSnapshot()

            const metadata =
              loadCloudSyncMetadata()

            const decision =
              decideSmartSync(
                local,
                cloud,
                metadata,
              )

            if (
              decision.action ===
              'upload'
            ) {
              publishAutoCloudSyncStatus({
                state:
                  'uploading',
                message:
                  'Saving local changes to the cloud...',
                cloudRevision:
                  cloud?.revision ??
                  null,
              })

              const latestLocal =
                collectLocalCloudSnapshot()

              const saved =
                await saveCloudState({
                  expectedRevision:
                    cloud?.revision ??
                    0,
                  payload:
                    latestLocal.payload,
                })

              markCloudSyncComplete(
                saved.revision,
                saved.payload,
              )

              lastObservedFingerprintRef.current =
                collectLocalCloudSnapshot()
                  .fingerprint

              publishAutoCloudSyncStatus({
                state:
                  'synced',
                message:
                  `Saved automatically · cloud revision ${saved.revision}.`,
                cloudRevision:
                  saved.revision,
              })

              return
            }

            if (
              decision.action ===
                'download' &&
              cloud
            ) {
              publishAutoCloudSyncStatus({
                state:
                  'downloading',
                message:
                  `A newer cloud revision (${cloud.revision}) was found. Restoring it safely...`,
                cloudRevision:
                  cloud.revision,
              })

              applyCloudPayload(
                cloud.payload,
              )

              markCloudSyncComplete(
                cloud.revision,
                cloud.payload,
              )

              lastObservedFingerprintRef.current =
                collectLocalCloudSnapshot()
                  .fingerprint

              publishAutoCloudSyncStatus({
                state:
                  'synced',
                message:
                  `Cloud revision ${cloud.revision} restored. Reloading local-first modules...`,
                cloudRevision:
                  cloud.revision,
              })

              reloadScheduledRef.current =
                true

              window.setTimeout(
                () => {
                  if (
                    !stoppedRef.current
                  ) {
                    window.location.reload()
                  }
                },
                700,
              )

              return
            }

            if (
              decision.action ===
              'nothing'
            ) {
              if (
                cloud
              ) {
                markCloudSyncComplete(
                  cloud.revision,
                  cloud.payload,
                )
              }

              lastObservedFingerprintRef.current =
                collectLocalCloudSnapshot()
                  .fingerprint

              publishAutoCloudSyncStatus({
                state:
                  'synced',
                message:
                  'All changes are saved.',
                cloudRevision:
                  cloud?.revision ??
                  null,
              })

              return
            }

            publishAutoCloudSyncStatus({
              state:
                'conflict',
              message:
                'Sync conflict detected. Automatic sync stopped before overwriting anything. Open Cloud Intelligence and choose which copy should win.',
              cloudRevision:
                cloud?.revision ??
                null,
            })
          } catch (
            error
          ) {
            const text =
              error instanceof Error
                ? error.message
                : 'Automatic cloud sync failed.'

            publishAutoCloudSyncStatus({
              state:
                text.includes(
                  '409',
                ) ||
                text.toLowerCase()
                  .includes(
                    'changed on another device',
                  )
                  ? 'conflict'
                  : 'error',

              message:
                text,

              cloudRevision:
                loadCloudSyncMetadata()
                  .lastCloudRevision ||
                null,
            })
          } finally {
            runningRef.current =
              false
          }
        }

      const scheduleLocalSync =
        () => {
          const settings =
            loadAutoCloudSyncSettings()

          if (
            !settings.enabled ||
            !loadAuthSession()
          ) {
            publishDisabledState()

            return
          }

          if (
            debounceTimerRef.current !==
            null
          ) {
            window.clearTimeout(
              debounceTimerRef.current,
            )
          }

          publishAutoCloudSyncStatus({
            state:
              'waiting',
            message:
              `Local changes detected. Saving automatically in ${(
                settings.debounceMs /
                1000
              ).toFixed(
                1,
              )}s...`,
            cloudRevision:
              loadCloudSyncMetadata()
                .lastCloudRevision ||
              null,
          })

          debounceTimerRef.current =
            window.setTimeout(
              () => {
                debounceTimerRef.current =
                  null

                void performSync(
                  'local change',
                )
              },
              settings.debounceMs,
            )
        }

      const detectLocalChanges =
        () => {
          const current =
            collectLocalCloudSnapshot()
              .fingerprint

          if (
            current !==
            lastObservedFingerprintRef.current
          ) {
            lastObservedFingerprintRef.current =
              current

            scheduleLocalSync()
          }
        }

      const startTimers =
        () => {
          clearTimers()

          const settings =
            loadAutoCloudSyncSettings()

          lastObservedFingerprintRef.current =
            collectLocalCloudSnapshot()
              .fingerprint

          if (
            !settings.enabled ||
            !loadAuthSession()
          ) {
            publishDisabledState()

            return
          }

          localPollTimerRef.current =
            window.setInterval(
              detectLocalChanges,
              1200,
            )

          cloudPollTimerRef.current =
            window.setInterval(
              () => {
                void performSync(
                  'remote check',
                )
              },
              settings.pollIntervalMs,
            )

          window.setTimeout(
            () => {
              void performSync(
                'startup',
              )
            },
            900,
          )
        }

      const handleSettingsOrAuth =
        () => {
          startTimers()
        }

      const handleOnline =
        () => {
          startTimers()

          void performSync(
            'connection restored',
          )
        }

      const handleOffline =
        () => {
          publishDisabledState()
        }

      const handleVisibility =
        () => {
          if (
            document.visibilityState ===
            'visible'
          ) {
            detectLocalChanges()

            void performSync(
              'tab active',
            )
          }
        }

      window.addEventListener(
        AUTO_CLOUD_SYNC_SETTINGS_CHANGED_EVENT,
        handleSettingsOrAuth,
      )

      window.addEventListener(
        AUTH_SESSION_CHANGED_EVENT,
        handleSettingsOrAuth,
      )

      window.addEventListener(
        'online',
        handleOnline,
      )

      window.addEventListener(
        'offline',
        handleOffline,
      )

      document.addEventListener(
        'visibilitychange',
        handleVisibility,
      )

      startTimers()

      return () => {
        stoppedRef.current =
          true

        clearTimers()

        window.removeEventListener(
          AUTO_CLOUD_SYNC_SETTINGS_CHANGED_EVENT,
          handleSettingsOrAuth,
        )

        window.removeEventListener(
          AUTH_SESSION_CHANGED_EVENT,
          handleSettingsOrAuth,
        )

        window.removeEventListener(
          'online',
          handleOnline,
        )

        window.removeEventListener(
          'offline',
          handleOffline,
        )

        document.removeEventListener(
          'visibilitychange',
          handleVisibility,
        )
      }
    },
    [],
  )

  return null
}

export default AutoCloudSyncAgent
