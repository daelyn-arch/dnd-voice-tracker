import type {
  SpellEntry, FeatureEntry, FeatEntry, EquipmentEntry,
  BackgroundEntry, SpeciesEntry, RulesEntry, MagicItemEntry,
  DaggerheartEntry, Entry, EntryType
} from '../types'

// Full (personal use) D&D data
import spellsFullRaw from './spells.json'
import featuresFullRaw from './features.json'
import featsFullRaw from './feats.json'
import equipmentFullRaw from './equipment.json'
import backgroundsFullRaw from './backgrounds.json'
import speciesFullRaw from './species.json'
import rulesFullRaw from './rules.json'
import magicItemsFullRaw from './magicItems.json'

// SRD-only D&D data (for commercial distribution)
import spellsSrdRaw from './spells_srd.json'
import featuresSrdRaw from './features_srd.json'
import featsSrdRaw from './feats_srd.json'
import equipmentSrdRaw from './equipment_srd.json'
import backgroundsSrdRaw from './backgrounds_srd.json'
import speciesSrdRaw from './species_srd.json'
import rulesSrdRaw from './rules_srd.json'
import magicItemsSrdRaw from './magicItems_srd.json'

// Daggerheart data
import daggerheartCoreBookRaw from './daggerheart.json'
import daggerheartSrdRaw from './daggerheart_srd.json'

export type DndSource = 'full' | 'srd'
export type DaggerheartSource = 'corebook' | 'srd'

// Tag each entry with _type discriminant at load time — both Full and SRD datasets
const spellsFullData: SpellEntry[] = (spellsFullRaw as any[]).map((s) => ({ ...s, _type: 'spell' as const }))
const featuresFullData: FeatureEntry[] = (featuresFullRaw as any[]).map((f) => ({ ...f, _type: 'feature' as const }))
const featsFullData: FeatEntry[] = (featsFullRaw as any[]).map((f) => ({ ...f, _type: 'feat' as const }))
const equipmentFullData: EquipmentEntry[] = (equipmentFullRaw as any[]).map((e) => ({ ...e, _type: 'equipment' as const }))
const backgroundsFullData: BackgroundEntry[] = (backgroundsFullRaw as any[]).map((b) => ({ ...b, _type: 'background' as const }))
const speciesFullData: SpeciesEntry[] = (speciesFullRaw as any[]).map((s) => ({ ...s, _type: 'species' as const }))
const rulesFullData: RulesEntry[] = (rulesFullRaw as any[]).map((r) => ({ ...r, _type: 'rules' as const }))
const magicItemsFullData: MagicItemEntry[] = (magicItemsFullRaw as any[]).map((m) => ({ ...m, _type: 'magicItem' as const }))

const spellsSrdData: SpellEntry[] = (spellsSrdRaw as any[]).map((s) => ({ ...s, _type: 'spell' as const }))
const featuresSrdData: FeatureEntry[] = (featuresSrdRaw as any[]).map((f) => ({ ...f, _type: 'feature' as const }))
const featsSrdData: FeatEntry[] = (featsSrdRaw as any[]).map((f) => ({ ...f, _type: 'feat' as const }))
const equipmentSrdData: EquipmentEntry[] = (equipmentSrdRaw as any[]).map((e) => ({ ...e, _type: 'equipment' as const }))
const backgroundsSrdData: BackgroundEntry[] = (backgroundsSrdRaw as any[]).map((b) => ({ ...b, _type: 'background' as const }))
const speciesSrdData: SpeciesEntry[] = (speciesSrdRaw as any[]).map((s) => ({ ...s, _type: 'species' as const }))
const rulesSrdData: RulesEntry[] = (rulesSrdRaw as any[]).map((r) => ({ ...r, _type: 'rules' as const }))
const magicItemsSrdData: MagicItemEntry[] = (magicItemsSrdRaw as any[]).map((m) => ({ ...m, _type: 'magicItem' as const }))

// Both Daggerheart datasets, tagged at load time
const daggerheartCoreBookData: DaggerheartEntry[] = (daggerheartCoreBookRaw as any[]).map((d) => ({ ...d, _type: 'daggerheart' as const }))
const daggerheartSrdData: DaggerheartEntry[] = (daggerheartSrdRaw as any[]).map((d) => ({ ...d, _type: 'daggerheart' as const }))

