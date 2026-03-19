export type EntryType =
  | 'spell'
  | 'statBlock'
  | 'classFeature'
  | 'feat'
  | 'item'
  | 'magicItem'
  | 'condition'
  | 'rule'
  | 'trait'
  | 'action'
  | 'table'
  | 'other'

export interface ScannedEntry {
  id: string
  entryType: EntryType
  name: string
  fields: Record<string, unknown>
  description: string
  source?: string
}

export interface ScanResult {
  system: string
  pageDescription: string
  entries: Omit<ScannedEntry, 'id'>[]
}

export interface ImageData {
  base64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  name: string
}

export interface SpellFields {
  level?: number | string
  school?: string
  castingTime?: string
  range?: string
  components?: string
  duration?: string
  classes?: string[]
  ritual?: boolean
  concentration?: boolean
}

export interface StatBlockFields {
  cr?: string
  type?: string
  size?: string
  alignment?: string
  ac?: string | number
  hp?: string
  speed?: string
  str?: number
  dex?: number
  con?: number
  int?: number
  wis?: number
  cha?: number
  savingThrows?: string
  skills?: string
  senses?: string
  languages?: string
  traits?: Array<{ name: string; description: string }>
  actions?: Array<{ name: string; description: string }>
  legendaryActions?: Array<{ name: string; description: string }>
}

export interface ClassFeatureFields {
  class?: string
  level?: number | string
  subclass?: string
  uses?: string
  restType?: string
}

export interface FeatFields {
  prerequisite?: string
  category?: string
}

export interface MagicItemFields {
  rarity?: string
  attunement?: string | boolean
  itemType?: string
}

export interface TableFields {
  headers?: string[]
  rows?: string[][]
  caption?: string
}

export interface ScanHistoryItem {
  id: string
  timestamp: number
  system: string
  pageDescription: string
  entries: ScannedEntry[]
  imageName?: string
}

export type ModelId = 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514'

export const MODEL_OPTIONS: { id: ModelId; label: string }[] = [
  { id: 'claude-sonnet-4-20250514', label: 'Sonnet 4 (Recommended)' },
  { id: 'claude-opus-4-20250514', label: 'Opus 4 (Best Quality)' },
]

export const ENTRY_TYPE_COLORS: Record<EntryType, string> = {
  spell: '#4a90d9',
  statBlock: '#e74c3c',
  classFeature: '#2ecc71',
  feat: '#e67e22',
  item: '#95a5a6',
  magicItem: '#f1c40f',
  condition: '#e91e63',
  rule: '#607d8b',
  trait: '#1abc9c',
  action: '#ff7043',
  table: '#78909c',
  other: '#9e9e9e',
}

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  spell: 'Spell',
  statBlock: 'Stat Block',
  classFeature: 'Class Feature',
  feat: 'Feat',
  item: 'Item',
  magicItem: 'Magic Item',
  condition: 'Condition',
  rule: 'Rule',
  trait: 'Trait',
  action: 'Action',
  table: 'Table',
  other: 'Other',
}
