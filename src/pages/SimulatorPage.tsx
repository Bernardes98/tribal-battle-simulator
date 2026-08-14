import {
  useState,
} from 'react'

import ArmyPanel from '../components/battle/ArmyPanel'
import BattleResultPanel from '../components/battle/BattleResultPanel'
import BattleSettingsPanel from '../components/battle/BattleSettingsPanel'
import PaladinWeaponsPanel from '../components/battle/PaladinWeaponsPanel'
import SiegeSettingsPanel from '../components/battle/SiegeSettingsPanel'

import { units } from '../data/units'

import {
  simulateBattle,
} from '../domain/battle/battleEngine'

import type {
  Army,
  AttackerModifiers,
  BattleResult,
  DefenderModifiers,
  PaladinWeaponLevels,
  SiegeSettings,
} from '../types/Battle'

import type {
  UnitId,
} from '../types/Unit'

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
    churchLevel: 1,
    morale: 100,
    luck: 0,
    grandmaster: true,
    weaponMasteryLevel: 0,
    medicLevel: 1,
    medicusLevel: 0,
  })

const createInitialDefenderModifiers =
  (): DefenderModifiers => ({
    churchLevel: 1,
    hospitalLevel: 0,
    clinicLevel: 0,
    ironWallLevel: 0,
    wallLevel: 13,
  })

const createInitialSiegeSettings =
  (): SiegeSettings => ({
    catapultTarget: 'farm',
    catapultTargetLevel: 16,
  })

