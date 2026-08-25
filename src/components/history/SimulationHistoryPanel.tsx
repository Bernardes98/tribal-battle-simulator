import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { units } from '../../data/units'

import type {
  UnitId,
} from '../../types/Unit'

import {
  copyTextToClipboard,
  createShortShareUrl,
} from '../../domain/simulation/simulationShare'

import {
  createSharedSimulation,
} from '../../services/sharedSimulationApi'

import {
  deleteSimulationHistory,
  listSimulationHistory,
} from '../../services/simulationHistoryApi'

import type {
  SimulationHistoryItem,
  SimulationHistorySource,
} from '../../services/simulationHistoryApi'

import type {
  Army,
  BattleSimulationInput,
} from '../../types/Battle'

import type {
  ReportPartyMetadata,
} from '../../types/ReportMetadata'

import './SimulationHistoryPanel.css'

interface SimulationHistoryPanelProps {
  refreshToken: number
  onOpen: (
    input: BattleSimulationInput,
  ) => void
}

const formatter =
  new Intl.NumberFormat('en-US')

const unitLabels: Record<
  UnitId,
  string
> = {
  spearman: 'Spearman',
  swordsman: 'Swordsman',
  axe: 'Axe Fighter',
  archer: 'Archer',
  lightCavalry: 'Light Cavalry',
  mountedArcher: 'Mounted Archer',
  heavyCavalry: 'Heavy Cavalry',
  ram: 'Ram',
  catapult: 'Catapult',
  berserker: 'Berserker',
  trebuchet: 'Trebuchet',
  nobleman: 'Nobleman',
  paladin: 'Paladin',
}

const sourceLabel = (
  source: SimulationHistorySource,
): string => {
  if (source === 'SPY_REPORT') {
    return 'Spy Report'
  }

  if (source === 'BATTLE_REPORT') {
    return 'Battle Report'
  }

  return 'Manual'
}

const armyTotal = (
  army: Army,
): number => {
  return units.reduce(
    (total, unit) =>
      total + (army[unit.id] ?? 0),
    0,
  )
}

const armySummary = (
  army: Army,
): string => {
  const active = units
    .map((unit) => ({
      label: unitLabels[unit.id],
      quantity: army[unit.id] ?? 0,
    }))
    .filter(
      (item) => item.quantity > 0,
    )
    .sort(
      (left, right) =>
        right.quantity - left.quantity,
    )
    .slice(0, 3)

  if (active.length === 0) {
    return 'No troops'
  }

  const summary = active
    .map(
      (item) =>
        `${formatter.format(
          item.quantity,
        )} ${item.label}`,
    )
    .join(' · ')

  const totalActive =
    units.filter(
      (unit) =>
        (army[unit.id] ?? 0) > 0,
    ).length

  return totalActive > active.length
    ? `${summary} · +${
        totalActive - active.length
      } more`
    : summary
}

