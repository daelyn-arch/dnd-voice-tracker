import * as fs from 'fs'
import * as path from 'path'

/**
 * Load all keywords from the built JSON data files.
 * Returns them as lowercase strings for Vosk grammar.
 *
 * In production, data files are in process.resourcesPath/data/.
 * In development, they're relative to the project src.
 */
export function loadKeywords(): string[] {
  const isProd = !process.env['ELECTRON_RENDERER_URL']

  const dataDir = isProd
    ? path.join(process.resourcesPath, 'data')
    : path.resolve(__dirname, '../../src/renderer/data')

  const dataFiles = [
    'spells.json',
    'features.json',
    'feats.json',
    'equipment.json',
    'backgrounds.json',
    'species.json',
    'rules.json',
    'magicItems.json',
    'daggerheart.json'
  ]

  const allNames: string[] = []

  for (const file of dataFiles) {
    try {
      const filePath = path.join(dataDir, file)
      if (fs.existsSync(filePath)) {
        const entries: { name: string }[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        allNames.push(...entries.map((e) => e.name.toLowerCase()))
      } else {
        console.warn(`[grammar] ${file} not found at`, filePath)
      }
    } catch (err) {
      console.error(`[grammar] Failed to load ${file}:`, err)
    }
  }

  // Also extract individual words from multi-word names so Vosk can recognise
  // partial speech (e.g. "fire" from "fire bolt", "magic" from "magic missile").
  const STOPWORDS = new Set(['the', 'of', 'and', 'at', 'in', 'to', 'or', 'a', 'an'])
  const wordParts: string[] = []
  for (const name of allNames) {
    const parts = name.split(/[\s-]+/)
    if (parts.length > 1) {
      parts.forEach((p) => { if (p.length >= 3 && !STOPWORDS.has(p)) wordParts.push(p) })
    }
  }

  const keywords = [...allNames, ...wordParts]

  // Deduplicate and strip entries with special characters vosk can't use
  // (parentheses, colons, slashes, digits, apostrophes, etc.)
  const unique = Array.from(new Set([...keywords, ...COMPOUND_FRAGMENTS]))
    .filter((k) => /^[a-z][a-z\s-]*[a-z]$/.test(k) || /^[a-z]+$/.test(k))
  console.log(`[grammar] Loaded ${unique.length} keywords`)
  return unique
}

/**
 * Word fragments extracted from single-word compound spell/feature names that
 * Vosk can't recognise as full words. Adding these lets users say e.g. "spell"
 * to trigger a catch-all search that finds "counterspell".
 */
const COMPOUND_FRAGMENTS = [
  // counterspell, countercharm
  'spell', 'counter', 'charm',
  // darkvision
  'dark', 'vision',
  // stoneskin, barkskin
  'stone', 'bark', 'skin',
  // cloudkill
  'cloud',
  // thunderwave
  'thunder', 'wave',
  // forcecage
  'force', 'cage',
  // passwall
  'pass',
  // shapechange
  'shape', 'change',
  // blindsense
  'blind', 'sense',
  // longstrider
  'stride',
  // feeblemind
  'feeble', 'mind',
  // demiplane
  'plane',
  // druidcraft
  'craft',
  // multiattack
  'attack',
  // overchannel
  'channel',
]
