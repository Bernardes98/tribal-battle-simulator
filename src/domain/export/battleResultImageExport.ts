import { units } from '../../data/units'

import type {
  BattleResult,
  BattleSimulationInput,
} from '../../types/Battle'

export type BattleResultExportMode =
  | 'summary'
  | 'full'

interface BattleImageTheme {
  page: string
  header: string
  headerDark: string
  panel: string
  panelAlt: string
  border: string
  text: string
  muted: string
  lightText: string
  success: string
  danger: string
  neutral: string
}

const theme: BattleImageTheme = {
  page: '#d3aa78',
  header: '#85572f',
  headerDark: '#70451f',
  panel: '#d9b581',
  panelAlt: '#c99f70',
  border: '#79502f',
  text: '#2d190c',
  muted: '#684527',
  lightText: '#fff1cf',
  success: '#697938',
  danger: '#8d4934',
  neutral: '#8a7037',
}

const logicalWidth =
  1200

const formatter =
  new Intl.NumberFormat(
    'en-US',
  )

const percentage = (
  value: number,
  total: number,
): number => {
  if (
    total <=
    0
  ) {
    return 0
  }

  return Math.max(
    0,
    Math.min(
      100,
      (
        value /
        total
      ) *
        100,
    ),
  )
}

const formatPercent = (
  value: number,
): string => {
  return `${value.toFixed(
    1,
  )}%`
}

const signedLuck = (
  value: number,
): string => {
  if (
    value >
    0
  ) {
    return `+${value}%`
  }

  return `${value}%`
}

const winnerTitle = (
  winner:
    BattleResult['winner'],
): string => {
  if (
    winner ===
    'attacker'
  ) {
    return 'ATTACKER VICTORY'
  }

  if (
    winner ===
    'defender'
  ) {
    return 'DEFENDER VICTORY'
  }

  return 'DRAW'
}

const winnerColor = (
  winner:
    BattleResult['winner'],
): string => {
  if (
    winner ===
    'attacker'
  ) {
    return theme.success
  }

  if (
    winner ===
    'defender'
  ) {
    return theme.danger
  }

  return theme.neutral
}

const setFont = (
  context:
    CanvasRenderingContext2D,
  size: number,
  weight:
    400 |
    600 |
    700 |
    900 = 400,
  family =
    'Arial, sans-serif',
): void => {
  context.font =
    `${weight} ${size}px ${family}`
}

const fillText = (
  context:
    CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options?: {
    color?: string
    size?: number
    weight?: 400 | 600 | 700 | 900
    align?: CanvasTextAlign
    family?: string
  },
): void => {
  setFont(
    context,
    options?.size ??
      18,
    options?.weight ??
      400,
    options?.family ??
      'Arial, sans-serif',
  )

  context.fillStyle =
    options?.color ??
    theme.text

  context.textAlign =
    options?.align ??
    'left'

  context.textBaseline =
    'middle'

  context.fillText(
    text,
    x,
    y,
  )
}

const rect = (
  context:
    CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke =
    theme.border,
): void => {
  context.fillStyle =
    fill

  context.fillRect(
    x,
    y,
    width,
    height,
  )

  context.strokeStyle =
    stroke

  context.lineWidth =
    1

  context.strokeRect(
    x + 0.5,
    y + 0.5,
    width - 1,
    height - 1,
  )
}

const drawStat = (
  context:
    CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  subtext?: string,
): void => {
  rect(
    context,
    x,
    y,
    width,
    78,
    theme.panel,
  )

  fillText(
    context,
    label.toUpperCase(),
    x + 18,
    y + 19,
    {
      color:
        theme.muted,
      size:
        12,
      weight:
        900,
    },
  )

  fillText(
    context,
    value,
    x + 18,
    y + 45,
    {
      size:
        21,
      weight:
        900,
    },
  )

  if (
    subtext
  ) {
    fillText(
      context,
      subtext,
      x + 18,
      y + 65,
      {
        color:
          theme.muted,
        size:
          11,
      },
    )
  }
}

