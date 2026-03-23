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
    'spells_srd.json',
    'features_srd.json',
    'feats_srd.json',
    'equipment_srd.json',
    'backgrounds_srd.json',
    'species_srd.json',
    'rules_srd.json',
    'magicItems_srd.json',
    'daggerheart.json',
    'daggerheart_srd.json'
  ]

  const allNames: string[] = []

  for (const file of dataFiles) {
    try {
      const filePath = path.join(dataDir, file)
      if (fs.existsSync(filePath)) {
        const entries: { name: string; aliases?: string[] }[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        for (const e of entries) {
          allNames.push(e.name.toLowerCase())
          if (e.aliases) {
            allNames.push(...e.aliases.map((a) => a.toLowerCase()))
          }
        }
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

  // Dice roll phrases: "plus one" through "plus thirty"
  const NUMBERS = [
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
    'eighteen', 'nineteen', 'twenty', 'twenty one', 'twenty two', 'twenty three',
    'twenty four', 'twenty five', 'twenty six', 'twenty seven', 'twenty eight',
    'twenty nine', 'thirty'
  ]
  const plusPhrases = NUMBERS.map((n) => `plus ${n}`)

  const phoneticPhrases = getPhoneticPhrases()
  const keywords = [...allNames, ...wordParts, ...plusPhrases, ...phoneticPhrases]

  // Deduplicate and strip entries with special characters vosk can't use
  // (parentheses, colons, slashes, digits, apostrophes, etc.)
  const unique = Array.from(new Set([...keywords, ...COMPOUND_FRAGMENTS]))
    .filter((k) => /^[a-z][a-z\s-]*[a-z]$/.test(k) || /^[a-z]+$/.test(k))
  console.log(`[grammar] Loaded ${unique.length} keywords (${phoneticPhrases.length} phonetic aliases)`)
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

/**
 * Phonetic alternatives for fantasy/unusual TTRPG terms.
 * Maps spoken alternative → canonical keyword that the lookup can resolve.
 * These get added to the Vosk grammar so it can recognise common mispronunciations
 * and phonetic spellings of fantasy words.
 */
export const PHONETIC_ALIASES: Record<string, string> = {
  // ─── Daggerheart ancestries ──────────────────────────────────────────
  'fur bolg': 'firbolg',
  'fir bolg': 'firbolg',
  'fire bolg': 'firbolg',
  'fun grill': 'fungril',
  'fung rill': 'fungril',
  'gal ah pah': 'galapa',
  'gal a pa': 'galapa',
  'rib it': 'ribbet',
  'rib bet': 'ribbet',
  'sim ee ah': 'simiah',
  'sim eye ah': 'simiah',
  'ka tar ee': 'katari',
  'ka tar eye': 'katari',
  'in fur nis': 'infernis',
  'in fern is': 'infernis',
  'dra ko na': 'drakona',
  'dra cone ah': 'drakona',

  // ─── Daggerheart domains & classes ───────────────────────────────────
  'are kah na': 'arcana',
  'are cane ah': 'arcana',
  'co dex': 'codex',
  'code ex': 'codex',
  'sare af': 'seraph',
  'sair a': 'seraph',
  'sarah': 'seraph',

  // ─── D&D named spells ───────────────────────────────────────────────
  'more den kine en': 'mordenkainen',
  'mor den kai nen': 'mordenkainen',
  'big bees hand': "bigby's hand",
  'big bee': 'bigby',
  'toss a': 'tasha',
  'tash a': 'tasha',
  'melfs': 'melf',
  'evo rds': 'evard',
  'ot a luke': 'otiluke',
  'ot ill uke': 'otiluke',
  'draw midge': 'drawmij',
  'ten sir': 'tenser',
  'nigh stool': 'nystul',
  'lay oh mund': 'leomund',
  'lee oh mund': 'leomund',
  'rare ee': 'rary',
  'a gah nah zar': 'aganazzar',

  // ─── Commonly mispronounced D&D terms ───────────────────────────────
  'can trip': 'cantrip',
  'eldritch': 'eldritch',
  'eld rich': 'eldritch',
  'necromancy': 'necromancy',
  'neck row man see': 'necromancy',
  'transmutation': 'transmutation',
  'trans mew tay shun': 'transmutation',
  'evocation': 'evocation',
  'ev oh cay shun': 'evocation',
  'abjuration': 'abjuration',
  'ab jure ay shun': 'abjuration',
  'conjuration': 'conjuration',
  'con jure ay shun': 'conjuration',
  'divination': 'divination',
  'div in ay shun': 'divination',
  'enchantment': 'enchantment',
  'illusion': 'illusion',

  // ─── Daggerheart game terms ─────────────────────────────────────────
  'spell cast': 'spellcast',
  'spell cast roll': 'spellcast roll',
  'hit points': 'hit point',
  'armor slots': 'armor slot',
  'damage threshold': 'damage thresholds',
  'recall cost': 'recall cost',
}

/** All phonetic alternative phrases for the Vosk grammar */
export function getPhoneticPhrases(): string[] {
  return Object.keys(PHONETIC_ALIASES)
}
