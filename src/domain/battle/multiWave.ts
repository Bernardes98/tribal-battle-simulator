import { units } from '../../data/units'

import type {
  Army,
  BattleResult,
  BattleSimulationInput,
} from '../../types/Battle'

import { simulateBattle } from './battleEngine'

export interface MultiWaveDefinition {
  id: string
  name: string
  army: Army
  luck: number
}

export interface MultiWaveOptions {
  includeDefenderRevivalBetweenWaves: boolean
}

export interface MultiWaveStepResult {
  wave: MultiWaveDefinition
  battleResult: BattleResult
  defenderBefore: Army
  defenderAfter: Army
  wallBefore: number
  wallAfter: number
  targetLevelBefore: number
  targetLevelAfter: number
}

export interface MultiWavePlanResult {
  steps: MultiWaveStepResult[]
  finalDefender: Army
  finalWallLevel: number
  finalTargetLevel: number
  clearedAtWave: number | null
}

const clampLuck = (
  luck: number,
): number => {
  if (!Number.isFinite(luck)) {
    return 0
  }

  return Math.max(
    -15,
    Math.min(15, luck),
  )
}

const cloneArmy = (
  army: Army,
): Army => ({
  ...army,
})

export const createEmptyArmy =
  (): Army => {
    return Object.fromEntries(
      units.map(
        (unit) => [
          unit.id,
          0,
        ],
      ),
    ) as Army
  }

export const calculateArmyUnitCount = (
  army: Army,
): number => {
  return units.reduce(
    (
      total,
      unit,
    ) =>
      total +
      (army[unit.id] ?? 0),
    0,
  )
}

export const calculateArmyProvisions = (
  army: Army,
): number => {
  return units.reduce(
    (
      total,
      unit,
    ) =>
      total +
      (army[unit.id] ?? 0) *
        unit.provisions,
    0,
  )
}

export const simulateMultiWavePlan = (
  input: BattleSimulationInput,
  waves: MultiWaveDefinition[],
  options: MultiWaveOptions,
): MultiWavePlanResult => {
  let currentDefender =
    cloneArmy(
      input.defender,
    )

  let currentWallLevel =
    input.defenderModifiers
      .wallLevel

  let currentTargetLevel =
    input.siegeSettings
      .catapultTargetLevel

  let clearedAtWave:
    number | null = null

  const steps:
    MultiWaveStepResult[] = []

  waves.forEach(
    (wave, index) => {
      const defenderBefore =
        cloneArmy(
          currentDefender,
        )

      const wallBefore =
        currentWallLevel

      const targetLevelBefore =
        currentTargetLevel

      const simulationInput:
        BattleSimulationInput = {
          ...input,

          attacker:
            cloneArmy(
              wave.army,
            ),

          defender:
            cloneArmy(
              currentDefender,
            ),

          attackerModifiers: {
            ...input.attackerModifiers,
            luck:
              clampLuck(
                wave.luck,
              ),
          },

          defenderModifiers: {
            ...input.defenderModifiers,
            wallLevel:
              currentWallLevel,
          },

          siegeSettings: {
            ...input.siegeSettings,
            catapultTargetLevel:
              currentTargetLevel,
          },
        }

      const battleResult =
        simulateBattle(
          simulationInput,
        )

      currentDefender =
        cloneArmy(
          options
            .includeDefenderRevivalBetweenWaves
            ? battleResult
                .defender
                .survivors
            : battleResult
                .defender
                .survivorsBeforeRevival,
        )

      currentWallLevel =
        battleResult.siege.wall
          .finalLevel

      currentTargetLevel =
        battleResult.siege
          .catapult.postLevel

      if (
        clearedAtWave === null &&
        battleResult.winner ===
          'attacker'
      ) {
        clearedAtWave =
          index + 1
      }

      steps.push({
        wave: {
          ...wave,
          army:
            cloneArmy(
              wave.army,
            ),
          luck:
            clampLuck(
              wave.luck,
            ),
        },

        battleResult,
        defenderBefore,
        defenderAfter:
          cloneArmy(
            currentDefender,
          ),
        wallBefore,
        wallAfter:
          currentWallLevel,
        targetLevelBefore,
        targetLevelAfter:
          currentTargetLevel,
      })
    },
  )

  return {
    steps,
    finalDefender:
      cloneArmy(
        currentDefender,
      ),
    finalWallLevel:
      currentWallLevel,
    finalTargetLevel:
      currentTargetLevel,
    clearedAtWave,
  }
}
