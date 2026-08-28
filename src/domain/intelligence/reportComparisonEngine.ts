import { units } from '../../data/units'

import type {
  UnitId,
} from '../../types/Battle'

import type {
  SimulationHistorySource,
} from '../../services/simulationHistoryApi'

import type {
  VillageIntelligence,
  VillageIntelligenceSnapshot,
} from './playerVillageIntelligence'

export type ReportComparisonDirection =
  | 'reinforced'
  | 'reduced'
  | 'mixed'
  | 'unchanged'

export type ReportComparisonSeverity =
  | 'major'
  | 'moderate'
  | 'minor'
  | 'none'

export interface ReportUnitComparison {
  unitId: UnitId
  unitName: string
  provisionsPerUnit: number
  older: number
  newer: number
  delta: number
  deltaPercent: number | null
  provisionDelta: number
  appeared: boolean
  disappeared: boolean
}

export interface ReportModifierComparison {
  key:
    | 'wallLevel'
    | 'churchLevel'
    | 'hospitalLevel'
    | 'clinicLevel'
    | 'ironWallLevel'
  label: string
  older: number
  newer: number
  delta: number
}

export interface ReportComparisonSummaryItem {
  tone:
    | 'positive'
    | 'negative'
    | 'neutral'
  text: string
}

export interface ReportComparisonResult {
  older: VillageIntelligenceSnapshot
  newer: VillageIntelligenceSnapshot
  elapsedMilliseconds: number
  olderSource: SimulationHistorySource
  newerSource: SimulationHistorySource

  previousTotalTroops: number
  currentTotalTroops: number
  troopDelta: number
  troopDeltaPercent: number | null

  previousProvisions: number
  currentProvisions: number
  provisionDelta: number
  provisionDeltaPercent: number | null

  increasedUnitTypes: number
  decreasedUnitTypes: number
  appearedUnitTypes: number
  disappearedUnitTypes: number

  direction: ReportComparisonDirection
  severity: ReportComparisonSeverity

  units: ReportUnitComparison[]
  modifiers: ReportModifierComparison[]
  summary: ReportComparisonSummaryItem[]
}

const totalTroops = (
  snapshot:
    VillageIntelligenceSnapshot,
): number => {
  return units.reduce(
    (
      total,
      unit,
    ) =>
      total +
      (
        snapshot.army[
          unit.id
        ] ??
        0
      ),
    0,
  )
}

const totalProvisions = (
  snapshot:
    VillageIntelligenceSnapshot,
): number => {
  return units.reduce(
    (
      total,
      unit,
    ) =>
      total +
      (
        snapshot.army[
          unit.id
        ] ??
        0
      ) *
        unit.provisions,
    0,
  )
}

const percentageChange = (
  previous: number,
  current: number,
): number | null => {
  if (
    previous ===
    0
  ) {
    return current ===
      0
      ? 0
      : null
  }

  return (
    (
      current -
      previous
    ) /
    previous
  ) *
    100
}

const compareModifier = (
  older:
    VillageIntelligenceSnapshot,
  newer:
    VillageIntelligenceSnapshot,
  key:
    ReportModifierComparison['key'],
  label: string,
): ReportModifierComparison => {
  const oldValue =
    Number(
      older.input
        .defenderModifiers[
          key
        ] ??
        0,
    )

  const newValue =
    Number(
      newer.input
        .defenderModifiers[
          key
        ] ??
        0,
    )

  return {
    key,
    label,
    older:
      oldValue,
    newer:
      newValue,
    delta:
      newValue -
      oldValue,
  }
}

const resolveDirection = (
  troopDelta: number,
  increasedTypes: number,
  decreasedTypes: number,
): ReportComparisonDirection => {
  if (
    troopDelta >
      0 &&
    decreasedTypes ===
      0
  ) {
    return 'reinforced'
  }

  if (
    troopDelta <
      0 &&
    increasedTypes ===
      0
  ) {
    return 'reduced'
  }

  if (
    increasedTypes >
      0 &&
    decreasedTypes >
      0
  ) {
    return 'mixed'
  }

  if (
    troopDelta >
    0
  ) {
    return 'reinforced'
  }

  if (
    troopDelta <
    0
  ) {
    return 'reduced'
  }

  return 'unchanged'
}

