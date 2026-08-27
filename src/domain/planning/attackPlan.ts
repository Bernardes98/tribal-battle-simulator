import type {
  AttackCandidateAnalysis,
} from '../intelligence/attackCandidateAnalyzer'

import type {
  SimulationHistorySource,
} from '../../services/simulationHistoryApi'

import type {
  Army,
  BattleSimulationInput,
} from '../../types/Battle'

import type {
  ReportMetadata,
} from '../../types/ReportMetadata'

export const ATTACK_PLAN_CHANGED_EVENT =
  'tribal-battle-attack-plan-changed'

const STORAGE_KEY =
  'tribal-battle-attack-plans-v1'

export type AttackPlanStatus =
  | 'PLANNED'
  | 'READY'
  | 'SENT'
  | 'COMPLETED'
  | 'CANCELLED'

export type AttackPlanObjective =
  | 'CLEAR_DEFENSE'
  | 'BREAK_WALL'
  | 'DESTROY_BUILDING'
  | 'CONQUER'
  | 'FARM'
  | 'SCOUT'
  | 'CUSTOM'

export type AttackPlanWaveStatus =
  | 'PLANNED'
  | 'READY'
  | 'SENT'
  | 'COMPLETED'
  | 'CANCELLED'

export const ATTACK_PLAN_STATUSES:
  AttackPlanStatus[] = [
    'PLANNED',
    'READY',
    'SENT',
    'COMPLETED',
    'CANCELLED',
  ]

export const ATTACK_PLAN_OBJECTIVES:
  AttackPlanObjective[] = [
    'CLEAR_DEFENSE',
    'BREAK_WALL',
    'DESTROY_BUILDING',
    'CONQUER',
    'FARM',
    'SCOUT',
    'CUSTOM',
  ]

export const ATTACK_PLAN_WAVE_STATUSES:
  AttackPlanWaveStatus[] = [
    'PLANNED',
    'READY',
    'SENT',
    'COMPLETED',
    'CANCELLED',
  ]

export interface AttackPlanTarget {
  villageKey: string
  playerName: string
  villageName: string
  x: number | null
  y: number | null
}

export interface AttackPlanWave {
  id: string
  order: number
  label: string
  objective: AttackPlanObjective
  status: AttackPlanWaveStatus
  offsetSeconds: number
  note: string
  simulationInput: BattleSimulationInput
}

export interface AttackPlan {
  id: string
  createdAt: string
  updatedAt: string
  plannedAt: string
  status: AttackPlanStatus
  objective: AttackPlanObjective
  note: string
  target: AttackPlanTarget
  targetScore: number
  targetRank: number
  candidateStatus: string
  expectedWinner:
    | 'attacker'
    | 'defender'
    | 'draw'
  expectedAttackerLossPercent: number
  expectedDefenderLossPercent: number
  simulationInput: BattleSimulationInput
  reportMetadata: ReportMetadata | null
  source: SimulationHistorySource
  waves: AttackPlanWave[]
}

const generateId =
  (prefix: string): string => {
    if (
      typeof crypto !==
        'undefined' &&
      'randomUUID' in
        crypto
    ) {
      return `${prefix}-${crypto.randomUUID()}`
    }

    return `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`
  }

const cloneInput =
  (
    input:
      BattleSimulationInput,
  ): BattleSimulationInput => {
    return {
      attacker: {
        ...input.attacker,
      },

      defender: {
        ...input.defender,
      },

      attackerModifiers: {
        ...input.attackerModifiers,
      },

      defenderModifiers: {
        ...input.defenderModifiers,
      },

      attackerPaladinWeapons: {
        ...input.attackerPaladinWeapons,
      },

      defenderPaladinWeapons: {
        ...input.defenderPaladinWeapons,
      },

      siegeSettings: {
        ...input.siegeSettings,
      },
    }
  }

