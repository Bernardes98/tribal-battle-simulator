import {
  ADVANCED_OPTIMIZER_UNIT_IDS,
  optimizeArmyComposition,
} from './advancedArmyOptimizer'

import type {
  Army,
  BattleResult,
  BattleSimulationInput,
} from '../../types/Battle'

import type {
  UnitId,
} from '../../types/Unit'

export const SAFE_ATTACK_UNIT_IDS: UnitId[] = [
  ...ADVANCED_OPTIMIZER_UNIT_IDS,
]

export const DEFAULT_SAFE_ATTACK_UNIT_IDS: UnitId[] = [
  'axe',
  'lightCavalry',
  'mountedArcher',
  'heavyCavalry',
]

export interface SafeAttackKeepOptions {
  ram: boolean
  catapult: boolean
  trebuchet: boolean
  nobleman: boolean
  paladin: boolean
}

export interface SafeAttackOptions {
  minimumLuck: number
  unitIds: UnitId[]
  keepCurrent: SafeAttackKeepOptions
}

export interface SafeAttackResult {
  success: boolean
  minimumLuck: number
  recommendedArmy: Army | null
  recommendedProvisions: number
  simulations: number
  templatesTested: number
  bestTemplate: string | null
  battleResult: BattleResult | null
  message: string
}

const clampLuck = (
  luck: number,
): number => {
  if (!Number.isFinite(luck)) {
    return -15
  }

  return Math.max(
    -15,
    Math.min(15, luck),
  )
}

const createSafeAttackSourceArmy = (
  input: BattleSimulationInput,
  keepCurrent: SafeAttackKeepOptions,
): Army => {
  const army: Army = {
    ...input.attacker,
  }

  if (!keepCurrent.ram) {
    army.ram = 0
  }

  if (!keepCurrent.catapult) {
    army.catapult = 0
  }

  if (!keepCurrent.trebuchet) {
    army.trebuchet = 0
  }

  if (!keepCurrent.nobleman) {
    army.nobleman = 0
  }

  if (!keepCurrent.paladin) {
    army.paladin = 0
  }

  return army
}

export const findSafeAttack = (
  input: BattleSimulationInput,
  options: SafeAttackOptions,
): SafeAttackResult => {
  const minimumLuck =
    clampLuck(
      options.minimumLuck,
    )

  const selectedUnitIds =
    SAFE_ATTACK_UNIT_IDS.filter(
      (unitId) =>
        options.unitIds.includes(
          unitId,
        ),
    )

  if (
    selectedUnitIds.length === 0
  ) {
    return {
      success: false,
      minimumLuck,
      recommendedArmy: null,
      recommendedProvisions: 0,
      simulations: 0,
      templatesTested: 0,
      bestTemplate: null,
      battleResult: null,
      message:
        'Select at least one attacking unit type before searching for a safe attack.',
    }
  }

  const sourceArmy =
    createSafeAttackSourceArmy(
      input,
      options.keepCurrent,
    )

  const safeInput: BattleSimulationInput = {
    ...input,
    attacker: sourceArmy,
    attackerModifiers: {
      ...input.attackerModifiers,
      luck: minimumLuck,
    },
  }

  const optimization =
    optimizeArmyComposition(
      safeInput,
      {
        mode: 'currentLuck',
        unitIds:
          selectedUnitIds,
      },
    )

  return {
    success:
      optimization.success,
    minimumLuck,
    recommendedArmy:
      optimization.recommendedArmy,
    recommendedProvisions:
      optimization.recommendedProvisions,
    simulations:
      optimization.simulations,
    templatesTested:
      optimization.templatesTested,
    bestTemplate:
      optimization.bestTemplate,
    battleResult:
      optimization.battleResult,
    message:
      optimization.success
        ? 'Safe attack found for the configured minimum luck.'
        : optimization.message,
  }
}
