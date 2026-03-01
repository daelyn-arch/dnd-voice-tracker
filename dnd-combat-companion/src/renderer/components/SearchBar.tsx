import React, { useState } from 'react'
import { getAllEntries } from '../data'
import { useDetectionStore } from '../store/detectionStore'
import { getEntryColor, getEntryBadge } from './schoolColors'
import type { Entry } from '../types'
import styles from './SearchBar.module.css'

interface Props {
  onClose: () => void
}

let _all: Entry[] | null = null
function cachedAllEntries(): Entry[] {
  if (!_all) _all = getAllEntries()
  return _all
}

export function SearchBar({ onClose }: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const addDetection = useDetectionStore((s) => s.addDetection)
  const expandDetection = useDetectionStore((s) => s.expandDetection)
  const visibleTypes = useDetectionStore((s) => s.visibleTypes)
  const visibleDHCategories = useDetectionStore((s) => s.visibleDHCategories)
  const isEntryVisible = useDetectionStore((s) => s.isEntryVisible)

  void visibleTypes
  void visibleDHCategories

  const trimmed = query.trim()
  const results = trimmed.length >= 2
    ? cachedAllEntries()
        .filter((e) => isEntryVisible(e))
        .filter((e) => e.name.toLowerCase().includes(trimmed.toLowerCase()))
        .slice(0, 12)
    : []

  function handleSelect(entry: Entry): void {
    const keyword = entry.name.toLowerCase()
    addDetection(keyword, entry)
    const detection = useDetectionStore.getState().detections.find((d) => d.keyword === keyword)
    if (detection) expandDetection(detection.id)
    onClose()
  }

  return (
    <div className={styles.panel}>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          autoFocus
          placeholder="Search all entries…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'Enter' && results.length > 0) handleSelect(results[0])
          }}
        />
        <button
          className={styles.closeBtn}
          onMouseDown={(e) => { e.preventDefault(); onClose() }}
          aria-label="Close search"
        >
          ×
        </button>
      </div>

      {results.length > 0 && (
        <>
          <div className={styles.divider} />
          <ul className={styles.results}>
            {results.map((entry) => (
              <li key={entry.id} className={styles.resultItem}>
                <button
                  className={styles.resultBtn}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(entry) }}
                >
                  <span className={styles.dot} style={{ background: getEntryColor(entry) }} />
                  <span className={styles.resultName}>{entry.name}</span>
                  <span className={styles.resultBadge}>{getEntryBadge(entry)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {trimmed.length >= 2 && results.length === 0 && (
        <p className={styles.empty}>No results for &ldquo;{trimmed}&rdquo;</p>
      )}
    </div>
  )
}