const createEmptyArmy =
  (
    reference:
      Army,
  ): Army => {
    return Object.fromEntries(
      Object.keys(
        reference,
      ).map(
        (unitId) => [
          unitId,
          0,
        ],
      ),
    ) as Army
  }

const createWave =
  (
    simulationInput:
      BattleSimulationInput,
    order: number,
    objective:
      AttackPlanObjective,
    label?: string,
  ): AttackPlanWave => {
    return {
      id:
        generateId(
          'wave',
        ),

      order,

      label:
        label ??
        `Wave ${order}`,

      objective,

      status:
        'PLANNED',

      offsetSeconds:
        Math.max(
          0,
          (
            order -
            1
          ) *
            5,
        ),

      note:
        '',

      simulationInput:
        cloneInput(
          simulationInput,
        ),
    }
  }

const normalizeWaves =
  (
    value:
      Partial<AttackPlan>,
  ): AttackPlanWave[] => {
    if (
      Array.isArray(
        value.waves,
      ) &&
      value.waves.length >
        0
    ) {
      return value.waves
        .filter(
          (
            wave,
          ): wave is AttackPlanWave =>
            Boolean(
              wave &&
                typeof wave ===
                  'object' &&
                typeof wave.id ===
                  'string' &&
                typeof wave.simulationInput ===
                  'object',
            ),
        )
        .sort(
          (
            left,
            right,
          ) =>
            left.order -
            right.order,
        )
        .map(
          (
            wave,
            index,
          ) => ({
            ...wave,
            order:
              index + 1,
            label:
              typeof wave.label ===
                'string' &&
              wave.label.trim()
                ? wave.label.slice(
                    0,
                    80,
                  )
                : `Wave ${index + 1}`,
            note:
              typeof wave.note ===
                'string'
                ? wave.note.slice(
                    0,
                    1000,
                  )
                : '',
            offsetSeconds:
              Math.max(
                0,
                Math.round(
                  Number(
                    wave.offsetSeconds,
                  ) || 0,
                ),
              ),
            simulationInput:
              cloneInput(
                wave.simulationInput,
              ),
          }),
        )
    }

    if (
      value.simulationInput
    ) {
      return [
        createWave(
          value.simulationInput,
          1,
          value.objective ??
            'CLEAR_DEFENSE',
          'Main Wave',
        ),
      ]
    }

    return []
  }

const normalizePlan =
  (
    value:
      AttackPlan,
  ): AttackPlan => {
    return {
      ...value,
      note:
        typeof value.note ===
          'string'
          ? value.note.slice(
              0,
              1000,
            )
          : '',
      simulationInput:
        cloneInput(
          value.simulationInput,
        ),
      waves:
        normalizeWaves(
          value,
        ),
    }
  }

const emitChange =
  (): void => {
    if (
      typeof window ===
      'undefined'
    ) {
      return
    }

    window.dispatchEvent(
      new CustomEvent(
        ATTACK_PLAN_CHANGED_EVENT,
      ),
    )
  }

export const loadAttackPlans =
  (): AttackPlan[] => {
    if (
      typeof window ===
      'undefined'
    ) {
      return []
    }

    try {
      const raw =
        window.localStorage.getItem(
          STORAGE_KEY,
        )

      if (!raw) {
        return []
      }

      const parsed =
        JSON.parse(
          raw,
        ) as unknown

      if (
        !Array.isArray(
          parsed,
        )
      ) {
        return []
      }

      return parsed
        .filter(
          (
            value,
          ): value is AttackPlan =>
            Boolean(
              value &&
                typeof value ===
                  'object' &&
                typeof (
                  value as AttackPlan
                ).id ===
                  'string' &&
                typeof (
                  value as AttackPlan
                ).createdAt ===
                  'string' &&
                typeof (
                  value as AttackPlan
                ).target ===
                  'object' &&
                typeof (
                  value as AttackPlan
                ).simulationInput ===
                  'object',
            ),
        )
        .map(
          normalizePlan,
        )
        .sort(
          (
            left,
            right,
          ) =>
            new Date(
              right.updatedAt,
            ).getTime() -
            new Date(
              left.updatedAt,
            ).getTime(),
        )
    } catch {
      return []
    }
  }

