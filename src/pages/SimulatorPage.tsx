import {
  useEffect,
  useState,
} from 'react'

import AdvancedArmyOptimizerPanel from '../components/battle/AdvancedArmyOptimizerPanel'
import ArmyOptimizerPanel from '../components/battle/ArmyOptimizerPanel'
import BattleQuickActions from '../components/battle/BattleQuickActions'
import BattleResultPanel from '../components/battle/BattleResultPanel'
import BattleSetupTable from '../components/battle/BattleSetupTable'
import CatapultPlannerPanel from '../components/battle/CatapultPlannerPanel'
import LuckAnalysisPanel from '../components/battle/LuckAnalysisPanel'
import MultiWavePlannerPanel from '../components/battle/MultiWavePlannerPanel'
import WallRamPlannerPanel from '../components/battle/WallRamPlannerPanel'
import SimulationToolsPanel from '../components/battle/SimulationToolsPanel'
import ReportScreenshotImportPanel from '../components/battle/ReportScreenshotImportPanel'
import SafeAttackPanel from '../components/battle/SafeAttackPanel'
import SimulationHistoryPanel from '../components/history/SimulationHistoryPanel'
import ArmyLibraryPanel from '../components/library/ArmyLibraryPanel'
import PlayerVillageIntelligencePanel from '../components/intelligence/PlayerVillageIntelligencePanel'
import VillageIntelligenceOverviewPanel from '../components/intelligence/VillageIntelligenceOverviewPanel'
import WatchlistDashboardPanel from '../components/intelligence/WatchlistDashboardPanel'
import TargetRankingDashboardPanel from '../components/intelligence/TargetRankingDashboardPanel'
import AttackCandidateAnalyzerPanel from '../components/intelligence/AttackCandidateAnalyzerPanel'
import AttackPlanQueuePanel from '../components/planning/AttackPlanQueuePanel'

import { units } from '../data/units'

import {
  optimizeArmyComposition,
} from '../domain/battle/advancedArmyOptimizer'

import type {
  AdvancedArmyOptimizerResult,
} from '../domain/battle/advancedArmyOptimizer'

import {
  optimizeArmy,
} from '../domain/battle/armyOptimizer'

import type {
  ArmyOptimizerMode,
  ArmyOptimizerResult,
} from '../domain/battle/armyOptimizer'

import {
  simulateBattle,
} from '../domain/battle/battleEngine'

import {
  analyzeLuckScenarios,
} from '../domain/battle/luckAnalysis'

import type {
  LuckAnalysisResult,
} from '../domain/battle/luckAnalysis'

import {
  findSafeAttack,
} from '../domain/battle/safeAttack'

import type {
  SafeAttackOptions,
  SafeAttackResult,
} from '../domain/battle/safeAttack'

import type {
  CatapultPlannerResult,
} from '../domain/battle/catapultPlanner'

import type {
  WallRamPlannerResult,
} from '../domain/battle/wallRamPlanner'

import {
  readLegacySimulationFromUrl,
  readSharedSimulationCodeFromUrl,
} from '../domain/simulation/simulationShare'

import {
  getSharedSimulation,
} from '../services/sharedSimulationApi'

import {
  createSimulationHistory,
} from '../services/simulationHistoryApi'

import type {
  SimulationHistorySource,
} from '../services/simulationHistoryApi'

import type {
  Army,
  AttackerModifiers,
  BattleResult,
  BattleSimulationInput,
  DefenderModifiers,
  PaladinWeaponLevels,
  SiegeSettings,
} from '../types/Battle'

import type {
  UnitId,
} from '../types/Unit'

import type {
  ReportMetadata,
} from '../types/ReportMetadata'

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

const createEmptyPaladinWeapons =
  (): PaladinWeaponLevels => ({
    spearman: 0,
    swordsman: 0,
    axe: 0,
    archer: 0,
    lightCavalry: 0,
    mountedArcher: 0,
    heavyCavalry: 0,
    ram: 0,
    catapult: 0,
    berserker: 0,
  })

