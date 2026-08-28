import { units } from '../../data/units'

import type {
  Army,
} from '../../types/Battle'

import type {
  UnitId,
} from '../../types/Unit'

export interface UnitDefenseChange {
  unitId: UnitId
  unitName: string
  previous: number
  current: number
  delta: number
}

export interface DefenseChangeSummary {
  previousTotal: number
  currentTotal: number
  totalDelta: number
  increasedUnits: number
  decreasedUnits: number
  unchangedUnits: number
  changes: UnitDefenseChange[]
}

export const compareDefenses = (
  previous: Army,
  current: Army,
): DefenseChangeSummary => {
  const changes =
    units.map(
      (unit) => {
        const previousValue =
          previous[unit.id] ??
          0

        const currentValue =
          current[unit.id] ??
          0

        return {
          unitId: unit.id,
          unitName: unit.name,
          previous: previousValue,
          current: currentValue,
          delta:
            currentValue -
            previousValue,
        }
      },
    )

  const previousTotal =
    changes.reduce(
      (
        total,
        change,
      ) =>
        total +
        change.previous,
      0,
    )

  const currentTotal =
    changes.reduce(
      (
        total,
        change,
      ) =>
        total +
        change.current,
      0,
    )

  return {
    previousTotal,
    currentTotal,
    totalDelta:
      currentTotal -
      previousTotal,
    increasedUnits:
      changes.filter(
        (change) =>
          change.delta >
          0,
      ).length,
    decreasedUnits:
      changes.filter(
        (change) =>
          change.delta <
          0,
      ).length,
    unchangedUnits:
      changes.filter(
        (change) =>
          change.delta ===
          0,
      ).length,
    changes:
      changes.filter(
        (change) =>
          change.previous >
            0 ||
          change.current >
            0,
      ),
  }
}

export const defenseChangeStatus = (
  summary: DefenseChangeSummary,
): 'reinforced'
  | 'reduced'
  | 'unchanged' => {
  if (
    summary.totalDelta >
    0
  ) {
    return 'reinforced'
  }

  if (
    summary.totalDelta <
    0
  ) {
    return 'reduced'
  }

  return 'unchanged'
}
