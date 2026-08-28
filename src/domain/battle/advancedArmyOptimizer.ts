import { units } from '../../data/units'

import {
  simulateBattle,
} from './battleEngine'

import type {
  ArmyOptimizerMode,
} from './armyOptimizer'

import type {
  Army,
  BattleResult,
  BattleSimulationInput,
} from '../../types/Battle'

import type {
  Unit,
  UnitId,
} from '../../types/Unit'

export const ADVANCED_OPTIMIZER_UNIT_IDS: UnitId[] = [
  'axe',
  'archer',
  'lightCavalry',
  'mountedArcher',
  'heavyCavalry',
  'berserker',
]

const FIXED_UNIT_IDS: UnitId[] = [
  'ram',
  'catapult',
  'trebuchet',
  'nobleman',
  'paladin',
]

const unitMap = Object.fromEntries(
  units.map((unit) => [
    unit.id,
    unit,
  ]),
) as Record<UnitId, Unit>

interface ArmyTemplate {
  name: string

  weights: Partial<
    Record<
      UnitId,
      number
    >
  >
}

export interface AdvancedArmyOptimizerOptions {
  mode: ArmyOptimizerMode

  unitIds: UnitId[]
}

export interface AdvancedArmyOptimizerResult {
  success: boolean

  mode: ArmyOptimizerMode

  luck: number

  recommendedArmy: Army | null

  currentProvisions: number
  recommendedProvisions: number

  provisionDifference: number

  simulations: number

  templatesTested: number

  winningTemplates: number

  bestTemplate: string | null

  battleResult: BattleResult | null

  message: string
}

const createEmptyArmy =
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

const calculateArmyProvisions = (
  army: Army,
): number => {
  return units.reduce(
    (
      total,
      unit,
    ) =>
      total +
      army[unit.id] *
        unit.provisions,
    0,
  )
}

const calculateDefenderProvisions = (
  input: BattleSimulationInput,
): number => {
  return calculateArmyProvisions(
    input.defender,
  )
}

const createFixedArmy = (
  sourceArmy: Army,
): Army => {
  const army =
    createEmptyArmy()

  FIXED_UNIT_IDS.forEach(
    (unitId) => {
      army[unitId] =
        sourceArmy[unitId]
    },
  )

  return army
}

const normalizeWeights = (
  weights: Partial<
    Record<
      UnitId,
      number
    >
  >,
): Partial<
  Record<
    UnitId,
    number
  >
> => {
  const total =
    Object.values(
      weights,
    ).reduce(
      (
        sum,
        value,
      ) =>
        sum +
        (value ?? 0),
      0,
    )

  if (total <= 0) {
    return {}
  }

  const normalized: Partial<
    Record<
      UnitId,
      number
    >
  > = {}

  Object.entries(
    weights,
  ).forEach(
    ([
      unitId,
      weight,
    ]) => {
      if (
        !weight ||
        weight <= 0
      ) {
        return
      }

      normalized[
        unitId as UnitId
      ] =
        weight /
        total
    },
  )

  return normalized
}

const createTemplateKey = (
  weights: Partial<
    Record<
      UnitId,
      number
    >
  >,
): string => {
  return Object.entries(
    weights,
  )
    .sort(
      (
        first,
        second,
      ) =>
        first[0].localeCompare(
          second[0],
        ),
    )
    .map(
      ([
        unitId,
        weight,
      ]) =>
        `${unitId}:${(
          weight ?? 0
        ).toFixed(4)}`,
    )
    .join('|')
}