const saveAllAttackPlans =
  (
    plans:
      AttackPlan[],
  ): void => {
    if (
      typeof window ===
      'undefined'
    ) {
      return
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        plans.map(
          normalizePlan,
        ),
      ),
    )

    emitChange()
  }

const buildSimulationInput =
  (
    currentInput:
      BattleSimulationInput,
    candidate:
      AttackCandidateAnalysis,
  ): BattleSimulationInput => {
    const targetInput =
      candidate.ranking
        .entry
        .village
        .latest
        .input

    return {
      attacker: {
        ...currentInput.attacker,
      },

      defender: {
        ...targetInput.defender,
      },

      attackerModifiers: {
        ...currentInput.attackerModifiers,
      },

      defenderModifiers: {
        ...targetInput.defenderModifiers,
      },

      attackerPaladinWeapons: {
        ...currentInput.attackerPaladinWeapons,
      },

      defenderPaladinWeapons: {
        ...targetInput.defenderPaladinWeapons,
      },

      siegeSettings: {
        ...currentInput.siegeSettings,
      },
    }
  }

export const addAttackPlanFromCandidate =
  (
    currentInput:
      BattleSimulationInput,
    candidate:
      AttackCandidateAnalysis,
  ): AttackPlan => {
    const village =
      candidate.ranking
        .entry
        .village

    const now =
      new Date().toISOString()

    const simulationInput =
      buildSimulationInput(
        currentInput,
        candidate,
      )

    const plan:
      AttackPlan = {
        id:
          generateId(
            'plan',
          ),

        createdAt:
          now,

        updatedAt:
          now,

        plannedAt:
          '',

        status:
          'PLANNED',

        objective:
          'CLEAR_DEFENSE',

        note:
          '',

        target: {
          villageKey:
            village.key,
          playerName:
            village.playerName,
          villageName:
            village.villageName,
          x:
            village.x,
          y:
            village.y,
        },

        targetScore:
          candidate.targetScore,

        targetRank:
          candidate.rank,

        candidateStatus:
          candidate.statusLabel,

        expectedWinner:
          candidate.current
            .result
            .winner,

        expectedAttackerLossPercent:
          candidate.current
            .attackerLossPercent,

        expectedDefenderLossPercent:
          candidate.current
            .defenderLossPercent,

        simulationInput:
          cloneInput(
            simulationInput,
          ),

        reportMetadata:
          village.latest
            .metadata,

        source:
          village.latest
            .source,

        waves: [
          createWave(
            simulationInput,
            1,
            'CLEAR_DEFENSE',
            'Main Wave',
          ),
        ],
      }

    saveAllAttackPlans([
      plan,
      ...loadAttackPlans(),
    ])

    return plan
  }

export const updateAttackPlan =
  (
    planId: string,
    patch:
      Partial<
        Pick<
          AttackPlan,
          | 'plannedAt'
          | 'status'
          | 'objective'
          | 'note'
        >
      >,
  ): AttackPlan | null => {
    const plans =
      loadAttackPlans()

    let updated:
      AttackPlan | null =
        null

    const next =
      plans.map(
        (plan) => {
          if (
            plan.id !==
            planId
          ) {
            return plan
          }

          updated = {
            ...plan,
            ...patch,
            note:
              patch.note !==
              undefined
                ? patch.note.slice(
                    0,
                    1000,
                  )
                : plan.note,
            updatedAt:
              new Date().toISOString(),
          }

          return updated
        },
      )

    saveAllAttackPlans(
      next,
    )

    return updated
  }

