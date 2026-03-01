/**
 * build-from-library.ts
 * Converts rpg-pdf-to-json library databases into the app's data format.
 *
 * Usage:
 *   npx ts-node -P tsconfig.node.json scripts/build-from-library.ts [path-to-pdf_to_json]
 *
 * Default path: ../pdf_to_json (sibling directory in claude_workspace)
 */

import * as fs from 'fs'
import * as path from 'path'

// ─── Resolve source paths ───────────────────────────────────────────────────

const pdfToJsonRoot = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '../../../pdf_to_json')

const dndLibPath = path.join(pdfToJsonRoot, 'data', 'library', 'dnd', 'library.json')
const daggerheartLibPath = path.join(pdfToJsonRoot, 'data', 'library', 'daggerheart', 'library.json')

if (!fs.existsSync(dndLibPath)) {
  console.error(`DnD library not found: ${dndLibPath}`)
  console.error('Pass the path to the rpg-pdf-to-json project as an argument.')
  process.exit(1)
}
if (!fs.existsSync(daggerheartLibPath)) {
  console.error(`Daggerheart library not found: ${daggerheartLibPath}`)
  process.exit(1)
}

const outDir = path.resolve(__dirname, '../src/renderer/data')
fs.mkdirSync(outDir, { recursive: true })

// ─── Load raw libraries ─────────────────────────────────────────────────────

interface LibEntry {
  name: string
  description: string
  category: string
  class?: string
  subclass?: string
  level?: number
  spell_level?: number
  school?: string
  classes?: string
  feat_type?: string
  rarity?: string
  attunement?: boolean
}

const dndLib: LibEntry[] = JSON.parse(fs.readFileSync(dndLibPath, 'utf-8'))
const daggerheartLib: LibEntry[] = JSON.parse(fs.readFileSync(daggerheartLibPath, 'utf-8'))

console.log(`Loaded DnD library: ${dndLib.length} entries`)
console.log(`Loaded Daggerheart library: ${daggerheartLib.length} entries`)

// ─── Utility ─────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function dedupId(id: string, seen: Set<string>): string {
  let final = id
  let n = 2
  while (seen.has(final)) {
    final = `${id}-${n}`
    n++
  }
  seen.add(final)
  return final
}

// ─── Spell Conversion ────────────────────────────────────────────────────────

interface SpellOut {
  id: string
  name: string
  level: number
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

function parseSpellDescription(raw: string): {
  castingTime: string
  range: string
  components: string
  duration: string
  concentration: boolean
  bodyText: string
  higherLevels?: string
} {
  const lines = raw.split('\n')

  let castingTime = ''
  let range = ''
  let components = ''
  let duration = ''
  let concentration = false
  let bodyStartIdx = 0

  // Find metadata lines
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i].trim()
    if (line.startsWith('Casting Time:')) {
      castingTime = line.replace('Casting Time:', '').trim()
    } else if (line.startsWith('Range:')) {
      range = line.replace('Range:', '').trim()
    } else if (line.startsWith('Components:')) {
      components = line.replace('Components:', '').trim()
    } else if (line.startsWith('Duration:')) {
      duration = line.replace('Duration:', '').trim()
      bodyStartIdx = i + 1
    }
  }

  // Detect concentration
  if (duration.toLowerCase().includes('concentration')) {
    concentration = true
    duration = duration.replace(/^Concentration,?\s*/i, '').trim()
  }

  // Also check first line for "Special: C"
  if (lines[0] && lines[0].includes('Special: C')) {
    concentration = true
  }

  // Skip blank lines after metadata
  while (bodyStartIdx < lines.length && lines[bodyStartIdx].trim() === '') {
    bodyStartIdx++
  }

  // If we couldn't find metadata, the whole thing is the body
  if (!castingTime && !range && !components && !duration) {
    return {
      castingTime: 'Unknown',
      range: 'Unknown',
      components: 'Unknown',
      duration: 'Unknown',
      concentration,
      bodyText: raw
    }
  }

  const bodyLines = lines.slice(bodyStartIdx)
  let bodyText = bodyLines.join('\n').trim()
  let higherLevels: string | undefined

  // Extract higher-level text
  const hlMarker = 'Using a Higher-Level Spell Slot.'
  const hlIdx = bodyText.indexOf(hlMarker)
  if (hlIdx !== -1) {
    higherLevels = bodyText.slice(hlIdx + hlMarker.length).trim()
    bodyText = bodyText.slice(0, hlIdx).trim()
  }

  return { castingTime, range, components, duration, concentration, bodyText, higherLevels }
}

