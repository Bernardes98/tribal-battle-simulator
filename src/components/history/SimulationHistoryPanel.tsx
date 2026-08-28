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
  bulkDeleteSimulationHistory,
  deleteSimulationHistory,
  searchSimulationHistory,
  updateSimulationHistoryFavorite,
} from '../../services/simulationHistoryApi'

import type {
  SimulationHistoryItem,
  SimulationHistorySort,
  SimulationHistorySortDirection,
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

const DEFAULT_PAGE_SIZE = 10

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

const startOfLocalDateIso = (
  value: string,
): string | undefined => {
  if (!value) {
    return undefined
  }

  const date =
    new Date(
      `${value}T00:00:00.000`,
    )

  return Number.isNaN(
    date.getTime(),
  )
    ? undefined
    : date.toISOString()
}

const endOfLocalDateIso = (
  value: string,
): string | undefined => {
  if (!value) {
    return undefined
  }

  const date =
    new Date(
      `${value}T23:59:59.999`,
    )

  return Number.isNaN(
    date.getTime(),
  )
    ? undefined
    : date.toISOString()
}

function SimulationHistoryPanel({
  refreshToken,
  onOpen,
}: SimulationHistoryPanelProps) {
  const [
    items,
    setItems,
  ] = useState<SimulationHistoryItem[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState<string | null>(null)

  const [
    actionMessage,
    setActionMessage,
  ] = useState<string | null>(null)

  const [
    sharingId,
    setSharingId,
  ] = useState<string | null>(null)

  const [
    favoriteUpdatingId,
    setFavoriteUpdatingId,
  ] = useState<string | null>(null)

  const [
    deletingSelection,
    setDeletingSelection,
  ] = useState(false)

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<Set<string>>(
    () => new Set(),
  )

  const [
    page,
    setPage,
  ] = useState(0)

  const [
    pageSize,
    setPageSize,
  ] = useState(DEFAULT_PAGE_SIZE)

  const [
    totalElements,
    setTotalElements,
  ] = useState(0)

  const [
    totalPages,
    setTotalPages,
  ] = useState(0)

  const [
    searchText,
    setSearchText,
  ] = useState('')

  const [
    playerFilter,
    setPlayerFilter,
  ] = useState('')

  const [
    villageFilter,
    setVillageFilter,
  ] = useState('')

  const [
    debouncedSearchText,
    setDebouncedSearchText,
  ] = useState('')

  const [
    debouncedPlayerFilter,
    setDebouncedPlayerFilter,
  ] = useState('')

  const [
    debouncedVillageFilter,
    setDebouncedVillageFilter,
  ] = useState('')

  const [
    sourceFilter,
    setSourceFilter,
  ] = useState<SimulationHistorySource | ''>('')

  const [
    fromDate,
    setFromDate,
  ] = useState('')

  const [
    toDate,
    setToDate,
  ] = useState('')

  const [
    favoritesOnly,
    setFavoritesOnly,
  ] = useState(false)

  const [
    sortField,
    setSortField,
  ] = useState<SimulationHistorySort>('createdAt')

  const [
    sortDirection,
    setSortDirection,
  ] = useState<SimulationHistorySortDirection>('desc')

  useEffect(() => {
    const timeout =
      window.setTimeout(
        () => {
          setDebouncedSearchText(
            searchText.trim(),
          )
          setDebouncedPlayerFilter(
            playerFilter.trim(),
          )
          setDebouncedVillageFilter(
            villageFilter.trim(),
          )
          setPage(0)
        },
        350,
      )

    return () => {
      window.clearTimeout(
        timeout,
      )
    }
  }, [
    searchText,
    playerFilter,
    villageFilter,
  ])

  const loadHistory =
    async () => {
      try {
        setLoading(true)
        setError(null)

        const result =
          await searchSimulationHistory({
            page,
            size: pageSize,
            source:
              sourceFilter || null,
            player:
              debouncedPlayerFilter,
            village:
              debouncedVillageFilter,
            from:
              startOfLocalDateIso(
                fromDate,
              ),
            to:
              endOfLocalDateIso(
                toDate,
              ),
            favorite:
              favoritesOnly
                ? true
                : null,
            search:
              debouncedSearchText,
            sort: sortField,
            direction:
              sortDirection,
          })

        setItems(result.content)
        setTotalElements(
          result.totalElements,
        )
        setTotalPages(
          result.totalPages,
        )
        setSelectedIds(
          new Set(),
        )

        if (
          result.totalPages > 0 &&
          result.page >= result.totalPages
        ) {
          setPage(
            result.totalPages - 1,
          )
        }
      } catch (historyError) {
        console.error(
          'Could not load simulation history:',
          historyError,
        )

        setError(
          historyError instanceof Error
            ? historyError.message
            : 'Could not load battle history.',
        )
      } finally {
        setLoading(false)
      }
    }

  useEffect(() => {
    void loadHistory()
  }, [
    refreshToken,
    page,
    pageSize,
    sourceFilter,
    debouncedSearchText,
    debouncedPlayerFilter,
    debouncedVillageFilter,
    fromDate,
    toDate,
    favoritesOnly,
    sortField,
    sortDirection,
  ])

  const allPageSelected =
    useMemo(
      () =>
        items.length > 0 &&
        items.every(
          (item) =>
            selectedIds.has(
              item.id,
            ),
        ),
      [
        items,
        selectedIds,
      ],
    )

  const hasFilters =
    Boolean(
      searchText ||
        playerFilter ||
        villageFilter ||
        sourceFilter ||
        fromDate ||
        toDate ||
        favoritesOnly,
    )

  const handleDelete =
    async (
      item: SimulationHistoryItem,
    ) => {
      try {
        await deleteSimulationHistory(
          item.id,
        )

        setActionMessage(
          'Simulation removed from history.',
        )
        await loadHistory()
      } catch (deleteError) {
        setActionMessage(
          deleteError instanceof Error
            ? deleteError.message
            : 'Could not remove simulation.',
        )
      }
    }

  const handleBulkDelete =
    async () => {
      const ids =
        Array.from(
          selectedIds,
        )

      if (ids.length === 0) {
        return
      }

      const confirmed =
        window.confirm(
          `Delete ${ids.length} selected ${
            ids.length === 1
              ? 'simulation'
              : 'simulations'
          }? This cannot be undone.`,
        )

      if (!confirmed) {
        return
      }

      try {
        setDeletingSelection(true)

        const response =
          await bulkDeleteSimulationHistory(
            ids,
          )

        setActionMessage(
          `${response.deletedCount} ${
            response.deletedCount === 1
              ? 'simulation was'
              : 'simulations were'
          } removed.`,
        )

        await loadHistory()
      } catch (deleteError) {
        setActionMessage(
          deleteError instanceof Error
            ? deleteError.message
            : 'Could not remove selected simulations.',
        )
      } finally {
        setDeletingSelection(false)
      }
    }

  const handleFavorite =
    async (
      item: SimulationHistoryItem,
    ) => {
      try {
        setFavoriteUpdatingId(
          item.id,
        )

        const updated =
          await updateSimulationHistoryFavorite(
            item.id,
            !item.favorite,
          )

        setItems(
          (current) =>
            current.map(
              (candidate) =>
                candidate.id ===
                updated.id
                  ? updated
                  : candidate,
            ),
        )

        if (
          favoritesOnly &&
          !updated.favorite
        ) {
          await loadHistory()
        }
      } catch (favoriteError) {
        setActionMessage(
          favoriteError instanceof Error
            ? favoriteError.message
            : 'Could not update favorite.',
        )
      } finally {
        setFavoriteUpdatingId(null)
      }
    }

  const handleShare =
    async (
      item: SimulationHistoryItem,
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

  const toggleSelection = (
    id: string,
  ) => {
    setSelectedIds(
      (current) => {
        const next =
          new Set(current)

        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }

        return next
      },
    )
  }

  const togglePageSelection = () => {
    setSelectedIds(
      () => {
        if (allPageSelected) {
          return new Set()
        }

        return new Set(
          items.map(
            (item) => item.id,
          ),
        )
      },
    )
  }

  const clearFilters = () => {
    setSearchText('')
    setPlayerFilter('')
    setVillageFilter('')
    setDebouncedSearchText('')
    setDebouncedPlayerFilter('')
    setDebouncedVillageFilter('')
    setSourceFilter('')
    setFromDate('')
    setToDate('')
    setFavoritesOnly(false)
    setSortField('createdAt')
    setSortDirection('desc')
    setPage(0)
  }

  const pageDisplay =
    totalPages === 0
      ? 0
      : page + 1

  return (
    <section
      className="simulation-history-card"
      id="simulation-history"
    >
      <div className="simulation-history-header">
        <div>
          <span className="section-label">
            HISTORY V2
          </span>

          <h3>
            Simulation History
          </h3>

          <p>
            Search, filter, favorite and manage your saved battles with server-side pagination.
          </p>
        </div>

        <div className="simulation-history-count">
          {formatter.format(
            totalElements,
          )}
        </div>
      </div>

      <div className="simulation-history-filters">
        <label className="history-filter history-search-filter">
          <span>Search</span>
          <input
            type="search"
            value={searchText}
            placeholder="Player, village, coordinates or report..."
            onChange={(event) =>
              setSearchText(
                event.target.value,
              )
            }
          />
        </label>

        <label className="history-filter">
          <span>Player</span>
          <input
            type="text"
            value={playerFilter}
            placeholder="Any player"
            onChange={(event) =>
              setPlayerFilter(
                event.target.value,
              )
            }
          />
        </label>

        <label className="history-filter">
          <span>Village</span>
          <input
            type="text"
            value={villageFilter}
            placeholder="Any village"
            onChange={(event) =>
              setVillageFilter(
                event.target.value,
              )
            }
          />
        </label>

        <label className="history-filter">
          <span>Type</span>
          <select
            value={sourceFilter}
            onChange={(event) => {
              setSourceFilter(
                event.target.value as SimulationHistorySource | '',
              )
              setPage(0)
            }}
          >
            <option value="">
              All types
            </option>
            <option value="SPY_REPORT">
              Spy Report
            </option>
            <option value="BATTLE_REPORT">
              Battle Report
            </option>
            <option value="MANUAL">
              Manual
            </option>
          </select>
        </label>

        <label className="history-filter">
          <span>From</span>
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) => {
              setFromDate(
                event.target.value,
              )
              setPage(0)
            }}
          />
        </label>

        <label className="history-filter">
          <span>To</span>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => {
              setToDate(
                event.target.value,
              )
              setPage(0)
            }}
          />
        </label>

        <label className="history-filter">
          <span>Sort</span>
          <select
            value={sortField}
            onChange={(event) => {
              setSortField(
                event.target.value as SimulationHistorySort,
              )
              setPage(0)
            }}
          >
            <option value="createdAt">
              Date
            </option>
            <option value="source">
              Type
            </option>
            <option value="player">
              Player
            </option>
            <option value="village">
              Village
            </option>
            <option value="favorite">
              Favorite
            </option>
          </select>
        </label>

        <label className="history-filter">
          <span>Order</span>
          <select
            value={sortDirection}
            onChange={(event) => {
              setSortDirection(
                event.target.value as SimulationHistorySortDirection,
              )
              setPage(0)
            }}
          >
            <option value="desc">
              Descending
            </option>
            <option value="asc">
              Ascending
            </option>
          </select>
        </label>

        <label className="history-filter">
          <span>Per page</span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(
                Number(
                  event.target.value,
                ),
              )
              setPage(0)
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>

        <label className="history-favorite-filter">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(event) => {
              setFavoritesOnly(
                event.target.checked,
              )
              setPage(0)
            }}
          />
          <span>
            ★ Favorites only
          </span>
        </label>

        <button
          className="history-clear-filters"
          type="button"
          disabled={!hasFilters}
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      </div>

      {actionMessage && (
        <div className="simulation-history-message">
          {actionMessage}
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="simulation-history-selection-bar">
          <label>
            <input
              type="checkbox"
              checked={allPageSelected}
              onChange={togglePageSelection}
            />
            <span>
              Select page
            </span>
          </label>

          <span>
            {selectedIds.size} selected
          </span>

          <button
            type="button"
            disabled={
              selectedIds.size === 0 ||
              deletingSelection
            }
            onClick={() =>
              void handleBulkDelete()
            }
          >
            {deletingSelection
              ? 'Deleting...'
              : 'Delete Selected'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="simulation-history-empty">
          Loading battle history...
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
            {hasFilters
              ? 'No history matches these filters'
              : 'No simulations saved yet'}
          </strong>

          <span>
            {hasFilters
              ? 'Try changing or clearing one of the filters above.'
              : 'Simulate a battle and it will appear here automatically.'}
          </span>

          {hasFilters && (
            <button
              className="history-empty-clear"
              type="button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
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
                  className={`simulation-history-item${
                    item.favorite
                      ? ' simulation-history-item-favorite'
                      : ''
                  }`}
                  key={item.id}
                >
                  <div className="simulation-history-item-top">
                    <div className="history-item-identity">
                      <input
                        className="history-item-checkbox"
                        type="checkbox"
                        aria-label="Select simulation"
                        checked={
                          selectedIds.has(
                            item.id,
                          )
                        }
                        onChange={() =>
                          toggleSelection(
                            item.id,
                          )
                        }
                      />

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

                    <button
                      className={`history-favorite-button${
                        item.favorite
                          ? ' is-favorite'
                          : ''
                      }`}
                      type="button"
                      aria-label={
                        item.favorite
                          ? 'Remove from favorites'
                          : 'Add to favorites'
                      }
                      title={
                        item.favorite
                          ? 'Remove from favorites'
                          : 'Add to favorites'
                      }
                      disabled={
                        favoriteUpdatingId ===
                        item.id
                      }
                      onClick={() =>
                        void handleFavorite(
                          item,
                        )
                      }
                    >
                      {item.favorite
                        ? '★'
                        : '☆'}
                    </button>
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

          <div className="simulation-history-pagination">
            <div>
              <strong>
                Page {pageDisplay} of {totalPages}
              </strong>
              <span>
                {formatter.format(
                  totalElements,
                )}{' '}
                total results
              </span>
            </div>

            <div className="history-pagination-buttons">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() =>
                  setPage(0)
                }
              >
                First
              </button>

              <button
                type="button"
                disabled={page <= 0}
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        current - 1,
                        0,
                      ),
                  )
                }
              >
                Previous
              </button>

              <button
                type="button"
                disabled={
                  page + 1 >=
                  totalPages
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      current + 1,
                  )
                }
              >
                Next
              </button>

              <button
                type="button"
                disabled={
                  page + 1 >=
                  totalPages
                }
                onClick={() =>
                  setPage(
                    Math.max(
                      totalPages - 1,
                      0,
                    ),
                  )
                }
              >
                Last
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default SimulationHistoryPanel