const updatePlanWaves =
  (
    planId: string,
    updater:
      (
        plan:
          AttackPlan,
      ) =>
        AttackPlanWave[],
  ): AttackPlan | null => {
    const plans =
      loadAttackPlans()

    let updated:
      AttackPlan | null =
        null

    const next =
      plans.map(
        (plan) => {
          if (
            plan.id !==
            planId
          ) {
            return plan
          }

          const waves =
            updater(
              plan,
            )
              .sort(
                (
                  left,
                  right,
                ) =>
                  left.order -
                  right.order,
              )
              .map(
                (
                  wave,
                  index,
                ) => ({
                  ...wave,
                  order:
                    index + 1,
                }),
              )

          updated = {
            ...plan,
            waves,
            updatedAt:
              new Date().toISOString(),
          }

          return updated
        },
      )

    saveAllAttackPlans(
      next,
    )

    return updated
  }

export const addAttackPlanWave =
  (
    planId: string,
    currentInput:
      BattleSimulationInput,
  ): AttackPlan | null => {
    return updatePlanWaves(
      planId,
      (plan) => {
        const order =
          plan.waves.length +
          1

        const waveInput:
          BattleSimulationInput = {
          attacker: {
            ...currentInput.attacker,
          },

          defender: {
            ...plan.simulationInput.defender,
          },

          attackerModifiers: {
            ...currentInput.attackerModifiers,
          },

          defenderModifiers: {
            ...plan.simulationInput.defenderModifiers,
          },

          attackerPaladinWeapons: {
            ...currentInput.attackerPaladinWeapons,
          },

          defenderPaladinWeapons: {
            ...plan.simulationInput.defenderPaladinWeapons,
          },

          siegeSettings: {
            ...currentInput.siegeSettings,
          },
        }

        return [
          ...plan.waves,
          createWave(
            waveInput,
            order,
            'CLEAR_DEFENSE',
          ),
        ]
      },
    )
  }

export const duplicateAttackPlanWave =
  (
    planId: string,
    waveId: string,
  ): AttackPlan | null => {
    return updatePlanWaves(
      planId,
      (plan) => {
        const index =
          plan.waves.findIndex(
            (wave) =>
              wave.id ===
              waveId,
          )

        if (
          index <
          0
        ) {
          return plan.waves
        }

        const source =
          plan.waves[
            index
          ]

        const duplicate:
          AttackPlanWave = {
          ...source,
          id:
            generateId(
              'wave',
            ),
          label:
            `${source.label} Copy`.slice(
              0,
              80,
            ),
          status:
            'PLANNED',
          simulationInput:
            cloneInput(
              source.simulationInput,
            ),
        }

        const next = [
          ...plan.waves,
        ]

        next.splice(
          index + 1,
          0,
          duplicate,
        )

        return next
      },
    )
  }

export const removeAttackPlanWave =
  (
    planId: string,
    waveId: string,
  ): AttackPlan | null => {
    return updatePlanWaves(
      planId,
      (plan) => {
        if (
          plan.waves.length <=
          1
        ) {
          return plan.waves
        }

        return plan.waves.filter(
          (wave) =>
            wave.id !==
            waveId,
        )
      },
    )
  }

export const moveAttackPlanWave =
  (
    planId: string,
    waveId: string,
    direction:
      | 'UP'
      | 'DOWN',
  ): AttackPlan | null => {
    return updatePlanWaves(
      planId,
      (plan) => {
        const next = [
          ...plan.waves,
        ]

        const index =
          next.findIndex(
            (wave) =>
              wave.id ===
              waveId,
          )

        if (
          index <
          0
        ) {
          return next
        }

        const targetIndex =
          direction ===
          'UP'
            ? index - 1
            : index + 1

        if (
          targetIndex <
            0 ||
          targetIndex >=
            next.length
        ) {
          return next
        }

        const current =
          next[
            index
          ]

        next[
          index
        ] =
          next[
            targetIndex
          ]

        next[
          targetIndex
        ] =
          current

        return next
      },
    )
  }

