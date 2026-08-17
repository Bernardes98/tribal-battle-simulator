import type {
  BuildingId,
} from './Building'

import type {
  UnitId,
} from './Unit'

export type Army = Record<
  UnitId,
  number
>

export interface AttackerModifiers {
  churchLevel: number
  morale: number
  luck: number
  grandmaster: boolean
  weaponMasteryLevel: number
  medicLevel: number
  medicusLevel: number
}

export interface DefenderModifiers {
  churchLevel: number
  hospitalLevel: number
  clinicLevel: number
  ironWallLevel: number
  wallLevel: number
}

export interface PaladinWeaponLevels {
  spearman: number
  swordsman: number
  axe: number
  archer: number
  lightCavalry: number
  mountedArcher: number
  heavyCavalry: number
  ram: number
  catapult: number
  berserker: number
}

export interface SiegeSettings {
  catapultTarget: BuildingId
  catapultTargetLevel: number
}

export type CombatGroup =
  | 'infantry'
  | 'cavalry'
  | 'archer'

export type BattleWinner =
  | 'attacker'
  | 'defender'
  | 'draw'

export interface BattleSimulationInput {
  attacker: Army
  defender: Army

  attackerModifiers: AttackerModifiers
  defenderModifiers: DefenderModifiers

  attackerPaladinWeapons: PaladinWeaponLevels
  defenderPaladinWeapons: PaladinWeaponLevels

  siegeSettings: SiegeSettings
}

export interface CombatGroupResult {
  group: CombatGroup

  attackStrength: number
  defenseStrength: number

  attackerLossRate: number
  defenderLossRate: number
}

export interface ResourceTotals {
  wood: number
  clay: number
  iron: number
}

export interface ArmyValueSummary {
  provisions: number
  bashPoints: number
  resources: ResourceTotals
}

export interface BattleSideResult {
  initialArmy: Army

  losses: Army
  revived: Army

  survivorsBeforeRevival: Army
  survivors: Army

  initialUnits: number
  lostUnits: number
  revivedUnits: number
  survivingUnits: number

  initialProvisions: number
  lostProvisions: number
  revivedProvisions: number
  survivingProvisions: number

  initialValue: ArmyValueSummary
  lostValue: ArmyValueSummary
  revivedValue: ArmyValueSummary
  survivingValue: ArmyValueSummary
}

export interface WallResult {
  startingLevel: number
  preBattleLevel: number
  postBattleLevel: number
  finalLevel: number
}

export interface CatapultResult {
  target: BuildingId
  targetName: string

  startingLevel: number
  postLevel: number

  attackStrength: number
  targetHitPoints: number
  damageLevels: number
}

export interface SiegeResult {
  wall: WallResult
  catapult: CatapultResult
}

export interface BattleResult {
  winner: BattleWinner

  attackStrength: number
  defenseStrength: number

  attacker: BattleSideResult
  defender: BattleSideResult

  groups: CombatGroupResult[]

  siege: SiegeResult

  warnings: string[]
}