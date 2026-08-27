export const CONQUEST_PLANNER_CHANGED_EVENT =
  'tribal-battle-conquest-planner-changed'

const STORAGE_KEY =
  'tribal-battle-conquest-planner-v1'

export type NobleEscortMode =
  | 'NOBLE_ONLY'
  | 'CURRENT_ATTACKER'

export interface ConquestPlannerSettings {
  planId: string
  startingLoyalty: number
  minLoyaltyReduction: number
  maxLoyaltyReduction: number
  nobleCount: number
  firstOffsetSeconds: number
  intervalSeconds: number
  escortMode: NobleEscortMode
  updatedAt: string
}

export interface ConquestProjectionStep {
  nobleNumber: number
  offsetSeconds: number
  bestCaseLoyalty: number
  expectedLoyalty: number
  worstCaseLoyalty: number
}

export interface ConquestProjection {
  averageReduction: number
  bestCaseNobles: number
  expectedNobles: number
  safeNobles: number
  selectedNobles: number
  bestCaseFinalLoyalty: number
  expectedFinalLoyalty: number
  worstCaseFinalLoyalty: number
  guaranteedConquest: boolean
  expectedConquest: boolean
  possibleConquest: boolean
  steps: ConquestProjectionStep[]
}

const clamp = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number => {
  const parsed =
    typeof value ===
    'number'
      ? value
      : Number(
          value,
        )

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return fallback
  }

  return Math.min(
    max,
    Math.max(
      min,
      Math.round(
        parsed,
      ),
    ),
  )
}

const defaultSettings = (
  planId: string,
): ConquestPlannerSettings => ({
  planId,
  startingLoyalty: 100,
  minLoyaltyReduction: 20,
  maxLoyaltyReduction: 35,
  nobleCount: 5,
  firstOffsetSeconds: 5,
  intervalSeconds: 5,
  escortMode:
    'CURRENT_ATTACKER',
  updatedAt:
    new Date().toISOString(),
})

const loadAll =
  (): Record<
    string,
    ConquestPlannerSettings
  > => {
    if (
      typeof window ===
      'undefined'
    ) {
      return {}
    }

    try {
      const raw =
        window.localStorage.getItem(
          STORAGE_KEY,
        )

      if (!raw) {
        return {}
      }

      const parsed =
        JSON.parse(
          raw,
        ) as Record<
          string,
          Partial<ConquestPlannerSettings>
        >

      return Object.fromEntries(
        Object.entries(
          parsed,
        ).map(
          ([
            planId,
            value,
          ]) => {
            const fallback =
              defaultSettings(
                planId,
              )

            const minReduction =
              clamp(
                value.minLoyaltyReduction,
                fallback.minLoyaltyReduction,
                1,
                100,
              )

            const maxReduction =
              Math.max(
                minReduction,
                clamp(
                  value.maxLoyaltyReduction,
                  fallback.maxLoyaltyReduction,
                  1,
                  100,
                ),
              )

            return [
              planId,
              {
                planId,
                startingLoyalty:
                  clamp(
                    value.startingLoyalty,
                    fallback.startingLoyalty,
                    1,
                    100,
                  ),
                minLoyaltyReduction:
                  minReduction,
                maxLoyaltyReduction:
                  maxReduction,
                nobleCount:
                  clamp(
                    value.nobleCount,
                    fallback.nobleCount,
                    1,
                    20,
                  ),
                firstOffsetSeconds:
                  clamp(
                    value.firstOffsetSeconds,
                    fallback.firstOffsetSeconds,
                    0,
                    86400,
                  ),
                intervalSeconds:
                  clamp(
                    value.intervalSeconds,
                    fallback.intervalSeconds,
                    1,
                    3600,
                  ),
                escortMode:
                  value.escortMode ===
                  'NOBLE_ONLY'
                    ? 'NOBLE_ONLY'
                    : 'CURRENT_ATTACKER',
                updatedAt:
                  typeof value.updatedAt ===
                  'string'
                    ? value.updatedAt
                    : fallback.updatedAt,
              } satisfies ConquestPlannerSettings,
            ]
          },
        ),
      )
    } catch {
      return {}
    }
  }

export const loadConquestPlannerSettings =
  (
    planId: string,
  ): ConquestPlannerSettings => {
    return (
      loadAll()[
        planId
      ] ??
      defaultSettings(
        planId,
      )
    )
  }

