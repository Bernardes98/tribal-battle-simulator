import {
  createShortShareUrl,
} from './simulationShare'

import type {
  BattleResult,
} from '../../types/Battle'

export type SharedSimulationPresentation =
  | 'setup'
  | 'result-summary'
  | 'result-full'

const presentationValues:
  SharedSimulationPresentation[] = [
    'setup',
    'result-summary',
    'result-full',
  ]

const isPresentation = (
  value: string | null,
): value is SharedSimulationPresentation => {
  return presentationValues.includes(
    value as SharedSimulationPresentation,
  )
}

export const createAdvancedShareUrl =
  (
    code: string,
    presentation:
      SharedSimulationPresentation,
  ): string => {
    const base =
      createShortShareUrl(
        code,
      )

    const url =
      new URL(
        base,
        window.location.origin,
      )

    if (
      presentation ===
      'setup'
    ) {
      url.searchParams.delete(
        'view',
      )

      url.searchParams.delete(
        'report',
      )
    } else {
      url.searchParams.set(
        'view',
        'result',
      )

      url.searchParams.set(
        'report',
        presentation ===
        'result-full'
          ? 'full'
          : 'summary',
      )
    }

    return url.toString()
  }

export const readAdvancedSharePresentationFromUrl =
  (): SharedSimulationPresentation => {
    if (
      typeof window ===
      'undefined'
    ) {
      return 'setup'
    }

    const params =
      new URLSearchParams(
        window.location.search,
      )

    const explicit =
      params.get(
        'presentation',
      )

    if (
      isPresentation(
        explicit,
      )
    ) {
      return explicit
    }

    if (
      params.get(
        'view',
      ) !==
      'result'
    ) {
      return 'setup'
    }

    return params.get(
      'report',
    ) ===
    'full'
      ? 'result-full'
      : 'result-summary'
  }

const winnerLabel = (
  winner:
    BattleResult['winner'],
): string => {
  if (
    winner ===
    'attacker'
  ) {
    return 'Attacker victory'
  }

  if (
    winner ===
    'defender'
  ) {
    return 'Defender victory'
  }

  return 'Draw'
}

const percentage = (
  surviving: number,
  initial: number,
): number => {
  if (
    initial <=
    0
  ) {
    return 0
  }

  return Math.max(
    0,
    Math.min(
      100,
      (
        (
          initial -
          surviving
        ) /
        initial
      ) *
        100,
    ),
  )
}

export const createAdvancedShareText =
  (
    code: string,
    url: string,
    presentation:
      SharedSimulationPresentation,
    result:
      BattleResult | null,
  ): string => {
    const heading =
      presentation ===
      'setup'
        ? 'Tribal Battle simulation setup'
        : presentation ===
            'result-full'
          ? 'Tribal Battle full battle report'
          : 'Tribal Battle result'

    if (
      !result ||
      presentation ===
      'setup'
    ) {
      return [
        heading,
        `Simulation code: ${code}`,
        url,
      ].join(
        '\n',
      )
    }

    const attackerLoss =
      percentage(
        result.attacker
          .survivingProvisions,
        result.attacker
          .initialProvisions,
      )

    const defenderLoss =
      percentage(
        result.defender
          .survivingProvisions,
        result.defender
          .initialProvisions,
      )

    return [
      heading,
      winnerLabel(
        result.winner,
      ),
      `Attack: ${Math.round(result.attackStrength).toLocaleString()}`,
      `Defense: ${Math.round(result.defenseStrength).toLocaleString()}`,
      `Attacker loss: ${attackerLoss.toFixed(1)}%`,
      `Defender loss: ${defenderLoss.toFixed(1)}%`,
      `Final wall: ${result.siege.wall.finalLevel}`,
      `Simulation code: ${code}`,
      url,
    ].join(
      '\n',
    )
  }

export const presentationLabel =
  (
    presentation:
      SharedSimulationPresentation,
  ): string => {
    if (
      presentation ===
      'result-summary'
    ) {
      return 'Result Summary'
    }

    if (
      presentation ===
      'result-full'
    ) {
      return 'Full Battle Report'
    }

    return 'Battle Setup'
  }