const drawProgress = (
  context:
    CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  value: number,
  fill: string,
): void => {
  context.fillStyle =
    '#ad7b4c'

  context.fillRect(
    x,
    y,
    width,
    12,
  )

  context.fillStyle =
    fill

  context.fillRect(
    x,
    y,
    width *
      Math.max(
        0,
        Math.min(
          100,
          value,
        ),
      ) /
      100,
    12,
  )

  context.strokeStyle =
    theme.border

  context.strokeRect(
    x + 0.5,
    y + 0.5,
    width - 1,
    11,
  )
}

const calculateHeight = (
  input:
    BattleSimulationInput,
  mode:
    BattleResultExportMode,
): number => {
  if (
    mode ===
    'summary'
  ) {
    return 930
  }

  const activeRows =
    units.filter(
      (unit) =>
        (
          input.attacker[
            unit.id
          ] ??
          0
        ) >
          0 ||
        (
          input.defender[
            unit.id
          ] ??
          0
        ) >
          0,
    ).length

  return (
    1010 +
    Math.max(
      1,
      activeRows,
    ) *
      38
  )
}

const drawSideCard = (
  context:
    CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  title: string,
  outcome: string,
  initial: number,
  survived: number,
  color: string,
): void => {
  const lost =
    Math.max(
      0,
      initial -
        survived,
    )

  const survival =
    percentage(
      survived,
      initial,
    )

  const loss =
    percentage(
      lost,
      initial,
    )

  rect(
    context,
    x,
    y,
    width,
    260,
    theme.panel,
  )

  fillText(
    context,
    title.toUpperCase(),
    x + 22,
    y + 25,
    {
      color:
        theme.muted,
      size:
        13,
      weight:
        900,
    },
  )

  fillText(
    context,
    outcome,
    x + 22,
    y + 52,
    {
      size:
        21,
      weight:
        900,
    },
  )

  fillText(
    context,
    'SURVIVING FORCE',
    x + 22,
    y + 87,
    {
      color:
        theme.muted,
      size:
        12,
      weight:
        900,
    },
  )

  fillText(
    context,
    formatPercent(
      survival,
    ),
    x + 22,
    y + 119,
    {
      size:
        29,
      weight:
        900,
    },
  )

  drawProgress(
    context,
    x + 22,
    y + 144,
    width - 44,
    survival,
    color,
  )

  const colWidth =
    (
      width -
      44
    ) /
    4

  const labels = [
    [
      'Initial',
      formatter.format(
        initial,
      ),
    ],

    [
      'Lost',
      formatter.format(
        lost,
      ),
    ],

    [
      'Survived',
      formatter.format(
        survived,
      ),
    ],

    [
      'Loss Rate',
      formatPercent(
        loss,
      ),
    ],
  ]

  labels.forEach(
    (
      [
        label,
        value,
      ],
      index,
    ) => {
      const left =
        x +
        22 +
        colWidth *
          index

      fillText(
        context,
        label.toUpperCase(),
        left,
        y + 184,
        {
          color:
            theme.muted,
          size:
            10,
          weight:
            900,
        },
      )

      fillText(
        context,
        value,
        left,
        y + 211,
        {
          size:
            15,
          weight:
            900,
        },
      )
    },
  )
}

