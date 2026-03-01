import type { SpellEntry, FeatureEntry, Entry } from '../types'

// Populated by scripts/build-data.ts then bundled by Vite as static JSON.
// Stub files (empty arrays) are checked in; build-data.ts overwrites them.
import spellsRaw from './spells.json'
import featuresRaw from './features.json'

const spellsData = spellsRaw as SpellEntry[]
const featuresData = featuresRaw as FeatureEntry[]

// Normalize: lowercase, collapse hyphens/whitespace to single space
function normalize(s: string): string {
  return s.toLowerCase().replace(/[-\s]+/g, ' ').trim()
}

// Build lookup map once at module init
const lookupMap = new Map<string, Entry>()

for (const spell of spellsData) {
  lookupMap.set(normalize(spell.name), spell)
}
for (const feature of featuresData) {
  lookupMap.set(normalize(feature.name), feature)
}

export function lookupEntry(keyword: string): Entry | undefined {
  return lookupMap.get(normalize(keyword))
}

/** All recognized keywords, normalized — fed to Vosk grammar */
export function getAllKeywords(): string[] {
  return Array.from(lookupMap.keys())
}

export function getSpells(): SpellEntry[] {
  return spellsData
}

export function getFeatures(): FeatureEntry[] {
  return featuresData
}
