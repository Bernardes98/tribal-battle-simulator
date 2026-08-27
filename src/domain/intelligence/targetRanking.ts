import type {
  VillageAnnotation,
} from './villageAnnotations'

import type {
  WatchlistDashboardEntry,
} from './watchlistDashboard'

import {
  calculateTargetScore,
} from './targetScoring'

import type {
  TargetScoringSettings,
  TargetScoreResult,
} from './targetScoring'

export interface TargetRankingEntry {
  rank: number
  entry: WatchlistDashboardEntry
  annotation: VillageAnnotation
  score: TargetScoreResult
}

const emptyAnnotation = (
  villageKey: string,
): VillageAnnotation => ({
  villageKey,
  tags: [],
  note: '',
  updatedAt:
    new Date(
      0,
    ).toISOString(),
})

export const buildTargetRanking =
  (
    entries:
      WatchlistDashboardEntry[],
    annotations: Record<
      string,
      VillageAnnotation
    >,
    settings:
      TargetScoringSettings,
  ): TargetRankingEntry[] => {
    const ranked =
      entries
        .map(
          (entry) => {
            const annotation =
              annotations[
                entry.village.key
              ] ??
              emptyAnnotation(
                entry.village.key,
              )

            return {
              entry,
              annotation,
              score:
                calculateTargetScore(
                  entry,
                  annotation,
                  settings,
                ),
            }
          },
        )
        .sort(
          (
            left,
            right,
          ) => {
            const scoreDifference =
              right.score.score -
              left.score.score

            if (
              scoreDifference !==
              0
            ) {
              return scoreDifference
            }

            const defenseDifference =
              left.entry
                .village
                .latest
                .totalTroops -
              right.entry
                .village
                .latest
                .totalTroops

            if (
              defenseDifference !==
              0
            ) {
              return defenseDifference
            }

            return (
              left.entry
                .ageHours -
              right.entry
                .ageHours
            )
          },
        )

    return ranked.map(
      (
        value,
        index,
      ) => ({
        ...value,
        rank:
          index + 1,
      }),
    )
  }

export const filterTargetRankingByMinimumScore =
  (
    ranking:
      TargetRankingEntry[],
    minimumScore: number,
  ): TargetRankingEntry[] => {
    const minimum =
      Math.max(
        0,
        Math.min(
          100,
          minimumScore,
        ),
      )

    return ranking.filter(
      (value) =>
        value.score.score >=
        minimum,
    )
  }

export const getRankingByVillageKeys =
  (
    ranking:
      TargetRankingEntry[],
    villageKeys: string[],
  ): TargetRankingEntry[] => {
    const indexByKey =
      new Map(
        villageKeys.map(
          (
            key,
            index,
          ) => [
            key,
            index,
          ],
        ),
      )

    return ranking
      .filter(
        (value) =>
          indexByKey.has(
            value.entry
              .village.key,
          ),
      )
      .sort(
        (
          left,
          right,
        ) =>
          (
            indexByKey.get(
              left.entry
                .village.key,
            ) ?? 0
          ) -
          (
            indexByKey.get(
              right.entry
                .village.key,
            ) ?? 0
          ),
      )
  }
