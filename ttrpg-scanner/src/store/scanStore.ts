import { create } from 'zustand'
import type { ImageData, ModelId, ScannedEntry, ScanHistoryItem } from '../types'
import { analyzeImage } from '../lib/api'
import { loadApiKey, saveApiKey, saveHistoryItem } from '../lib/storage'

interface ScanState {
  // API key
  apiKey: string
  showApiKeyModal: boolean
  setApiKey: (key: string) => void
  setShowApiKeyModal: (show: boolean) => void

  // Image
  image: ImageData | null
  setImage: (image: ImageData | null) => void

  // Model
  model: ModelId
  setModel: (model: ModelId) => void

  // Scan state
  scanning: boolean
  error: string | null
  system: string | null
  pageDescription: string | null
  entries: ScannedEntry[]

  // Actions
  startScan: () => Promise<void>
  clearResults: () => void
}

let nextId = 1
function genId(): string {
  return `entry-${Date.now()}-${nextId++}`
}

export const useScanStore = create<ScanState>((set, get) => ({
  apiKey: loadApiKey(),
  showApiKeyModal: !loadApiKey(),
  setApiKey: (key) => {
    saveApiKey(key)
    set({ apiKey: key, showApiKeyModal: false })
  },
  setShowApiKeyModal: (show) => set({ showApiKeyModal: show }),

  image: null,
  setImage: (image) => set({ image, entries: [], error: null, system: null, pageDescription: null }),

  model: 'claude-sonnet-4-20250514',
  setModel: (model) => set({ model }),

  scanning: false,
  error: null,
  system: null,
  pageDescription: null,
  entries: [],

  startScan: async () => {
    const { apiKey, image, model } = get()
    if (!apiKey) {
      set({ showApiKeyModal: true })
      return
    }
    if (!image) return

    set({ scanning: true, error: null, entries: [], system: null, pageDescription: null })

    try {
      const result = await analyzeImage({ apiKey, image, model })
      const entries: ScannedEntry[] = result.entries.map((e) => ({
        ...e,
        id: genId(),
      }))
      set({
        scanning: false,
        entries,
        system: result.system,
        pageDescription: result.pageDescription,
      })

      // Save to history
      const historyItem: ScanHistoryItem = {
        id: genId(),
        timestamp: Date.now(),
        system: result.system,
        pageDescription: result.pageDescription,
        entries,
        imageName: image.name,
      }
      saveHistoryItem(historyItem)
    } catch (err) {
      set({
        scanning: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  },

  clearResults: () => set({ entries: [], error: null, system: null, pageDescription: null, image: null }),
}))