const resolveSeverity = (
  troopDeltaPercent:
    number | null,
  provisionDeltaPercent:
    number | null,
  modifierChanges: number,
  changedUnitTypes: number,
): ReportComparisonSeverity => {
  const troopMagnitude =
    Math.abs(
      troopDeltaPercent ??
        0,
    )

  const provisionMagnitude =
    Math.abs(
      provisionDeltaPercent ??
        0,
    )

  const largestMagnitude =
    Math.max(
      troopMagnitude,
      provisionMagnitude,
    )

  if (
    largestMagnitude >=
      50 ||
    modifierChanges >=
      3 ||
    changedUnitTypes >=
      7
  ) {
    return 'major'
  }

  if (
    largestMagnitude >=
      20 ||
    modifierChanges >=
      2 ||
    changedUnitTypes >=
      4
  ) {
    return 'moderate'
  }

  if (
    largestMagnitude >
      0 ||
    modifierChanges >
      0 ||
    changedUnitTypes >
      0
  ) {
    return 'minor'
  }

  return 'none'
}

const buildSummary = (
  troopDelta: number,
  troopDeltaPercent:
    number | null,
  provisionDelta: number,
  provisionDeltaPercent:
    number | null,
  unitChanges:
    ReportUnitComparison[],
  modifierChanges:
    ReportModifierComparison[],
): ReportComparisonSummaryItem[] => {
  const summary:
    ReportComparisonSummaryItem[] =
    []

  if (
    troopDelta >
    0
  ) {
    summary.push({
      tone:
        'negative',
      text:
        troopDeltaPercent ===
        null
          ? `Defense increased by ${troopDelta.toLocaleString()} troops from an unknown/zero baseline.`
          : `Defense increased by ${troopDelta.toLocaleString()} troops (${troopDeltaPercent.toFixed(1)}%).`,
    })
  } else if (
    troopDelta <
    0
  ) {
    summary.push({
      tone:
        'positive',
      text:
        troopDeltaPercent ===
        null
          ? `Defense decreased by ${Math.abs(
              troopDelta,
            ).toLocaleString()} troops.`
          : `Defense decreased by ${Math.abs(
              troopDelta,
            ).toLocaleString()} troops (${Math.abs(
              troopDeltaPercent,
            ).toFixed(1)}%).`,
    })
  } else {
    summary.push({
      tone:
        'neutral',
      text:
        'Total troop count did not change.',
    })
  }

  if (
    provisionDelta !==
    0
  ) {
    summary.push({
      tone:
        provisionDelta >
        0
          ? 'negative'
          : 'positive',
      text:
        provisionDeltaPercent ===
        null
          ? `Defense provisions changed by ${provisionDelta.toLocaleString()}.`
          : `Defense provisions ${provisionDelta > 0 ? 'increased' : 'decreased'} by ${Math.abs(
              provisionDelta,
            ).toLocaleString()} (${Math.abs(
              provisionDeltaPercent,
            ).toFixed(1)}%).`,
    })
  }

  const strongestIncrease =
    unitChanges
      .filter(
        (change) =>
          change.delta >
          0,
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.provisionDelta -
          left.provisionDelta,
      )[0]

  if (
    strongestIncrease
  ) {
    summary.push({
      tone:
        'negative',
      text:
        `Largest reinforcement: ${strongestIncrease.unitName} +${strongestIncrease.delta.toLocaleString()}.`,
    })
  }

  const strongestDecrease =
    unitChanges
      .filter(
        (change) =>
          change.delta <
          0,
      )
      .sort(
        (
          left,
          right,
        ) =>
          left.provisionDelta -
          right.provisionDelta,
      )[0]

  if (
    strongestDecrease
  ) {
    summary.push({
      tone:
        'positive',
      text:
        `Largest reduction: ${strongestDecrease.unitName} ${strongestDecrease.delta.toLocaleString()}.`,
    })
  }

  for (
    const modifier
    of modifierChanges.filter(
      (change) =>
        change.delta !==
        0,
    )
  ) {
    summary.push({
      tone:
        modifier.delta >
        0
          ? 'negative'
          : 'positive',
      text:
        `${modifier.label} changed from ${modifier.older} to ${modifier.newer} (${modifier.delta > 0 ? '+' : ''}${modifier.delta}).`,
    })
  }

  return summary.slice(
    0,
    8,
  )
}