const createTemplates = (
  input: BattleSimulationInput,
  selectedUnitIds: UnitId[],
): ArmyTemplate[] => {
  const templates:
    ArmyTemplate[] = []

  const templateKeys =
    new Set<string>()

  const addTemplate = (
    name: string,
    weights: Partial<
      Record<
        UnitId,
        number
      >
    >,
  ) => {
    const normalized =
      normalizeWeights(
        weights,
      )

    const key =
      createTemplateKey(
        normalized,
      )

    if (
      !key ||
      templateKeys.has(
        key,
      )
    ) {
      return
    }

    templateKeys.add(
      key,
    )

    templates.push({
      name,
      weights:
        normalized,
    })
  }

  /*
   * Composição utilizando
   * somente uma unidade.
   */
  selectedUnitIds.forEach(
    (unitId) => {
      addTemplate(
        `${unitMap[unitId].name} only`,
        {
          [unitId]: 1,
        },
      )
    },
  )

  /*
   * Combinações de duas unidades.
   *
   * Testamos:
   *
   * 75 / 25
   * 50 / 50
   * 25 / 75
   */
  for (
    let firstIndex = 0;
    firstIndex <
    selectedUnitIds.length;
    firstIndex += 1
  ) {
    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex <
      selectedUnitIds.length;
      secondIndex += 1
    ) {
      const firstUnitId =
        selectedUnitIds[
          firstIndex
        ]

      const secondUnitId =
        selectedUnitIds[
          secondIndex
        ]

      const firstUnit =
        unitMap[
          firstUnitId
        ]

      const secondUnit =
        unitMap[
          secondUnitId
        ]

      addTemplate(
        `${firstUnit.name} 75% / ${secondUnit.name} 25%`,
        {
          [firstUnitId]:
            0.75,

          [secondUnitId]:
            0.25,
        },
      )

      addTemplate(
        `${firstUnit.name} 50% / ${secondUnit.name} 50%`,
        {
          [firstUnitId]:
            0.5,

          [secondUnitId]:
            0.5,
        },
      )

      addTemplate(
        `${firstUnit.name} 25% / ${secondUnit.name} 75%`,
        {
          [firstUnitId]:
            0.25,

          [secondUnitId]:
            0.75,
        },
      )
    }
  }

  /*
   * Todas as unidades selecionadas
   * recebem o mesmo peso.
   */
  if (
    selectedUnitIds.length >
    1
  ) {
    const equalWeights: Partial<
      Record<
        UnitId,
        number
      >
    > = {}

    selectedUnitIds.forEach(
      (unitId) => {
        equalWeights[
          unitId
        ] = 1
      },
    )

    addTemplate(
      'Balanced composition',
      equalWeights,
    )
  }

  /*
   * Composição favorecendo unidades
   * com melhor ataque por provisão.
   */
  if (
    selectedUnitIds.length >
    1
  ) {
    const attackWeights: Partial<
      Record<
        UnitId,
        number
      >
    > = {}

    selectedUnitIds.forEach(
      (unitId) => {
        const unit =
          unitMap[
            unitId
          ]

        attackWeights[
          unitId
        ] =
          unit.attack /
          unit.provisions
      },
    )

    addTemplate(
      'Attack efficiency',
      attackWeights,
    )
  }

  /*
   * Também testamos a proporção
   * atualmente informada pelo usuário.
   */
  const currentTotalProvisions =
    selectedUnitIds.reduce(
      (
        total,
        unitId,
      ) =>
        total +
        input.attacker[
          unitId
        ] *
          unitMap[
            unitId
          ].provisions,
      0,
    )

  if (
    currentTotalProvisions >
    0
  ) {
    const currentWeights: Partial<
      Record<
        UnitId,
        number
      >
    > = {}

    selectedUnitIds.forEach(
      (unitId) => {
        currentWeights[
          unitId
        ] =
          (
            input.attacker[
              unitId
            ] *
            unitMap[
              unitId
            ].provisions
          ) /
          currentTotalProvisions
      },
    )

    addTemplate(
      'Current composition',
      currentWeights,
    )
  }

  return templates
}

const buildArmyFromBudget = (
  fixedArmy: Army,
  template: ArmyTemplate,
  provisionBudget: number,
): Army => {
  const army: Army = {
    ...fixedArmy,
  }

  Object.entries(
    template.weights,
  ).forEach(
    ([
      unitId,
      weight,
    ]) => {
      if (
        !weight ||
        weight <= 0
      ) {
        return
      }

      const typedUnitId =
        unitId as UnitId

      const unit =
        unitMap[
          typedUnitId
        ]

      const allocatedProvisions =
        provisionBudget *
        weight

      const quantity =
        Math.floor(
          allocatedProvisions /
            unit.provisions,
        )

      army[
        typedUnitId
      ] =
        Math.max(
          0,
          quantity,
        )
    },
  )

  return army
}

const buildSimulationInput = (
  input: BattleSimulationInput,
  attacker: Army,
  luck: number,
): BattleSimulationInput => {
  return {
    ...input,

    attacker,

    attackerModifiers: {
      ...input.attackerModifiers,

      luck,
    },
  }
}

const isVictory = (
  result: BattleResult,
): boolean => {
  return (
    result.winner ===
    'attacker'
  )
}

interface TemplateSearchResult {
  army: Army

  result: BattleResult

  provisions: number

  template: ArmyTemplate
}