const spellEntries = dndLib.filter((e) => e.category === 'spell')
const spellIds = new Set<string>()
const spells: SpellOut[] = spellEntries.map((s) => {
  const parsed = parseSpellDescription(s.description)
  const classes = s.classes
    ? s.classes.split(',').map((c) => c.trim()).filter(Boolean)
    : []

  return {
    id: dedupId(slugify(s.name), spellIds),
    name: s.name,
    level: s.spell_level ?? 0,
    school: s.school ?? 'Unknown',
    castingTime: parsed.castingTime,
    range: parsed.range,
    components: parsed.components,
    duration: parsed.duration,
    concentration: parsed.concentration,
    classes,
    description: parsed.bodyText,
    ...(parsed.higherLevels ? { higherLevels: parsed.higherLevels } : {})
  }
})

fs.writeFileSync(path.join(outDir, 'spells.json'), JSON.stringify(spells, null, 2))
console.log(`✓ spells.json — ${spells.length} spells`)

// ─── Feature Conversion (class features + subclass features) ─────────────────

interface FeatureOut {
  id: string
  name: string
  class: string
  levelAvailable: number
  description: string
  subclass?: string
}

function stripLevelPrefix(name: string): string {
  return name.replace(/^Level\s+\d+:\s*/i, '')
}

const classFeatures = dndLib.filter((e) => e.category === 'class feature')
const subclassFeatures = dndLib.filter((e) => e.category === 'subclass feature')

const featureIds = new Set<string>()
const features: FeatureOut[] = []

for (const f of classFeatures) {
  const cleanName = stripLevelPrefix(f.name)
  features.push({
    id: dedupId(slugify(cleanName || f.name), featureIds),
    name: cleanName || f.name,
    class: f.class ?? 'Unknown',
    levelAvailable: f.level ?? 0,
    description: f.description
  })
}

for (const f of subclassFeatures) {
  const cleanName = stripLevelPrefix(f.name)
  const desc = f.subclass
    ? `[${f.subclass}] ${f.description}`
    : f.description
  features.push({
    id: dedupId(slugify(cleanName || f.name), featureIds),
    name: cleanName || f.name,
    class: f.class ?? 'Unknown',
    levelAvailable: f.level ?? 0,
    description: desc,
    subclass: f.subclass
  })
}

fs.writeFileSync(path.join(outDir, 'features.json'), JSON.stringify(features, null, 2))
console.log(`✓ features.json — ${features.length} features (${classFeatures.length} class + ${subclassFeatures.length} subclass)`)

// ─── Feats ───────────────────────────────────────────────────────────────────

interface FeatOut {
  id: string
  name: string
  description: string
  featType?: string
}

const featEntries = dndLib.filter((e) => e.category === 'feat')
const featIds = new Set<string>()
const feats: FeatOut[] = featEntries.map((f) => ({
  id: dedupId(slugify(f.name), featIds),
  name: f.name,
  description: f.description,
  ...(f.feat_type ? { featType: f.feat_type } : {})
}))

fs.writeFileSync(path.join(outDir, 'feats.json'), JSON.stringify(feats, null, 2))
console.log(`✓ feats.json — ${feats.length} feats`)

// ─── Equipment ───────────────────────────────────────────────────────────────

interface EquipmentOut {
  id: string
  name: string
  description: string
}

const equipEntries = dndLib.filter((e) => e.category === 'equipment')
const equipIds = new Set<string>()
const equipment: EquipmentOut[] = equipEntries.map((e) => ({
  id: dedupId(slugify(e.name), equipIds),
  name: e.name,
  description: e.description
}))

