import { units } from '../../data/units'

import type {
  SimulationHistoryItem,
  SimulationHistorySource,
} from '../../services/simulationHistoryApi'

import type {
  Army,
  BattleSimulationInput,
} from '../../types/Battle'

import type {
  ReportMetadata,
  ReportPartyMetadata,
} from '../../types/ReportMetadata'

export interface VillageIntelligenceSnapshot {
  id: string
  source: SimulationHistorySource
  createdAt: string
  army: Army
  input: BattleSimulationInput
  metadata: ReportMetadata | null
  totalTroops: number
  wallLevel: number
}

export interface VillageIntelligence {
  key: string
  playerName: string
  villageName: string
  x: number | null
  y: number | null
  reportCount: number
  latest: VillageIntelligenceSnapshot
  previous: VillageIntelligenceSnapshot | null
  snapshots: VillageIntelligenceSnapshot[]
}

export interface PlayerIntelligence {
  key: string
  playerName: string
  villageCount: number
  reportCount: number
  latestSeenAt: string
  villages: VillageIntelligence[]
}

const normalizeText = (
  value: string | null | undefined,
): string => {
  return (
    value
      ?.trim()
      .replace(/\s+/g, ' ')
      .toLowerCase() ?? ''
  )
}

const armyTotal = (
  army: Army,
): number => {
  return units.reduce(
    (total, unit) =>
      total +
      (army[unit.id] ?? 0),
    0,
  )
}

const hasPartyIdentity = (
  party:
    | ReportPartyMetadata
    | null
    | undefined,
): party is ReportPartyMetadata => {
  if (!party) {
    return false
  }

  return Boolean(
    party.playerName?.trim() ||
      party.villageName?.trim() ||
      party.coordinates,
  )
}

const playerKey = (
  party: ReportPartyMetadata,
): string => {
  const player =
    normalizeText(
      party.playerName,
    )

  return player || 'unknown-player'
}

const villageKey = (
  party: ReportPartyMetadata,
): string => {
  if (party.coordinates) {
    return `${party.coordinates.x}|${party.coordinates.y}`
  }

  const player =
    normalizeText(
      party.playerName,
    )

  const village =
    normalizeText(
      party.villageName,
    )

  return [
    player,
    village,
  ]
    .filter(Boolean)
    .join('|') ||
    'unknown-village'
}

const snapshotFromItem = (
  item: SimulationHistoryItem,
): VillageIntelligenceSnapshot => {
  return {
    id: item.id,
    source: item.source,
    createdAt: item.createdAt,
    army: {
      ...item.payload.defender,
    },
    input: item.payload,
    metadata:
      item.reportMetadata,
    totalTroops:
      armyTotal(
        item.payload.defender,
      ),
    wallLevel:
      item.payload
        .defenderModifiers
        .wallLevel,
  }
}

const byNewest = (
  left: VillageIntelligenceSnapshot,
  right: VillageIntelligenceSnapshot,
): number => {
  return (
    new Date(
      right.createdAt,
    ).getTime() -
    new Date(
      left.createdAt,
    ).getTime()
  )
}

export const buildPlayerVillageIntelligence = (
  items: SimulationHistoryItem[],
): PlayerIntelligence[] => {
  const playerMap =
    new Map<
      string,
      Map<
        string,
        VillageIntelligenceSnapshot[]
      >
    >()

  const partyByVillage =
    new Map<
      string,
      ReportPartyMetadata
    >()

  for (const item of items) {
    const party =
      item.reportMetadata
        ?.defender

    if (
      !hasPartyIdentity(
        party,
      )
    ) {
      continue
    }

    const pKey =
      playerKey(party)

    const vKey =
      villageKey(party)

    const compoundVillageKey =
      `${pKey}::${vKey}`

    if (
      !playerMap.has(pKey)
    ) {
      playerMap.set(
        pKey,
        new Map(),
      )
    }

    const villages =
      playerMap.get(
        pKey,
      )!

    if (
      !villages.has(vKey)
    ) {
      villages.set(
        vKey,
        [],
      )
    }

    villages
      .get(vKey)!
      .push(
        snapshotFromItem(
          item,
        ),
      )

    partyByVillage.set(
      compoundVillageKey,
      party,
    )
  }

  const players:
    PlayerIntelligence[] =
    []

  for (
    const [
      pKey,
      villageMap,
    ]
    of playerMap
  ) {
    const villages:
      VillageIntelligence[] =
      []

    for (
      const [
        vKey,
        rawSnapshots,
      ]
      of villageMap
    ) {
      const snapshots = [
        ...rawSnapshots,
      ].sort(byNewest)

      const party =
        partyByVillage.get(
          `${pKey}::${vKey}`,
        )

      if (!party) {
        continue
      }

      const latest =
        snapshots[0]

      if (!latest) {
        continue
      }

      villages.push({
        key:
          `${pKey}::${vKey}`,
        playerName:
          party.playerName?.trim() ||
          'Unknown player',
        villageName:
          party.villageName?.trim() ||
          'Unknown village',
        x:
          party.coordinates?.x ??
          null,
        y:
          party.coordinates?.y ??
          null,
        reportCount:
          snapshots.length,
        latest,
        previous:
          snapshots[1] ??
          null,
        snapshots:
          snapshots.slice(
            0,
            12,
          ),
      })
    }

    villages.sort(
      (
        left,
        right,
      ) =>
        new Date(
          right.latest.createdAt,
        ).getTime() -
        new Date(
          left.latest.createdAt,
        ).getTime(),
    )

    if (
      villages.length === 0
    ) {
      continue
    }

    players.push({
      key: pKey,
      playerName:
        villages[0]
          .playerName,
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
      latestSeenAt:
        villages[0]
          .latest
          .createdAt,
      villages,
    })
  }

  players.sort(
    (
      left,
      right,
    ) =>
      new Date(
        right.latestSeenAt,
      ).getTime() -
      new Date(
        left.latestSeenAt,
      ).getTime(),
  )

  return players
}

export const filterPlayerVillageIntelligence = (
  players: PlayerIntelligence[],
  search: string,
): PlayerIntelligence[] => {
  const normalized =
    normalizeText(search)

  if (!normalized) {
    return players
  }

  return players
    .map(
      (player) => {
        const playerMatches =
          normalizeText(
            player.playerName,
          ).includes(
            normalized,
          )

        const villages =
          playerMatches
            ? player.villages
            : player.villages.filter(
                (village) => {
                  const coordinates =
                    village.x !== null &&
                    village.y !== null
                      ? `${village.x}|${village.y}`
                      : ''

                  return (
                    normalizeText(
                      village.villageName,
                    ).includes(
                      normalized,
                    ) ||
                    normalizeText(
                      coordinates,
                    ).includes(
                      normalized,
                    )
                  )
                },
              )

        if (
          villages.length === 0
        ) {
          return null
        }

        return {
          ...player,
          villageCount:
            villages.length,
          villages,
        }
      },
    )
    .filter(
      (
        player,
      ): player is PlayerIntelligence =>
        player !== null,
    )
}
