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
  saveCloudState,
} from '../../services/cloudSyncApi'

import type {
  CloudStateResponse,
} from '../../services/cloudSyncApi'

import './CloudSyncPanel.css'

type SyncStatus =
  | 'idle'
  | 'loading'
  | 'uploading'
  | 'downloading'
  | 'deleting'

const formatDateTime =
  (
    value: string | null,
  ): string => {
    if (!value) {
      return 'Never'
    }

    const date =
      new Date(value)

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
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    ).format(date)
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
      [localVersion],
    )

  const metadata =
    useMemo(
      () => {
        void localVersion

        return loadCloudSyncMetadata()
      },
      [localVersion],
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

          setCloudLoaded(false)
          setCloud(null)
        }

      const storage =
        (
          event: StorageEvent,
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

      window.addEventListener(
        AUTH_SESSION_CHANGED_EVENT,
        syncAuth,
      )

      window.addEventListener(
        'storage',
        storage,
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
      }
    },
    [],
  )

  const refreshCloud =
    async () => {
      if (!signedIn) {
        return
      }

      try {
        setStatus('loading')
        setMessage(null)

        setCloud(
          await getCloudState(),
        )

        setCloudLoaded(true)
      } catch (error) {
        setMessage({
          type: 'error',
          text:
            error instanceof Error
              ? error.message
              : 'Could not read cloud data.',
        })
      } finally {
        setStatus('idle')
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
      expectedRevision: number,
    ) => {
      try {
        setStatus('uploading')
        setMessage(null)

        const latestLocal =
          collectLocalCloudSnapshot()

        const saved =
          await saveCloudState({
            expectedRevision,
            payload:
              latestLocal.payload,
          })

        setCloud(saved)
        setCloudLoaded(true)

        markCloudSyncComplete(
          saved.revision,
          saved.payload,
        )

        setLocalVersion(
          (value) =>
            value + 1,
        )

        setMessage({
          type: 'success',
          text:
            `Cloud snapshot saved as revision ${saved.revision}.`,
        })
      } catch (error) {
        setMessage({
          type: 'error',
          text:
            error instanceof Error
              ? error.message
              : 'Could not upload local data.',
        })

        await refreshCloud()
      } finally {
        setStatus('idle')
      }
    }

  const downloadCloud =
    async (
      source: CloudStateResponse,
    ) => {
      try {
        setStatus('downloading')
        setMessage(null)

        applyCloudPayload(
          source.payload,
        )

        markCloudSyncComplete(
          source.revision,
          source.payload,
        )

        setMessage({
          type: 'success',
          text:
            'Cloud data restored. Reloading the simulator so every local-first module reads the restored state.',
        })

        window.setTimeout(
          () =>
            window.location.reload(),
          550,
        )
      } catch (error) {
        setStatus('idle')

        setMessage({
          type: 'error',
          text:
            error instanceof Error
              ? error.message
              : 'Could not restore cloud data.',
        })
      }
    }

  const smartSync =
    async () => {
      if (!cloudLoaded) {
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
        await downloadCloud(cloud)
        return
      }

      if (
        decision.action ===
        'nothing'
      ) {
        if (cloud) {
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
          type: 'success',
          text:
            'Local and cloud data are already synchronized.',
        })
        return
      }

      setMessage({
        type: 'warning',
        text: decision.reason,
      })
    }

  const removeCloud =
    async () => {
      if (
        !window.confirm(
          'Delete the cloud snapshot for this account? Local browser data will not be deleted.',
        )
      ) {
        return
      }

      try {
        setStatus('deleting')

        await deleteCloudState()

        setCloud(null)
        setCloudLoaded(true)

        setMessage({
          type: 'success',
          text:
            'Cloud snapshot deleted. Local data is unchanged.',
        })
      } catch (error) {
        setMessage({
          type: 'error',
          text:
            error instanceof Error
              ? error.message
              : 'Could not delete cloud data.',
        })
      } finally {
        setStatus('idle')
      }
    }

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
            Local-first synchronization
          </strong>

          <small>
            V50 backs up Tribal Battle localStorage intelligence under your authenticated account without changing the individual feature storage formats.
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
              {message.text}
            </div>
          )}

          <div className="cloud-sync-overview">
            <div>
              <span>
                This Browser
              </span>

              <strong>
                {local.keyCount} data keys
              </strong>

              <small>
                {formatApproximateBytes(
                  local.approximateBytes,
                )}
                {' · '}
                fingerprint {local.fingerprint}
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
                  : 'First Smart Sync can create it'}
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
                revision {metadata.lastCloudRevision}
              </small>
            </div>
          </div>

          <div className={`cloud-sync-decision action-${decision.action}`}>
            <span>
              Smart Sync Decision
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
              {decision.reason}
            </small>
          </div>

          <div className="cloud-sync-actions">
            <button
              type="button"
              className="primary"
              disabled={
                status !== 'idle'
              }
              onClick={() =>
                void smartSync()
              }
            >
              {status === 'uploading'
                ? 'Uploading...'
                : status === 'downloading'
                  ? 'Downloading...'
                  : status === 'loading'
                    ? 'Checking Cloud...'
                    : 'Smart Sync'}
            </button>

            <button
              type="button"
              disabled={
                status !== 'idle'
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
                status !== 'idle' ||
                !cloud
              }
              onClick={() => {
                if (
                  cloud &&
                  window.confirm(
                    'Replace this browser cloud-eligible Tribal Battle data with the cloud snapshot?',
                  )
                ) {
                  void downloadCloud(cloud)
                }
              }}
            >
              Download Cloud
            </button>

            <button
              type="button"
              disabled={
                status !== 'idle'
              }
              onClick={() =>
                void refreshCloud()
              }
            >
              Refresh
            </button>
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
                    <code key={key}>
                      {key}
                    </code>
                  ),
                )}

              {local.keyCount === 0 && (
                <span>
                  No cloud-eligible local keys yet.
                </span>
              )}
            </div>
          </details>

          <div className="cloud-sync-safety">
            <strong>
              Conflict-safe by default
            </strong>

            <span>
              Smart Sync never guesses when both sides changed. In that case it stops and lets you explicitly choose which copy wins. Upload uses optimistic revision checking so an outdated browser cannot silently overwrite a newer cloud revision.
            </span>
          </div>

          <button
            type="button"
            className="cloud-sync-delete"
            disabled={
              status !== 'idle' ||
              !cloud
            }
            onClick={() =>
              void removeCloud()
            }
          >
            Delete Cloud Snapshot
          </button>
        </>
      )}
    </section>
  )
}

export default CloudSyncPanel
