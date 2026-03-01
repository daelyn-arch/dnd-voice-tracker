import * as fs from 'fs'
import * as path from 'path'

/**
 * Load all spell/feature keywords from the built JSON data files.
 * Returns them as lowercase strings for Vosk grammar.
 *
 * In production, data files are in process.resourcesPath/data/.
 * In development, they're relative to the project src.
 */
export function loadKeywords(): string[] {
  let spells: { name: string }[] = []
  let features: { name: string }[] = []

  const isProd = !process.env['ELECTRON_RENDERER_URL']

  const dataDir = isProd
    ? path.join(process.resourcesPath, 'data')
    : path.resolve(__dirname, '../../src/renderer/data')

  try {
    const spellsPath = path.join(dataDir, 'spells.json')
    const featuresPath = path.join(dataDir, 'features.json')

    if (fs.existsSync(spellsPath)) {
      spells = JSON.parse(fs.readFileSync(spellsPath, 'utf-8'))
    } else {
      console.warn('[grammar] spells.json not found at', spellsPath)
    }

    if (fs.existsSync(featuresPath)) {
      features = JSON.parse(fs.readFileSync(featuresPath, 'utf-8'))
    } else {
      console.warn('[grammar] features.json not found at', featuresPath)
    }
  } catch (err) {
    console.error('[grammar] Failed to load data files:', err)
  }

  const allNames = [
    ...spells.map((s) => s.name.toLowerCase()),
    ...features.map((f) => f.name.toLowerCase())
  ]

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