function SimulatorPage() {
  const [
    attacker,
    setAttacker,
  ] =
    useState<Army>(
      createEmptyArmy,
    )

  const [
    defender,
    setDefender,
  ] =
    useState<Army>(
      createEmptyArmy,
    )

  const [
    attackerModifiers,
    setAttackerModifiers,
  ] =
    useState<AttackerModifiers>(
      createInitialAttackerModifiers,
    )

  const [
    defenderModifiers,
    setDefenderModifiers,
  ] =
    useState<DefenderModifiers>(
      createInitialDefenderModifiers,
    )

  const [
    attackerPaladinWeapons,
    setAttackerPaladinWeapons,
  ] =
    useState<PaladinWeaponLevels>(
      () => ({
        ...createEmptyPaladinWeapons(),
        axe: 1,
      }),
    )

  const [
    defenderPaladinWeapons,
    setDefenderPaladinWeapons,
  ] =
    useState<PaladinWeaponLevels>(
      createEmptyPaladinWeapons,
    )

  const [
    siegeSettings,
    setSiegeSettings,
  ] =
    useState<SiegeSettings>(
      createInitialSiegeSettings,
    )

  const [
    battleResult,
    setBattleResult,
  ] =
    useState<BattleResult | null>(
      null,
    )

  const clearResult = () => {
    setBattleResult(null)
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

    clearResult()
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

    clearResult()
  }

  const clearAttacker = () => {
    setAttacker(
      createEmptyArmy(),
    )

    clearResult()
  }

  const clearDefender = () => {
    setDefender(
      createEmptyArmy(),
    )

    clearResult()
  }

  const handleAttackerModifiers = (
    modifiers:
      AttackerModifiers,
  ) => {
    setAttackerModifiers(
      modifiers,
    )

    clearResult()
  }

  const handleDefenderModifiers = (
    modifiers:
      DefenderModifiers,
  ) => {
    setDefenderModifiers(
      modifiers,
    )

    clearResult()
  }

  const handleAttackerWeapons = (
    weapons:
      PaladinWeaponLevels,
  ) => {
    setAttackerPaladinWeapons(
      weapons,
    )

    clearResult()
  }

  const handleDefenderWeapons = (
    weapons:
      PaladinWeaponLevels,
  ) => {
    setDefenderPaladinWeapons(
      weapons,
    )

    clearResult()
  }

  const handleSiegeSettings = (
    settings:
      SiegeSettings,
  ) => {
    setSiegeSettings(
      settings,
    )

    clearResult()
  }

  const handleSimulation =
    () => {
      const result =
        simulateBattle({
          attacker,
          defender,

          attackerModifiers,
          defenderModifiers,

          attackerPaladinWeapons,
          defenderPaladinWeapons,

          siegeSettings,
        })

      setBattleResult(
        result,
      )

      window.setTimeout(
        () => {
          document
            .getElementById(
              'battle-result',
            )
            ?.scrollIntoView({
              behavior:
                'smooth',

              block:
                'start',
            })
        },
        50,
      )
    }

  const loadExcelExample =
    () => {
      const exampleAttacker =
        createEmptyArmy()

      exampleAttacker.axe =
        1800

      exampleAttacker.lightCavalry =
        25

      exampleAttacker.mountedArcher =
        10

      exampleAttacker.catapult =
        16

      exampleAttacker.paladin =
        1

      const exampleDefender =
        createEmptyArmy()

      exampleDefender.spearman =
        154

      exampleDefender.swordsman =
        270

      exampleDefender.axe =
        914

      exampleDefender.archer =
        30

      exampleDefender.lightCavalry =
        30

      exampleDefender.mountedArcher =
        10

      exampleDefender.paladin =
        1

      setAttacker(
        exampleAttacker,
      )

      setDefender(
        exampleDefender,
      )

      setAttackerModifiers(
        createInitialAttackerModifiers(),
      )

      setDefenderModifiers(
        createInitialDefenderModifiers(),
      )

      setAttackerPaladinWeapons({
        ...createEmptyPaladinWeapons(),
        axe: 1,
      })

      setDefenderPaladinWeapons(
        createEmptyPaladinWeapons(),
      )

      setSiegeSettings(
        createInitialSiegeSettings(),
      )

      setBattleResult(null)
    }

  return (
    <div className="simulator-page">
      <header className="header">
        <div className="header-content">
          <div>
            <h1>
              Tribal Battle Simulator
            </h1>

            <p>
              Battle simulation
              and strategy tools
            </p>
          </div>

          <nav>
            <a href="#simulator">
              Simulator
            </a>

            <a href="#settings">
              Settings
            </a>

            <a href="#tools">
              Tools
            </a>

            <a href="#guides">
              Guides
            </a>
          </nav>
        </div>
      </header>

      <main
        className="main-content"
        id="simulator"
      >
        <section className="hero">
          <span className="hero-badge">
            Battle Simulator
          </span>

          <h2>
            Simulate your battle
          </h2>

          <p>
            Configure the attacking
            and defending armies,
            battle modifiers, siege
            settings and Paladin
            weapons.
          </p>
        </section>

        <section className="battle-container">
          <ArmyPanel
            side="attacker"
            army={attacker}
            onUnitChange={
              updateAttacker
            }
            onClear={
              clearAttacker
            }
          />

          <div className="versus">
            <span>
              VS
            </span>
          </div>

          <ArmyPanel
            side="defender"
            army={defender}
            onUnitChange={
              updateDefender
            }
            onClear={
              clearDefender
            }
          />
        </section>

        <div id="settings">
          <BattleSettingsPanel
            attacker={
              attackerModifiers
            }
            defender={
              defenderModifiers
            }
            onAttackerChange={
              handleAttackerModifiers
            }
            onDefenderChange={
              handleDefenderModifiers
            }
          />
        </div>

        <SiegeSettingsPanel
          settings={
            siegeSettings
          }
          wallLevel={
            defenderModifiers
              .wallLevel
          }
          onChange={
            handleSiegeSettings
          }
        />

        <PaladinWeaponsPanel
          attacker={
            attackerPaladinWeapons
          }
          defender={
            defenderPaladinWeapons
          }
          onAttackerChange={
            handleAttackerWeapons
          }
          onDefenderChange={
            handleDefenderWeapons
          }
        />

        <div className="simulation-actions">
          <button
            className="example-button"
            type="button"
            onClick={
              loadExcelExample
            }
          >
            Load Excel Example
          </button>

          <button
            className="simulate-button"
            type="button"
            onClick={
              handleSimulation
            }
          >
            Simulate Battle
          </button>
        </div>

        {battleResult && (
          <BattleResultPanel
            result={
              battleResult
            }
          />
        )}
      </main>
    </div>
  )
}

export default SimulatorPage