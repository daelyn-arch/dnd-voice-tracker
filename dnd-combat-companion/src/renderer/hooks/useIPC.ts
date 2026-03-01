import { useEffect } from 'react'
import { useDetectionStore } from '../store/detectionStore'
import { lookupEntry, getAllEntries } from '../data'
import type { Entry } from '../types'
import { useAudio } from './useAudio'

// Words to ignore when searching — short/common English words and dice grammar words
const CATCH_ALL_IGNORE = new Set([
  'the', 'of', 'and', 'at', 'in', 'to', 'or', 'a', 'an', 'unk',
  'one', 'two', 'to', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'hundred',
  'die', 'dice'
])

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