// Active sources — defaults to full/corebook for personal use
let activeDndSource: DndSource = 'full'
let activeDaggerheartSource: DaggerheartSource = 'corebook'

// Mutable references that switch when source changes
let spellsData = spellsFullData
let featuresData = featuresFullData
let featsData = featsFullData
let equipmentData = equipmentFullData
let backgroundsData = backgroundsFullData
let speciesData = speciesFullData
let rulesData = rulesFullData
let magicItemsData = magicItemsFullData
let daggerheartData: DaggerheartEntry[] = daggerheartCoreBookData

// Normalize: lowercase, collapse hyphens/whitespace to single space
function normalize(s: string): string {
  return s.toLowerCase().replace(/[-\s]+/g, ' ').trim()
}

// Custom cards — must be declared before rebuildLookupMap() is called
let customCards: Entry[] = []
let customCardsRaw: CustomCardData[] = []

// Build lookup map — rebuilt when data source changes
let lookupMap = new Map<string, Entry>()
// Originals that should also appear when showBoth is enabled for a modified entry
let showBothOriginals = new Map<string, Entry>()

function rebuildLookupMap(): void {
  lookupMap = new Map<string, Entry>()
  showBothOriginals = new Map<string, Entry>()

  // First pass: load all bundled entries
  const bundledSources: Entry[][] = [
    spellsData, featuresData, featsData, equipmentData,
    backgroundsData, speciesData, rulesData, magicItemsData,
    daggerheartData
  ]
  for (const entries of bundledSources) {
    for (const entry of entries) {
      lookupMap.set(normalize(entry.name), entry)
      const aliases = (entry as any).aliases as string[] | undefined
      if (aliases) {
        for (const alias of aliases) {
          lookupMap.set(normalize(alias), entry)
        }
      }
    }
  }

  // Second pass: overlay custom/modified cards — save originals for showBoth
  for (let i = 0; i < customCardsRaw.length; i++) {
    const raw = customCardsRaw[i]
    const entry = customCards[i]
    if (!entry) continue
    const key = normalize(entry.name)

    if (raw.originalEntryId && raw.showBoth) {
      // Save the original before overwriting
      const original = lookupMap.get(key)
      if (original && original.id !== entry.id) {
        showBothOriginals.set(key, original)
      }
    }

    lookupMap.set(key, entry)
    const aliases = (entry as any).aliases as string[] | undefined
    if (aliases) {
      for (const alias of aliases) {
        lookupMap.set(normalize(alias), entry)
      }
    }
  }
}

// Initial build
rebuildLookupMap()

/** Get the current D&D data source */
export function getDndSource(): DndSource {
  return activeDndSource
}

/** Switch the active D&D data source and rebuild lookups */
export function setDndSource(source: DndSource): void {
  if (source === activeDndSource) return
  activeDndSource = source
  const isSrd = source === 'srd'
  spellsData = isSrd ? spellsSrdData : spellsFullData
  featuresData = isSrd ? featuresSrdData : featuresFullData
  featsData = isSrd ? featsSrdData : featsFullData
  equipmentData = isSrd ? equipmentSrdData : equipmentFullData
  backgroundsData = isSrd ? backgroundsSrdData : backgroundsFullData
  speciesData = isSrd ? speciesSrdData : speciesFullData
  rulesData = isSrd ? rulesSrdData : rulesFullData
  magicItemsData = isSrd ? magicItemsSrdData : magicItemsFullData
  rebuildLookupMap()
}

/** Get the current Daggerheart data source */
export function getDaggerheartSource(): DaggerheartSource {
  return activeDaggerheartSource
}

/** Switch the active Daggerheart data source and rebuild lookups */
export function setDaggerheartSource(source: DaggerheartSource): void {
  if (source === activeDaggerheartSource) return
  activeDaggerheartSource = source
  daggerheartData = source === 'corebook' ? daggerheartCoreBookData : daggerheartSrdData
  rebuildLookupMap()
}

export function lookupEntry(keyword: string): Entry | undefined {
  return lookupMap.get(normalize(keyword))
}

