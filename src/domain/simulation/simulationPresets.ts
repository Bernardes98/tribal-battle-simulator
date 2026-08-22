import type {
  BattleSimulationInput,
} from '../../types/Battle'

export interface SimulationPreset {
  id: string
  name: string

  createdAt: string

  input: BattleSimulationInput
}

const STORAGE_KEY =
  'tribal-battle-simulator-presets'

const cloneSimulation = (
  input: BattleSimulationInput,
): BattleSimulationInput => {
  return JSON.parse(
    JSON.stringify(
      input,
    ),
  ) as BattleSimulationInput
}

const createId = (): string => {
  if (
    typeof crypto !==
      'undefined' &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID()
  }

  return `${
    Date.now()
  }-${Math.random()
    .toString(16)
    .slice(2)}`
}

export const getSimulationPresets =
  (): SimulationPreset[] => {
    try {
      const stored =
        localStorage.getItem(
          STORAGE_KEY,
        )

      if (!stored) {
        return []
      }

      const parsed: unknown =
        JSON.parse(stored)

      if (
        !Array.isArray(
          parsed,
        )
      ) {
        return []
      }

      return parsed as SimulationPreset[]
    } catch {
      return []
    }
  }

const persistPresets = (
  presets:
    SimulationPreset[],
) => {
  localStorage.setItem(
    STORAGE_KEY,

    JSON.stringify(
      presets,
    ),
  )
}

export const saveSimulationPreset = (
  name: string,

  input:
    BattleSimulationInput,
): SimulationPreset => {
  const presets =
    getSimulationPresets()

  const preset:
    SimulationPreset = {
      id: createId(),

      name:
        name.trim(),

      createdAt:
        new Date().toISOString(),

      input:
        cloneSimulation(
          input,
        ),
    }

  const updated = [
    preset,
    ...presets,
  ]

  persistPresets(
    updated,
  )

  return preset
}

export const deleteSimulationPreset = (
  presetId: string,
) => {
  const presets =
    getSimulationPresets()

  const updated =
    presets.filter(
      (preset) =>
        preset.id !==
        presetId,
    )

  persistPresets(
    updated,
  )
}