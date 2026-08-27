import type {
  PlayerIntelligence,
  VillageIntelligence,
} from './playerVillageIntelligence'

import type {
  VillageAnnotation,
  VillageTag,
} from './villageAnnotations'

import type {
  WatchlistAttention,
  WatchlistDashboardEntry,
} from './watchlistDashboard'

export type VillageTagMatchMode =
  | 'any'
  | 'all'

export type WatchlistAttentionFilter =
  | 'all'
  | WatchlistAttention

export interface VillageFilterOptions {
  search: string
  selectedTags: VillageTag[]
  tagMode: VillageTagMatchMode
}

const normalize = (
  value: string,
): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      ' ',
    )
}

const matchesTags = (
  annotation: VillageAnnotation,
  selectedTags: VillageTag[],
  tagMode: VillageTagMatchMode,
): boolean => {
  if (
    selectedTags.length ===
    0
  ) {
    return true
  }

  if (
    tagMode ===
    'all'
  ) {
    return selectedTags.every(
      (tag) =>
        annotation.tags.includes(
          tag,
        ),
    )
  }

  return selectedTags.some(
    (tag) =>
      annotation.tags.includes(
        tag,
      ),
  )
}

const matchesSearch = (
  village: VillageIntelligence,
  annotation: VillageAnnotation,
  search: string,
  playerAlreadyMatches = false,
): boolean => {
  const query =
    normalize(search)

  if (!query) {
    return true
  }

  if (
    playerAlreadyMatches
  ) {
    return true
  }

  const coordinates =
    village.x !==
      null &&
    village.y !==
      null
      ? `${village.x}|${village.y} ${village.x} ${village.y}`
      : ''

  const haystack =
    normalize(
      [
        village.playerName,
        village.villageName,
        coordinates,
        annotation.note,
        annotation.tags.join(
          ' ',
        ),
      ].join(' '),
    )

  return haystack.includes(
    query,
  )
}

export const matchesVillageFilters =
  (
    village: VillageIntelligence,
    annotation: VillageAnnotation,
    options: VillageFilterOptions,
    playerAlreadyMatches = false,
  ): boolean => {
    return (
      matchesTags(
        annotation,
        options.selectedTags,
        options.tagMode,
      ) &&
      matchesSearch(
        village,
        annotation,
        options.search,
        playerAlreadyMatches,
      )
    )
  }

export const filterPlayersWithVillageFilters =
  (
    players: PlayerIntelligence[],
    annotations: Record<
      string,
      VillageAnnotation
    >,
    options: VillageFilterOptions,
  ): PlayerIntelligence[] => {
    const query =
      normalize(
        options.search,
      )

    return players
      .map(
        (player) => {
          const playerMatches =
            Boolean(
              query,
            ) &&
            normalize(
              player.playerName,
            ).includes(
              query,
            )

          const villages =
            player.villages.filter(
              (village) => {
                const annotation =
                  annotations[
                    village.key
                  ] ?? {
                    villageKey:
                      village.key,
                    tags: [],
                    note: '',
                    updatedAt:
                      new Date(
                        0,
                      ).toISOString(),
                  }

                return matchesVillageFilters(
                  village,
                  annotation,
                  options,
                  playerMatches,
                )
              },
            )

          if (
            villages.length ===
            0
          ) {
            return null
          }

          return {
            ...player,
            villageCount:
              villages.length,
            reportCount:
              villages.reduce(
                (
                  total,
                  village,
                ) =>
                  total +
                  village.reportCount,
                0,
              ),
            villages,
          }
        },
      )
      .filter(
        (
          player,
        ): player is PlayerIntelligence =>
          player !==
          null,
      )
  }

export const filterWatchlistEntries =
  (
    entries:
      WatchlistDashboardEntry[],
    annotations: Record<
      string,
      VillageAnnotation
    >,
    options: VillageFilterOptions,
    attentionFilter:
      WatchlistAttentionFilter,
  ): WatchlistDashboardEntry[] => {
    return entries.filter(
      (entry) => {
        if (
          attentionFilter !==
            'all' &&
          entry.attention !==
            attentionFilter
        ) {
          return false
        }

        const annotation =
          annotations[
            entry.village.key
          ] ?? {
            villageKey:
              entry.village.key,
            tags: [],
            note: '',
            updatedAt:
              new Date(
                0,
              ).toISOString(),
          }

        return matchesVillageFilters(
          entry.village,
          annotation,
          options,
        )
      },
    )
  }
