import {
  useEffect,
  useState,
} from 'react'

import {
  deleteVillageAnnotation,
  getVillageAnnotation,
  saveVillageAnnotation,
  toggleVillageTag,
  VILLAGE_TAGS,
} from '../../domain/intelligence/villageAnnotations'

import type {
  VillageTag,
} from '../../domain/intelligence/villageAnnotations'

import type {
  VillageIntelligence,
} from '../../domain/intelligence/playerVillageIntelligence'

import './VillageNotesTagsPanel.css'

interface VillageNotesTagsPanelProps {
  village: VillageIntelligence
}

function VillageNotesTagsPanel({
  village,
}: VillageNotesTagsPanelProps) {
  const [tags, setTags] =
    useState<VillageTag[]>([])

  const [note, setNote] =
    useState('')

  const [saved, setSaved] =
    useState(false)

  useEffect(
    () => {
      const annotation =
        getVillageAnnotation(
          village.key,
        )

      setTags(annotation.tags)
      setNote(annotation.note)
      setSaved(false)
    },
    [village.key],
  )

  const handleSave = () => {
    const annotation =
      saveVillageAnnotation(
        village.key,
        tags,
        note,
      )

    setTags(annotation.tags)
    setNote(annotation.note)
    setSaved(true)

    window.setTimeout(
      () => setSaved(false),
      1500,
    )
  }

  const handleClear = () => {
    deleteVillageAnnotation(
      village.key,
    )
    setTags([])
    setNote('')
    setSaved(false)
  }

  return (
    <section className="village-notes-tags">
      <div className="village-notes-tags-header">
        <div>
          <span>Village Notes & Tags</span>
          <strong>
            {village.playerName} · {village.villageName}
          </strong>
        </div>
      </div>

      <div className="village-notes-tags-body">
        <div className="village-notes-tags-group">
          <span className="village-notes-tags-label">Tags</span>

          <div className="village-notes-tags-options">
            {VILLAGE_TAGS.map(
              (tag) => {
                const active =
                  tags.includes(tag)

                return (
                  <button
                    key={tag}
                    type="button"
                    className={active ? 'active' : undefined}
                    onClick={() =>
                      setTags(
                        toggleVillageTag(
                          tags,
                          tag,
                        ),
                      )
                    }
                  >
                    {active ? '✓ ' : ''}
                    {tag}
                  </button>
                )
              },
            )}
          </div>
        </div>

        <label className="village-notes-tags-note">
          <span className="village-notes-tags-label">Notes</span>

          <textarea
            value={note}
            maxLength={1000}
            rows={5}
            placeholder="Add observations about this village, timing, troop behavior or noble opportunities..."
            onChange={(event) =>
              setNote(
                event.target.value,
              )
            }
          />

          <small>
            {note.length}/1000
          </small>
        </label>

        <div className="village-notes-tags-actions">
          <button
            type="button"
            className="primary"
            onClick={handleSave}
          >
            {saved ? 'Saved ✓' : 'Save Notes'}
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={
              tags.length === 0 &&
              note.trim().length === 0
            }
          >
            Clear
          </button>
        </div>
      </div>
    </section>
  )
}

export default VillageNotesTagsPanel
