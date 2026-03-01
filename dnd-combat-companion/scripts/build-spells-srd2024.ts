/**
 * build-spells-srd2024.ts
 * Downloads the SRD 5.2.1 spells JSON (CC-BY-4.0, via dmcb's gist) and
 * converts it into the app's compact SpellEntry schema.
 *
 * Output: src/renderer/data/spells.json
 *
 * Usage:
 *   npx ts-node scripts/build-spells-srd2024.ts
 *
 * Source: https://gist.github.com/dmcb/4b67869f962e3adaa3d0f7e5ca8f4912
 * License: Creative Commons Attribution 4.0 International (CC-BY-4.0)
 */

import * as fs from 'fs'
import * as https from 'https'
import * as path from 'path'

const GIST_URL =
  'https://gist.githubusercontent.com/dmcb/4b67869f962e3adaa3d0f7e5ca8f4912/raw/b205fc6c5a4f1d2f1c0e1c63f51323cbd0565bfd/srd-5.2-spells.json'

// ─── Raw gist schema ─────────────────────────────────────────────────────────

interface RawSpell {
  name: string
  level: number
  school: string
  classes: string[]
  actionType: 'action' | 'bonusAction' | 'reaction'
  concentration: boolean
  ritual: boolean
  range: string
  components: string[]
  material?: string
  duration: string
  description: string
  cantripUpgrade?: string
  higherLevelSlot?: string
  castingTrigger?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function nameToId(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const ACTION_TYPE_MAP: Record<string, string> = {
  action: '1 action',
  bonusAction: '1 bonus action',
  reaction: '1 reaction'
}

function buildCastingTime(spell: RawSpell): string {
  const base = ACTION_TYPE_MAP[spell.actionType] ?? spell.actionType
  if (spell.actionType === 'reaction' && spell.castingTrigger) {
    return `${base}, ${spell.castingTrigger}`
  }
  return base
}

function buildComponents(spell: RawSpell): string {
  const parts = spell.components.map((c) => c.toUpperCase())
  let result = parts.join(', ')
  if (spell.components.includes('m') && spell.material) {
    result += ` (${spell.material})`
  }
  return result
}

function buildDescription(spell: RawSpell): string {
  if (spell.cantripUpgrade) {
    return `${spell.description}\n\nCantrip Upgrade. ${spell.cantripUpgrade}`
  }
  return spell.description
}

// ─── Transform ───────────────────────────────────────────────────────────────

function transform(raw: RawSpell) {
  return {
    id: nameToId(raw.name),
    name: raw.name,
    level: raw.level,
    school: capitalize(raw.school),
    castingTime: buildCastingTime(raw),
    range: raw.range,
    components: buildComponents(raw),
    duration: raw.duration,
    concentration: raw.concentration,
    classes: raw.classes.map(capitalize),
    description: buildDescription(raw),
    ...(raw.higherLevelSlot ? { higherLevels: raw.higherLevelSlot } : {})
  }
}

// ─── Fetch & write ───────────────────────────────────────────────────────────

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        fetchText(res.headers.location!).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function main(): Promise<void> {
  console.log('Fetching SRD 5.2 spells from gist…')
  const json = await fetchText(GIST_URL)
  const raw: RawSpell[] = JSON.parse(json)
  console.log(`  Downloaded ${raw.length} spells`)

  const spells = raw.map(transform)

  const outDir = path.resolve(__dirname, '../src/renderer/data')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'spells.json')
  fs.writeFileSync(outPath, JSON.stringify(spells, null, 2))
  console.log(`✓ spells.json — ${spells.length} spells written to ${outPath}`)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
