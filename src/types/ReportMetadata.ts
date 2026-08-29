export interface ReportCoordinates {
  x: number
  y: number
}

export interface ReportPartyMetadata {
  playerName: string | null
  villageName: string | null
  coordinates: ReportCoordinates | null
}

export interface ReportTimestampMetadata {
  localDateTime: string
  rawText: string
  timezone: string | null
}

export interface ReportMetadata {
  attacker: ReportPartyMetadata | null
  defender: ReportPartyMetadata | null
  timestamp?: ReportTimestampMetadata | null
}

export const hasReportPartyMetadata = (
  metadata: ReportPartyMetadata | null | undefined,
): boolean => {
  if (!metadata) {
    return false
  }

  return Boolean(
    metadata.playerName ||
      metadata.villageName ||
      metadata.coordinates,
  )
}

export const cloneReportMetadata = (
  metadata: ReportMetadata | null | undefined,
): ReportMetadata | null => {
  if (!metadata) {
    return null
  }

  const cloneParty = (
    party: ReportPartyMetadata | null,
  ): ReportPartyMetadata | null => {
    if (!party) {
      return null
    }

    return {
      playerName: party.playerName,
      villageName: party.villageName,
      coordinates: party.coordinates
        ? {
            ...party.coordinates,
          }
        : null,
    }
  }

  return {
    attacker: cloneParty(metadata.attacker),
    defender: cloneParty(metadata.defender),
    timestamp: metadata.timestamp
      ? {
          ...metadata.timestamp,
        }
      : null,
  }
}
