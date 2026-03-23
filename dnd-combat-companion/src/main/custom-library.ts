/**
 * custom-library.ts — Persistent storage for user-created cards.
 * Stored in the app's userData directory as custom-library.json.
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export interface CustomCard {
  id: string
  name: string
  description: string
  game: 'dnd' | 'daggerheart' | 'other'
  category: string  // 'spell' | 'feature' | 'feat' | 'equipment' | 'rules' | etc.
  createdAt: number
  // Optional spell-specific fields
  spellLevel?: number
  spellSchool?: string
  castingTime?: string
  range?: string
  components?: string
  duration?: string
  classes?: string[]
  // Modification tracking
  originalEntryId?: string
  originalEntryType?: string
  showBoth?: boolean
}

function getLibraryPath(): string {
  return path.join(app.getPath('userData'), 'custom-library.json')
}

function loadLibrary(): CustomCard[] {
  const p = getLibraryPath()
  try {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'))
    }
  } catch (err) {
    console.error('[custom-library] Failed to load:', err)
  }
  return []
}

function saveLibrary(cards: CustomCard[]): void {
  const p = getLibraryPath()
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(cards, null, 2))
}

export function getCustomCards(): CustomCard[] {
  return loadLibrary()
}

export function addCustomCard(card: CustomCard): CustomCard[] {
  const cards = loadLibrary()
  cards.push(card)
  saveLibrary(cards)
  return cards
}

export function updateCustomCard(id: string, updates: Partial<CustomCard>): CustomCard[] {
  const cards = loadLibrary()
  const idx = cards.findIndex((c) => c.id === id)
  if (idx >= 0) {
    cards[idx] = { ...cards[idx], ...updates, id } // preserve id
    saveLibrary(cards)
  }
  return cards
}

export function deleteCustomCard(id: string): CustomCard[] {
  const cards = loadLibrary().filter((c) => c.id !== id)
  saveLibrary(cards)
  return cards
}

export function exportLibrary(): string {
  return JSON.stringify(loadLibrary(), null, 2)
}

export function importLibrary(json: string): CustomCard[] {
  const incoming: CustomCard[] = JSON.parse(json)
  const existing = loadLibrary()
  const existingIds = new Set(existing.map((c) => c.id))
  // Merge: skip duplicates by id
  const merged = [...existing, ...incoming.filter((c) => !existingIds.has(c.id))]
  saveLibrary(merged)
  return merged
}
