import {
  deleteServerIntelligenceAnnotation,
  saveServerIntelligenceAnnotation,
} from '../../services/intelligenceApi'

export const VILLAGE_ANNOTATIONS_CHANGED_EVENT =
  'tribal-battle-village-annotations-changed'

const STORAGE_KEY =
  'tribal-battle-village-annotations-v1'

export const VILLAGE_TAGS = [
  'Target',
  'Farm',
  'Strong Defense',
  'Noble Target',
  'Priority',
  'Avoid',
] as const

export type VillageTag =
  (typeof VILLAGE_TAGS)[number]

export interface VillageAnnotation {
  villageKey: string
  tags: VillageTag[]
  note: string
  updatedAt: string
}

type StoredVillageAnnotations =
  Record<string, VillageAnnotation>

const normalizeTags = (
  values: unknown,
): VillageTag[] => {
  if (!Array.isArray(values)) {
    return []
  }

  const allowed =
    new Set<string>(
      VILLAGE_TAGS,
    )

  return [
    ...new Set(
      values.filter(
        (
          value,
        ): value is VillageTag =>
          typeof value ===
            'string' &&
          allowed.has(value),
      ),
    ),
  ]
}

export const loadVillageAnnotations =
  (): StoredVillageAnnotations => {
    if (
      typeof window ===
      'undefined'
    ) {
      return {}
    }

    try {
      const raw =
        window.localStorage.getItem(
          STORAGE_KEY,
        )

      if (!raw) {
        return {}
      }

      const parsed =
        JSON.parse(raw) as Record<
          string,
          Partial<VillageAnnotation>
        >

      return Object.fromEntries(
        Object.entries(parsed).map(
          ([villageKey, value]) => [
            villageKey,
            {
              villageKey,
              tags:
                normalizeTags(
                  value.tags,
                ),
              note:
                typeof value.note ===
                'string'
                  ? value.note.slice(0, 1000)
                  : '',
              updatedAt:
                typeof value.updatedAt ===
                'string'
                  ? value.updatedAt
                  : new Date(0).toISOString(),
            },
          ],
        ),
      )
    } catch {
      return {}
    }
  }

export const getVillageAnnotation = (
  villageKey: string,
): VillageAnnotation => {
  const values =
    loadVillageAnnotations()

  return values[villageKey] ?? {
    villageKey,
    tags: [],
    note: '',
    updatedAt:
      new Date(0).toISOString(),
  }
}

export const saveVillageAnnotation = (
  villageKey: string,
  tags: VillageTag[],
  note: string,
): VillageAnnotation => {
  const values =
    loadVillageAnnotations()

  const annotation: VillageAnnotation = {
    villageKey,
    tags:
      normalizeTags(tags),
    note:
      note.trim().slice(0, 1000),
    updatedAt:
      new Date().toISOString(),
  }

  values[villageKey] =
    annotation

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(values),
  )

  window.dispatchEvent(
    new CustomEvent(
      VILLAGE_ANNOTATIONS_CHANGED_EVENT,
    ),
  )

  void saveServerIntelligenceAnnotation({
    villageKey: annotation.villageKey,
    tags: annotation.tags,
    note: annotation.note,
  }).catch((error) => {
    console.warn(
      'Could not persist village annotation to server-side intelligence:',
      error,
    )
  })

  return annotation
}

export const deleteVillageAnnotation = (
  villageKey: string,
): void => {
  const values =
    loadVillageAnnotations()

  delete values[villageKey]

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(values),
  )

  window.dispatchEvent(
    new CustomEvent(
      VILLAGE_ANNOTATIONS_CHANGED_EVENT,
    ),
  )

  void deleteServerIntelligenceAnnotation(
    villageKey,
  ).catch((error) => {
    console.warn(
      'Could not delete village annotation from server-side intelligence:',
      error,
    )
  })
}

export const toggleVillageTag = (
  tags: VillageTag[],
  tag: VillageTag,
): VillageTag[] => {
  return tags.includes(tag)
    ? tags.filter(
        (value) =>
          value !== tag,
      )
    : [...tags, tag]
}
