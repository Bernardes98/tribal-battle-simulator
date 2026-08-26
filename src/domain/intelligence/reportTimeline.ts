import { units } from '../../data/units'

import type {
  Army,
} from '../../types/Battle'

import type {
  VillageIntelligence,
  VillageIntelligenceSnapshot,
} from './playerVillageIntelligence'

export interface ReportTimelineEntry {
  snapshot: VillageIntelligenceSnapshot
  totalTroops: number
  troopDelta: number | null
  wallDelta: number | null
  topUnits: Array<{
    name: string
    quantity: number
  }>
}

const totalArmy = (
  army: Army,
): number => {
  return units.reduce(
    (total, unit) =>
      total +
      (army[unit.id] ?? 0),
    0,
  )
}

const topArmyUnits = (
  army: Army,
) => {
  return units
    .map(
      (unit) => ({
        name: unit.name,
        quantity:
          army[unit.id] ?? 0,
      }),
    )
    .filter(
      (item) =>
        item.quantity > 0,
    )
    .sort(
      (
        left,
        right,
      ) =>
        right.quantity -
        left.quantity,
    )
    .slice(
      0,
      5,
    )
}

export const buildReportTimeline = (
  village: VillageIntelligence,
): ReportTimelineEntry[] => {
  const snapshots =
    village.snapshots

  return snapshots.map(
    (
      snapshot,
      index,
    ) => {
      const previous =
        snapshots[
          index + 1
        ]

      return {
        snapshot,
        totalTroops:
          totalArmy(
            snapshot.army,
          ),
        troopDelta:
          previous
            ? totalArmy(
                snapshot.army,
              ) -
              totalArmy(
                previous.army,
              )
            : null,
        wallDelta:
          previous
            ? snapshot.wallLevel -
              previous.wallLevel
            : null,
        topUnits:
          topArmyUnits(
            snapshot.army,
          ),
      }
    },
  )
}
