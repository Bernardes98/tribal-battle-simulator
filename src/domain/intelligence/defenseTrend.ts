import { units } from '../../data/units'

import type {
  UnitId,
} from '../../types/Unit'

import type {
  VillageIntelligence,
  VillageIntelligenceSnapshot,
} from './playerVillageIntelligence'

export interface DefenseTrendPoint {
  id: string
  createdAt: string
  totalTroops: number
  wallLevel: number
  source: VillageIntelligenceSnapshot['source']
}

export interface DefenseTrendUnitSeries {
  unitId: UnitId
  unitName: string
  latest: number
  previous: number | null
  delta: number | null
  values: number[]
}

export interface DefenseTrendData {
  points: DefenseTrendPoint[]
  unitSeries: DefenseTrendUnitSeries[]
  latestTotal: number
  oldestTotal: number
  totalDelta: number
  totalDeltaPercent: number | null
  highestTotal: number
  lowestTotal: number
  latestWall: number
  oldestWall: number
  wallDelta: number
}

const percentageChange = (
  oldest: number,
  latest: number,
): number | null => {
  if (oldest === 0) {
    return latest === 0
      ? 0
      : null
  }

  return (
    ((latest - oldest) /
      oldest) *
    100
  )
}

export const buildDefenseTrendData = (
  village: VillageIntelligence,
): DefenseTrendData => {
  const snapshots =
    [...village.snapshots].reverse()

  const points =
    snapshots.map(
      (snapshot) => ({
        id: snapshot.id,
        createdAt:
          snapshot.createdAt,
        totalTroops:
          snapshot.totalTroops,
        wallLevel:
          snapshot.wallLevel,
        source:
          snapshot.source,
      }),
    )

  const latestSnapshot =
    snapshots[
      snapshots.length - 1
    ]

  const oldestSnapshot =
    snapshots[0]

  const unitSeries =
    units
      .map(
        (unit) => {
          const values =
            snapshots.map(
              (snapshot) =>
                snapshot.army[
                  unit.id
                ] ?? 0,
            )

          const latest =
            values[
              values.length - 1
            ] ?? 0

          const previous =
            values.length > 1
              ? values[
                  values.length - 2
                ]
              : null

          return {
            unitId: unit.id,
            unitName:
              unit.name,
            latest,
            previous,
            delta:
              previous === null
                ? null
                : latest -
                  previous,
            values,
          }
        },
      )
      .filter(
        (series) =>
          series.values.some(
            (value) =>
              value > 0,
          ),
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.latest -
          left.latest,
      )

  const totals =
    points.map(
      (point) =>
        point.totalTroops,
    )

  const latestTotal =
    latestSnapshot
      ?.totalTroops ?? 0

  const oldestTotal =
    oldestSnapshot
      ?.totalTroops ?? 0

  const latestWall =
    latestSnapshot
      ?.wallLevel ?? 0

  const oldestWall =
    oldestSnapshot
      ?.wallLevel ?? 0

  return {
    points,
    unitSeries,
    latestTotal,
    oldestTotal,
    totalDelta:
      latestTotal -
      oldestTotal,
    totalDeltaPercent:
      percentageChange(
        oldestTotal,
        latestTotal,
      ),
    highestTotal:
      totals.length > 0
        ? Math.max(
            ...totals,
          )
        : 0,
    lowestTotal:
      totals.length > 0
        ? Math.min(
            ...totals,
          )
        : 0,
    latestWall,
    oldestWall,
    wallDelta:
      latestWall -
      oldestWall,
  }
}