export const optimizeArmyComposition = (
  input: BattleSimulationInput,
  options: AdvancedArmyOptimizerOptions,
): AdvancedArmyOptimizerResult => {
  const selectedUnitIds =
    ADVANCED_OPTIMIZER_UNIT_IDS.filter(
      (unitId) =>
        options.unitIds.includes(
          unitId,
        ),
    )

  const currentProvisions =
    calculateArmyProvisions(
      input.attacker,
    )

  const luck =
    options.mode ===
    'worstCase'
      ? -15
      : input.attackerModifiers
          .luck

  if (
    selectedUnitIds.length ===
    0
  ) {
    return {
      success: false,

      mode:
        options.mode,

      luck,

      recommendedArmy:
        null,

      currentProvisions,

      recommendedProvisions:
        0,

      provisionDifference:
        0,

      simulations: 0,

      templatesTested:
        0,

      winningTemplates:
        0,

      bestTemplate:
        null,

      battleResult:
        null,

      message:
        'Select at least one unit type before running the advanced optimizer.',
    }
  }

  const fixedArmy =
    createFixedArmy(
      input.attacker,
    )

  const templates =
    createTemplates(
      input,
      selectedUnitIds,
    )

  let simulations = 0

  let winningTemplates =
    0

  let best:
    TemplateSearchResult | null =
    null

  const defenderProvisions =
    calculateDefenderProvisions(
      input,
    )

  const maximumBudget =
    Math.max(
      2_000_000,

      defenderProvisions *
        10,
    )

  const simulate = (
    template: ArmyTemplate,
    budget: number,
  ) => {
    const army =
      buildArmyFromBudget(
        fixedArmy,
        template,
        budget,
      )

    const result =
      simulateBattle(
        buildSimulationInput(
          input,
          army,
          luck,
        ),
      )

    simulations += 1

    return {
      army,
      result,

      provisions:
        calculateArmyProvisions(
          army,
        ),

      template,
    }
  }

  templates.forEach(
    (template) => {
      /*
       * Primeiro verificamos se
       * somente as unidades fixas
       * já são suficientes.
       */
      const zeroBudget =
        simulate(
          template,
          0,
        )

      if (
        isVictory(
          zeroBudget.result,
        )
      ) {
        winningTemplates +=
          1

        if (
          !best ||
          zeroBudget.provisions <
            best.provisions
        ) {
          best =
            zeroBudget
        }

        return
      }

      let low = 0

      let high =
        Math.max(
          1000,

          defenderProvisions,
        )

      let highResult =
        simulate(
          template,
          high,
        )

      /*
       * Aumenta o orçamento até
       * encontrar uma vitória.
       */
      while (
        !isVictory(
          highResult.result,
        ) &&
        high <
          maximumBudget
      ) {
        low = high

        high =
          Math.min(
            maximumBudget,
            high * 2,
          )

        highResult =
          simulate(
            template,
            high,
          )

        if (
          high ===
            maximumBudget &&
          !isVictory(
            highResult.result,
          )
        ) {
          break
        }
      }

      if (
        !isVictory(
          highResult.result,
        )
      ) {
        return
      }

      winningTemplates +=
        1

      /*
       * Binary Search no orçamento
       * de provisões.
       */
      while (
        low + 1 <
        high
      ) {
        const middle =
          Math.floor(
            (
              low +
              high
            ) /
              2,
          )

        const middleResult =
          simulate(
            template,
            middle,
          )

        if (
          isVictory(
            middleResult.result,
          )
        ) {
          high =
            middle
        } else {
          low =
            middle
        }
      }

      /*
       * Pequeno refinamento para
       * compensar os arredondamentos
       * de quantidades das unidades.
       */
      const refinementStart =
        Math.max(
          0,
          high - 30,
        )

      const refinementEnd =
        high + 30

      let templateBest:
        TemplateSearchResult | null =
        null

      for (
        let budget =
          refinementStart;
        budget <=
        refinementEnd;
        budget += 1
      ) {
        const result =
          simulate(
            template,
            budget,
          )

        if (
          !isVictory(
            result.result,
          )
        ) {
          continue
        }

        if (
          !templateBest ||
          result.provisions <
            templateBest.provisions
        ) {
          templateBest =
            result
        }
      }

      if (
        !templateBest
      ) {
        templateBest =
          highResult
      }

      if (
        !best ||
        templateBest.provisions <
          best.provisions
      ) {
        best =
          templateBest

        return
      }

      /*
       * Em empate de provisões,
       * preferimos o exército que
       * mantém mais tropas vivas.
       */
      if (
        best &&
        templateBest.provisions ===
          best.provisions &&
        templateBest.result
          .attacker
          .survivingUnits >
          best.result
            .attacker
            .survivingUnits
      ) {
        best =
          templateBest
      }
    },
  )

  if (!best) {
    return {
      success: false,

      mode:
        options.mode,

      luck,

      recommendedArmy:
        null,

      currentProvisions,

      recommendedProvisions:
        0,

      provisionDifference:
        0,

      simulations,

      templatesTested:
        templates.length,

      winningTemplates,

      bestTemplate:
        null,

      battleResult:
        null,

      message:
        'No winning composition was found within the configured search limit.',
    }
  }

  const winningBest =
    best as TemplateSearchResult

  return {
    success: true,

    mode:
      options.mode,

    luck,

    recommendedArmy:
      winningBest.army,

    currentProvisions,

    recommendedProvisions:
      winningBest.provisions,

    provisionDifference:
      currentProvisions -
      winningBest.provisions,

    simulations,

    templatesTested:
      templates.length,

    winningTemplates,

    bestTemplate:
      winningBest.template.name,

    battleResult:
      winningBest.result,

    message:
      'A winning composition was found successfully.',
  }
}