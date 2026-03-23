import { useEffect } from 'react'
import { useDetectionStore } from '../store/detectionStore'
import { lookupEntry, lookupAllEntries, getAllEntries } from '../data'
import type { Entry, DiceRollEntry } from '../types'
import { useAudio } from './useAudio'

/**
 * Phonetic aliases — maps spoken alternative phrases back to canonical keywords.
 * Must stay in sync with the PHONETIC_ALIASES in main/grammar.ts.
 * (Duplicated here because main and renderer are separate processes.)
 */
const PHONETIC_ALIASES: Record<string, string> = {
  'fur bolg': 'firbolg', 'fir bolg': 'firbolg', 'fire bolg': 'firbolg',
  'fun grill': 'fungril', 'fung rill': 'fungril',
  'gal ah pah': 'galapa', 'gal a pa': 'galapa',
  'rib it': 'ribbet', 'rib bet': 'ribbet',
  'sim ee ah': 'simiah', 'sim eye ah': 'simiah',
  'ka tar ee': 'katari', 'ka tar eye': 'katari',
  'in fur nis': 'infernis', 'in fern is': 'infernis',
  'dra ko na': 'drakona', 'dra cone ah': 'drakona',
  'are kah na': 'arcana', 'are cane ah': 'arcana',
  'co dex': 'codex', 'code ex': 'codex',
  'sare af': 'seraph', 'sair a': 'seraph', 'sarah': 'seraph',
  'more den kine en': 'mordenkainen', 'mor den kai nen': 'mordenkainen',
  'big bees hand': "bigby's hand", 'big bee': 'bigby',
  'toss a': 'tasha', 'tash a': 'tasha',
  'melfs': 'melf', 'evo rds': 'evard',
  'ot a luke': 'otiluke', 'ot ill uke': 'otiluke',
  'draw midge': 'drawmij', 'ten sir': 'tenser',
  'nigh stool': 'nystul', 'lay oh mund': 'leomund', 'lee oh mund': 'leomund',
  'rare ee': 'rary', 'a gah nah zar': 'aganazzar',
  'can trip': 'cantrip', 'eld rich': 'eldritch',
  'neck row man see': 'necromancy', 'trans mew tay shun': 'transmutation',
  'ev oh cay shun': 'evocation', 'ab jure ay shun': 'abjuration',
  'con jure ay shun': 'conjuration', 'div in ay shun': 'divination',
  'spell cast': 'spellcast', 'spell cast roll': 'spellcast roll',
  'hit points': 'hit point', 'armor slots': 'armor slot',
  'damage threshold': 'damage thresholds', 'recall cost': 'recall cost',
}

/** Resolve a phonetic alias to its canonical keyword, or return as-is */
function resolveAlias(keyword: string): string {
  return PHONETIC_ALIASES[keyword] ?? keyword
}

// Words to ignore when searching — short/common English words and dice grammar words
const CATCH_ALL_IGNORE = new Set([
  'the', 'of', 'and', 'at', 'in', 'to', 'or', 'a', 'an', 'unk',
  'one', 'two', 'to', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'hundred',
  'die', 'dice'
])

// Map number words to numeric values for "plus {N}" dice rolls
const WORD_TO_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, 'twenty one': 21, 'twenty two': 22, 'twenty three': 23,
  'twenty four': 24, 'twenty five': 25, 'twenty six': 26, 'twenty seven': 27,
  'twenty eight': 28, 'twenty nine': 29, thirty: 30
}