/** Look up all entries for a keyword — returns [modified, original] when showBoth is on */
export function lookupAllEntries(keyword: string): Entry[] {
  const key = normalize(keyword)
  const primary = lookupMap.get(key)
  if (!primary) return []
  const original = showBothOriginals.get(key)
  if (original) return [primary, original]
  return [primary]
}

/** All recognized keywords, normalized — fed to Vosk grammar */
export function getAllKeywords(): string[] {
  return Array.from(lookupMap.keys())
}

// ─── Typed accessors ─────────────────────────────────────────────────────────

export function getSpells(): SpellEntry[] { return spellsData }
export function getFeatures(): FeatureEntry[] { return featuresData }
export function getFeats(): FeatEntry[] { return featsData }
export function getEquipment(): EquipmentEntry[] { return equipmentData }
export function getBackgrounds(): BackgroundEntry[] { return backgroundsData }
export function getSpecies(): SpeciesEntry[] { return speciesData }
export function getRules(): RulesEntry[] { return rulesData }
export function getMagicItems(): MagicItemEntry[] { return magicItemsData }
export function getDaggerheart(): DaggerheartEntry[] { return daggerheartData }

/** All entries, useful for search */
export function getAllEntries(): Entry[] {
  return [
    ...spellsData,
    ...featuresData,
    ...featsData,
    ...equipmentData,
    ...backgroundsData,
    ...speciesData,
    ...rulesData,
    ...magicItemsData,
    ...daggerheartData,
    ...customCards
  ]
}

/** Map of EntryType → human-readable label */
export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  spell: 'Spells',
  feature: 'Class Features',
  feat: 'Feats',
  equipment: 'Equipment',
  background: 'Backgrounds',
  species: 'Species',
  rules: 'Rules',
  magicItem: 'Magic Items',
  daggerheart: 'Daggerheart',
  diceRoll: 'Dice Rolls'
}

/** Get all entries of a given type, including modified entries replacing originals */
export function getEntriesByType(type: EntryType): Entry[] {
  let base: Entry[]
  switch (type) {
    case 'spell': base = spellsData; break
    case 'feature': base = featuresData; break
    case 'feat': base = featsData; break
    case 'equipment': base = equipmentData; break
    case 'background': base = backgroundsData; break
    case 'species': base = speciesData; break
    case 'rules': base = rulesData; break
    case 'magicItem': base = magicItemsData; break
    case 'daggerheart': base = daggerheartData; break
    default: return []
  }
  const modifiedOfType = customCardsRaw
    .filter((c) => c.originalEntryId && c.originalEntryType === type)
    .map(customCardToEntry)
  if (modifiedOfType.length === 0) return base
  const modifiedOrigIds = new Set(customCardsRaw.filter((c) => c.originalEntryId && c.originalEntryType === type).map((c) => c.originalEntryId))
  return [
    ...base.filter((e) => !modifiedOrigIds.has(e.id)),
    ...modifiedOfType
  ]
}

/** Get daggerheart entries filtered by category, including modified entries */
export function getDaggerheartByCategory(cat: DaggerheartEntry['category']): DaggerheartEntry[] {
  const base = daggerheartData.filter((d) => d.category === cat)
  const modifiedOfCat = customCardsRaw
    .filter((c) => c.originalEntryId && c.originalEntryType === 'daggerheart' && c.dhCategory === cat)
    .map(customCardToEntry) as DaggerheartEntry[]
  if (modifiedOfCat.length === 0) return base
  const modifiedOrigIds = new Set(customCardsRaw.filter((c) => c.originalEntryId && c.originalEntryType === 'daggerheart' && c.dhCategory === cat).map((c) => c.originalEntryId))
  return [
    ...base.filter((e) => !modifiedOrigIds.has(e.id)),
    ...modifiedOfCat
  ]
}

// ─── Custom Library ──────────────────────────────────────────────────────────

export interface CustomCardData {
  id: string
  name: string
  description: string
  game: 'dnd' | 'daggerheart' | 'other'
  category: string
  createdAt: number
  // D&D spell-specific fields
  spellLevel?: number
  spellSchool?: string
  castingTime?: string
  range?: string
  components?: string
  duration?: string
  classes?: string[]
  // Daggerheart-specific fields
  dhCategory?: 'domain' | 'class features' | 'rules' | 'adversary'
  // Modification tracking — set when editing a bundled entry
  originalEntryId?: string
  originalEntryType?: EntryType
  showBoth?: boolean  // when true, both original and modified show up on detection
}

