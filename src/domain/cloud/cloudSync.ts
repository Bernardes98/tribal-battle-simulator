export const CLOUD_DATA_APPLIED_EVENT =
  'tribal-battle-cloud-data-applied'

export const CLOUD_SYNC_CHANGED_EVENT =
  'tribal-battle-cloud-sync-changed'

const LOCAL_PREFIX =
  'tribal-battle-'

const META_KEY =
  'tribal-battle-cloud-sync-meta-v1'

export interface CloudSyncMetadata {
  lastCloudRevision: number
  lastSyncedFingerprint: string
  lastSyncedAt: string | null
}

export interface LocalCloudSnapshot {
  payload: Record<string, string>
  fingerprint: string
  keyCount: number
  approximateBytes: number
}

export type SmartSyncAction =
  | 'upload'
  | 'download'
  | 'nothing'
  | 'conflict'

export interface SmartSyncDecision {
  action: SmartSyncAction
  reason: string
}

const defaultMetadata =
  (): CloudSyncMetadata => ({
    lastCloudRevision: 0,
    lastSyncedFingerprint: '',
    lastSyncedAt: null,
  })

const isCloudEligibleKey =
  (
    key: string,
  ): boolean => {
    return (
      key.startsWith(LOCAL_PREFIX) &&
      !key.startsWith(
        'tribal-battle-cloud-sync-',
      ) &&
      !key.startsWith(
        'tribal-battle-auth-',
      )
    )
  }

const fnv1a =
  (
    value: string,
  ): string => {
    let hash =
      0x811c9dc5

    for (
      let index = 0;
      index < value.length;
      index += 1
    ) {
      hash ^=
        value.charCodeAt(index)

      hash =
        Math.imul(
          hash,
          0x01000193,
        )
    }

    return (hash >>> 0)
      .toString(16)
      .padStart(8, '0')
  }

const stablePayloadText =
  (
    payload: Record<string, string>,
  ): string => {
    return Object.keys(payload)
      .sort()
      .map(
        (key) =>
          `${key}\u0000${payload[key]}`,
      )
      .join('\u0001')
  }

export const fingerprintCloudPayload =
  (
    payload: Record<string, string>,
  ): string => {
    return fnv1a(
      stablePayloadText(payload),
    )
  }

export const collectLocalCloudSnapshot =
  (): LocalCloudSnapshot => {
    if (
      typeof window ===
      'undefined'
    ) {
      return {
        payload: {},
        fingerprint:
          fingerprintCloudPayload({}),
        keyCount: 0,
        approximateBytes: 0,
      }
    }

    const payload:
      Record<string, string> =
      {}

    let approximateBytes =
      0

    for (
      let index = 0;
      index <
      window.localStorage.length;
      index += 1
    ) {
      const key =
        window.localStorage.key(index)

      if (
        !key ||
        !isCloudEligibleKey(key)
      ) {
        continue
      }

      const value =
        window.localStorage.getItem(key)

      if (value === null) {
        continue
      }

      payload[key] =
        value

      approximateBytes +=
        new Blob([
          key,
          value,
        ]).size
    }

    return {
      payload,
      fingerprint:
        fingerprintCloudPayload(payload),
      keyCount:
        Object.keys(payload).length,
      approximateBytes,
    }
  }