/** Check if keyword is "plus {number}" and return a dice roll entry, or null */
function tryDiceRoll(keyword: string): DiceRollEntry | null {
  const match = keyword.match(/^plus\s+(.+)$/)
  if (!match) return null
  const mod = WORD_TO_NUM[match[1]]
  if (mod === undefined) return null

  const roll = Math.floor(Math.random() * 20) + 1
  const total = roll + mod
  const sign = mod >= 0 ? '+' : ''
  return {
    _type: 'diceRoll',
    id: `roll-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `d20${sign}${mod}: ${total}`,
    description: `Rolled ${roll} on d20 ${sign} ${mod} modifier = ${total}`,
    modifier: mod,
    roll,
    total
  }
}

function allEntries(): Entry[] {
  return getAllEntries()
}

/** Get all searchable names for an entry (its name + any aliases) */
function getEntryNames(entry: Entry): string[] {
  const names = [entry.name.toLowerCase()]
  const aliases = (entry as any).aliases as string[] | undefined
  if (aliases) {
    names.push(...aliases.map((a: string) => a.toLowerCase()))
  }
  return names
}

/**
 * Scan a phrase for exact entry name matches (e.g. "fireball" inside
 * "so when you cast the fireball it is going to find the room").
 * Only matches whole words to avoid false positives.
 * Also checks aliases so grouped entries trigger on sub-entry names.
 */
function extractExactMatches(phrase: string): Entry[] {
  const lower = phrase.toLowerCase().replace(/\[unk\]/g, '').trim()
  if (!lower) return []

  // Build variants: original + all adjacent-word merges
  const variants = [lower]
  const words = lower.split(/\s+/)
  if (words.length >= 2) {
    // Fully collapsed: "anti magic field" → "antimagicfield"
    variants.push(words.join(''))
    // Pairwise merges: "anti magic field" → "antimagic field", "anti magicfield"
    for (let i = 0; i < words.length - 1; i++) {
      variants.push([...words.slice(0, i), words[i] + words[i + 1], ...words.slice(i + 2)].join(' '))
    }
  }

  const seen = new Set<string>()
  const results: Entry[] = []

  for (const entry of allEntries()) {
    if (seen.has(entry.id)) continue
    for (const name of getEntryNames(entry)) {
      // Skip very short names (1-2 chars) to avoid false positives
      if (name.length < 3) continue
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = new RegExp(`\\b${escaped}\\b`)
      // Check against all variants of the input
      if (variants.some((v) => pattern.test(v))) {
        seen.add(entry.id)
        results.push(entry)
        break
      }
    }
  }
  return results
}

function catchAllLookup(phrase: string): Entry[] {
  const words = phrase
    .toLowerCase()
    .replace(/\[unk\]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !CATCH_ALL_IGNORE.has(w))

  if (words.length === 0) return []

  const seen = new Set<string>()
  const results: Entry[] = []
  for (const word of words) {
    for (const entry of allEntries()) {
      if (seen.has(entry.id)) continue
      // Check entry name and aliases for the spoken word
      if (getEntryNames(entry).some((name) => name.includes(word))) {
        seen.add(entry.id)
        results.push(entry)
      }
    }
  }
  return results
}

/**
 * Subscribes to IPC events from the main process and wires them into the
 * Zustand store. Also kicks off the audio capture pipeline.
 * Mount once at the App root.
 */
export function useIPC(): void {
  const addDetection = useDetectionStore((s) => s.addDetection)
  const setListening = useDetectionStore((s) => s.setListening)
  const setError = useDetectionStore((s) => s.setError)

  // Start getUserMedia → AudioWorklet → IPC audio pipeline
  useAudio()

  useEffect(() => {
    // Track which keywords we already detected from partials so we don't
    // double-fire when the final result arrives
    const detectedFromPartial = new Set<string>()

    // Partial results — low-latency detection mid-sentence.
    // Only fires for exact entry name matches (no catch-all/dice from partials).
    const offPartial = window.electronAPI.onKeywordPartial((payload) => {
      const keyword = resolveAlias(payload.keyword)

      // Update transcript with partial
      useDetectionStore.getState().pushTranscriptWord(keyword)

      // Scan for exact entry names in the partial text
      const matches = extractExactMatches(keyword)
      for (const entry of matches) {
        const key = entry.name.toLowerCase()
        if (!detectedFromPartial.has(key)) {
          detectedFromPartial.add(key)
          addDetection(key, entry)
        }
      }
    })

    // Final results — complete utterance
    const offKeyword = window.electronAPI.onKeywordDetected((payload) => {
      // Push to transcript
      useDetectionStore.getState().pushTranscriptWord(payload.keyword)

      // Resolve phonetic aliases
      const keyword = resolveAlias(payload.keyword)

      // Check for "plus {N}" dice roll first
      const diceEntry = tryDiceRoll(keyword)
      if (diceEntry) {
        const updated = useDetectionStore.getState().updateStickyRoll(diceEntry)
        if (!updated) {
          addDetection(diceEntry.id, diceEntry)
        }
        detectedFromPartial.clear()
        return
      }

      // Collect all matches from multiple strategies, deduplicating
      const added = new Set<string>(detectedFromPartial)

      function addIfNew(entry: Entry): void {
        const key = entry.name.toLowerCase()
        if (!added.has(key)) {
          added.add(key)
          addDetection(key, entry)
        }
      }

      // 1. Exact entry-name extraction (finds "fireball" inside a sentence)
      extractExactMatches(keyword).forEach(addIfNew)

      // 2. Mode-specific lookup
      if (useDetectionStore.getState().catchAllMode) {
        // Catch-all: find entries whose name contains any spoken word
        // (e.g. "smite" → finds "blinding smite", "divine smite", etc.)
        catchAllLookup(keyword).forEach(addIfNew)
      } else {
        // Exact mode: try direct lookup of the full phrase
        // lookupAllEntries returns [modified, original] when showBoth is on
        lookupAllEntries(keyword).forEach(addIfNew)

        // Also try with spaces collapsed so "anti magic field" matches "antimagic field"
        const collapsed = keyword.replace(/\s+/g, '')
        if (collapsed !== keyword.replace(/\s+/g, ' ')) {
          lookupAllEntries(collapsed).forEach(addIfNew)
        }
        // And try all ways to merge adjacent word pairs:
        // "anti magic field" → try "antimagic field", "anti magicfield"
        const words = keyword.split(/\s+/)
        if (words.length >= 2) {
          for (let i = 0; i < words.length - 1; i++) {
            const merged = [...words.slice(0, i), words[i] + words[i + 1], ...words.slice(i + 2)].join(' ')
            lookupAllEntries(merged).forEach(addIfNew)
          }
        }
      }

      detectedFromPartial.clear()
    })

    const offStatus = window.electronAPI.onSpeechStatus((status) => {
      setListening(status === 'listening')
    })

    const offError = window.electronAPI.onSpeechError((msg) => {
      setError(msg)
    })

    // Tell main to initialize Vosk — this also gates audio chunk processing
    window.electronAPI.startListening()

    return () => {
      offPartial()
      offKeyword()
      offStatus()
      offError()
      window.electronAPI.stopListening()
    }
  }, [])
}