export const compareReportSnapshots =
  (
    first:
      VillageIntelligenceSnapshot,
    second:
      VillageIntelligenceSnapshot,
  ): ReportComparisonResult => {
    const firstTime =
      new Date(
        first.createdAt,
      ).getTime()

    const secondTime =
      new Date(
        second.createdAt,
      ).getTime()

    const older =
      firstTime <=
      secondTime
        ? first
        : second

    const newer =
      firstTime <=
      secondTime
        ? second
        : first

    const unitChanges:
      ReportUnitComparison[] =
      units.map(
        (unit) => {
          const previous =
            older.army[
              unit.id
            ] ??
            0

          const current =
            newer.army[
              unit.id
            ] ??
            0

          const delta =
            current -
            previous

          return {
            unitId:
              unit.id,

            unitName:
              unit.name,

            provisionsPerUnit:
              unit.provisions,

            older:
              previous,

            newer:
              current,

            delta,

            deltaPercent:
              percentageChange(
                previous,
                current,
              ),

            provisionDelta:
              delta *
              unit.provisions,

            appeared:
              previous ===
                0 &&
              current >
                0,

            disappeared:
              previous >
                0 &&
              current ===
                0,
          }
        },
      )

    const visibleUnits =
      unitChanges.filter(
        (change) =>
          change.older >
            0 ||
          change.newer >
            0,
      )

    const previousTotalTroops =
      totalTroops(
        older,
      )

    const currentTotalTroops =
      totalTroops(
        newer,
      )

    const previousProvisions =
      totalProvisions(
        older,
      )

    const currentProvisions =
      totalProvisions(
        newer,
      )

    const troopDelta =
      currentTotalTroops -
      previousTotalTroops

    const provisionDelta =
      currentProvisions -
      previousProvisions

    const troopDeltaPercent =
      percentageChange(
        previousTotalTroops,
        currentTotalTroops,
      )

    const provisionDeltaPercent =
      percentageChange(
        previousProvisions,
        currentProvisions,
      )

    const increasedUnitTypes =
      visibleUnits.filter(
        (change) =>
          change.delta >
          0,
      ).length

    const decreasedUnitTypes =
      visibleUnits.filter(
        (change) =>
          change.delta <
          0,
      ).length

    const appearedUnitTypes =
      visibleUnits.filter(
        (change) =>
          change.appeared,
      ).length

    const disappearedUnitTypes =
      visibleUnits.filter(
        (change) =>
          change.disappeared,
      ).length

    const modifiers = [
      compareModifier(
        older,
        newer,
        'wallLevel',
        'Wall',
      ),

      compareModifier(
        older,
        newer,
        'churchLevel',
        'Church',
      ),

      compareModifier(
        older,
        newer,
        'hospitalLevel',
        'Hospital',
      ),

      compareModifier(
        older,
        newer,
        'clinicLevel',
        'Clinic',
      ),

      compareModifier(
        older,
        newer,
        'ironWallLevel',
        'Iron Wall',
      ),
    ]

    const changedModifierCount =
      modifiers.filter(
        (change) =>
          change.delta !==
          0,
      ).length

    const changedUnitTypes =
      visibleUnits.filter(
        (change) =>
          change.delta !==
          0,
      ).length

    return {
      older,
      newer,

      elapsedMilliseconds:
        Math.max(
          0,
          new Date(
            newer.createdAt,
          ).getTime() -
          new Date(
            older.createdAt,
          ).getTime(),
        ),

      olderSource:
        older.source,

      newerSource:
        newer.source,

      previousTotalTroops,
      currentTotalTroops,
      troopDelta,
      troopDeltaPercent,

      previousProvisions,
      currentProvisions,
      provisionDelta,
      provisionDeltaPercent,

      increasedUnitTypes,
      decreasedUnitTypes,
      appearedUnitTypes,
      disappearedUnitTypes,

      direction:
        resolveDirection(
          troopDelta,
          increasedUnitTypes,
          decreasedUnitTypes,
        ),

      severity:
        resolveSeverity(
          troopDeltaPercent,
          provisionDeltaPercent,
          changedModifierCount,
          changedUnitTypes,
        ),

      units:
        visibleUnits,

      modifiers,

      summary:
        buildSummary(
          troopDelta,
          troopDeltaPercent,
          provisionDelta,
          provisionDeltaPercent,
          visibleUnits,
          modifiers,
        ),
    }
  }

export const defaultReportComparisonPair =
  (
    village:
      VillageIntelligence,
  ): [
    VillageIntelligenceSnapshot,
    VillageIntelligenceSnapshot,
  ] | null => {
    if (
      village.snapshots.length <
      2
    ) {
      return null
    }

    return [
      village.snapshots[1],
      village.snapshots[0],
    ]
  }

export const findSnapshot =
  (
    village:
      VillageIntelligence,
    snapshotId: string,
  ): VillageIntelligenceSnapshot | null => {
    return (
      village.snapshots.find(
        (snapshot) =>
          snapshot.id ===
          snapshotId,
      ) ??
      null
    )
  }
