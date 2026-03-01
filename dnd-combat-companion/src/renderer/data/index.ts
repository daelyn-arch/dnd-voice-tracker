import type {
  SpellEntry, FeatureEntry, FeatEntry, EquipmentEntry,
  BackgroundEntry, SpeciesEntry, RulesEntry, MagicItemEntry,
  DaggerheartEntry, Entry, EntryType
} from '../types'

// Populated by scripts/build-from-library.ts then bundled by Vite as static JSON.
import spellsRaw from './spells.json'
import featuresRaw from './features.json'
import featsRaw from './feats.json'
import equipmentRaw from './equipment.json'
import backgroundsRaw from './backgrounds.json'
import speciesRaw from './species.json'
import rulesRaw from './rules.json'
import magicItemsRaw from './magicItems.json'
import daggerheartRaw from './daggerheart.json'

// Tag each entry with _type discriminant at load time
const spellsData: SpellEntry[] = (spellsRaw as any[]).map((s) => ({ ...s, _type: 'spell' as const }))
const featuresData: FeatureEntry[] = (featuresRaw as any[]).map((f) => ({ ...f, _type: 'feature' as const }))
const featsData: FeatEntry[] = (featsRaw as any[]).map((f) => ({ ...f, _type: 'feat' as const }))
const equipmentData: EquipmentEntry[] = (equipmentRaw as any[]).map((e) => ({ ...e, _type: 'equipment' as const }))
const backgroundsData: BackgroundEntry[] = (backgroundsRaw as any[]).map((b) => ({ ...b, _type: 'background' as const }))
const speciesData: SpeciesEntry[] = (speciesRaw as any[]).map((s) => ({ ...s, _type: 'species' as const }))
const rulesData: RulesEntry[] = (rulesRaw as any[]).map((r) => ({ ...r, _type: 'rules' as const }))
const magicItemsData: MagicItemEntry[] = (magicItemsRaw as any[]).map((m) => ({ ...m, _type: 'magicItem' as const }))
const daggerheartData: DaggerheartEntry[] = (daggerheartRaw as any[]).map((d) => ({ ...d, _type: 'daggerheart' as const }))

// Normalize: lowercase, collapse hyphens/whitespace to single space
function normalize(s: string): string {
  return s.toLowerCase().replace(/[-\s]+/g, ' ').trim()
}

// Build lookup map once at module init
const lookupMap = new Map<string, Entry>()

function addToLookup(entries: Entry[]): void {
  for (const entry of entries) {
    lookupMap.set(normalize(entry.name), entry)
  }
}

addToLookup(spellsData)
addToLookup(featuresData)
addToLookup(featsData)
addToLookup(equipmentData)
addToLookup(backgroundsData)
addToLookup(speciesData)
addToLookup(rulesData)
addToLookup(magicItemsData)
addToLookup(daggerheartData)

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
    ...daggerheartData
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
  daggerheart: 'Daggerheart'
}