const drawArmyTable = (
  context:
    CanvasRenderingContext2D,
  input:
    BattleSimulationInput,
  y: number,
): number => {
  const rows =
    units.filter(
      (unit) =>
        (
          input.attacker[
            unit.id
          ] ??
          0
        ) >
          0 ||
        (
          input.defender[
            unit.id
          ] ??
          0
        ) >
          0,
    )

  const visibleRows =
    rows.length >
    0
      ? rows
      : []

  const left =
    40

  const width =
    logicalWidth -
    80

  const headerHeight =
    42

  const rowHeight =
    38

  rect(
    context,
    left,
    y,
    width,
    headerHeight,
    theme.headerDark,
  )

  fillText(
    context,
    'ARMY COMPOSITION',
    left + 16,
    y + 21,
    {
      color:
        theme.lightText,
      size:
        14,
      weight:
        900,
    },
  )

  const tableY =
    y +
    headerHeight

  const columns = [
    {
      x:
        left,
      width:
        350,
      label:
        'Unit',
      align:
        'left' as CanvasTextAlign,
    },

    {
      x:
        left +
        350,
      width:
        250,
      label:
        'Attacker',
      align:
        'right' as CanvasTextAlign,
    },

    {
      x:
        left +
        600,
      width:
        250,
      label:
        'Defender',
      align:
        'right' as CanvasTextAlign,
    },

    {
      x:
        left +
        850,
      width:
        width -
        850,
      label:
        'Provision / Unit',
      align:
        'right' as CanvasTextAlign,
    },
  ]

  rect(
    context,
    left,
    tableY,
    width,
    rowHeight,
    theme.panelAlt,
  )

  columns.forEach(
    (column) => {
      fillText(
        context,
        column.label.toUpperCase(),
        column.align ===
        'right'
          ? column.x +
            column.width -
            14
          : column.x +
            14,
        tableY +
          rowHeight /
            2,
        {
          color:
            theme.muted,
          size:
            11,
          weight:
            900,
          align:
            column.align,
        },
      )
    },
  )

  if (
    visibleRows.length ===
    0
  ) {
    rect(
      context,
      left,
      tableY +
        rowHeight,
      width,
      rowHeight,
      theme.panel,
    )

    fillText(
      context,
      'No units configured.',
      left +
        width /
          2,
      tableY +
        rowHeight +
        rowHeight /
          2,
      {
        color:
          theme.muted,
        size:
          13,
        align:
          'center',
      },
    )

    return (
      tableY +
      rowHeight *
        2
    )
  }

  visibleRows.forEach(
    (
      unit,
      index,
    ) => {
      const rowY =
        tableY +
        rowHeight +
        rowHeight *
          index

      rect(
        context,
        left,
        rowY,
        width,
        rowHeight,
        index %
          2 ===
          0
          ? theme.panel
          : '#d2aa77',
      )

      fillText(
        context,
        unit.name,
        left + 14,
        rowY +
          rowHeight /
            2,
        {
          size:
            13,
          weight:
            700,
        },
      )

      fillText(
        context,
        formatter.format(
          input.attacker[
            unit.id
          ] ??
            0,
        ),
        left +
          350 +
          250 -
          14,
        rowY +
          rowHeight /
            2,
        {
          size:
            13,
          weight:
            700,
          align:
            'right',
        },
      )

      fillText(
        context,
        formatter.format(
          input.defender[
            unit.id
          ] ??
            0,
        ),
        left +
          600 +
          250 -
          14,
        rowY +
          rowHeight /
            2,
        {
          size:
            13,
          weight:
            700,
          align:
            'right',
        },
      )

      fillText(
        context,
        String(
          unit.provisions,
        ),
        left +
          width -
          14,
        rowY +
          rowHeight /
            2,
        {
          size:
            13,
          weight:
            700,
          align:
            'right',
        },
      )
    },
  )

  return (
    tableY +
    rowHeight *
      (
        visibleRows.length +
        1
      )
  )
}