/** Convert a custom card to an Entry for the lookup map */
function customCardToEntry(card: CustomCardData): Entry {
  // Daggerheart custom cards
  if (card.game === 'daggerheart') {
    return {
      _type: 'daggerheart',
      id: card.id,
      name: card.name,
      description: card.description,
      category: card.dhCategory ?? 'rules'
    } as DaggerheartEntry
  }

  // D&D spell
  const cat = card.category
  if (cat === 'spell') {
    return {
      _type: 'spell',
      id: card.id,
      name: card.name,
      description: card.description,
      level: card.spellLevel ?? 0,
      school: card.spellSchool ?? 'Custom',
      castingTime: card.castingTime ?? '',
      range: card.range ?? '',
      components: card.components ?? '',
      duration: card.duration ?? '',
      concentration: false,
      classes: card.classes ?? []
    } as SpellEntry
  }

  // Default D&D: treat as equipment-style entry (generic name + description)
  return {
    _type: (cat === 'feature' ? 'feature' : cat === 'feat' ? 'feat' : cat === 'rules' ? 'rules' : cat === 'magicItem' ? 'magicItem' : 'equipment') as any,
    id: card.id,
    name: card.name,
    description: card.description
  } as Entry
}

/** Load custom cards and inject into lookup map */
export function setCustomCards(cards: CustomCardData[]): void {
  customCardsRaw = cards
  customCards = cards.map(customCardToEntry)
  rebuildLookupMap()
}

/** Get custom card entries (user-created, not modifications of bundled entries) */
export function getCustomEntries(): Entry[] {
  return customCardsRaw.filter((c) => !c.originalEntryId).map(customCardToEntry)
}

/** Get modified entries (edits of bundled entries) */
export function getModifiedEntries(): Entry[] {
  return customCardsRaw.filter((c) => !!c.originalEntryId).map(customCardToEntry)
}

/** Find the raw CustomCardData by entry ID */
export function getCustomCardDataById(entryId: string): CustomCardData | undefined {
  return customCardsRaw.find((c) => c.id === entryId)
}

/** Check if an entry ID belongs to a modified bundled entry */
export function isModifiedEntry(entryId: string): boolean {
  return customCardsRaw.some((c) => c.id === entryId && !!c.originalEntryId)
}

/** Find original bundled entry for a modified card */
export function getOriginalEntry(originalId: string, originalType: EntryType): Entry | undefined {
  const baseEntries = (() => {
    switch (originalType) {
      case 'spell': return spellsData
      case 'feature': return featuresData
      case 'feat': return featsData
      case 'equipment': return equipmentData
      case 'background': return backgroundsData
      case 'species': return speciesData
      case 'rules': return rulesData
      case 'magicItem': return magicItemsData
      case 'daggerheart': return daggerheartData
      default: return []
    }
  })()
  return baseEntries.find((e) => e.id === originalId)
}

/** Convert any Entry to CustomCardData for editing */
export function entryToCustomCardData(entry: Entry): CustomCardData {
  const base: CustomCardData = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: entry.name,
    description: entry.description,
    game: entry._type === 'daggerheart' ? 'daggerheart' : 'dnd',
    category: entry._type,
    createdAt: Date.now(),
    originalEntryId: entry.id,
    originalEntryType: entry._type
  }

  switch (entry._type) {
    case 'spell':
      base.category = 'spell'
      base.spellLevel = entry.level
      base.spellSchool = entry.school
      base.castingTime = entry.castingTime
      base.range = entry.range
      base.components = entry.components
      base.duration = entry.duration
      base.classes = [...entry.classes]
      break
    case 'daggerheart':
      base.dhCategory = (entry as DaggerheartEntry).category
      base.category = (entry as DaggerheartEntry).category
      break
    case 'feature':
      base.category = 'feature'
      break
    case 'feat':
      base.category = 'feat'
      break
    case 'equipment':
      base.category = 'equipment'
      break
    case 'rules':
      base.category = 'rules'
      break
    case 'magicItem':
      base.category = 'magicItem'
      break
    default:
      base.category = 'other'
      break
  }

  return base
}