const formatReportParty = (
  party: ReportPartyMetadata | null | undefined,
): string | null => {
  if (!party) {
    return null
  }

  const identity = [
    party.playerName,
    party.villageName,
  ]
    .filter(Boolean)
    .join(' · ')

  const coordinates =
    party.coordinates
      ? `(${party.coordinates.x}|${party.coordinates.y})`
      : ''

  const value = [
    identity,
    coordinates,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return value || null
}

const formatHistoryDate = (
  value: string,
): string => {
  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(date)
}

function SimulationHistoryPanel({
  refreshToken,
  onOpen,
}: SimulationHistoryPanelProps) {
  const [
    items,
    setItems,
  ] = useState<
    SimulationHistoryItem[]
  >([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  )

  const [
    actionMessage,
    setActionMessage,
  ] = useState<string | null>(
    null,
  )

  const [
    sharingId,
    setSharingId,
  ] = useState<string | null>(
    null,
  )

  const loadHistory =
    async () => {
      try {
        setLoading(true)
        setError(null)

        const result =
          await listSimulationHistory()

        setItems(result)
      } catch (historyError) {
        console.error(
          'Could not load simulation history:',
          historyError,
        )

        setError(
          historyError instanceof Error
            ? historyError.message
            : 'Could not load recent battles.',
        )
      } finally {
        setLoading(false)
      }
    }

  useEffect(() => {
    void loadHistory()
  }, [refreshToken])

  const totalSimulations =
    useMemo(
      () => items.length,
      [items],
    )

  const handleDelete =
    async (
      item:
        SimulationHistoryItem,
    ) => {
      try {
        await deleteSimulationHistory(
          item.id,
        )

        setItems(
          (current) =>
            current.filter(
              (candidate) =>
                candidate.id !==
                item.id,
            ),
        )

        setActionMessage(
          'Simulation removed from history.',
        )
      } catch (deleteError) {
        setActionMessage(
          deleteError instanceof Error
            ? deleteError.message
            : 'Could not remove simulation.',
        )
      }
    }

  const handleShare =
    async (
      item:
        SimulationHistoryItem,
    ) => {
      try {
        setSharingId(item.id)

        const code =
          await createSharedSimulation(
            item.payload,
          )

        const url =
          createShortShareUrl(code)

        await copyTextToClipboard(
          url,
        )

        setActionMessage(
          `Share link ${code} copied.`,
        )
      } catch (shareError) {
        setActionMessage(
          shareError instanceof Error
            ? shareError.message
            : 'Could not create share link.',
        )
      } finally {
        setSharingId(null)
      }
    }

  return (
    <section
      className="simulation-history-card"
      id="simulation-history"
    >
      <div className="simulation-history-header">
        <div>
          <span className="section-label">
            RECENT BATTLES
          </span>

          <h3>
            Simulation History
          </h3>

          <p>
            Your latest simulations are stored by the API for this browser.
          </p>
        </div>

        <div className="simulation-history-count">
          {totalSimulations}
        </div>
      </div>

      {actionMessage && (
        <div className="simulation-history-message">
          {actionMessage}
        </div>
      )}

      {loading ? (
        <div className="simulation-history-empty">
          Loading recent battles...
        </div>
      ) : error ? (
        <div className="simulation-history-error">
          <strong>
            History unavailable
          </strong>

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              void loadHistory()
            }
          >
            Try Again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="simulation-history-empty">
          <strong>
            No simulations saved yet
          </strong>

          <span>
            Simulate a battle and it will appear here automatically.
          </span>
        </div>
      ) : (
        <div className="simulation-history-list">
          {items.map((item) => {
            const attackerTotal =
              armyTotal(
                item.payload.attacker,
              )

            const defenderTotal =
              armyTotal(
                item.payload.defender,
              )

            return (
              <article
                className="simulation-history-item"
                key={item.id}
              >
                <div className="simulation-history-item-top">
                  <div>
                    <span
                      className={`history-source history-source-${item.source.toLowerCase()}`}
                    >
                      {sourceLabel(
                        item.source,
                      )}
                    </span>

                    <time
                      dateTime={
                        item.createdAt
                      }
                    >
                      {formatHistoryDate(
                        item.createdAt,
                      )}
                    </time>
                  </div>

                  <span className="history-saved-status">
                    Saved
                  </span>
                </div>

                {(item.reportMetadata?.attacker ||
                  item.reportMetadata?.defender) && (
                  <div className="simulation-history-report-context">
                    {formatReportParty(
                      item.reportMetadata?.attacker,
                    ) && (
                      <span>
                        <strong>From</strong>
                        {formatReportParty(
                          item.reportMetadata?.attacker,
                        )}
                      </span>
                    )}

                    {formatReportParty(
                      item.reportMetadata?.defender,
                    ) && (
                      <span>
                        <strong>Target</strong>
                        {formatReportParty(
                          item.reportMetadata?.defender,
                        )}
                      </span>
                    )}
                  </div>
                )}

                <div className="simulation-history-armies">
                  <div className="history-army">
                    <span>
                      Attacker
                    </span>

                    <strong>
                      {formatter.format(
                        attackerTotal,
                      )}{' '}
                      troops
                    </strong>

                    <small>
                      {armySummary(
                        item.payload
                          .attacker,
                      )}
                    </small>
                  </div>

                  <div className="history-versus">
                    VS
                  </div>

                  <div className="history-army">
                    <span>
                      Defender
                    </span>

                    <strong>
                      {formatter.format(
                        defenderTotal,
                      )}{' '}
                      troops
                    </strong>

                    <small>
                      {armySummary(
                        item.payload
                          .defender,
                      )}
                    </small>
                  </div>
                </div>

                <div className="simulation-history-actions">
                  <button
                    className="history-primary-button"
                    type="button"
                    onClick={() =>
                      onOpen(
                        item.payload,
                      )
                    }
                  >
                    Open
                  </button>

                  <button
                    type="button"
                    disabled={
                      sharingId ===
                      item.id
                    }
                    onClick={() =>
                      void handleShare(
                        item,
                      )
                    }
                  >
                    {sharingId ===
                    item.id
                      ? 'Sharing...'
                      : 'Share'}
                  </button>

                  <button
                    className="history-delete-button"
                    type="button"
                    onClick={() =>
                      void handleDelete(
                        item,
                      )
                    }
                  >
                    Delete
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default SimulationHistoryPanel
