import { create } from 'zustand'
import type { Detection, Entry } from '../types'

const MAX_DETECTIONS = 32

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
  showSpells: boolean
  showFeatures: boolean
  toggleShowSpells: () => void
  toggleShowFeatures: () => void
}

export const useDetectionStore = create<DetectionStore>((set, get) => ({
  detections: [],
  isListening: false,
  errorMsg: null,
  catchAllMode: false,
  showSpells: true,
  showFeatures: true,

  addDetection(keyword, entry) {
    set((state) => {
      // Dedup: if same keyword already present, refresh its timestamp
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

      // Cap at MAX_DETECTIONS — drop oldest
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

  toggleShowSpells() {
    set((s) => ({ showSpells: !s.showSpells }))
  },

  toggleShowFeatures() {
    set((s) => ({ showFeatures: !s.showFeatures }))
  }
}))
