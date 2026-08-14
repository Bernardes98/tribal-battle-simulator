export type BuildingId =
  | 'villageHeadquarters'
  | 'timberCamp'
  | 'clayPit'
  | 'ironMine'
  | 'farm'
  | 'warehouse'
  | 'church'
  | 'rallyPoint'
  | 'barracks'
  | 'statue'
  | 'wall'
  | 'market'
  | 'tavern'
  | 'academy'
  | 'hallOfOrders'

export interface Building {
  id: BuildingId
  name: string
  maxLevel: number
  hitPoints: number[]
}