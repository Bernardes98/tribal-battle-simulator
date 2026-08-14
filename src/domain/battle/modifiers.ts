import type {
  AttackerModifiers,
  DefenderModifiers,
} from '../../types/Battle'

export const calculateFaithMultiplier = (
  churchLevel: number,
): number => {
  if (churchLevel <= 0) {
    return 0.5
  }

  return 0.95 + churchLevel * 0.05
}

export const calculateAttackerOverallModifier = (
  modifiers: AttackerModifiers,
): number => {
  const faith = calculateFaithMultiplier(
    modifiers.churchLevel,
  )

  const morale = modifiers.morale / 100
  const luck = modifiers.luck / 100

  const grandmasterBonus =
    modifiers.grandmaster ? 0.1 : 0

  const weaponMasteryBonus =
    modifiers.weaponMasteryLevel * 0.02

  return (
    faith * morale * (1 + luck) +
    weaponMasteryBonus +
    grandmasterBonus
  )
}

export const calculateDefenderFaithMultiplier = (
  modifiers: DefenderModifiers,
): number => {
  return calculateFaithMultiplier(
    modifiers.churchLevel,
  )
}

export const formatMultiplier = (
  value: number,
): string => {
  return `${Math.round(value * 100)}%`
}