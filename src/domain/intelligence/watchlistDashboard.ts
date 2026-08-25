import {
  getVillageWatchAlert,
} from './villageWatchlist'

import type {
  VillageIntelligence,
} from './playerVillageIntelligence'

export type WatchlistAttention =
  | 'critical'
  | 'increased'
  | 'recent'
  | 'stale'
  | 'normal'

export interface WatchlistDashboardEntry {
  village: VillageIntelligence
  attention: WatchlistAttention
  troopDelta: number | null
  troopDeltaPercent: number | null
  ageHours: number
  hasAlert: boolean
}

const hoursSince = (
  value: string,
  now: number,
): number => {
  const timestamp =
    new Date(
      value,
    ).getTime()

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    return Number.POSITIVE_INFINITY
  }

  return Math.max(
    0,
    (now - timestamp) /
      3_600_000,
  )
}

export const buildWatchlistDashboardEntries =
  (
    villages: VillageIntelligence[],
    watchedVillageKeys: string[],
    thresholdPercent: number,
    now: number = Date.now(),
  ): WatchlistDashboardEntry[] => {
    const watched =
      new Set(
        watchedVillageKeys,
      )

    return villages
      .filter(
        (village) =>
          watched.has(
            village.key,
          ),
      )
      .map(
        (village) => {
          const alert =
            getVillageWatchAlert(
              village,
              thresholdPercent,
            )

          const ageHours =
            hoursSince(
              village.latest.createdAt,
              now,
            )

          const troopDelta =
            alert.delta

          const troopDeltaPercent =
            alert.percentage

          let attention:
            WatchlistAttention =
            'normal'

          if (
            alert.isAlert
          ) {
            attention =
              'critical'
          } else if (
            village.latest.source ===
              'SPY_REPORT' &&
            troopDelta !==
              null &&
            troopDelta >
              0
          ) {
            attention =
              'increased'
          } else if (
            village.latest.source ===
              'SPY_REPORT' &&
            ageHours <=
              24
          ) {
            attention =
              'recent'
          } else if (
            ageHours >=
              72
          ) {
            attention =
              'stale'
          }

          return {
            village,
            attention,
            troopDelta,
            troopDeltaPercent,
            ageHours,
            hasAlert:
              alert.isAlert,
          }
        },
      )
      .sort(
        (
          left,
          right,
        ) => {
          const order:
            Record<
              WatchlistAttention,
              number
            > = {
              critical: 0,
              increased: 1,
              recent: 2,
              stale: 3,
              normal: 4,
            }

          const priority =
            order[
              left.attention
            ] -
            order[
              right.attention
            ]

          if (
            priority !==
            0
          ) {
            return priority
          }

          return (
            new Date(
              right.village
                .latest
                .createdAt,
            ).getTime() -
            new Date(
              left.village
                .latest
                .createdAt,
            ).getTime()
          )
        },
      )
  }

export const countWatchlistAttention =
  (
    entries:
      WatchlistDashboardEntry[],
  ) => {
    return {
      critical:
        entries.filter(
          (entry) =>
            entry.attention ===
            'critical',
        ).length,
      increased:
        entries.filter(
          (entry) =>
            entry.attention ===
            'increased',
        ).length,
      recent:
        entries.filter(
          (entry) =>
            entry.attention ===
            'recent',
        ).length,
      stale:
        entries.filter(
          (entry) =>
            entry.attention ===
            'stale',
        ).length,
    }
  }
