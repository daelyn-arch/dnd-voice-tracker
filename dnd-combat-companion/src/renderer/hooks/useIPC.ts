import { useEffect } from 'react'
import { useDetectionStore } from '../store/detectionStore'
import { lookupEntry, getAllEntries } from '../data'
import type { Entry, DiceRollEntry } from '../types'
import { useAudio } from './useAudio'

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

let _allEntries: Entry[] | null = null
function allEntries(): Entry[] {
  if (!_allEntries) _allEntries = getAllEntries()
  return _allEntries
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
      if (!seen.has(entry.id) && entry.name.toLowerCase().includes(word)) {
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
    const offKeyword = window.electronAPI.onKeywordDetected((payload) => {
      // Push every recognized word to the live transcript
      useDetectionStore.getState().pushTranscriptWord(payload.keyword)

      // Check for "plus {N}" dice roll first
      const diceEntry = tryDiceRoll(payload.keyword)
      if (diceEntry) {
        // If a sticky-pinned d20 card exists, update it in-place
        const updated = useDetectionStore.getState().updateStickyRoll(diceEntry)
        if (!updated) {
          // Otherwise create a new card
          addDetection(diceEntry.id, diceEntry)
        }
        return
      }

      // Read catchAllMode from store directly so closure always sees latest value
      if (useDetectionStore.getState().catchAllMode) {
        const matches = catchAllLookup(payload.keyword)
        if (matches.length > 0) {
          matches.forEach((e) => addDetection(e.name.toLowerCase(), e))
        } else {
          console.warn('[IPC] Catch-all: no matches for:', payload.keyword)
        }
      } else {
        const entry = lookupEntry(payload.keyword)
        if (entry) {
          addDetection(payload.keyword, entry)
        } else {
          console.warn('[IPC] No entry found for keyword:', payload.keyword)
        }
      }
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
      offKeyword()
      offStatus()
      offError()
      window.electronAPI.stopListening()
    }
  }, [])
}
