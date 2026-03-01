/**
 * build-data.ts
 * Run once: npx ts-node scripts/build-data.ts <path-to-5e-database>
 *
 * Transforms raw 5e-database JSON into the app's compact schema.
 * Output: src/renderer/data/spells.json, src/renderer/data/features.json
 *
 * Usage:
 *   git clone https://github.com/bagelbits/5e-database ./5e-database
 *   npx ts-node scripts/build-data.ts ./5e-database
 */

import * as fs from 'fs'
import * as path from 'path'

const dbPath = process.argv[2]
if (!dbPath) {
  console.error('Usage: ts-node scripts/build-data.ts <path-to-5e-database>')
  process.exit(1)
}

const outDir = path.resolve(__dirname, '../src/renderer/data')
fs.mkdirSync(outDir, { recursive: true })

// ─── Spells ──────────────────────────────────────────────────────────────────

interface RawSpell {
  index: string
  name: string
  level: number
  school: { name: string }
  casting_time: string
  range: string
  components: string[]
  material?: string
  duration: string
  concentration: boolean
  classes: { name: string }[]
  desc: string[]
  higher_level?: string[]
}

function buildComponents(raw: RawSpell): string {
  let c = raw.components.join(', ')
  if (raw.components.includes('M') && raw.material) {
    c += ` (${raw.material.replace(/^a\s+/i, '')})`
  }
  return c
}

// Repo restructured in 2024: files moved from src/ to src/2014/
const rawSpellsPath =
  fs.existsSync(path.join(dbPath, 'src', '2014', '5e-SRD-Spells.json'))
    ? path.join(dbPath, 'src', '2014', '5e-SRD-Spells.json')
    : path.join(dbPath, 'src', '5e-SRD-Spells.json')

if (!fs.existsSync(rawSpellsPath)) {
  console.error(`Not found: ${rawSpellsPath}`)
  console.error('Make sure you pointed to the root of the 5e-database repo.')
  process.exit(1)
}

const rawSpells: RawSpell[] = JSON.parse(fs.readFileSync(rawSpellsPath, 'utf-8'))

const spells = rawSpells.map((s) => ({
  id: s.index,
  name: s.name,
  level: s.level,
  school: s.school.name,
  castingTime: s.casting_time,
  range: s.range,
  components: buildComponents(s),
  duration: s.duration,
  concentration: s.concentration,
  classes: s.classes.map((c) => c.name),
  description: s.desc.join('\n\n'),
  ...(s.higher_level?.length ? { higherLevels: s.higher_level.join('\n\n') } : {})
}))

fs.writeFileSync(path.join(outDir, 'spells.json'), JSON.stringify(spells, null, 2))
console.log(`✓ spells.json — ${spells.length} spells`)

// ─── Features ────────────────────────────────────────────────────────────────

interface RawFeature {
  index: string
  name: string
  class: { name: string }
  level: number
  desc: string[]
}

const rawFeaturesPath =
  fs.existsSync(path.join(dbPath, 'src', '2014', '5e-SRD-Features.json'))
    ? path.join(dbPath, 'src', '2014', '5e-SRD-Features.json')
    : path.join(dbPath, 'src', '5e-SRD-Features.json')

if (!fs.existsSync(rawFeaturesPath)) {
  console.error(`Not found: ${rawFeaturesPath}`)
  process.exit(1)
}

const rawFeatures: RawFeature[] = JSON.parse(fs.readFileSync(rawFeaturesPath, 'utf-8'))

// Map of known rest types and uses for common features
const restMeta: Record<string, { usesPerRest?: string; restType?: 'short' | 'long' | 'none' }> = {
  'action-surge': { usesPerRest: '1 (2 at level 17)', restType: 'short' },
  'second-wind': { usesPerRest: '1', restType: 'short' },
  'bardic-inspiration': { usesPerRest: 'Charisma modifier', restType: 'short' },
  'channel-divinity': { usesPerRest: '1 (2 at level 6, 3 at level 18)', restType: 'short' },
  'wild-shape': { usesPerRest: '2', restType: 'short' },
  'ki': { usesPerRest: 'Monk level', restType: 'short' },
  'rage': { usesPerRest: '2 (scales with level)', restType: 'long' },
  'lay-on-hands': { restType: 'long' },
  'divine-smite': { restType: 'none' },
  'sneak-attack': { restType: 'none' },
  'spellcasting': { restType: 'long' },
  'eldritch-invocations': { restType: 'long' },
  'metamagic': { usesPerRest: 'Sorcery Points', restType: 'short' },
  'stroke-of-luck': { usesPerRest: '1', restType: 'long' }
}

const features = rawFeatures.map((f) => ({
  id: f.index,
  name: f.name,
  class: f.class.name,
  levelAvailable: f.level,
  description: f.desc.join('\n\n'),
  ...(restMeta[f.index] ?? {})
}))

fs.writeFileSync(path.join(outDir, 'features.json'), JSON.stringify(features, null, 2))
console.log(`✓ features.json — ${features.length} features`)
console.log('Done. Run the app to verify lookups.')
