export const AUTO_CLOUD_SYNC_SETTINGS_CHANGED_EVENT =
  'tribal-battle-auto-cloud-sync-settings-changed'

export const AUTO_CLOUD_SYNC_STATUS_EVENT =
  'tribal-battle-auto-cloud-sync-status'

const SETTINGS_KEY =
  'tribal-battle-cloud-sync-auto-v1'

export type AutoCloudSyncState =
  | 'disabled'
  | 'idle'
  | 'waiting'
  | 'checking'
  | 'uploading'
  | 'downloading'
  | 'synced'
  | 'conflict'
  | 'offline'
  | 'error'

export interface AutoCloudSyncSettings {
  enabled: boolean
  debounceMs: number
  pollIntervalMs: number
}

export interface AutoCloudSyncStatus {
  state: AutoCloudSyncState
  message: string
  cloudRevision: number | null
  changedAt: string
}

const DEFAULT_SETTINGS:
  AutoCloudSyncSettings = {
    enabled: true,
    debounceMs: 1800,
    pollIntervalMs: 30000,
  }

let latestStatus:
  AutoCloudSyncStatus = {
    state: 'idle',
    message:
      'Automatic cloud sync is ready.',
    cloudRevision: null,
    changedAt:
      new Date().toISOString(),
  }

export const loadAutoCloudSyncSettings =
  (): AutoCloudSyncSettings => {
    if (
      typeof window ===
      'undefined'
    ) {
      return {
        ...DEFAULT_SETTINGS,
      }
    }

    try {
      const raw =
        window.localStorage.getItem(
          SETTINGS_KEY,
        )

      if (
        !raw
      ) {
        return {
          ...DEFAULT_SETTINGS,
        }
      }

      const parsed =
        JSON.parse(
          raw,
        ) as Partial<AutoCloudSyncSettings>

      return {
        enabled:
          typeof parsed.enabled ===
          'boolean'
            ? parsed.enabled
            : DEFAULT_SETTINGS.enabled,

        debounceMs:
          typeof parsed.debounceMs ===
            'number' &&
          parsed.debounceMs >=
            750 &&
          parsed.debounceMs <=
            10000
            ? parsed.debounceMs
            : DEFAULT_SETTINGS.debounceMs,

        pollIntervalMs:
          typeof parsed.pollIntervalMs ===
            'number' &&
          parsed.pollIntervalMs >=
            10000 &&
          parsed.pollIntervalMs <=
            300000
            ? parsed.pollIntervalMs
            : DEFAULT_SETTINGS.pollIntervalMs,
      }
    } catch {
      return {
        ...DEFAULT_SETTINGS,
      }
    }
  }

export const saveAutoCloudSyncSettings =
  (
    settings:
      AutoCloudSyncSettings,
  ): void => {
    if (
      typeof window ===
      'undefined'
    ) {
      return
    }

    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(
        settings,
      ),
    )

    window.dispatchEvent(
      new CustomEvent(
        AUTO_CLOUD_SYNC_SETTINGS_CHANGED_EVENT,
      ),
    )
  }

export const setAutoCloudSyncEnabled =
  (
    enabled: boolean,
  ): void => {
    const current =
      loadAutoCloudSyncSettings()

    saveAutoCloudSyncSettings({
      ...current,
      enabled,
    })
  }

export const publishAutoCloudSyncStatus =
  (
    status:
      Omit<
        AutoCloudSyncStatus,
        'changedAt'
      >,
  ): void => {
    latestStatus = {
      ...status,
      changedAt:
        new Date().toISOString(),
    }

    if (
      typeof window !==
      'undefined'
    ) {
      window.dispatchEvent(
        new CustomEvent<
          AutoCloudSyncStatus
        >(
          AUTO_CLOUD_SYNC_STATUS_EVENT,
          {
            detail:
              latestStatus,
          },
        ),
      )
    }
  }

export const getAutoCloudSyncStatus =
  (): AutoCloudSyncStatus => {
    return {
      ...latestStatus,
    }
  }
