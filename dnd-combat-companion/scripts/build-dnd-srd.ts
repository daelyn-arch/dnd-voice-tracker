/**
 * build-dnd-srd.ts
 * Transforms 5e-database SRD JSON into app-format _srd.json files.
 * Uses 2014 SRD as primary (most content), 2024 SRD as supplement for feats/backgrounds.
 *
 * Usage:
 *   npx ts-node -P tsconfig.node.json scripts/build-dnd-srd.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const dbPath = path.resolve(__dirname, '../../5e-database')
const srd2014 = path.join(dbPath, 'src', '2014')
const srd2024 = path.join(dbPath, 'src', '2024')
const outDir = path.resolve(__dirname, '../src/renderer/data')

function load(dir: string, file: string): any[] {
  const p = path.join(dir, file)
  if (!fs.existsSync(p)) {
    console.warn(`  ⚠ Not found: ${p}`)
    return []
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8'))
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ─── Spells (2014 SRD — 319 spells) ─────────────────────────────────────────

interface RawSpell {
  index: string; name: string; level: number
  school: { name: string }; casting_time: string; range: string
  components: string[]; material?: string; duration: string
  concentration: boolean; classes: { name: string }[]
  desc: string[]; higher_level?: string[]
}

const rawSpells: RawSpell[] = load(srd2014, '5e-SRD-Spells.json')

const spells = rawSpells.map((s) => ({
  id: s.index,
  name: s.name,
  level: s.level,
  school: s.school.name,
  castingTime: s.casting_time,
  range: s.range,
  components: (() => {
    let c = s.components.join(', ')
    if (s.components.includes('M') && s.material) c += ` (${s.material})`
    return c
  })(),
  duration: s.duration,
  concentration: s.concentration,
  classes: s.classes.map((c) => c.name),
  description: s.desc.join('\n\n'),
  ...(s.higher_level?.length ? { higherLevels: s.higher_level.join('\n\n') } : {})
}))

fs.writeFileSync(path.join(outDir, 'spells_srd.json'), JSON.stringify(spells, null, 2) + '\n')
console.log(`✓ spells_srd.json — ${spells.length} spells`)

// ─── Features (2014 SRD — 407 features) ─────────────────────────────────────

interface RawFeature {
  index: string; name: string; class: { name: string }
  level: number; desc: string[]; subclass?: { name: string }
}

const rawFeatures: RawFeature[] = load(srd2014, '5e-SRD-Features.json')

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
  ...(f.subclass ? { subclass: f.subclass.name } : {}),
  ...(restMeta[f.index] ?? {})
}))

fs.writeFileSync(path.join(outDir, 'features_srd.json'), JSON.stringify(features, null, 2) + '\n')
console.log(`✓ features_srd.json — ${features.length} features`)

// ─── Feats (2024 SRD — 17 feats, much better than 2014's 1) ─────────────────

interface RawFeat2024 {
  index: string; name: string; description: string
  type?: string; repeatable?: boolean
  prerequisites?: { type: string; level?: number }[]
}

const rawFeats: RawFeat2024[] = load(srd2024, '5e-SRD-Feats.json')

const feats = rawFeats.map((f) => {
  let desc = f.description
  if (f.prerequisites?.length) {
    const prereqs = f.prerequisites.map((p) => {
      if (p.type === 'level' && p.level) return `Level ${p.level}+`
      return p.type
    }).join(', ')
    desc = `Prerequisite: ${prereqs}\n\n${desc}`
  }
  return {
    id: f.index,
    name: f.name,
    description: desc,
    ...(f.type ? { featType: f.type } : {})
  }
})

fs.writeFileSync(path.join(outDir, 'feats_srd.json'), JSON.stringify(feats, null, 2) + '\n')
console.log(`✓ feats_srd.json — ${feats.length} feats`)

// ─── Equipment (2014 SRD — structured, synthesize descriptions) ──────────────

interface RawEquip2014 {
  index: string; name: string
  equipment_category: { name: string }
  weapon_category?: string; weapon_range?: string
  cost?: { quantity: number; unit: string }; weight?: number
  damage?: { damage_dice: string; damage_type: { name: string } }
  two_handed_damage?: { damage_dice: string; damage_type: { name: string } }
  range?: { normal: number; long: number | null }
  properties?: { name: string }[]
  armor_category?: string
  armor_class?: { base: number; dex_bonus: boolean; max_bonus?: number }
  str_minimum?: number; stealth_disadvantage?: boolean
  desc?: string[]
  contents?: { item: { name: string }; quantity: number }[]
  capacity?: string
}

const rawEquip: RawEquip2014[] = load(srd2014, '5e-SRD-Equipment.json')

function buildEquipDescription(e: RawEquip2014): string {
  const parts: string[] = []

  // Cost and weight
  const cost = e.cost ? `${e.cost.quantity} ${e.cost.unit.toUpperCase()}` : null
  const weight = e.weight ? `${e.weight} lb.` : null
  if (cost || weight) {
    const meta = [weight ? `Weight: ${weight}` : null, cost ? `Cost: ${cost}` : null].filter(Boolean).join(', ')
    parts.push(meta)
  }

  // Weapon stats
  if (e.damage) {
    let dmg = `${e.damage.damage_dice} ${e.damage.damage_type.name}`
    if (e.two_handed_damage) {
      dmg += ` (${e.two_handed_damage.damage_dice} two-handed)`
    }
    parts.push(`Damage: ${dmg}`)
  }
  if (e.range?.normal) {
    const rng = e.range.long ? `${e.range.normal}/${e.range.long} ft.` : `${e.range.normal} ft.`
    parts.push(`Range: ${rng}`)
  }
  if (e.properties?.length) {
    parts.push(`Properties: ${e.properties.map((p) => p.name).join(', ')}`)
  }

  // Armor stats
  if (e.armor_class) {
    let ac = `AC: ${e.armor_class.base}`
    if (e.armor_class.dex_bonus) {
      ac += e.armor_class.max_bonus ? ` + Dex (max ${e.armor_class.max_bonus})` : ' + Dex'
    }
    parts.push(ac)
    if (e.armor_category) parts.push(`Category: ${e.armor_category}`)
    if (e.str_minimum) parts.push(`Strength: ${e.str_minimum} required`)
    if (e.stealth_disadvantage) parts.push('Stealth: Disadvantage')
  }

  // Pack contents
  if (e.contents?.length) {
    parts.push('Contains: ' + e.contents.map((c) => `${c.item.name}${c.quantity > 1 ? ` (×${c.quantity})` : ''}`).join(', '))
  }

  // Capacity
  if (e.capacity) parts.push(`Capacity: ${e.capacity}`)

  // Raw desc if present
  if (e.desc?.length) {
    parts.push(e.desc.join('\n\n'))
  }

  return parts.join('\n') || e.name
}

const equipment = rawEquip.map((e) => ({
  id: e.index,
  name: e.name,
  description: buildEquipDescription(e)
}))

fs.writeFileSync(path.join(outDir, 'equipment_srd.json'), JSON.stringify(equipment, null, 2) + '\n')
console.log(`✓ equipment_srd.json — ${equipment.length} equipment`)

// ─── Backgrounds (2024 SRD — 4 backgrounds) ─────────────────────────────────

interface RawBG2024 {
  index: string; name: string
  ability_scores?: { name: string }[]
  feat?: { name: string }
  skill_proficiencies?: { name: string }[]
  tool_proficiency?: { name: string }
  equipment?: string
  description?: string
}

const rawBGs: RawBG2024[] = load(srd2024, '5e-SRD-Backgrounds.json')

const backgrounds = rawBGs.map((b) => {
  const parts: string[] = []
  if (b.ability_scores?.length) {
    parts.push(`Ability Scores: ${b.ability_scores.map((a) => a.name).join(', ')}`)
  }
  if (b.feat) parts.push(`Feat: ${b.feat.name}`)
  if (b.skill_proficiencies?.length) {
    parts.push(`Skill Proficiencies: ${b.skill_proficiencies.map((s) => s.name).join(' and ')}`)
  }
  if (b.tool_proficiency) parts.push(`Tool Proficiency: ${b.tool_proficiency.name}`)
  if (b.equipment) parts.push(`Equipment: ${b.equipment}`)
  if (b.description) parts.push('', b.description)
  return {
    id: b.index,
    name: b.name,
    description: parts.join('\n')
  }
})

// Also pull the 2014 Acolyte if we don't already have it (2024 has Acolyte too, so dedupe)
const rawBG2014: any[] = load(srd2014, '5e-SRD-Backgrounds.json')
for (const b of rawBG2014) {
  if (!backgrounds.find((bg) => bg.id === b.index)) {
    backgrounds.push({
      id: b.index,
      name: b.name,
      description: [
        ...(b.starting_proficiencies?.length
          ? [`Proficiencies: ${b.starting_proficiencies.map((p: any) => p.name).join(', ')}`]
          : []),
        ...(b.feature ? [b.feature.desc?.join('\n\n') || b.feature.name] : []),
      ].join('\n\n')
    })
  }
}

fs.writeFileSync(path.join(outDir, 'backgrounds_srd.json'), JSON.stringify(backgrounds, null, 2) + '\n')
console.log(`✓ backgrounds_srd.json — ${backgrounds.length} backgrounds`)

// ─── Species (2014 SRD Races + Traits) ───────────────────────────────────────

interface RawRace {
  index: string; name: string; speed: number
  ability_bonuses: { ability_score: { name: string }; bonus: number }[]
  alignment: string; age: string; size: string; size_description: string
  language_desc: string; traits: { index: string; name: string }[]
  subraces: { index: string; name: string }[]
}

interface RawTrait {
  index: string; name: string; desc: string[]
  races: { name: string }[]
}

interface RawSubrace {
  index: string; name: string; race: { name: string }
  desc: string
  ability_bonuses: { ability_score: { name: string }; bonus: number }[]
  racial_traits: { index: string; name: string }[]
}

const rawRaces: RawRace[] = load(srd2014, '5e-SRD-Races.json')
const rawTraits: RawTrait[] = load(srd2014, '5e-SRD-Traits.json')
const rawSubraces: RawSubrace[] = load(srd2014, '5e-SRD-Subraces.json')
const traitMap = new Map(rawTraits.map((t) => [t.index, t]))

const species = rawRaces.map((r) => {
  const parts: string[] = []

  parts.push(r.size_description)
  parts.push(`Speed: ${r.speed} feet`)

  // Ability bonuses
  const bonuses = r.ability_bonuses.map((b) => `${b.ability_score.name} +${b.bonus}`).join(', ')
  if (bonuses) parts.push(`Ability Score Increase: ${bonuses}`)

  parts.push(`Age: ${r.age}`)
  parts.push(`Alignment: ${r.alignment}`)
  parts.push(`Languages: ${r.language_desc}`)

  // Racial traits
  if (r.traits.length) {
    parts.push('')
    parts.push('Traits:')
    for (const tRef of r.traits) {
      const trait = traitMap.get(tRef.index)
      if (trait) {
        parts.push(`\n${trait.name}: ${trait.desc.join(' ')}`)
      } else {
        parts.push(`\n${tRef.name}`)
      }
    }
  }

  // Subraces
  const subs = rawSubraces.filter((s) => s.race.name === r.name)
  if (subs.length) {
    parts.push('')
    parts.push('Subraces:')
    for (const sub of subs) {
      const subParts = [sub.desc]
      const subBonuses = sub.ability_bonuses.map((b) => `${b.ability_score.name} +${b.bonus}`).join(', ')
      if (subBonuses) subParts.push(`Ability Score Increase: ${subBonuses}`)
      for (const tRef of sub.racial_traits) {
        const trait = traitMap.get(tRef.index)
        if (trait) subParts.push(`${trait.name}: ${trait.desc.join(' ')}`)
      }
      parts.push(`\n${sub.name}: ${subParts.join('\n')}`)
    }
  }

  return {
    id: r.index,
    name: r.name,
    description: parts.join('\n')
  }
})

fs.writeFileSync(path.join(outDir, 'species_srd.json'), JSON.stringify(species, null, 2) + '\n')
console.log(`✓ species_srd.json — ${species.length} species`)

// ─── Rules (2014 Rule Sections + Conditions) ────────────────────────────────

interface RawRuleSection {
  index: string; name: string; desc: string
}

interface RawCondition {
  index: string; name: string; desc: string[]
}

const rawRuleSections: RawRuleSection[] = load(srd2014, '5e-SRD-Rule-Sections.json')
const rawConditions: RawCondition[] = load(srd2014, '5e-SRD-Conditions.json')

const rules = [
  ...rawRuleSections.map((r) => ({
    id: r.index,
    name: r.name,
    // Strip leading markdown heading that duplicates the name
    description: r.desc.replace(/^##?\s+[^\n]+\n+/, '')
  })),
  ...rawConditions.map((c) => ({
    id: c.index,
    name: c.name,
    description: c.desc.join('\n')
  }))
]

fs.writeFileSync(path.join(outDir, 'rules_srd.json'), JSON.stringify(rules, null, 2) + '\n')
console.log(`✓ rules_srd.json — ${rules.length} rules (${rawRuleSections.length} sections + ${rawConditions.length} conditions)`)

// ─── Magic Items (2014 SRD — 362 items) ─────────────────────────────────────

interface RawMagicItem {
  index: string; name: string
  rarity: { name: string }
  desc: string[]
  variant: boolean
  variants: { index: string; name: string }[]
}

const rawMagicItems: RawMagicItem[] = load(srd2014, '5e-SRD-Magic-Items.json')

const magicItems = rawMagicItems
  .filter((m) => !m.variant) // skip variant entries (they're children of a parent)
  .map((m) => {
    const desc = m.desc.join('\n\n')
    const attunement = /requires attunement/i.test(desc)
    return {
      id: m.index,
      name: m.name,
      description: desc,
      rarity: m.rarity.name,
      attunement
    }
  })

fs.writeFileSync(path.join(outDir, 'magicItems_srd.json'), JSON.stringify(magicItems, null, 2) + '\n')
console.log(`✓ magicItems_srd.json — ${magicItems.length} magic items`)

console.log('\nDone. All SRD data files written to src/renderer/data/')