export const renderBattleResultToBlob =
  async (
    result:
      BattleResult,
    input:
      BattleSimulationInput,
    mode:
      BattleResultExportMode,
  ): Promise<Blob> => {
    const logicalHeight =
      calculateHeight(
        input,
        mode,
      )

    const scale =
      2

    const canvas =
      document.createElement(
        'canvas',
      )

    canvas.width =
      logicalWidth *
      scale

    canvas.height =
      logicalHeight *
      scale

    const context =
      canvas.getContext(
        '2d',
      )

    if (
      !context
    ) {
      throw new Error(
        'Canvas is not available in this browser.',
      )
    }

    context.scale(
      scale,
      scale,
    )

    context.fillStyle =
      theme.page

    context.fillRect(
      0,
      0,
      logicalWidth,
      logicalHeight,
    )

    /*
     * Everything below is drawn directly into Canvas.
     * There is no SVG foreignObject, external image, webfont extraction or
     * cross-origin resource. Therefore the canvas remains origin-clean and
     * can always be exported through toBlob().
     */

    rect(
      context,
      0,
      0,
      logicalWidth,
      62,
      theme.header,
      theme.headerDark,
    )

    fillText(
      context,
      'BATTLE REPORT',
      40,
      20,
      {
        color:
          '#e9d0a4',
        size:
          12,
        weight:
          900,
      },
    )

    fillText(
      context,
      'Simulation Result',
      40,
      43,
      {
        color:
          theme.lightText,
        size:
          18,
        weight:
          900,
      },
    )

    fillText(
      context,
      'TRIBAL BATTLE SIMULATOR',
      logicalWidth -
        40,
      32,
      {
        color:
          '#e9d0a4',
        size:
          11,
        weight:
          900,
        align:
          'right',
      },
    )

    const outcomeColor =
      winnerColor(
        result.winner,
      )

    rect(
      context,
      0,
      62,
      logicalWidth,
      128,
      '#cfaa76',
    )

    context.fillStyle =
      outcomeColor

    context.fillRect(
      0,
      62,
      8,
      128,
    )

    fillText(
      context,
      'OUTCOME',
      40,
      88,
      {
        color:
          theme.muted,
        size:
          12,
        weight:
          900,
      },
    )

    fillText(
      context,
      winnerTitle(
        result.winner,
      ),
      40,
      126,
      {
        size:
          31,
        weight:
          900,
        family:
          'Georgia, serif',
      },
    )

    fillText(
      context,
      result.winner ===
      'attacker'
        ? 'The attacking army broke through the defense.'
        : result.winner ===
            'defender'
          ? 'The defending army held the village.'
          : 'Neither side achieved a decisive victory.',
      40,
      163,
      {
        color:
          theme.muted,
        size:
          13,
      },
    )

    const strengthRatio =
      result.defenseStrength >
      0
        ? result.attackStrength /
          result.defenseStrength
        : result.attackStrength >
            0
          ? null
          : 0

    drawStat(
      context,
      895,
      87,
      265,
      'Strength Ratio',
      strengthRatio ===
      null
        ? '∞'
        : `${strengthRatio.toFixed(
            2,
          )}x`,
      'Attack / Defense',
    )

    rect(
      context,
      0,
      190,
      logicalWidth,
      82,
      '#c69a66',
    )

    fillText(
      context,
      'ATTACK STRENGTH',
      500,
      213,
      {
        color:
          theme.muted,
        size:
          12,
        weight:
          900,
        align:
          'right',
      },
    )

    fillText(
      context,
      formatter.format(
        Math.round(
          result.attackStrength,
        ),
      ),
      500,
      245,
      {
        size:
          24,
        weight:
          900,
        align:
          'right',
      },
    )

    fillText(
      context,
      'VS',
      600,
      231,
      {
        color:
          theme.lightText,
        size:
          18,
        weight:
          900,
        align:
          'center',
      },
    )

    fillText(
      context,
      'DEFENSE STRENGTH',
      700,
      213,
      {
        color:
          theme.muted,
        size:
          12,
        weight:
          900,
      },
    )

    fillText(
      context,
      formatter.format(
        Math.round(
          result.defenseStrength,
        ),
      ),
      700,
      245,
      {
        size:
          24,
        weight:
          900,
      },
    )

    const attackerInitial =
      result.attacker
        .initialProvisions

    const attackerSurviving =
      result.attacker
        .survivingProvisions

    const defenderInitial =
      result.defender
        .initialProvisions

    const defenderSurviving =
      result.defender
        .survivingProvisions

    drawSideCard(
      context,
      40,
      294,
      535,
      'Attacker',
      result.winner ===
      'attacker'
        ? 'Victory'
        : result.winner ===
            'draw'
          ? 'Draw'
          : 'Defeated',
      attackerInitial,
      attackerSurviving,
      theme.success,
    )

    drawSideCard(
      context,
      625,
      294,
      535,
      'Defender',
      result.winner ===
      'defender'
        ? 'Victory'
        : result.winner ===
            'draw'
          ? 'Draw'
          : 'Defeated',
      defenderInitial,
      defenderSurviving,
      '#7b7440',
    )

    const eventsY =
      578

    const eventWidth =
      (
        logicalWidth -
        80 -
        24
      ) /
      4

    const initialWall =
      input.defenderModifiers
        .wallLevel

    const finalWall =
      result.siege.wall
        .finalLevel

    const eventData = [
      {
        label:
          'Wall',
        value:
          `Level ${initialWall} → ${finalWall}`,
        sub:
          initialWall >
          finalWall
            ? `Reduced by ${initialWall - finalWall}`
            : 'No reduction',
      },

      {
        label:
          'Luck',
        value:
          signedLuck(
            input.attackerModifiers
              .luck,
          ),
        sub:
          'Attacker battle luck',
      },

      {
        label:
          'Morale',
        value:
          `${input.attackerModifiers.morale}%`,
        sub:
          'Attacker morale',
      },

      {
        label:
          'Church',
        value:
          `A${input.attackerModifiers.churchLevel} · D${input.defenderModifiers.churchLevel}`,
        sub:
          'Attacker / Defender',
      },
    ]

    eventData.forEach(
      (
        event,
        index,
      ) => {
        drawStat(
          context,
          40 +
            index *
              (
                eventWidth +
                8
              ),
          eventsY,
          eventWidth,
          event.label,
          event.value,
          event.sub,
        )
      },
    )

    const attackerLoss =
      percentage(
        Math.max(
          0,
          attackerInitial -
            attackerSurviving,
        ),
        attackerInitial,
      )

    const defenderLoss =
      percentage(
        Math.max(
          0,
          defenderInitial -
            defenderSurviving,
        ),
        defenderInitial,
      )

    let footerY =
      686

    if (
      mode ===
      'full'
    ) {
      footerY =
        drawArmyTable(
          context,
          input,
          686,
        ) +
        24
    }

    const footerWidth =
      (
        logicalWidth -
        80
      ) /
      3

    drawStat(
      context,
      40,
      footerY,
      footerWidth,
      'Attacker Casualties',
      formatPercent(
        attackerLoss,
      ),
    )

    drawStat(
      context,
      40 +
        footerWidth,
      footerY,
      footerWidth,
      'Final Result',
      winnerTitle(
        result.winner,
      ),
    )

    drawStat(
      context,
      40 +
        footerWidth *
          2,
      footerY,
      footerWidth,
      'Defender Casualties',
      formatPercent(
        defenderLoss,
      ),
    )

    const noteY =
      footerY +
      98

    fillText(
      context,
      'Casualties are shown as effective provisions because the battle engine exposes aggregate surviving provisions rather than exact per-unit survivors.',
      logicalWidth /
        2,
      noteY,
      {
        color:
          theme.muted,
        size:
          11,
        align:
          'center',
      },
    )

    const blob =
      await new Promise<
        Blob
      >(
        (
          resolve,
          reject,
        ) => {
          canvas.toBlob(
            (value) => {
              if (
                value
              ) {
                resolve(
                  value,
                )
              } else {
                reject(
                  new Error(
                    'Could not create PNG from the battle report.',
                  ),
                )
              }
            },
            'image/png',
            1,
          )
        },
      )

    return blob
  }

