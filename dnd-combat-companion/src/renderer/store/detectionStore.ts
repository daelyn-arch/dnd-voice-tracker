import { create } from 'zustand'
import type { Detection, Entry, EntryType } from '../types'

const MAX_DETECTIONS = 128

type VisibleTypes = Record<EntryType, boolean>

interface DetectionStore {
  detections: Detection[]
  isListening: boolean
  errorMsg: string | null

  addDetection: (keyword: string, entry: Entry) => void
  removeDetection: (id: string) => void
  expandDetection: (id: string) => void
  collapseDetection: (id: string) => void
  togglePin: (id: string) => void
  setListening: (v: boolean) => void
  setError: (msg: string | null) => void
  catchAllMode: boolean
  toggleCatchAllMode: () => void

  // Unified visibility map replaces showSpells/showFeatures
  visibleTypes: VisibleTypes
  toggleVisibleType: (type: EntryType) => void

  // Legacy compat — derived from visibleTypes
  showSpells: boolean
  showFeatures: boolean
  toggleShowSpells: () => void
  toggleShowFeatures: () => void
}

const DEFAULT_VISIBLE: VisibleTypes = {
  spell: true,
  feature: true,
  feat: true,
  equipment: true,
  background: true,
  species: true,
  rules: true,
  magicItem: true,
  daggerheart: true
}

export const useDetectionStore = create<DetectionStore>((set, get) => ({
  detections: [],
  isListening: false,
  errorMsg: null,
  catchAllMode: false,
  visibleTypes: { ...DEFAULT_VISIBLE },

  // Legacy derived getters
  get showSpells() { return get().visibleTypes.spell },
  get showFeatures() { return get().visibleTypes.feature },

  addDetection(keyword, entry) {
    set((state) => {
      const existing = state.detections.find(
        (d) => d.keyword === keyword
      )
      if (existing) {
        return {
          detections: state.detections.map((d) =>
            d.keyword === keyword ? { ...d, detectedAt: Date.now() } : d
          )
        }
      }

      const next: Detection = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        keyword,
        entry,
        detectedAt: Date.now(),
        expanded: false,
        pinned: false
      }

      const list = [next, ...state.detections].slice(0, MAX_DETECTIONS)
      return { detections: list }
    })
  },

  removeDetection(id) {
    set((state) => ({
      detections: state.detections.filter((d) => d.id !== id)
    }))
  },

  expandDetection(id) {
    set((state) => ({
      detections: state.detections.map((d) =>
        d.id === id ? { ...d, expanded: true } : d
      )
    }))
  },

  collapseDetection(id) {
    set((state) => ({
      detections: state.detections.map((d) =>
        d.id === id ? { ...d, expanded: false } : d
      )
    }))
  },

  togglePin(id) {
    set((state) => ({
      detections: state.detections.map((d) =>
        d.id === id ? { ...d, pinned: !d.pinned } : d
      )
    }))
  },

  setListening(v) {
    set({ isListening: v })
  },

  setError(msg) {
    set({ errorMsg: msg })
  },

  toggleCatchAllMode() {
    set((s) => ({ catchAllMode: !s.catchAllMode }))
  },

  toggleVisibleType(type) {
    set((s) => ({
      visibleTypes: { ...s.visibleTypes, [type]: !s.visibleTypes[type] }
    }))
  },

  // Legacy toggle methods
  toggleShowSpells() {
    get().toggleVisibleType('spell')
  },
  toggleShowFeatures() {
    get().toggleVisibleType('feature')
  }
}))