fs.writeFileSync(path.join(outDir, 'equipment.json'), JSON.stringify(equipment, null, 2))
console.log(`✓ equipment.json — ${equipment.length} entries`)

// ─── Backgrounds ─────────────────────────────────────────────────────────────

interface BackgroundOut {
  id: string
  name: string
  description: string
}

const bgEntries = dndLib.filter((e) => e.category === 'background')
const bgIds = new Set<string>()
const backgrounds: BackgroundOut[] = bgEntries.map((b) => ({
  id: dedupId(slugify(b.name), bgIds),
  name: b.name,
  description: b.description
}))

fs.writeFileSync(path.join(outDir, 'backgrounds.json'), JSON.stringify(backgrounds, null, 2))
console.log(`✓ backgrounds.json — ${backgrounds.length} entries`)

// ─── Species ─────────────────────────────────────────────────────────────────

interface SpeciesOut {
  id: string
  name: string
  description: string
}

const speciesEntries = dndLib.filter((e) => e.category === 'species')
const speciesIds = new Set<string>()
const species: SpeciesOut[] = speciesEntries.map((s) => ({
  id: dedupId(slugify(s.name), speciesIds),
  name: s.name,
  description: s.description
}))

fs.writeFileSync(path.join(outDir, 'species.json'), JSON.stringify(species, null, 2))
console.log(`✓ species.json — ${species.length} entries`)

// ─── Rules (rules + subclass descriptions) ───────────────────────────────────

interface RulesOut {
  id: string
  name: string
  description: string
}

const rulesEntries = dndLib.filter((e) => e.category === 'rules')
const subclassEntries = dndLib.filter((e) => e.category === 'subclass')
const rulesIds = new Set<string>()

const rules: RulesOut[] = [
  ...rulesEntries.map((r) => ({
    id: dedupId(slugify(r.name), rulesIds),
    name: r.name,
    description: r.description
  })),
  ...subclassEntries.map((s) => ({
    id: dedupId(slugify(s.name), rulesIds),
    name: s.name,
    description: `[${s.class ?? 'Unknown'} Subclass] ${s.description}`
  }))
]

fs.writeFileSync(path.join(outDir, 'rules.json'), JSON.stringify(rules, null, 2))
console.log(`✓ rules.json — ${rules.length} entries (${rulesEntries.length} rules + ${subclassEntries.length} subclasses)`)

// ─── Magic Items ─────────────────────────────────────────────────────────────

interface MagicItemOut {
  id: string
  name: string
  description: string
  rarity?: string
  attunement?: boolean
}

const magicItemEntries = dndLib.filter((e) => e.category === 'magic item')
const miIds = new Set<string>()
const magicItems: MagicItemOut[] = magicItemEntries.map((m) => ({
  id: dedupId(slugify(m.name), miIds),
  name: m.name,
  description: m.description,
  ...(m.rarity ? { rarity: m.rarity } : {}),
  ...(m.attunement !== undefined ? { attunement: m.attunement } : {})
}))

fs.writeFileSync(path.join(outDir, 'magicItems.json'), JSON.stringify(magicItems, null, 2))
console.log(`✓ magicItems.json — ${magicItems.length} entries`)

// ─── Daggerheart (all categories combined) ───────────────────────────────────

interface DaggerheartOut {
  id: string
  name: string
  description: string
  category: 'domain' | 'class features' | 'rules' | 'adversary'
}

const dhIds = new Set<string>()
const daggerheart: DaggerheartOut[] = daggerheartLib.map((d) => ({
  id: dedupId(`dh-${slugify(d.name)}`, dhIds),
  name: d.name,
  description: d.description,
  category: d.category as DaggerheartOut['category']
}))

fs.writeFileSync(path.join(outDir, 'daggerheart.json'), JSON.stringify(daggerheart, null, 2))
console.log(`✓ daggerheart.json — ${daggerheart.length} entries`)

// ─── Summary ─────────────────────────────────────────────────────────────────

const total = spells.length + features.length + feats.length + equipment.length +
  backgrounds.length + species.length + rules.length + magicItems.length + daggerheart.length
console.log(`\nDone. ${total} total entries across all files.`)
