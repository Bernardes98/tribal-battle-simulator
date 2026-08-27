import type {
  VillageAnnotation,
  VillageTag,
} from './villageAnnotations'

import type {
  WatchlistDashboardEntry,
} from './watchlistDashboard'

const STORAGE_KEY =
  'tribal-battle-target-scoring-settings-v1'

export const TARGET_SCORING_SETTINGS_CHANGED_EVENT =
  'tribal-battle-target-scoring-settings-changed'

export interface TargetScoringSettings {
  priorityTagBonus: number
  targetTagBonus: number
  nobleTargetTagBonus: number
  farmTagBonus: number
  avoidTagPenalty: number
  strongDefenseTagPenalty: number
  freshSpyBonus: number
  recentSpyBonus: number
  staleIntelPenalty: number
  defenseDecreaseBonus: number
  defenseIncreasePenalty: number
  lowWallBonus: number
  highWallPenalty: number
  preferredMaxDefense: number
  lowWallLevel: number
  highWallLevel: number
}

export interface TargetScoreFactor {
  key: string
  label: string
  value: number
  description: string
}

export interface TargetScoreResult {
  score: number
  rawScore: number
  factors: TargetScoreFactor[]
  label:
    | 'Excellent'
    | 'Good'
    | 'Possible'
    | 'Risky'
    | 'Avoid'
}

export const DEFAULT_TARGET_SCORING_SETTINGS:
  TargetScoringSettings = {
    priorityTagBonus: 25,
    targetTagBonus: 18,
    nobleTargetTagBonus: 22,
    farmTagBonus: 14,
    avoidTagPenalty: 45,
    strongDefenseTagPenalty: 20,
    freshSpyBonus: 18,
    recentSpyBonus: 8,
    staleIntelPenalty: 15,
    defenseDecreaseBonus: 14,
    defenseIncreasePenalty: 16,
    lowWallBonus: 10,
    highWallPenalty: 12,
    preferredMaxDefense: 2500,
    lowWallLevel: 5,
    highWallLevel: 15,
  }

const clampNumber = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number => {
  const parsed =
    typeof value === 'number'
      ? value
      : Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(
    max,
    Math.max(
      min,
      Math.round(parsed),
    ),
  )
}