export const applyCloudPayload =
  (
    payload: Record<string, string>,
  ): void => {
    if (
      typeof window ===
      'undefined'
    ) {
      return
    }

    const keysToRemove:
      string[] =
      []

    for (
      let index = 0;
      index <
      window.localStorage.length;
      index += 1
    ) {
      const key =
        window.localStorage.key(index)

      if (
        key &&
        isCloudEligibleKey(key) &&
        !Object.prototype.hasOwnProperty.call(
          payload,
          key,
        )
      ) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(
      (key) =>
        window.localStorage.removeItem(
          key,
        ),
    )

    Object.entries(payload)
      .forEach(
        ([key, value]) => {
          if (
            isCloudEligibleKey(key)
          ) {
            window.localStorage.setItem(
              key,
              value,
            )
          }
        },
      )

    window.dispatchEvent(
      new CustomEvent(
        CLOUD_DATA_APPLIED_EVENT,
      ),
    )
  }

export const loadCloudSyncMetadata =
  (): CloudSyncMetadata => {
    if (
      typeof window ===
      'undefined'
    ) {
      return defaultMetadata()
    }

    try {
      const raw =
        window.localStorage.getItem(
          META_KEY,
        )

      if (!raw) {
        return defaultMetadata()
      }

      const parsed =
        JSON.parse(raw) as Partial<CloudSyncMetadata>

      const revision =
        Number(
          parsed.lastCloudRevision ??
          0,
        )

      return {
        lastCloudRevision:
          Number.isInteger(revision) &&
          revision >= 0
            ? revision
            : 0,

        lastSyncedFingerprint:
          typeof parsed.lastSyncedFingerprint ===
          'string'
            ? parsed.lastSyncedFingerprint
            : '',

        lastSyncedAt:
          typeof parsed.lastSyncedAt ===
          'string'
            ? parsed.lastSyncedAt
            : null,
      }
    } catch {
      return defaultMetadata()
    }
  }

export const saveCloudSyncMetadata =
  (
    metadata: CloudSyncMetadata,
  ): void => {
    window.localStorage.setItem(
      META_KEY,
      JSON.stringify(metadata),
    )

    window.dispatchEvent(
      new CustomEvent(
        CLOUD_SYNC_CHANGED_EVENT,
      ),
    )
  }

export const markCloudSyncComplete =
  (
    revision: number,
    payload: Record<string, string>,
  ): void => {
    saveCloudSyncMetadata({
      lastCloudRevision: revision,
      lastSyncedFingerprint:
        fingerprintCloudPayload(payload),
      lastSyncedAt:
        new Date().toISOString(),
    })
  }

export const decideSmartSync =
  (
    local: LocalCloudSnapshot,
    cloud: {
      revision: number
      payload: Record<string, string>
    } | null,
    metadata: CloudSyncMetadata,
  ): SmartSyncDecision => {
    if (!cloud) {
      return {
        action: 'upload',
        reason:
          local.keyCount > 0
            ? 'No cloud copy exists yet. Uploading this browser creates the first cloud snapshot.'
            : 'No cloud copy exists yet. Smart Sync can initialize an empty account snapshot.',
      }
    }

    const cloudFingerprint =
      fingerprintCloudPayload(
        cloud.payload,
      )

    if (
      local.fingerprint ===
      cloudFingerprint
    ) {
      return {
        action: 'nothing',
        reason:
          'Local and cloud data are already identical.',
      }
    }

    if (local.keyCount === 0) {
      return {
        action: 'download',
        reason:
          'This browser has no local intelligence, so the cloud copy can be restored safely.',
      }
    }

    if (
      metadata.lastSyncedFingerprint
    ) {
      const localChanged =
        local.fingerprint !==
        metadata.lastSyncedFingerprint

      const cloudChanged =
        cloud.revision !==
          metadata.lastCloudRevision ||
        cloudFingerprint !==
          metadata.lastSyncedFingerprint

      if (
        localChanged &&
        !cloudChanged
      ) {
        return {
          action: 'upload',
          reason:
            'Only this browser changed since the last successful sync.',
        }
      }

      if (
        !localChanged &&
        cloudChanged
      ) {
        return {
          action: 'download',
          reason:
            'Only the cloud copy changed since the last successful sync.',
        }
      }

      if (
        !localChanged &&
        !cloudChanged
      ) {
        return {
          action: 'nothing',
          reason:
            'There are no changes to synchronize.',
        }
      }
    }

    return {
      action: 'conflict',
      reason:
        'Both local and cloud contain different data. V50 will not overwrite either side automatically; choose Upload Local or Download Cloud explicitly.',
    }
  }

export const formatApproximateBytes =
  (
    bytes: number,
  ): string => {
    if (bytes < 1024) {
      return `${bytes} B`
    }

    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes /
        1024
      ).toFixed(1)} KB`
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(2)} MB`
  }
