import React from 'react'
import { useDetectionStore } from '../store/detectionStore'
import type { EntryType } from '../types'
import type { DHCategory } from '../store/detectionStore'
import styles from './SettingsPanel.module.css'

interface Props {
  onClose: () => void
}

interface FilterItem {
  type: EntryType
  label: string
}

interface DHFilterItem {
  category: DHCategory
  label: string
}

const DND_TYPES: EntryType[] = ['spell', 'feature', 'feat', 'equipment', 'background', 'species', 'rules', 'magicItem']

const DND_FILTERS: FilterItem[] = [
  { type: 'spell', label: 'Spells' },
  { type: 'feature', label: 'Class Features' },
  { type: 'feat', label: 'Feats' },
  { type: 'equipment', label: 'Equipment' },
  { type: 'background', label: 'Backgrounds' },
  { type: 'species', label: 'Species' },
  { type: 'rules', label: 'Rules' },
  { type: 'magicItem', label: 'Magic Items' }
]

const DH_CATEGORY_FILTERS: DHFilterItem[] = [
  { category: 'domain', label: 'Domains' },
  { category: 'class features', label: 'Class Features' },
  { category: 'rules', label: 'Rules' },
  { category: 'adversary', label: 'Adversaries' }
]

export function SettingsPanel({ onClose }: Props): React.JSX.Element {
  const visibleTypes = useDetectionStore((s) => s.visibleTypes)
  const toggleVisibleType = useDetectionStore((s) => s.toggleVisibleType)
  const visibleDHCategories = useDetectionStore((s) => s.visibleDHCategories)
  const toggleDHCategory = useDetectionStore((s) => s.toggleDHCategory)
  const selectDndOnly = useDetectionStore((s) => s.selectDndOnly)
  const selectDaggerheartOnly = useDetectionStore((s) => s.selectDaggerheartOnly)
  const autoExpandDiceRolls = useDetectionStore((s) => s.autoExpandDiceRolls)
  const toggleAutoExpandDiceRolls = useDetectionStore((s) => s.toggleAutoExpandDiceRolls)
  const showTranscript = useDetectionStore((s) => s.showTranscript)
  const toggleShowTranscript = useDetectionStore((s) => s.toggleShowTranscript)
  const sortByCategory = useDetectionStore((s) => s.sortByCategory)
  const toggleSortByCategory = useDetectionStore((s) => s.toggleSortByCategory)
  const daggerheartSource = useDetectionStore((s) => s.daggerheartSource)
  const setDhSource = useDetectionStore((s) => s.setDaggerheartSource)

  const anyDndOn = DND_TYPES.some((t) => visibleTypes[t])
  const allDndOn = DND_TYPES.every((t) => visibleTypes[t])

  function toggleAllDnd(): void {
    const target = !allDndOn
    const store = useDetectionStore.getState()
    const vt = { ...store.visibleTypes }
    for (const t of DND_TYPES) vt[t] = target
    useDetectionStore.setState({ visibleTypes: vt })
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Settings</h2>
        <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.quickRow}>
        <button className={styles.quickBtn} onMouseDown={(e) => { e.preventDefault(); selectDndOnly() }}>
          D&D 2024
        </button>
        <button className={styles.quickBtn} onMouseDown={(e) => { e.preventDefault(); selectDaggerheartOnly() }}>
          Daggerheart
        </button>
      </div>

      <div className={styles.divider} />

      <h3 className={styles.sectionTitle}>D&D 2024</h3>

      <div className={styles.checkList}>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={allDndOn}
            ref={(el) => { if (el) el.indeterminate = anyDndOn && !allDndOn }}
            onChange={toggleAllDnd}
          />
          <span className={styles.checkLabel}>All D&D</span>
        </label>
        {anyDndOn && DND_FILTERS.map(({ type, label }) => (
          <label key={type} className={`${styles.checkRow} ${styles.subCheck}`}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={visibleTypes[type]}
              onChange={() => toggleVisibleType(type)}
            />
            <span className={styles.checkLabel}>{label}</span>
          </label>
        ))}
      </div>

      <div className={styles.divider} />

      <h3 className={styles.sectionTitle}>Daggerheart</h3>

      <div className={styles.checkList}>
        <label className={styles.checkRow}>
          <span className={styles.checkLabel}>Data Source</span>
        </label>
        <div className={styles.sourceToggle}>
          <button
            className={`${styles.sourceBtn} ${daggerheartSource === 'corebook' ? styles.sourceBtnActive : ''}`}
            onClick={() => setDhSource('corebook')}
          >
            Core Book
          </button>
          <button
            className={`${styles.sourceBtn} ${daggerheartSource === 'srd' ? styles.sourceBtnActive : ''}`}
            onClick={() => setDhSource('srd')}
          >
            SRD (Commercial)
          </button>
        </div>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={visibleTypes.daggerheart}
            onChange={() => toggleVisibleType('daggerheart')}
          />
          <span className={styles.checkLabel}>All Daggerheart</span>
        </label>
        {visibleTypes.daggerheart && DH_CATEGORY_FILTERS.map(({ category, label }) => (
          <label key={category} className={`${styles.checkRow} ${styles.subCheck}`}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={visibleDHCategories[category]}
              onChange={() => toggleDHCategory(category)}
            />
            <span className={styles.checkLabel}>{label}</span>
          </label>
        ))}
      </div>

      <div className={styles.divider} />

      <h3 className={styles.sectionTitle}>Dice Rolls</h3>
      <div className={styles.checkList}>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={visibleTypes.diceRoll}
            onChange={() => toggleVisibleType('diceRoll')}
          />
          <span className={styles.checkLabel}>Show Dice Rolls</span>
        </label>
        <label className={`${styles.checkRow} ${styles.subCheck}`}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={autoExpandDiceRolls}
            onChange={toggleAutoExpandDiceRolls}
          />
          <span className={styles.checkLabel}>Auto-expand on pop up</span>
        </label>
      </div>

      <div className={styles.divider} />

      <h3 className={styles.sectionTitle}>Display</h3>
      <div className={styles.checkList}>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={sortByCategory}
            onChange={toggleSortByCategory}
          />
          <span className={styles.checkLabel}>Group cards by category</span>
        </label>
      </div>

      <div className={styles.divider} />

      <h3 className={styles.sectionTitle}>Debug</h3>
      <div className={styles.checkList}>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={showTranscript}
            onChange={toggleShowTranscript}
          />
          <span className={styles.checkLabel}>Live transcript</span>
        </label>
      </div>
    </div>
  )
}
