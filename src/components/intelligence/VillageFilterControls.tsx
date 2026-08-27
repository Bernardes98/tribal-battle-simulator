import {
  VILLAGE_TAGS,
} from '../../domain/intelligence/villageAnnotations'

import type {
  VillageTag,
} from '../../domain/intelligence/villageAnnotations'

import type {
  VillageTagMatchMode,
  WatchlistAttentionFilter,
} from '../../domain/intelligence/villageFilters'

import './VillageFilterControls.css'

interface VillageFilterControlsProps {
  search: string
  onSearchChange: (
    value: string,
  ) => void
  selectedTags: VillageTag[]
  onSelectedTagsChange: (
    value: VillageTag[],
  ) => void
  tagMode: VillageTagMatchMode
  onTagModeChange: (
    value: VillageTagMatchMode,
  ) => void
  attention?: WatchlistAttentionFilter
  onAttentionChange?: (
    value: WatchlistAttentionFilter,
  ) => void
  resultCount?: number
}

function VillageFilterControls({
  search,
  onSearchChange,
  selectedTags,
  onSelectedTagsChange,
  tagMode,
  onTagModeChange,
  attention,
  onAttentionChange,
  resultCount,
}: VillageFilterControlsProps) {
  const toggleTag =
    (
      tag: VillageTag,
    ) => {
      if (
        selectedTags.includes(
          tag,
        )
      ) {
        onSelectedTagsChange(
          selectedTags.filter(
            (value) =>
              value !==
              tag,
          ),
        )

        return
      }

      onSelectedTagsChange([
        ...selectedTags,
        tag,
      ])
    }

  const hasFilters =
    Boolean(
      search.trim(),
    ) ||
    selectedTags.length >
      0 ||
    (
      attention !==
        undefined &&
      attention !==
        'all'
    )

  return (
    <div className="village-filter-controls">
      <div className="village-filter-controls-top">
        <label>
          <span>
            Search
          </span>

          <input
            type="search"
            value={search}
            placeholder="Player, village, coordinates, notes or tags..."
            onChange={(
              event,
            ) =>
              onSearchChange(
                event
                  .target
                  .value,
              )
            }
          />
        </label>

        {attention !==
          undefined &&
          onAttentionChange && (
          <label className="village-filter-attention">
            <span>
              Status
            </span>

            <select
              value={
                attention
              }
              onChange={(
                event,
              ) =>
                onAttentionChange(
                  event
                    .target
                    .value as WatchlistAttentionFilter,
                )
              }
            >
              <option value="all">
                All statuses
              </option>

              <option value="critical">
                Defense Alert
              </option>

              <option value="increased">
                Defense Increased
              </option>

              <option value="recent">
                Fresh Spy
              </option>

              <option value="stale">
                Needs Update
              </option>

              <option value="normal">
                Watching
              </option>
            </select>
          </label>
        )}

        <div className="village-filter-mode">
          <span>
            Tags match
          </span>

          <div>
            <button
              type="button"
              className={
                tagMode ===
                'any'
                  ? 'active'
                  : undefined
              }
              onClick={() =>
                onTagModeChange(
                  'any',
                )
              }
            >
              Any
            </button>

            <button
              type="button"
              className={
                tagMode ===
                'all'
                  ? 'active'
                  : undefined
              }
              onClick={() =>
                onTagModeChange(
                  'all',
                )
              }
            >
              All
            </button>
          </div>
        </div>

        {hasFilters && (
          <button
            type="button"
            className="village-filter-clear"
            onClick={() => {
              onSearchChange('')
              onSelectedTagsChange([])
              onTagModeChange(
                'any',
              )

              if (
                onAttentionChange
              ) {
                onAttentionChange(
                  'all',
                )
              }
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="village-filter-tags-row">
        <div className="village-filter-tags">
          {VILLAGE_TAGS.map(
            (tag) => (
              <button
                key={
                  tag
                }
                type="button"
                className={
                  selectedTags.includes(
                    tag,
                  )
                    ? 'active'
                    : undefined
                }
                onClick={() =>
                  toggleTag(
                    tag,
                  )
                }
              >
                {selectedTags.includes(
                  tag,
                )
                  ? '✓ '
                  : ''}
                {tag}
              </button>
            ),
          )}
        </div>

        {resultCount !==
          undefined && (
          <span className="village-filter-result-count">
            {resultCount}{' '}
            {resultCount ===
            1
              ? 'result'
              : 'results'}
          </span>
        )}
      </div>
    </div>
  )
}

export default VillageFilterControls