export const updateAttackPlanWave =
  (
    planId: string,
    waveId: string,
    patch:
      Partial<
        Pick<
          AttackPlanWave,
          | 'label'
          | 'objective'
          | 'status'
          | 'offsetSeconds'
          | 'note'
        >
      >,
  ): AttackPlan | null => {
    return updatePlanWaves(
      planId,
      (plan) =>
        plan.waves.map(
          (wave) => {
            if (
              wave.id !==
              waveId
            ) {
              return wave
            }

            return {
              ...wave,
              ...patch,
              label:
                patch.label !==
                undefined
                  ? patch.label.slice(
                      0,
                      80,
                    )
                  : wave.label,
              note:
                patch.note !==
                undefined
                  ? patch.note.slice(
                      0,
                      1000,
                    )
                  : wave.note,
              offsetSeconds:
                patch.offsetSeconds !==
                undefined
                  ? Math.max(
                      0,
                      Math.round(
                        patch.offsetSeconds,
                      ),
                    )
                  : wave.offsetSeconds,
            }
          },
        ),
    )
  }

export const updateAttackPlanWaveArmy =
  (
    planId: string,
    waveId: string,
    army: Army,
  ): AttackPlan | null => {
    return updatePlanWaves(
      planId,
      (plan) =>
        plan.waves.map(
          (wave) =>
            wave.id ===
            waveId
              ? {
                  ...wave,
                  simulationInput: {
                    ...wave.simulationInput,
                    attacker: {
                      ...army,
                    },
                  },
                }
              : wave,
        ),
    )
  }

export const clearAttackPlanWaveArmy =
  (
    planId: string,
    waveId: string,
  ): AttackPlan | null => {
    const plan =
      loadAttackPlans().find(
        (value) =>
          value.id ===
          planId,
      )

    const wave =
      plan?.waves.find(
        (value) =>
          value.id ===
          waveId,
      )

    if (
      !plan ||
      !wave
    ) {
      return null
    }

    return updateAttackPlanWaveArmy(
      planId,
      waveId,
      createEmptyArmy(
        wave.simulationInput
          .attacker,
      ),
    )
  }

export const replaceAttackPlanWaveFromCurrent =
  (
    planId: string,
    waveId: string,
    currentInput:
      BattleSimulationInput,
  ): AttackPlan | null => {
    return updatePlanWaves(
      planId,
      (plan) =>
        plan.waves.map(
          (wave) => {
            if (
              wave.id !==
              waveId
            ) {
              return wave
            }

            return {
              ...wave,
              simulationInput: {
                attacker: {
                  ...currentInput.attacker,
                },

                defender: {
                  ...plan.simulationInput.defender,
                },

                attackerModifiers: {
                  ...currentInput.attackerModifiers,
                },

                defenderModifiers: {
                  ...plan.simulationInput.defenderModifiers,
                },

                attackerPaladinWeapons: {
                  ...currentInput.attackerPaladinWeapons,
                },

                defenderPaladinWeapons: {
                  ...plan.simulationInput.defenderPaladinWeapons,
                },

                siegeSettings: {
                  ...currentInput.siegeSettings,
                },
              },
            }
          },
        ),
    )
  }

export interface NobleTrainWaveOptions {
  count: number
  firstOffsetSeconds: number
  intervalSeconds: number
  useCurrentArmyAsEscort: boolean
}

