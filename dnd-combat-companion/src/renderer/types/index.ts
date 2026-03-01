export interface SpellEntry {
  _type: 'spell'
  id: string
  name: string
  level: number          // 0 = cantrip
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  concentration: boolean
  classes: string[]
  description: string
  higherLevels?: string
}

export interface FeatureEntry {
  _type: 'feature'
  id: string
  name: string
  class: string
  levelAvailable: number
  description: string
  subclass?: string
  usesPerRest?: string
  restType?: 'short' | 'long' | 'none'
}

export interface FeatEntry {
  _type: 'feat'
  id: string
  name: string
  description: string
  featType?: string
}

export interface EquipmentEntry {
  _type: 'equipment'
  id: string
  name: string
  description: string
}

export interface BackgroundEntry {
  _type: 'background'
  id: string
  name: string
  description: string
}

export interface SpeciesEntry {
  _type: 'species'
  id: string
  name: string
  description: string
}

export interface RulesEntry {
  _type: 'rules'
  id: string
  name: string
  description: string
}

export interface MagicItemEntry {
  _type: 'magicItem'
  id: string
  name: string
  description: string
  rarity?: string
  attunement?: boolean
}

export interface DaggerheartEntry {
  _type: 'daggerheart'
  id: string
  name: string
  description: string
  category: 'domain' | 'class features' | 'rules' | 'adversary'
}

export type Entry =
  | SpellEntry
  | FeatureEntry
  | FeatEntry
  | EquipmentEntry
  | BackgroundEntry
  | SpeciesEntry
  | RulesEntry
  | MagicItemEntry
  | DaggerheartEntry

export type EntryType = Entry['_type']

// ─── Type guards ─────────────────────────────────────────────────────────────

export function isSpell(e: Entry): e is SpellEntry {
  return e._type === 'spell'
}

export function isFeature(e: Entry): e is FeatureEntry {
  return e._type === 'feature'
}

export function isFeat(e: Entry): e is FeatEntry {
  return e._type === 'feat'
}

export function isEquipment(e: Entry): e is EquipmentEntry {
  return e._type === 'equipment'
}

export function isBackground(e: Entry): e is BackgroundEntry {
  return e._type === 'background'
}

export function isSpecies(e: Entry): e is SpeciesEntry {
  return e._type === 'species'
}

export function isRules(e: Entry): e is RulesEntry {
  return e._type === 'rules'
}

export function isMagicItem(e: Entry): e is MagicItemEntry {
  return e._type === 'magicItem'
}

export function isDaggerheart(e: Entry): e is DaggerheartEntry {
  return e._type === 'daggerheart'
}

export interface Detection {
  id: string
  keyword: string       // matched keyword (lowercase)
  entry: Entry
  detectedAt: number    // Date.now()
  expanded: boolean
  pinned: boolean       // if true, auto-dismiss timer is suppressed
}

export interface KeywordDetectedPayload {
  keyword: string
  id: string
  timestamp: number
}
