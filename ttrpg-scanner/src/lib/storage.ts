import type { ScanHistoryItem } from '../types'

const API_KEY_KEY = 'ttrpg-scanner-api-key'
const HISTORY_KEY = 'ttrpg-scanner-history'
const MAX_HISTORY = 50

export function loadApiKey(): string {
  return localStorage.getItem(API_KEY_KEY) ?? ''
}

export function saveApiKey(key: string): void {
  if (key) {
    localStorage.setItem(API_KEY_KEY, key)
  } else {
    localStorage.removeItem(API_KEY_KEY)
  }
}

export function loadHistory(): ScanHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveHistoryItem(item: ScanHistoryItem): void {
  const history = loadHistory()
  history.unshift(item)
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY)
}