export const addNobleTrainWaves =
  (
    planId: string,
    currentInput:
      BattleSimulationInput,
    options:
      NobleTrainWaveOptions,
  ): AttackPlan | null => {
    return updatePlanWaves(
      planId,
      (plan) => {
        const count =
          Math.max(
            1,
            Math.min(
              20,
              Math.round(
                options.count,
              ),
            ),
          )

        const firstOffsetSeconds =
          Math.max(
            0,
            Math.round(
              options.firstOffsetSeconds,
            ),
          )

        const intervalSeconds =
          Math.max(
            1,
            Math.round(
              options.intervalSeconds,
            ),
          )

        const waves:
          AttackPlanWave[] =
          Array.from(
            {
              length:
                count,
            },
            (
              _,
              index,
            ) => {
              const attacker =
                options.useCurrentArmyAsEscort
                  ? {
                      ...currentInput.attacker,
                    }
                  : createEmptyArmy(
                      currentInput.attacker,
                    )

              attacker[
                'nobleman'
              ] = 1

              const waveInput:
                BattleSimulationInput = {
                attacker,

                defender: {
                  ...plan.simulationInput.defender,
                },

                attackerModifiers: {
                  ...currentInput.attackerModifiers,
                },

                defenderModifiers: {
                  ...plan.simulationInput.defenderModifiers,
                },

                attackerPaladinWeapons: {
                  ...currentInput.attackerPaladinWeapons,
                },

                defenderPaladinWeapons: {
                  ...plan.simulationInput.defenderPaladinWeapons,
                },

                siegeSettings: {
                  ...currentInput.siegeSettings,
                },
              }

              const wave =
                createWave(
                  waveInput,
                  plan.waves.length +
                    index +
                    1,
                  'CONQUER',
                  `Noble ${index + 1}`,
                )

              return {
                ...wave,

                offsetSeconds:
                  firstOffsetSeconds +
                  index *
                    intervalSeconds,

                note:
                  `Noble train ${index + 1}/${count}`,
              }
            },
          )

        return [
          ...plan.waves,
          ...waves,
        ]
      },
    )
  }

export const removeAttackPlan =
  (
    planId: string,
  ): void => {
    saveAllAttackPlans(
      loadAttackPlans().filter(
        (plan) =>
          plan.id !==
          planId,
      ),
    )
  }

export const duplicateAttackPlan =
  (
    planId: string,
  ): AttackPlan | null => {
    const source =
      loadAttackPlans().find(
        (plan) =>
          plan.id ===
          planId,
      )

    if (!source) {
      return null
    }

    const now =
      new Date().toISOString()

    const duplicate:
      AttackPlan = {
        ...source,
        id:
          generateId(
            'plan',
          ),
        createdAt:
          now,
        updatedAt:
          now,
        status:
          'PLANNED',
        plannedAt:
          '',
        waves:
          source.waves.map(
            (
              wave,
              index,
            ) => ({
              ...wave,
              id:
                generateId(
                  'wave',
                ),
              order:
                index + 1,
              status:
                'PLANNED',
              simulationInput:
                cloneInput(
                  wave.simulationInput,
                ),
            }),
          ),
      }

    saveAllAttackPlans([
      duplicate,
      ...loadAttackPlans(),
    ])

    return duplicate
  }

export const clearFinishedAttackPlans =
  (): void => {
    saveAllAttackPlans(
      loadAttackPlans().filter(
        (plan) =>
          plan.status !==
            'COMPLETED' &&
          plan.status !==
            'CANCELLED',
      ),
    )
  }

export const attackPlanObjectiveLabel =
  (
    objective:
      AttackPlanObjective,
  ): string => {
    const labels:
      Record<
        AttackPlanObjective,
        string
      > = {
      CLEAR_DEFENSE:
        'Clear Defense',
      BREAK_WALL:
        'Break Wall',
      DESTROY_BUILDING:
        'Destroy Building',
      CONQUER:
        'Conquer / Noble',
      FARM:
        'Farm',
      SCOUT:
        'Scout',
      CUSTOM:
        'Custom',
    }

    return labels[
      objective
    ]
  }

export const attackPlanStatusLabel =
  (
    status:
      AttackPlanStatus,
  ): string => {
    const labels:
      Record<
        AttackPlanStatus,
        string
      > = {
      PLANNED:
        'Planned',
      READY:
        'Ready',
      SENT:
        'Sent',
      COMPLETED:
        'Completed',
      CANCELLED:
        'Cancelled',
    }

    return labels[
      status
    ]
  }

export const attackPlanWaveStatusLabel =
  (
    status:
      AttackPlanWaveStatus,
  ): string => {
    return attackPlanStatusLabel(
      status,
    )
  }