export const loadTargetScoringSettings =
  (): TargetScoringSettings => {
    if (typeof window === 'undefined') {
      return {
        ...DEFAULT_TARGET_SCORING_SETTINGS,
      }
    }

    try {
      const raw =
        window.localStorage.getItem(
          STORAGE_KEY,
        )

      if (!raw) {
        return {
          ...DEFAULT_TARGET_SCORING_SETTINGS,
        }
      }

      const parsed =
        JSON.parse(raw) as
          Partial<TargetScoringSettings>

      return {
        priorityTagBonus:
          clampNumber(
            parsed.priorityTagBonus,
            DEFAULT_TARGET_SCORING_SETTINGS.priorityTagBonus,
            0,
            100,
          ),
        targetTagBonus:
          clampNumber(
            parsed.targetTagBonus,
            DEFAULT_TARGET_SCORING_SETTINGS.targetTagBonus,
            0,
            100,
          ),
        nobleTargetTagBonus:
          clampNumber(
            parsed.nobleTargetTagBonus,
            DEFAULT_TARGET_SCORING_SETTINGS.nobleTargetTagBonus,
            0,
            100,
          ),
        farmTagBonus:
          clampNumber(
            parsed.farmTagBonus,
            DEFAULT_TARGET_SCORING_SETTINGS.farmTagBonus,
            0,
            100,
          ),
        avoidTagPenalty:
          clampNumber(
            parsed.avoidTagPenalty,
            DEFAULT_TARGET_SCORING_SETTINGS.avoidTagPenalty,
            0,
            100,
          ),
        strongDefenseTagPenalty:
          clampNumber(
            parsed.strongDefenseTagPenalty,
            DEFAULT_TARGET_SCORING_SETTINGS.strongDefenseTagPenalty,
            0,
            100,
          ),
        freshSpyBonus:
          clampNumber(
            parsed.freshSpyBonus,
            DEFAULT_TARGET_SCORING_SETTINGS.freshSpyBonus,
            0,
            100,
          ),
        recentSpyBonus:
          clampNumber(
            parsed.recentSpyBonus,
            DEFAULT_TARGET_SCORING_SETTINGS.recentSpyBonus,
            0,
            100,
          ),
        staleIntelPenalty:
          clampNumber(
            parsed.staleIntelPenalty,
            DEFAULT_TARGET_SCORING_SETTINGS.staleIntelPenalty,
            0,
            100,
          ),
        defenseDecreaseBonus:
          clampNumber(
            parsed.defenseDecreaseBonus,
            DEFAULT_TARGET_SCORING_SETTINGS.defenseDecreaseBonus,
            0,
            100,
          ),
        defenseIncreasePenalty:
          clampNumber(
            parsed.defenseIncreasePenalty,
            DEFAULT_TARGET_SCORING_SETTINGS.defenseIncreasePenalty,
            0,
            100,
          ),
        lowWallBonus:
          clampNumber(
            parsed.lowWallBonus,
            DEFAULT_TARGET_SCORING_SETTINGS.lowWallBonus,
            0,
            100,
          ),
        highWallPenalty:
          clampNumber(
            parsed.highWallPenalty,
            DEFAULT_TARGET_SCORING_SETTINGS.highWallPenalty,
            0,
            100,
          ),
        preferredMaxDefense:
          clampNumber(
            parsed.preferredMaxDefense,
            DEFAULT_TARGET_SCORING_SETTINGS.preferredMaxDefense,
            0,
            500000,
          ),
        lowWallLevel:
          clampNumber(
            parsed.lowWallLevel,
            DEFAULT_TARGET_SCORING_SETTINGS.lowWallLevel,
            0,
            20,
          ),
        highWallLevel:
          clampNumber(
            parsed.highWallLevel,
            DEFAULT_TARGET_SCORING_SETTINGS.highWallLevel,
            0,
            20,
          ),
      }
    } catch {
      return {
        ...DEFAULT_TARGET_SCORING_SETTINGS,
      }
    }
  }

export const saveTargetScoringSettings = (
  settings: TargetScoringSettings,
): void => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(settings),
  )

  window.dispatchEvent(
    new CustomEvent(
      TARGET_SCORING_SETTINGS_CHANGED_EVENT,
    ),
  )
}

export const resetTargetScoringSettings =
  (): TargetScoringSettings => {
    const settings = {
      ...DEFAULT_TARGET_SCORING_SETTINGS,
    }

    saveTargetScoringSettings(settings)

    return settings
  }

const hasTag = (
  annotation: VillageAnnotation,
  tag: VillageTag,
): boolean => {
  return annotation.tags.includes(tag)
}

const pushFactor = (
  factors: TargetScoreFactor[],
  key: string,
  label: string,
  value: number,
  description: string,
): void => {
  if (value === 0) {
    return
  }

  factors.push({
    key,
    label,
    value,
    description,
  })
}

const scoreLabel = (
  score: number,
): TargetScoreResult['label'] => {
  if (score >= 80) return 'Excellent'
  if (score >= 65) return 'Good'
  if (score >= 50) return 'Possible'
  if (score >= 30) return 'Risky'
  return 'Avoid'
}

