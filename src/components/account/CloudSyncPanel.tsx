import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AUTH_SESSION_CHANGED_EVENT,
  loadAuthSession,
} from '../../domain/auth/authSession'

import {
  AUTO_CLOUD_SYNC_SETTINGS_CHANGED_EVENT,
  AUTO_CLOUD_SYNC_STATUS_EVENT,
  getAutoCloudSyncStatus,
  loadAutoCloudSyncSettings,
  setAutoCloudSyncEnabled,
} from '../../domain/cloud/autoCloudSync'

import type {
  AutoCloudSyncStatus,
} from '../../domain/cloud/autoCloudSync'

import {
  applyCloudPayload,
  collectLocalCloudSnapshot,
  decideSmartSync,
  formatApproximateBytes,
  loadCloudSyncMetadata,
  markCloudSyncComplete,
} from '../../domain/cloud/cloudSync'

import type {
  SmartSyncDecision,
} from '../../domain/cloud/cloudSync'

import {
  deleteCloudState,
  getCloudState,
  listCloudStateVersions,
  restoreCloudStateVersion,
  saveCloudState,
} from '../../services/cloudSyncApi'

import type {
  CloudStateResponse,
  CloudStateVersionResponse,
} from '../../services/cloudSyncApi'

import './CloudSyncPanel.css'

type SyncStatus =
  | 'idle'
  | 'loading'
  | 'uploading'
  | 'downloading'
  | 'restoring'
  | 'deleting'

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

const formatRelativeTime =
  (
    value: string,
  ): string => {
    const timestamp =
      new Date(value)
        .getTime()

    if (
      Number.isNaN(timestamp)
    ) {
      return value
    }

    const seconds =
      Math.round(
        (timestamp - Date.now()) /
        1000,
      )

    const formatter =
      new Intl.RelativeTimeFormat(
        undefined,
        {
          numeric: 'auto',
        },
      )

    if (
      Math.abs(seconds) < 60
    ) {
      return formatter.format(
        seconds,
        'second',
      )
    }

    const minutes =
      Math.round(seconds / 60)

    if (
      Math.abs(minutes) < 60
    ) {
      return formatter.format(
        minutes,
        'minute',
      )
    }

    const hours =
      Math.round(minutes / 60)

    if (
      Math.abs(hours) < 24
    ) {
      return formatter.format(
        hours,
        'hour',
      )
    }

    const days =
      Math.round(hours / 24)

    return formatter.format(
      days,
      'day',
    )
  }

