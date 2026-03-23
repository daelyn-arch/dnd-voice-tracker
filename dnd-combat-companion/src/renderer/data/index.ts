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

// Build lookup map — rebuilt when data source changes
let lookupMap = new Map<string, Entry>()

function rebuildLookupMap(): void {
  lookupMap = new Map<string, Entry>()
  const allSources: Entry[][] = [
    spellsData, featuresData, featsData, equipmentData,
    backgroundsData, speciesData, rulesData, magicItemsData,
    daggerheartData, customCards
  ]
  for (const entries of allSources) {
    for (const entry of entries) {
      lookupMap.set(normalize(entry.name), entry)
      // Register aliases so voice recognition of sub-entry names triggers the grouped card
      const aliases = (entry as any).aliases as string[] | undefined
      if (aliases) {
        for (const alias of aliases) {
          lookupMap.set(normalize(alias), entry)
        }
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

/** Get all entries of a given type */
export function getEntriesByType(type: EntryType): Entry[] {
  switch (type) {
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
}

/** Get daggerheart entries filtered by category */
export function getDaggerheartByCategory(cat: DaggerheartEntry['category']): DaggerheartEntry[] {
  return daggerheartData.filter((d) => d.category === cat)
}

// ─── Custom Library ──────────────────────────────────────────────────────────

export interface CustomCardData {
  id: string
  name: string
  description: string
  game: 'dnd' | 'daggerheart' | 'other'
  category: string
  createdAt: number
  spellLevel?: number
  spellSchool?: string
  castingTime?: string
  range?: string
  components?: string
  duration?: string
  classes?: string[]
}

/** Convert a custom card to an Entry for the lookup map */
function customCardToEntry(card: CustomCardData): Entry {
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
  // Default: treat as equipment-style entry (generic name + description)
  return {
    _type: (cat === 'feature' ? 'feature' : cat === 'feat' ? 'feat' : cat === 'rules' ? 'rules' : cat === 'magicItem' ? 'magicItem' : 'equipment') as any,
    id: card.id,
    name: card.name,
    description: card.description
  } as Entry
}

/** Load custom cards and inject into lookup map */
export function setCustomCards(cards: CustomCardData[]): void {
  customCards = cards.map(customCardToEntry)
  rebuildLookupMap()
}

/** Get all custom card entries */
export function getCustomEntries(): Entry[] {
  return customCards
}