const createInitialAttackerModifiers =
  (): AttackerModifiers => ({
    churchLevel: 0,
    morale: 100,
    luck: 0,
    grandmaster: false,
    weaponMasteryLevel: 0,
    medicLevel: 0,
    medicusLevel: 0,
  })

const createInitialDefenderModifiers =
  (): DefenderModifiers => ({
    churchLevel: 0,
    hospitalLevel: 0,
    clinicLevel: 0,
    ironWallLevel: 0,
    wallLevel: 0,
  })

const createInitialSiegeSettings =
  (): SiegeSettings => ({
    catapultTarget: 'farm',
    catapultTargetLevel: 0,
  })

function SimulatorPage() {
  const [
    attacker,
    setAttacker,
  ] = useState<Army>(
    createEmptyArmy,
  )

  const [
    defender,
    setDefender,
  ] = useState<Army>(
    createEmptyArmy,
  )

  const [
    attackerModifiers,
    setAttackerModifiers,
  ] = useState<AttackerModifiers>(
    createInitialAttackerModifiers,
  )

  const [
    defenderModifiers,
    setDefenderModifiers,
  ] = useState<DefenderModifiers>(
    createInitialDefenderModifiers,
  )

  const [
    attackerPaladinWeapons,
    setAttackerPaladinWeapons,
  ] = useState<PaladinWeaponLevels>(
    createEmptyPaladinWeapons,
  )

  const [
    defenderPaladinWeapons,
    setDefenderPaladinWeapons,
  ] = useState<PaladinWeaponLevels>(
    createEmptyPaladinWeapons,
  )

  const [
    siegeSettings,
    setSiegeSettings,
  ] = useState<SiegeSettings>(
    createInitialSiegeSettings,
  )

  const [
    battleResult,
    setBattleResult,
  ] = useState<BattleResult | null>(
    null,
  )

  const [
    luckAnalysis,
    setLuckAnalysis,
  ] = useState<LuckAnalysisResult | null>(
    null,
  )

  const [
    optimizerResult,
    setOptimizerResult,
  ] = useState<ArmyOptimizerResult | null>(
    null,
  )

  const [
    advancedOptimizerResult,
    setAdvancedOptimizerResult,
  ] = useState<AdvancedArmyOptimizerResult | null>(
    null,
  )

  const [
    safeAttackResult,
    setSafeAttackResult,
  ] = useState<SafeAttackResult | null>(
    null,
  )

  const [
    sharedSimulationLoading,
    setSharedSimulationLoading,
  ] = useState(false)

  const [
    sharedSimulationError,
    setSharedSimulationError,
  ] = useState<string | null>(
    null,
  )

  const [
    historySource,
    setHistorySource,
  ] = useState<SimulationHistorySource>(
    'MANUAL',
  )

  const [
    reportMetadata,
    setReportMetadata,
  ] = useState<ReportMetadata | null>(
    null,
  )

  const [
    historyRefreshToken,
    setHistoryRefreshToken,
  ] = useState(0)

  const clearResults = () => {
    setBattleResult(null)
    setLuckAnalysis(null)
    setOptimizerResult(null)
    setAdvancedOptimizerResult(null)
    setSafeAttackResult(null)
  }

  useEffect(() => {
    let cancelled = false

    const loadSharedSimulation =
      async () => {
        const code =
          readSharedSimulationCodeFromUrl()

        if (code) {
          try {
            setSharedSimulationLoading(true)
            setSharedSimulationError(null)

            const input =
              await getSharedSimulation(code)

            if (cancelled) {
              return
            }

            setAttacker({
              ...input.attacker,
            })

            setDefender({
              ...input.defender,
            })

            setAttackerModifiers({
              ...input.attackerModifiers,
            })

            setDefenderModifiers({
              ...input.defenderModifiers,
            })

            setAttackerPaladinWeapons({
              ...input.attackerPaladinWeapons,
            })

            setDefenderPaladinWeapons({
              ...input.defenderPaladinWeapons,
            })

            setSiegeSettings({
              ...input.siegeSettings,
            })

            return
          } catch (error) {
            if (cancelled) {
              return
            }

            console.error(
              'Could not load shared simulation:',
              error,
            )

            setSharedSimulationError(
              error instanceof Error
                ? error.message
                : 'Could not load shared simulation.',
            )
          } finally {
            if (!cancelled) {
              setSharedSimulationLoading(false)
            }
          }
        }

        const legacyInput =
          readLegacySimulationFromUrl()

        if (
          !legacyInput ||
          cancelled
        ) {
          return
        }

        setAttacker({
          ...legacyInput.attacker,
        })

        setDefender({
          ...legacyInput.defender,
        })

        setAttackerModifiers({
          ...legacyInput.attackerModifiers,
        })

        setDefenderModifiers({
          ...legacyInput.defenderModifiers,
        })

        setAttackerPaladinWeapons({
          ...legacyInput.attackerPaladinWeapons,
        })

        setDefenderPaladinWeapons({
          ...legacyInput.defenderPaladinWeapons,
        })

        setSiegeSettings({
          ...legacyInput.siegeSettings,
        })
      }

    void loadSharedSimulation()

    return () => {
      cancelled = true
    }
  }, [])

  const buildSimulationInput =
    (): BattleSimulationInput => {
      return {
        attacker,
        defender,
        attackerModifiers,
        defenderModifiers,
        attackerPaladinWeapons,
        defenderPaladinWeapons,
        siegeSettings,
      }
    }

  const applySimulationInput = (
    input: BattleSimulationInput,
  ) => {
    setHistorySource(
      'MANUAL',
    )
    setReportMetadata(null)

    setAttacker({
      ...input.attacker,
    })

    setDefender({
      ...input.defender,
    })

    setAttackerModifiers({
      ...input.attackerModifiers,
    })

    setDefenderModifiers({
      ...input.defenderModifiers,
    })

    setAttackerPaladinWeapons({
      ...input.attackerPaladinWeapons,
    })

    setDefenderPaladinWeapons({
      ...input.defenderPaladinWeapons,
    })

    setSiegeSettings({
      ...input.siegeSettings,
    })

    clearResults()

    window.setTimeout(
      () => {
        document
          .getElementById('simulator')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
      },
      50,
    )
  }

  const updateAttacker = (
    unitId: UnitId,
    quantity: number,
  ) => {
    setAttacker(
      (currentArmy) => ({
        ...currentArmy,
        [unitId]: quantity,
      }),
    )

    clearResults()
  }

  const updateDefender = (
    unitId: UnitId,
    quantity: number,
  ) => {
    setDefender(
      (currentArmy) => ({
        ...currentArmy,
        [unitId]: quantity,
      }),
    )

    clearResults()
  }

  const clearAttacker = () => {
    setAttacker(
      createEmptyArmy(),
    )

    clearResults()
  }

  const clearDefender = () => {
    setDefender(
      createEmptyArmy(),
    )

    clearResults()
  }

  const resetBattle = () => {
    setHistorySource(
      'MANUAL',
    )
    setReportMetadata(null)

    setAttacker(
      createEmptyArmy(),
    )

    setDefender(
      createEmptyArmy(),
    )

    setAttackerModifiers(
      createInitialAttackerModifiers(),
    )

    setDefenderModifiers(
      createInitialDefenderModifiers(),
    )

    setAttackerPaladinWeapons(
      createEmptyPaladinWeapons(),
    )

    setDefenderPaladinWeapons(
      createEmptyPaladinWeapons(),
    )

    setSiegeSettings(
      createInitialSiegeSettings(),
    )

    setSharedSimulationError(null)

    clearResults()
  }

  const swapArmies = () => {
    setHistorySource(
      'MANUAL',
    )
    setReportMetadata(null)

    const previousAttacker = {
      ...attacker,
    }

    const previousDefender = {
      ...defender,
    }

    const previousAttackerWeapons = {
      ...attackerPaladinWeapons,
    }

    const previousDefenderWeapons = {
      ...defenderPaladinWeapons,
    }

    setAttacker(
      previousDefender,
    )

    setDefender(
      previousAttacker,
    )

    setAttackerPaladinWeapons(
      previousDefenderWeapons,
    )

    setDefenderPaladinWeapons(
      previousAttackerWeapons,
    )

    clearResults()
  }

  const handleAttackerModifiers = (
    modifiers: AttackerModifiers,
  ) => {
    setAttackerModifiers(modifiers)
    clearResults()
  }

  const handleDefenderModifiers = (
    modifiers: DefenderModifiers,
  ) => {
    setDefenderModifiers(modifiers)
    clearResults()
  }

  const handleAttackerWeapons = (
    weapons: PaladinWeaponLevels,
  ) => {
    setAttackerPaladinWeapons(weapons)
    clearResults()
  }

  const handleDefenderWeapons = (
    weapons: PaladinWeaponLevels,
  ) => {
    setDefenderPaladinWeapons(weapons)
    clearResults()
  }

  const handleSiegeSettings = (
    settings: SiegeSettings,
  ) => {
    setSiegeSettings(settings)
    clearResults()
  }

  const handleReportAttackerApply = (
    importedArmy: Army,
    modifierPatch: Partial<AttackerModifiers>,
  ) => {
    setAttacker({
      ...createEmptyArmy(),
      ...importedArmy,
    })

    setAttackerModifiers(
      (current) => ({
        ...current,
        ...modifierPatch,
      }),
    )

    clearResults()
  }

  const handleReportDefenderApply = (
    importedArmy: Army,
    modifierPatch: Partial<DefenderModifiers>,
  ) => {
    setDefender({
      ...createEmptyArmy(),
      ...importedArmy,
    })

    setDefenderModifiers(
      (current) => ({
        ...current,
        ...modifierPatch,
      }),
    )

    clearResults()
  }

  const handleReportBothApply = (
    importedAttacker: Army,
    importedDefender: Army,
    attackerModifierPatch: Partial<AttackerModifiers>,
    defenderModifierPatch: Partial<DefenderModifiers>,
  ) => {
    setAttacker({
      ...createEmptyArmy(),
      ...importedAttacker,
    })

    setDefender({
      ...createEmptyArmy(),
      ...importedDefender,
    })

    setAttackerModifiers(
      (current) => ({
        ...current,
        ...attackerModifierPatch,
      }),
    )

    setDefenderModifiers(
      (current) => ({
        ...current,
        ...defenderModifierPatch,
      }),
    )

    clearResults()
  }

  const handleReportImportApplied = (
    source: SimulationHistorySource,
    metadata: ReportMetadata,
  ) => {
    setHistorySource(source)
    setReportMetadata(metadata)
  }

  const handleSimulation = () => {
    const input =
      buildSimulationInput()

    const result =
      simulateBattle(input)

    setBattleResult(result)
    setLuckAnalysis(null)
    setOptimizerResult(null)
    setAdvancedOptimizerResult(null)
    setSafeAttackResult(null)

    void createSimulationHistory(
      historySource,
      input,
      result,
      reportMetadata,
    )
      .then(() => {
        setHistoryRefreshToken(
          (current) =>
            current + 1,
        )
      })
      .catch(
        (historyError) => {
          console.error(
            'Could not save simulation history:',
            historyError,
          )
        },
      )

    window.setTimeout(
      () => {
        document
          .getElementById('battle-result')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
      },
      50,
    )
  }

  const handleLuckAnalysis = () => {
    const analysis =
      analyzeLuckScenarios(
        buildSimulationInput(),
      )

    setLuckAnalysis(analysis)
    setBattleResult(null)
    setOptimizerResult(null)
    setAdvancedOptimizerResult(null)
    setSafeAttackResult(null)

    window.setTimeout(
      () => {
        document
          .getElementById('luck-analysis')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
      },
      50,
    )
  }

  const handleArmyOptimization = (
    mode: ArmyOptimizerMode,
  ) => {
    const result = optimizeArmy(
      buildSimulationInput(),
      mode,
    )

    setOptimizerResult(result)
    setBattleResult(null)
    setLuckAnalysis(null)
    setAdvancedOptimizerResult(null)
    setSafeAttackResult(null)
  }

  const handleAdvancedArmyOptimization = (
    mode: ArmyOptimizerMode,
    unitIds: UnitId[],
  ) => {
    const result =
      optimizeArmyComposition(
        buildSimulationInput(),
        {
          mode,
          unitIds,
        },
      )

    setAdvancedOptimizerResult(result)
    setBattleResult(null)
    setLuckAnalysis(null)
    setOptimizerResult(null)
    setSafeAttackResult(null)
  }

  const handleSafeAttack = (
    options: SafeAttackOptions,
  ) => {
    const result =
      findSafeAttack(
        buildSimulationInput(),
        options,
      )

    setSafeAttackResult(result)
    setBattleResult(null)
    setLuckAnalysis(null)
    setOptimizerResult(null)
    setAdvancedOptimizerResult(null)
  }

  const handleSafeAttackSimulation = (
    result: SafeAttackResult,
  ) => {
    if (
      !result.success ||
      !result.recommendedArmy ||
      !result.battleResult
    ) {
      return
    }

    const safeInput: BattleSimulationInput = {
      ...buildSimulationInput(),
      attacker: {
        ...result.recommendedArmy,
      },
      attackerModifiers: {
        ...attackerModifiers,
        luck: result.minimumLuck,
      },
    }

    setAttacker({
      ...result.recommendedArmy,
    })

    setAttackerModifiers({
      ...attackerModifiers,
      luck: result.minimumLuck,
    })

    setBattleResult(
      result.battleResult,
    )
    setLuckAnalysis(null)
    setOptimizerResult(null)
    setAdvancedOptimizerResult(null)
    setSafeAttackResult(result)

    void createSimulationHistory(
      historySource,
      safeInput,
      result.battleResult,
      reportMetadata,
    )
      .then(() => {
        setHistoryRefreshToken(
          (current) =>
            current + 1,
        )
      })
      .catch(
        (historyError) => {
          console.error(
            'Could not save safe attack simulation history:',
            historyError,
          )
        },
      )

    window.setTimeout(
      () => {
        document
          .getElementById('battle-result')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
      },
      50,
    )
  }

  const handleMultiWaveFinalDefense = (
    army: Army,
    wallLevel: number,
    targetLevel: number,
  ) => {
    setDefender({
      ...army,
    })

    setDefenderModifiers(
      (current) => ({
        ...current,
        wallLevel,
      }),
    )

    setSiegeSettings(
      (current) => ({
        ...current,
        catapultTargetLevel:
          targetLevel,
      }),
    )

    clearResults()

    window.setTimeout(
      () => {
        document
          .getElementById('simulator')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
      },
      50,
    )
  }

  const handleMultiWaveApplyWave = (
    army: Army,
    luck: number,
  ) => {
    setAttacker({
      ...army,
    })

    setAttackerModifiers(
      (current) => ({
        ...current,
        luck,
      }),
    )

    clearResults()

    window.setTimeout(
      () => {
        document
          .getElementById('simulator')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
      },
      50,
    )
  }

  const handleWallRamApply = (
    ramCount: number,
    luck: number,
  ) => {
    setAttacker(
      (current) => ({
        ...current,
        ram: ramCount,
      }),
    )

    setAttackerModifiers(
      (current) => ({
        ...current,
        luck,
      }),
    )

    clearResults()

    window.setTimeout(
      () => {
        document
          .getElementById('simulator')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
      },
      50,
    )
  }

  const handleWallRamSimulation = (
    result: WallRamPlannerResult,
  ) => {
    if (
      !result.success ||
      !result.recommendedArmy ||
      !result.battleResult ||
      result.recommendedRams === null
    ) {
      return
    }

    const plannerInput: BattleSimulationInput = {
      ...buildSimulationInput(),
      attacker: {
        ...result.recommendedArmy,
      },
      attackerModifiers: {
        ...attackerModifiers,
        luck: result.minimumLuck,
      },
    }

    setAttacker({
      ...result.recommendedArmy,
    })

    setAttackerModifiers({
      ...attackerModifiers,
      luck: result.minimumLuck,
    })

    setBattleResult(
      result.battleResult,
    )
    setLuckAnalysis(null)
    setOptimizerResult(null)
    setAdvancedOptimizerResult(null)
    setSafeAttackResult(null)

    void createSimulationHistory(
      historySource,
      plannerInput,
      result.battleResult,
      reportMetadata,
    )
      .then(() => {
        setHistoryRefreshToken(
          (current) =>
            current + 1,
        )
      })
      .catch(
        (historyError) => {
          console.error(
            'Could not save wall/ram planner simulation history:',
            historyError,
          )
        },
      )

    window.setTimeout(
      () => {
        document
          .getElementById('battle-result')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
      },
      50,
    )
  }

  const handleCatapultApply = (
    catapultCount: number,
    luck: number,
  ) => {
    setAttacker(
      (current) => ({
        ...current,
        catapult: catapultCount,
      }),
    )

    setAttackerModifiers(
      (current) => ({
        ...current,
        luck,
      }),
    )

    clearResults()

    window.setTimeout(
      () => {
        document
          .getElementById('simulator')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
      },
      50,
    )
  }

  const handleCatapultSimulation = (
    result: CatapultPlannerResult,
  ) => {
    if (
      !result.success ||
      !result.recommendedArmy ||
      !result.battleResult ||
      result.recommendedCatapults === null
    ) {
      return
    }

    const plannerInput: BattleSimulationInput = {
      ...buildSimulationInput(),
      attacker: {
        ...result.recommendedArmy,
      },
      attackerModifiers: {
        ...attackerModifiers,
        luck: result.minimumLuck,
      },
    }

    setAttacker({
      ...result.recommendedArmy,
    })

    setAttackerModifiers({
      ...attackerModifiers,
      luck: result.minimumLuck,
    })

    setBattleResult(
      result.battleResult,
    )
    setLuckAnalysis(null)
    setOptimizerResult(null)
    setAdvancedOptimizerResult(null)
    setSafeAttackResult(null)

    void createSimulationHistory(
      historySource,
      plannerInput,
      result.battleResult,
      reportMetadata,
    )
      .then(() => {
        setHistoryRefreshToken(
          (current) =>
            current + 1,
        )
      })
      .catch(
        (historyError) => {
          console.error(
            'Could not save catapult planner simulation history:',
            historyError,
          )
        },
      )

    window.setTimeout(
      () => {
        document
          .getElementById('battle-result')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
      },
      50,
    )
  }

  const handleArmyLibraryAttacker = (
    army: Army,
  ) => {
    setHistorySource(
      'MANUAL',
    )
    setReportMetadata(null)

    setAttacker({
      ...createEmptyArmy(),
      ...army,
    })

    clearResults()

    window.setTimeout(
      () => {
        document
          .getElementById('simulator')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
      },
      50,
    )
  }

  const handleArmyLibraryDefender = (
    army: Army,
  ) => {
    setHistorySource(
      'MANUAL',
    )
    setReportMetadata(null)

    setDefender({
      ...createEmptyArmy(),
      ...army,
    })

    clearResults()

    window.setTimeout(
      () => {
        document
          .getElementById('simulator')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
      },
      50,
    )
  }

  const handleIntelligenceLoadDefense = (
    input: BattleSimulationInput,
    metadata: ReportMetadata | null,
    source: SimulationHistorySource,
  ) => {
    setHistorySource(source)
    setReportMetadata(metadata)

    setDefender({
      ...createEmptyArmy(),
      ...input.defender,
    })

    setDefenderModifiers({
      ...input.defenderModifiers,
    })

    setDefenderPaladinWeapons({
      ...input.defenderPaladinWeapons,
    })

    clearResults()

    window.setTimeout(
      () => {
        document
          .getElementById('simulator')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
      },
      50,
    )
  }

  const applyArmy = (
    army: Army,
  ) => {
    setAttacker({
      ...army,
    })

    clearResults()

    window.setTimeout(
      () => {
        document
          .getElementById('simulator')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
      },
      50,
    )
  }

  const handleAttackPlanOpen = (
    input: BattleSimulationInput,
    metadata: ReportMetadata | null,
    source: SimulationHistorySource,
  ) => {
    setHistorySource(source)
    setReportMetadata(metadata)

    setAttacker({
      ...input.attacker,
    })

    setDefender({
      ...input.defender,
    })

    setAttackerModifiers({
      ...input.attackerModifiers,
    })

    setDefenderModifiers({
      ...input.defenderModifiers,
    })

    setAttackerPaladinWeapons({
      ...input.attackerPaladinWeapons,
    })

    setDefenderPaladinWeapons({
      ...input.defenderPaladinWeapons,
    })

    setSiegeSettings({
      ...input.siegeSettings,
    })

    clearResults()

    window.setTimeout(
      () => {
        document
          .getElementById('simulator')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
      },
      50,
    )
  }


  const simulationInput =
    buildSimulationInput()

  return (
    <div className="simulator-page">
      <header className="header">
        <div className="header-content">
          <div>
            <h1>
              Tribal Battle Simulator
            </h1>

            <p>
              Battle simulation and strategy tools
            </p>
          </div>

          <nav>
            <a href="#simulator">
              Simulator
            </a>

            <a href="#settings">
              Settings
            </a>

            <a href="#report-screenshot-import">
              Import
            </a>

            <a href="#tools">
              Tools
            </a>

            <a href="#safe-attack">
              Safe Attack
            </a>

            <a href="#multi-wave">
              Waves
            </a>

            <a href="#wall-ram">
              Rams
            </a>

            <a href="#catapult-planner">
              Catapults
            </a>

            <a href="#army-library">
              Armies
            </a>

            <a href="#village-overview">
              Overview
            </a>

            <a href="#attack-plans">
              Plans
            </a>

            <a href="#attack-candidate-analyzer">
              Candidates
            </a>

            <a href="#target-ranking">
              Targets
            </a>

            <a href="#watchlist-dashboard">
              Watchlist
            </a>

            <a href="#player-village-intelligence">
              Intel
            </a>

            <a href="#simulation-history">
              History
            </a>

            <a href="#simulation-tools">
              Presets
            </a>
          </nav>
        </div>
      </header>

      <main
        className="main-content"
        id="simulator"
      >
        {sharedSimulationLoading && (
          <div className="shared-simulation-message">
            Loading shared battle...
          </div>
        )}

        {sharedSimulationError && (
          <div className="shared-simulation-message shared-simulation-error">
            Could not load the shared battle:{' '}
            {sharedSimulationError}
          </div>
        )}

        <section className="hero">
          <span className="hero-badge">
            Battle Simulator
          </span>

          <h2>
            Simulate your battle
          </h2>

          <p>
            Configure both armies and the most important battle settings in one compact comparison table.
          </p>
        </section>

        <BattleSetupTable
          attacker={attacker}
          defender={defender}
          attackerModifiers={attackerModifiers}
          defenderModifiers={defenderModifiers}
          attackerPaladinWeapons={attackerPaladinWeapons}
          defenderPaladinWeapons={defenderPaladinWeapons}
          siegeSettings={siegeSettings}
          onAttackerUnitChange={updateAttacker}
          onDefenderUnitChange={updateDefender}
          onClearAttacker={clearAttacker}
          onClearDefender={clearDefender}
          onAttackerModifiersChange={handleAttackerModifiers}
          onDefenderModifiersChange={handleDefenderModifiers}
          onAttackerWeaponsChange={handleAttackerWeapons}
          onDefenderWeaponsChange={handleDefenderWeapons}
          onSiegeSettingsChange={handleSiegeSettings}
        />

        <ReportScreenshotImportPanel
          onApplyAttacker={handleReportAttackerApply}
          onApplyDefender={handleReportDefenderApply}
          onApplyBoth={handleReportBothApply}
          onImportApplied={handleReportImportApplied}
        />

        <BattleQuickActions
          attacker={attacker}
          defender={defender}
          attackerModifiers={attackerModifiers}
          defenderModifiers={defenderModifiers}
          onSwapArmies={swapArmies}
          onResetBattle={resetBattle}
          onSimulate={handleSimulation}
          onAnalyzeLuck={handleLuckAnalysis}
        />

        {battleResult && (
          <BattleResultPanel
            result={battleResult}
            input={simulationInput}
          />
        )}

        {luckAnalysis && (
          <LuckAnalysisPanel
            analysis={luckAnalysis}
          />
        )}

        <div id="tools">
          <SafeAttackPanel
            input={simulationInput}
            result={safeAttackResult}
            onSearch={handleSafeAttack}
            onApply={applyArmy}
            onSimulate={handleSafeAttackSimulation}
          />

          <MultiWavePlannerPanel
            input={simulationInput}
            onApplyFinalDefense={handleMultiWaveFinalDefense}
            onApplyWave={handleMultiWaveApplyWave}
          />

          <WallRamPlannerPanel
            input={simulationInput}
            onApply={handleWallRamApply}
            onSimulate={handleWallRamSimulation}
          />

          <CatapultPlannerPanel
            input={simulationInput}
            onApply={handleCatapultApply}
            onSimulate={handleCatapultSimulation}
          />

          <ArmyOptimizerPanel
            result={optimizerResult}
            onOptimize={handleArmyOptimization}
            onApply={applyArmy}
          />

          <AdvancedArmyOptimizerPanel
            result={advancedOptimizerResult}
            onOptimize={handleAdvancedArmyOptimization}
            onApply={applyArmy}
          />
        </div>

        <ArmyLibraryPanel
          attacker={attacker}
          defender={defender}
          reportMetadata={reportMetadata}
          onApplyAttacker={handleArmyLibraryAttacker}
          onApplyDefender={handleArmyLibraryDefender}
        />

        <VillageIntelligenceOverviewPanel
          refreshToken={historyRefreshToken}
          onLoadDefense={handleIntelligenceLoadDefense}
        />

        <AttackPlanQueuePanel
          currentInput={simulationInput}
          onOpenPlan={handleAttackPlanOpen}
        />

        <AttackCandidateAnalyzerPanel
          input={simulationInput}
          refreshToken={historyRefreshToken}
          onLoadDefense={handleIntelligenceLoadDefense}
          onApplyArmy={applyArmy}
        />

        <TargetRankingDashboardPanel
          refreshToken={historyRefreshToken}
          onLoadDefense={handleIntelligenceLoadDefense}
        />

        <WatchlistDashboardPanel
          refreshToken={historyRefreshToken}
          onLoadDefense={handleIntelligenceLoadDefense}
        />

        <PlayerVillageIntelligencePanel
          refreshToken={historyRefreshToken}
          onLoadDefense={handleIntelligenceLoadDefense}
        />

        <SimulationHistoryPanel
          refreshToken={historyRefreshToken}
          onOpen={applySimulationInput}
        />

        <SimulationToolsPanel
          input={simulationInput}
          onLoad={applySimulationInput}
        />
      </main>
    </div>
  )
}

export default SimulatorPage