export const saveConquestPlannerSettings =
  (
    settings:
      ConquestPlannerSettings,
  ): ConquestPlannerSettings => {
    const normalized =
      loadConquestPlannerSettings(
        settings.planId,
      )

    const minReduction =
      clamp(
        settings.minLoyaltyReduction,
        normalized.minLoyaltyReduction,
        1,
        100,
      )

    const saved:
      ConquestPlannerSettings = {
      planId:
        settings.planId,

      startingLoyalty:
        clamp(
          settings.startingLoyalty,
          normalized.startingLoyalty,
          1,
          100,
        ),

      minLoyaltyReduction:
        minReduction,

      maxLoyaltyReduction:
        Math.max(
          minReduction,
          clamp(
            settings.maxLoyaltyReduction,
            normalized.maxLoyaltyReduction,
            1,
            100,
          ),
        ),

      nobleCount:
        clamp(
          settings.nobleCount,
          normalized.nobleCount,
          1,
          20,
        ),

      firstOffsetSeconds:
        clamp(
          settings.firstOffsetSeconds,
          normalized.firstOffsetSeconds,
          0,
          86400,
        ),

      intervalSeconds:
        clamp(
          settings.intervalSeconds,
          normalized.intervalSeconds,
          1,
          3600,
        ),

      escortMode:
        settings.escortMode ===
        'NOBLE_ONLY'
          ? 'NOBLE_ONLY'
          : 'CURRENT_ATTACKER',

      updatedAt:
        new Date().toISOString(),
    }

    if (
      typeof window !==
      'undefined'
    ) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...loadAll(),
          [saved.planId]:
            saved,
        }),
      )

      window.dispatchEvent(
        new CustomEvent(
          CONQUEST_PLANNER_CHANGED_EVENT,
        ),
      )
    }

    return saved
  }

export const calculateConquestProjection =
  (
    settings:
      ConquestPlannerSettings,
  ): ConquestProjection => {
    const starting =
      Math.max(
        1,
        settings.startingLoyalty,
      )

    const minReduction =
      Math.max(
        1,
        settings.minLoyaltyReduction,
      )

    const maxReduction =
      Math.max(
        minReduction,
        settings.maxLoyaltyReduction,
      )

    const averageReduction =
      (
        minReduction +
        maxReduction
      ) /
      2

    const bestCaseNobles =
      Math.ceil(
        starting /
          maxReduction,
      )

    const expectedNobles =
      Math.ceil(
        starting /
          averageReduction,
      )

    const safeNobles =
      Math.ceil(
        starting /
          minReduction,
      )

    const selectedNobles =
      Math.max(
        1,
        settings.nobleCount,
      )

    const bestCaseFinalLoyalty =
      Math.max(
        0,
        starting -
          selectedNobles *
            maxReduction,
      )

    const expectedFinalLoyalty =
      Math.max(
        0,
        starting -
          selectedNobles *
            averageReduction,
      )

    const worstCaseFinalLoyalty =
      Math.max(
        0,
        starting -
          selectedNobles *
            minReduction,
      )

    const steps =
      Array.from(
        {
          length:
            selectedNobles,
        },
        (
          _,
          index,
        ) => {
          const nobleNumber =
            index + 1

          return {
            nobleNumber,

            offsetSeconds:
              settings.firstOffsetSeconds +
              index *
                settings.intervalSeconds,

            bestCaseLoyalty:
              Math.max(
                0,
                starting -
                  nobleNumber *
                    maxReduction,
              ),

            expectedLoyalty:
              Math.max(
                0,
                starting -
                  nobleNumber *
                    averageReduction,
              ),

            worstCaseLoyalty:
              Math.max(
                0,
                starting -
                  nobleNumber *
                    minReduction,
              ),
          }
        },
      )

    return {
      averageReduction,
      bestCaseNobles,
      expectedNobles,
      safeNobles,
      selectedNobles,
      bestCaseFinalLoyalty,
      expectedFinalLoyalty,
      worstCaseFinalLoyalty,
      guaranteedConquest:
        worstCaseFinalLoyalty <=
        0,
      expectedConquest:
        expectedFinalLoyalty <=
        0,
      possibleConquest:
        bestCaseFinalLoyalty <=
        0,
      steps,
    }
  }
