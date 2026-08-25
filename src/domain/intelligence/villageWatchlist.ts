import type {
  VillageIntelligence,
} from './playerVillageIntelligence'

const STORAGE_KEY =
  'tribal-battle-village-watchlist-v1'

export const VILLAGE_WATCHLIST_CHANGED_EVENT =
  'tribal-battle-village-watchlist-changed'

export const DEFAULT_WATCH_ALERT_THRESHOLD_PERCENT =
  25

export interface VillageWatchlistSettings {
  watchedVillageKeys: string[]
  alertThresholdPercent: number
}

export interface VillageWatchAlert {
  isAlert: boolean
  isLatestSpyReport: boolean
  previousTotal: number | null
  currentTotal: number
  delta: number | null
  percentage: number | null
}

const clampThreshold = (
  value: number,
): number => {
  if (
    !Number.isFinite(value)
  ) {
    return DEFAULT_WATCH_ALERT_THRESHOLD_PERCENT
  }

  return Math.min(
    200,
    Math.max(
      5,
      Math.round(value),
    ),
  )
}

export const createDefaultVillageWatchlistSettings =
  (): VillageWatchlistSettings => ({
    watchedVillageKeys: [],
    alertThresholdPercent:
      DEFAULT_WATCH_ALERT_THRESHOLD_PERCENT,
  })

export const loadVillageWatchlistSettings =
  (): VillageWatchlistSettings => {
    if (
      typeof window ===
      'undefined'
    ) {
      return createDefaultVillageWatchlistSettings()
    }

    try {
      const raw =
        window.localStorage.getItem(
          STORAGE_KEY,
        )

      if (!raw) {
        return createDefaultVillageWatchlistSettings()
      }

      const parsed =
        JSON.parse(
          raw,
        ) as Partial<VillageWatchlistSettings>

      return {
        watchedVillageKeys:
          Array.isArray(
            parsed.watchedVillageKeys,
          )
            ? parsed.watchedVillageKeys.filter(
                (
                  value,
                ): value is string =>
                  typeof value ===
                    'string' &&
                  value.length >
                    0,
              )
            : [],
        alertThresholdPercent:
          clampThreshold(
            parsed.alertThresholdPercent ??
              DEFAULT_WATCH_ALERT_THRESHOLD_PERCENT,
          ),
      }
    } catch {
      return createDefaultVillageWatchlistSettings()
    }
  }

export const saveVillageWatchlistSettings =
  (
    settings: VillageWatchlistSettings,
  ): void => {
    if (
      typeof window ===
      'undefined'
    ) {
      return
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        watchedVillageKeys:
          [
            ...new Set(
              settings.watchedVillageKeys,
            ),
          ],
        alertThresholdPercent:
          clampThreshold(
            settings.alertThresholdPercent,
          ),
      }),
    )

    window.dispatchEvent(
      new CustomEvent(
        VILLAGE_WATCHLIST_CHANGED_EVENT,
      ),
    )
  }

export const toggleVillageWatch =
  (
    settings: VillageWatchlistSettings,
    villageKey: string,
  ): VillageWatchlistSettings => {
    const watched =
      settings.watchedVillageKeys.includes(
        villageKey,
      )

    return {
      ...settings,
      watchedVillageKeys:
        watched
          ? settings.watchedVillageKeys.filter(
              (key) =>
                key !==
                villageKey,
            )
          : [
              ...settings.watchedVillageKeys,
              villageKey,
            ],
    }
  }

export const updateVillageWatchThreshold =
  (
    settings: VillageWatchlistSettings,
    threshold: number,
  ): VillageWatchlistSettings => ({
    ...settings,
    alertThresholdPercent:
      clampThreshold(
        threshold,
      ),
  })

export const getVillageWatchAlert =
  (
    village: VillageIntelligence,
    thresholdPercent: number,
  ): VillageWatchAlert => {
    const previous =
      village.previous

    const currentTotal =
      village.latest.totalTroops

    const isLatestSpyReport =
      village.latest.source ===
      'SPY_REPORT'

    if (!previous) {
      return {
        isAlert: false,
        isLatestSpyReport,
        previousTotal: null,
        currentTotal,
        delta: null,
        percentage: null,
      }
    }

    const previousTotal =
      previous.totalTroops

    const delta =
      currentTotal -
      previousTotal

    let percentage = 0

    if (
      previousTotal >
      0
    ) {
      percentage =
        (delta /
          previousTotal) *
        100
    } else if (
      currentTotal >
      0
    ) {
      percentage = 100
    }

    const threshold =
      clampThreshold(
        thresholdPercent,
      )

    return {
      isAlert:
        isLatestSpyReport &&
        delta >
          0 &&
        percentage >=
          threshold,
      isLatestSpyReport,
      previousTotal,
      currentTotal,
      delta,
      percentage,
    }
  }
