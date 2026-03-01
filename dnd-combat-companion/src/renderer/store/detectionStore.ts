import { create } from 'zustand'
import type { Detection, Entry, EntryType, DaggerheartEntry, DiceRollEntry } from '../types'

const MAX_DETECTIONS = 128

type VisibleTypes = Record<EntryType, boolean>

export type DHCategory = 'domain' | 'class features' | 'rules' | 'adversary'
type VisibleDHCategories = Record<DHCategory, boolean>

// D&D entry types (for quick-select buttons)
const DND_TYPES: EntryType[] = ['spell', 'feature', 'feat', 'equipment', 'background', 'species', 'rules', 'magicItem']

interface DetectionStore {
  detections: Detection[]
  isListening: boolean
  errorMsg: string | null

  addDetection: (keyword: string, entry: Entry) => void
  /** Update the sticky-pinned d20 card in-place. Returns true if one was updated. */
  updateStickyRoll: (entry: DiceRollEntry) => boolean
  toggleStickyRoll: (id: string) => void
  removeDetection: (id: string) => void
  expandDetection: (id: string) => void
  collapseDetection: (id: string) => void
  togglePin: (id: string) => void
  setListening: (v: boolean) => void
  setError: (msg: string | null) => void
  catchAllMode: boolean
  toggleCatchAllMode: () => void

  // Unified visibility map
  visibleTypes: VisibleTypes
  toggleVisibleType: (type: EntryType) => void

  // Daggerheart sub-category visibility
  visibleDHCategories: VisibleDHCategories
  toggleDHCategory: (cat: DHCategory) => void

  // Quick-select: enable one system, disable the other
  selectDndOnly: () => void
  selectDaggerheartOnly: () => void

  /** Check if a detection should be visible (type + DH category) */
  isEntryVisible: (entry: Entry) => boolean

  // Dice roll settings
  autoExpandDiceRolls: boolean
  toggleAutoExpandDiceRolls: () => void

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
  daggerheart: true,
  diceRoll: true
}

const DEFAULT_DH_CATEGORIES: VisibleDHCategories = {
  domain: true,
  'class features': true,
  rules: true,
  adversary: true
}

export const useDetectionStore = create<DetectionStore>((set, get) => ({
  detections: [],
  isListening: false,
  errorMsg: null,
  catchAllMode: false,
  visibleTypes: { ...DEFAULT_VISIBLE },
  visibleDHCategories: { ...DEFAULT_DH_CATEGORIES },
  autoExpandDiceRolls: true,

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

      const autoExpand = entry._type === 'diceRoll' && get().autoExpandDiceRolls

      const next: Detection = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        keyword,
        entry,
        detectedAt: Date.now(),
        expanded: autoExpand,
        pinned: false,
        stickyRoll: false
      }

      const list = [next, ...state.detections].slice(0, MAX_DETECTIONS)
      return { detections: list }
    })
  },

  updateStickyRoll(entry: DiceRollEntry) {
    const state = get()
    const sticky = state.detections.find(
      (d) => d.stickyRoll && d.pinned && d.expanded && d.entry._type === 'diceRoll'
    )
    if (!sticky) return false
    set({
      detections: state.detections.map((d) =>
        d.id === sticky.id
          ? { ...d, entry, keyword: entry.id, detectedAt: Date.now() }
          : d
      )
    })
    return true
  },

  toggleStickyRoll(id) {
    set((state) => ({
      detections: state.detections.map((d) =>
        d.id === id ? { ...d, stickyRoll: !d.stickyRoll } : d
      )
    }))
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

  toggleDHCategory(cat) {
    set((s) => ({
      visibleDHCategories: { ...s.visibleDHCategories, [cat]: !s.visibleDHCategories[cat] }
    }))
  },

  selectDndOnly() {
    set((s) => {
      const vt = { ...s.visibleTypes }
      for (const t of DND_TYPES) vt[t] = true
      vt.daggerheart = false
      vt.diceRoll = true
      return { visibleTypes: vt }
    })
  },

  selectDaggerheartOnly() {
    set((s) => {
      const vt = { ...s.visibleTypes }
      for (const t of DND_TYPES) vt[t] = false
      vt.daggerheart = true
      vt.diceRoll = true
      return {
        visibleTypes: vt,
        visibleDHCategories: { ...DEFAULT_DH_CATEGORIES }
      }
    })
  },

  toggleAutoExpandDiceRolls() {
    set((s) => ({ autoExpandDiceRolls: !s.autoExpandDiceRolls }))
  },

  isEntryVisible(entry) {
    const s = get()
    if (!s.visibleTypes[entry._type]) return false
    if (entry._type === 'daggerheart') {
      return s.visibleDHCategories[(entry as DaggerheartEntry).category]
    }
    return true
  },

  // Legacy toggle methods
  toggleShowSpells() {
    get().toggleVisibleType('spell')
  },
  toggleShowFeatures() {
    get().toggleVisibleType('feature')
  }
}))