export const calculateTargetScore = (
  entry: WatchlistDashboardEntry,
  annotation: VillageAnnotation,
  settings: TargetScoringSettings,
): TargetScoreResult => {
  const factors: TargetScoreFactor[] = []
  let rawScore = 50

  const tagFactors: Array<[
    VillageTag,
    string,
    number,
    string,
  ]> = [
    [
      'Priority',
      'Priority tag',
      settings.priorityTagBonus,
      'Village was manually marked as Priority.',
    ],
    [
      'Target',
      'Target tag',
      settings.targetTagBonus,
      'Village was manually marked as Target.',
    ],
    [
      'Noble Target',
      'Noble Target tag',
      settings.nobleTargetTagBonus,
      'Village was marked as a possible noble target.',
    ],
    [
      'Farm',
      'Farm tag',
      settings.farmTagBonus,
      'Village was manually marked as Farm.',
    ],
    [
      'Avoid',
      'Avoid tag',
      -settings.avoidTagPenalty,
      'Village was manually marked as Avoid.',
    ],
    [
      'Strong Defense',
      'Strong Defense tag',
      -settings.strongDefenseTagPenalty,
      'Village was marked as having strong defense.',
    ],
  ]

  tagFactors.forEach(
    ([tag, label, value, description]) => {
      if (hasTag(annotation, tag)) {
        pushFactor(
          factors,
          `tag-${tag.toLowerCase().replace(/\\s+/g, '-')}`,
          label,
          value,
          description,
        )
      }
    },
  )

  if (
    entry.village.latest.source ===
    'SPY_REPORT'
  ) {
    if (entry.ageHours <= 24) {
      pushFactor(
        factors,
        'fresh-spy',
        'Fresh spy report',
        settings.freshSpyBonus,
        'Latest intelligence is less than 24 hours old.',
      )
    } else if (entry.ageHours <= 48) {
      pushFactor(
        factors,
        'recent-spy',
        'Recent spy report',
        settings.recentSpyBonus,
        'Latest intelligence is between 24 and 48 hours old.',
      )
    }
  }

  if (entry.ageHours >= 72) {
    pushFactor(
      factors,
      'stale-intel',
      'Stale intelligence',
      -settings.staleIntelPenalty,
      'Latest report is at least 72 hours old.',
    )
  }

  if (entry.troopDelta !== null) {
    if (entry.troopDelta < 0) {
      pushFactor(
        factors,
        'defense-decrease',
        'Defense decreased',
        settings.defenseDecreaseBonus,
        'Latest saved report contains fewer defending troops.',
      )
    } else if (entry.troopDelta > 0) {
      pushFactor(
        factors,
        'defense-increase',
        'Defense increased',
        -settings.defenseIncreasePenalty,
        'Latest saved report contains more defending troops.',
      )
    }
  }

  const totalDefense =
    entry.village.latest.totalTroops

  if (
    totalDefense <=
    settings.preferredMaxDefense
  ) {
    const difference =
      settings.preferredMaxDefense -
      totalDefense

    const defenseBonus =
      settings.preferredMaxDefense > 0
        ? Math.round(
            Math.min(
              20,
              5 +
                (difference /
                  settings.preferredMaxDefense) *
                  15,
            ),
          )
        : 0

    pushFactor(
      factors,
      'preferred-defense',
      'Defense within preferred range',
      defenseBonus,
      `${totalDefense.toLocaleString()} troops is within your preferred maximum of ${settings.preferredMaxDefense.toLocaleString()}.`,
    )
  } else {
    const ratio =
      settings.preferredMaxDefense > 0
        ? totalDefense /
          settings.preferredMaxDefense
        : 2

    const penalty =
      Math.round(
        Math.min(
          30,
          8 +
            Math.max(
              0,
              ratio - 1,
            ) *
              8,
        ),
      )

    pushFactor(
      factors,
      'high-defense',
      'Defense above preferred range',
      -penalty,
      `${totalDefense.toLocaleString()} troops is above your preferred maximum of ${settings.preferredMaxDefense.toLocaleString()}.`,
    )
  }

  const wallLevel =
    entry.village.latest.wallLevel

  if (
    wallLevel <=
    settings.lowWallLevel
  ) {
    pushFactor(
      factors,
      'low-wall',
      'Low wall',
      settings.lowWallBonus,
      `Wall level ${wallLevel} is at or below your low-wall threshold.`,
    )
  } else if (
    wallLevel >=
    settings.highWallLevel
  ) {
    pushFactor(
      factors,
      'high-wall',
      'High wall',
      -settings.highWallPenalty,
      `Wall level ${wallLevel} is at or above your high-wall threshold.`,
    )
  }

  rawScore +=
    factors.reduce(
      (total, factor) =>
        total + factor.value,
      0,
    )

  const score =
    Math.max(
      0,
      Math.min(100, rawScore),
    )

  return {
    score,
    rawScore,
    factors,
    label: scoreLabel(score),
  }
}
