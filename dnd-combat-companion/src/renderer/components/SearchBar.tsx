import React, { useState } from 'react'
import { getSpells, getFeatures } from '../data'
import { useDetectionStore } from '../store/detectionStore'
import { isSpell } from '../types'
import { getSchoolColor } from './schoolColors'
import type { Entry } from '../types'
import styles from './SearchBar.module.css'



interface Props {
  onClose: () => void
}

let _all: Entry[] | null = null
function getAllEntries(): Entry[] {
  if (!_all) _all = [...getSpells(), ...getFeatures()]
  return _all
}

function entryColor(entry: Entry): string {
  return isSpell(entry) ? getSchoolColor(entry.school) : '#607d8b'
}

function entryBadge(entry: Entry): string {
  return isSpell(entry) ? entry.school : (entry as { class: string }).class
}

export function SearchBar({ onClose }: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const addDetection = useDetectionStore((s) => s.addDetection)
  const expandDetection = useDetectionStore((s) => s.expandDetection)
  const showSpells = useDetectionStore((s) => s.showSpells)
  const showFeatures = useDetectionStore((s) => s.showFeatures)

  const trimmed = query.trim()
  const results = trimmed.length >= 2
    ? getAllEntries()
        .filter((e) => isSpell(e) ? showSpells : showFeatures)
        .filter((e) => e.name.toLowerCase().includes(trimmed.toLowerCase()))
        .slice(0, 8)
    : []

  function handleSelect(entry: Entry): void {
    const keyword = entry.name.toLowerCase()
    addDetection(keyword, entry)
    // Expand immediately — read id from store after addDetection has run
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
          placeholder="Search spells & features…"
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
                  <span className={styles.dot} style={{ background: entryColor(entry) }} />
                  <span className={styles.resultName}>{entry.name}</span>
                  <span className={styles.resultBadge}>{entryBadge(entry)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {trimmed.length >= 2 && results.length === 0 && (
        <p className={styles.empty}>No results for "{trimmed}"</p>
      )}
    </div>
  )
}