function CloudSyncPanel() {
  const [
    signedIn,
    setSignedIn,
  ] = useState(
    () =>
      Boolean(
        loadAuthSession(),
      ),
  )

  const [
    cloud,
    setCloud,
  ] = useState<
    CloudStateResponse | null
  >(null)

  const [
    cloudVersions,
    setCloudVersions,
  ] = useState<
    CloudStateVersionResponse[]
  >([])

  const [
    cloudLoaded,
    setCloudLoaded,
  ] = useState(false)

  const [
    localVersion,
    setLocalVersion,
  ] = useState(0)

  const [
    status,
    setStatus,
  ] = useState<SyncStatus>(
    'idle',
  )

  const [
    autoEnabled,
    setAutoEnabled,
  ] = useState(
    () =>
      loadAutoCloudSyncSettings()
        .enabled,
  )

  const [
    autoStatus,
    setAutoStatus,
  ] = useState<
    AutoCloudSyncStatus
  >(
    () =>
      getAutoCloudSyncStatus(),
  )

  const [
    message,
    setMessage,
  ] = useState<
    {
      type:
        | 'success'
        | 'error'
        | 'warning'
      text: string
    } | null
  >(null)

  const local =
    useMemo(
      () => {
        void localVersion

        return collectLocalCloudSnapshot()
      },
      [
        localVersion,
      ],
    )

  const metadata =
    useMemo(
      () => {
        void localVersion

        return loadCloudSyncMetadata()
      },
      [
        localVersion,
      ],
    )

  const decision:
    SmartSyncDecision =
    useMemo(
      () =>
        decideSmartSync(
          local,
          cloud,
          metadata,
        ),
      [
        local,
        cloud,
        metadata,
      ],
    )

  useEffect(
    () => {
      const syncAuth =
        () => {
          setSignedIn(
            Boolean(
              loadAuthSession(),
            ),
          )

          setCloudLoaded(
            false,
          )

          setCloud(
            null,
          )

          setCloudVersions(
            [],
          )
        }

      const storage =
        (
          event:
            StorageEvent,
        ) => {
          if (
            event.key?.startsWith(
              'tribal-battle-',
            )
          ) {
            setLocalVersion(
              (value) =>
                value + 1,
            )
          }
        }

      const autoSettings =
        () => {
          setAutoEnabled(
            loadAutoCloudSyncSettings()
              .enabled,
          )
        }

      const autoStatusChanged =
        (
          event:
            Event,
        ) => {
          const customEvent =
            event as CustomEvent<
              AutoCloudSyncStatus
            >

          setAutoStatus(
            customEvent.detail,
          )

          setLocalVersion(
            (value) =>
              value + 1,
          )

          if (
            customEvent.detail
              .state ===
              'synced'
          ) {
            void refreshCloud(
              false,
            )
          }
        }

      window.addEventListener(
        AUTH_SESSION_CHANGED_EVENT,
        syncAuth,
      )

      window.addEventListener(
        'storage',
        storage,
      )

      window.addEventListener(
        AUTO_CLOUD_SYNC_SETTINGS_CHANGED_EVENT,
        autoSettings,
      )

      window.addEventListener(
        AUTO_CLOUD_SYNC_STATUS_EVENT,
        autoStatusChanged,
      )

      return () => {
        window.removeEventListener(
          AUTH_SESSION_CHANGED_EVENT,
          syncAuth,
        )

        window.removeEventListener(
          'storage',
          storage,
        )

        window.removeEventListener(
          AUTO_CLOUD_SYNC_SETTINGS_CHANGED_EVENT,
          autoSettings,
        )

        window.removeEventListener(
          AUTO_CLOUD_SYNC_STATUS_EVENT,
          autoStatusChanged,
        )
      }
    },
    [],
  )

  const refreshCloud =
    async (
      showErrors =
        true,
    ) => {
      if (
        !signedIn
      ) {
        return
      }

      try {
        setStatus(
          'loading',
        )

        if (
          showErrors
        ) {
          setMessage(
            null,
          )
        }

        const [
          nextCloud,
          nextVersions,
        ] =
          await Promise.all([
            getCloudState(),
            listCloudStateVersions(),
          ])

        setCloud(
          nextCloud,
        )

        setCloudVersions(
          nextVersions,
        )

        setCloudLoaded(
          true,
        )
      } catch (
        error
      ) {
        if (
          showErrors
        ) {
          setMessage({
            type:
              'error',
            text:
              error instanceof Error
                ? error.message
                : 'Could not read cloud data.',
          })
        }
      } finally {
        setStatus(
          'idle',
        )
      }
    }

  useEffect(
    () => {
      if (
        signedIn &&
        !cloudLoaded
      ) {
        void refreshCloud()
      }
    },
    [
      signedIn,
      cloudLoaded,
    ],
  )

  const uploadLocal =
    async (
      expectedRevision:
        number,
  ) => {
    try {
      setStatus(
        'uploading',
      )

      setMessage(
        null,
      )

      const latestLocal =
        collectLocalCloudSnapshot()

      const saved =
        await saveCloudState({
          expectedRevision,
          payload:
            latestLocal.payload,
        })

      setCloud(
        saved,
      )

      setCloudLoaded(
        true,
      )

      setCloudVersions(
        await listCloudStateVersions(),
      )

      markCloudSyncComplete(
        saved.revision,
        saved.payload,
      )

      setLocalVersion(
        (value) =>
          value + 1,
      )

      setMessage({
        type:
          'success',
        text:
          `Cloud snapshot saved as revision ${saved.revision}.`,
      })
    } catch (
      error
    ) {
      setMessage({
        type:
          'error',
        text:
          error instanceof Error
            ? error.message
            : 'Could not upload local data.',
      })

      await refreshCloud(
        false,
      )
    } finally {
      setStatus(
        'idle',
      )
    }
  }

  const downloadCloud =
    async (
      source:
        CloudStateResponse,
  ) => {
    try {
      setStatus(
        'downloading',
      )

      setMessage(
        null,
      )

      applyCloudPayload(
        source.payload,
      )

      markCloudSyncComplete(
        source.revision,
        source.payload,
      )

      setMessage({
        type:
          'success',
        text:
          'Cloud data restored. Reloading the simulator so every local-first module reads the restored state.',
      })

      window.setTimeout(
        () =>
          window.location.reload(),
        550,
      )
    } catch (
      error
    ) {
      setStatus(
        'idle',
      )

      setMessage({
        type:
          'error',
        text:
          error instanceof Error
            ? error.message
            : 'Could not restore cloud data.',
      })
    }
  }

  const restoreVersion =
    async (
      version:
        CloudStateVersionResponse,
    ) => {
      if (
        version.current ||
        !window.confirm(
          `Restore revision ${version.revision}? The current cloud snapshot will be archived first, then this backup will become a new revision and replace this browser's cloud-eligible data.`,
        )
      ) {
        return
      }

      try {
        setStatus(
          'restoring',
        )

        setMessage(
          null,
        )

        const restored =
          await restoreCloudStateVersion(
            version.revision,
            {
              expectedRevision:
                cloud?.revision ??
                0,
            },
          )

        applyCloudPayload(
          restored.payload,
        )

        markCloudSyncComplete(
          restored.revision,
          restored.payload,
        )

        setCloud(
          restored,
        )

        setCloudVersions(
          await listCloudStateVersions(),
        )

        setLocalVersion(
          (value) =>
            value + 1,
        )

        setMessage({
          type:
            'success',
          text:
            `Revision ${version.revision} restored safely as new current revision ${restored.revision}. Reloading the simulator.`,
        })

        window.setTimeout(
          () =>
            window.location.reload(),
          650,
        )
      } catch (
        error
      ) {
        setStatus(
          'idle',
        )

        setMessage({
          type:
            'error',
          text:
            error instanceof Error
              ? error.message
              : 'Could not restore this cloud backup.',
        })

        await refreshCloud(
          false,
        )
      }
    }

  const smartSync =
    async () => {
      if (
        !cloudLoaded
      ) {
        await refreshCloud()

        return
      }

      if (
        decision.action ===
        'upload'
      ) {
        await uploadLocal(
          cloud?.revision ??
          0,
        )

        return
      }

      if (
        decision.action ===
          'download' &&
        cloud
      ) {
        await downloadCloud(
          cloud,
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

        setLocalVersion(
          (value) =>
            value + 1,
        )

        setMessage({
          type:
            'success',
          text:
            'Local and cloud data are already synchronized.',
        })

        return
      }

      setMessage({
        type:
          'warning',
        text:
          decision.reason,
      })
    }

  const removeCloud =
    async () => {
      if (
        !window.confirm(
          'Delete the current cloud snapshot? V55 will keep it as a recoverable backup, leave local browser data unchanged and turn Automatic Sync off so it is not recreated immediately.',
        )
      ) {
        return
      }

      try {
        setStatus(
          'deleting',
        )

        await deleteCloudState()

        setAutoCloudSyncEnabled(
          false,
        )

        setAutoEnabled(
          false,
        )

        setCloud(
          null,
        )

        setCloudVersions(
          await listCloudStateVersions(),
        )

        setCloudLoaded(
          true,
        )

        setMessage({
          type:
            'success',
          text:
            'Current cloud snapshot archived and removed. Automatic Sync is off and the backup remains recoverable below.',
        })
      } catch (
        error
      ) {
        setMessage({
          type:
            'error',
          text:
            error instanceof Error
              ? error.message
              : 'Could not delete cloud data.',
        })
      } finally {
        setStatus(
          'idle',
        )
      }
    }

  const toggleAutomatic =
    () => {
      setAutoCloudSyncEnabled(
        !autoEnabled,
      )
    }

  const autoStatusLabel =
    autoStatus.state ===
      'synced'
      ? 'Saved'
      : autoStatus.state ===
          'uploading'
        ? 'Saving'
        : autoStatus.state ===
            'downloading'
          ? 'Restoring'
          : autoStatus.state ===
              'checking'
            ? 'Checking'
            : autoStatus.state ===
                'waiting'
              ? 'Pending'
              : autoStatus.state ===
                  'conflict'
                ? 'Conflict'
                : autoStatus.state ===
                    'offline'
                  ? 'Offline'
                  : autoStatus.state ===
                      'error'
                    ? 'Error'
                    : autoEnabled
                      ? 'Ready'
                      : 'Off'

  return (
    <section
      id="cloud-sync"
      className="cloud-sync-panel"
    >
      <div className="cloud-sync-header">
        <div>
          <span>
            Cloud Intelligence
          </span>

          <strong>
            Automatic local-first synchronization
          </strong>

          <small>
            V55 keeps recoverable cloud revisions behind the current snapshot while preserving V53 conflict-safe automatic synchronization.
          </small>
        </div>

        <span className={`cloud-sync-state ${signedIn ? 'ready' : 'guest'}`}>
          {signedIn
            ? 'Account Ready'
            : 'Guest'}
        </span>
      </div>

      {!signedIn ? (
        <div className="cloud-sync-guest">
          <strong>
            Sign in to synchronize intelligence.
          </strong>

          <span>
            Guest mode remains unchanged and your existing browser data is not touched.
          </span>
        </div>
      ) : (
        <>
          {message && (
            <div className={`cloud-sync-message ${message.type}`}>
              {
                message.text
              }
            </div>
          )}

          <div className={`cloud-auto-sync-card state-${autoStatus.state}`}>
            <div className="cloud-auto-sync-main">
              <div className="cloud-auto-sync-title">
                <span>
                  Automatic Sync
                </span>

                <strong>
                  {
                    autoStatusLabel
                  }
                </strong>
              </div>

              <small>
                {
                  autoStatus.message
                }
              </small>
            </div>

            <label className="cloud-auto-sync-toggle">
              <input
                type="checkbox"
                checked={
                  autoEnabled
                }
                onChange={
                  toggleAutomatic
                }
              />

              <span>
                {autoEnabled
                  ? 'On'
                  : 'Off'}
              </span>
            </label>
          </div>

          <div className="cloud-auto-sync-rules">
            <div>
              <strong>
                Local change
              </strong>

              <span>
                waits about 1.8 seconds, then saves
              </span>
            </div>

            <div>
              <strong>
                Remote check
              </strong>

              <span>
                every 30 seconds while signed in
              </span>
            </div>

            <div>
              <strong>
                Conflict
              </strong>

              <span>
                stops automatically; never picks a winner
              </span>
            </div>
          </div>

          <div className="cloud-sync-overview">
            <div>
              <span>
                This Browser
              </span>

              <strong>
                {
                  local.keyCount
                }{' '}
                data keys
              </strong>

              <small>
                {formatApproximateBytes(
                  local.approximateBytes,
                )}
                {' · '}
                fingerprint {
                  local.fingerprint
                }
              </small>
            </div>

            <div>
              <span>
                Cloud
              </span>

              <strong>
                {!cloudLoaded
                  ? 'Loading...'
                  : cloud
                    ? `Revision ${cloud.revision}`
                    : 'No snapshot'}
              </strong>

              <small>
                {cloud
                  ? `${Object.keys(cloud.payload).length} keys · updated ${formatDateTime(cloud.updatedAt)}`
                  : 'Automatic sync can create it'}
              </small>
            </div>

            <div>
              <span>
                Last Successful Sync
              </span>

              <strong>
                {formatDateTime(
                  metadata.lastSyncedAt,
                )}
              </strong>

              <small>
                revision {
                  metadata.lastCloudRevision
                }
              </small>
            </div>
          </div>

          <div className={`cloud-sync-decision action-${decision.action}`}>
            <span>
              Current Decision
            </span>

            <strong>
              {decision.action ===
              'upload'
                ? 'Upload Local'
                : decision.action ===
                    'download'
                  ? 'Download Cloud'
                  : decision.action ===
                      'nothing'
                    ? 'Already Synced'
                    : 'Conflict Detected'}
            </strong>

            <small>
              {
                decision.reason
              }
            </small>
          </div>

          <div className="cloud-sync-actions">
            <button
              type="button"
              className="primary"
              disabled={
                status !==
                'idle'
              }
              onClick={() =>
                void smartSync()
              }
            >
              {status ===
              'uploading'
                ? 'Uploading...'
                : status ===
                    'downloading'
                  ? 'Downloading...'
                  : status ===
                      'loading'
                    ? 'Checking Cloud...'
                    : 'Sync Now'}
            </button>

            <button
              type="button"
              disabled={
                status !==
                'idle'
              }
              onClick={() =>
                void uploadLocal(
                  cloud?.revision ??
                  0,
                )
              }
            >
              Upload Local
            </button>

            <button
              type="button"
              disabled={
                status !==
                  'idle' ||
                !cloud
              }
              onClick={() => {
                if (
                  cloud &&
                  window.confirm(
                    'Replace this browser cloud-eligible Tribal Battle data with the cloud snapshot?',
                  )
                ) {
                  void downloadCloud(
                    cloud,
                  )
                }
              }}
            >
              Download Cloud
            </button>

            <button
              type="button"
              disabled={
                status !==
                'idle'
              }
              onClick={() =>
                void refreshCloud()
              }
            >
              Refresh
            </button>
          </div>

          <div className="cloud-backup-versions">
            <div className="cloud-backup-versions-header">
              <div>
                <span>
                  Cloud Backup Versions
                </span>

                <strong>
                  {cloudVersions.length > 0
                    ? `${cloudVersions.length} revision${cloudVersions.length === 1 ? '' : 's'} available`
                    : 'No revisions yet'}
                </strong>
              </div>

              <small>
                Recent previous revisions are retained automatically. Restoring never rewinds the revision number: it creates a new current revision.
              </small>
            </div>

            <div className="cloud-backup-version-list">
              {cloudVersions.map(
                (version) => (
                  <div
                    key={`${version.revision}-${version.current ? 'current' : 'backup'}`}
                    className={`cloud-backup-version-row ${version.current ? 'current' : ''}`}
                  >
                    <div>
                      <strong>
                        Revision {version.revision}
                      </strong>

                      <span>
                        {version.current
                          ? 'Current'
                          : 'Backup'}
                      </span>
                    </div>

                    <small
                      title={formatDateTime(
                        version.snapshotAt,
                      )}
                    >
                      {formatRelativeTime(
                        version.snapshotAt,
                      )}
                      {' · '}
                      {formatDateTime(
                        version.snapshotAt,
                      )}
                    </small>

                    {version.current ? (
                      <span className="cloud-backup-current-badge">
                        Current
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={
                          status !==
                          'idle'
                        }
                        onClick={() =>
                          void restoreVersion(
                            version,
                          )
                        }
                      >
                        {status ===
                          'restoring'
                          ? 'Restoring...'
                          : 'Restore'}
                      </button>
                    )}
                  </div>
                ),
              )}

              {cloudVersions.length ===
                0 && (
                <div className="cloud-backup-empty">
                  Your first successful cloud save will become Revision 1. Older revisions appear here automatically after future changes.
                </div>
              )}
            </div>
          </div>

          <details className="cloud-sync-details">
            <summary>
              Synced localStorage keys
            </summary>

            <div>
              {Object.keys(
                local.payload,
              )
                .sort()
                .map(
                  (key) => (
                    <code
                      key={
                        key
                      }
                    >
                      {
                        key
                      }
                    </code>
                  ),
                )}

              {local.keyCount ===
                0 && (
                <span>
                  No cloud-eligible local keys yet.
                </span>
              )}
            </div>
          </details>

          <div className="cloud-sync-safety">
            <strong>
              Manual controls remain available
            </strong>

            <span>
              Before every overwrite or deletion, V55 preserves the previous current snapshot as a recoverable revision. Automatic mode still stops on conflicts instead of choosing a winner.
            </span>
          </div>

          <button
            type="button"
            className="cloud-sync-delete"
            disabled={
              status !==
                'idle' ||
              !cloud
            }
            onClick={() =>
              void removeCloud()
            }
          >
            Delete Current Snapshot
          </button>
        </>
      )}
    </section>
  )
}

export default CloudSyncPanel