const createFileName =
  (
    mode:
      BattleResultExportMode,
  ): string => {
    const timestamp =
      new Date()
        .toISOString()
        .replace(
          /[:.]/g,
          '-',
        )

    return `tribal-battle-result-${mode}-${timestamp}.png`
  }

export const downloadBattleResultImage =
  async (
    result:
      BattleResult,
    input:
      BattleSimulationInput,
    mode:
      BattleResultExportMode,
  ): Promise<void> => {
    const blob =
      await renderBattleResultToBlob(
        result,
        input,
        mode,
      )

    const url =
      URL.createObjectURL(
        blob,
      )

    try {
      const anchor =
        document.createElement(
          'a',
        )

      anchor.href =
        url

      anchor.download =
        createFileName(
          mode,
        )

      document.body.appendChild(
        anchor,
      )

      anchor.click()
      anchor.remove()
    } finally {
      window.setTimeout(
        () =>
          URL.revokeObjectURL(
            url,
          ),
        1000,
      )
    }
  }

export const canCopyBattleResultImage =
  (): boolean => {
    return Boolean(
      typeof navigator !==
        'undefined' &&
        navigator.clipboard &&
        typeof ClipboardItem !==
          'undefined',
    )
  }

export const copyBattleResultImage =
  async (
    result:
      BattleResult,
    input:
      BattleSimulationInput,
    mode:
      BattleResultExportMode,
  ): Promise<void> => {
    if (
      !canCopyBattleResultImage()
    ) {
      throw new Error(
        'Image clipboard is not supported by this browser.',
      )
    }

    const blob =
      await renderBattleResultToBlob(
        result,
        input,
        mode,
      )

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png':
          blob,
      }),
    ])
  }
