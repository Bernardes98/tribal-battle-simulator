export type UnitId =
  | 'spearman'
  | 'swordsman'
  | 'axe'
  | 'archer'
  | 'lightCavalry'
  | 'mountedArcher'
  | 'heavyCavalry'
  | 'ram'
  | 'catapult'
  | 'berserker'
  | 'trebuchet'
  | 'nobleman'
  | 'paladin'

export type UnitCategory =
  | 'infantry'
  | 'cavalry'
  | 'siege'
  | 'special'

export interface UnitResources {
  wood: number
  clay: number
  iron: number
}

export interface Unit {
  id: UnitId
  name: string
  abbreviation: string

  category: UnitCategory

  provisions: number

  attack: number

  defenseGeneral: number
  defenseCavalry: number
  defenseArcher: number

  speedMinutes: number

  resources: UnitResources

  offensiveBashPoints: number
  defensiveBashPoints: number
}