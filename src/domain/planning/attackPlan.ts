import type {
  AttackCandidateAnalysis,
} from '../intelligence/attackCandidateAnalyzer'

import type {
  SimulationHistorySource,
} from '../../services/simulationHistoryApi'

import type {
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

export interface AttackPlanTarget {
  villageKey: string
  playerName: string
  villageName: string
  x: number | null
  y: number | null
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
}

const generateId =
  (): string => {
    if (
      typeof crypto !==
        'undefined' &&
      'randomUUID' in
        crypto
    ) {
      return crypto.randomUUID()
    }

    return `plan-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`
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
        plans,
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

    const plan:
      AttackPlan = {
        id:
          generateId(),

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
          buildSimulationInput(
            currentInput,
            candidate,
          ),

        reportMetadata:
          village.latest
            .metadata,

        source:
          village.latest
            .source,
      }

    const plans =
      loadAttackPlans()

    saveAllAttackPlans([
      plan,
      ...plans,
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
          generateId(),
        createdAt:
          now,
        updatedAt:
          now,
        status:
          'PLANNED',
        plannedAt:
          '',
        note:
          source.note,
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
