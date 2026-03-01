import React from 'react'
import { useDetectionStore } from '../store/detectionStore'
import type { EntryType } from '../types'
import styles from './SettingsPanel.module.css'

interface Props {
  onClose: () => void
}

interface FilterItem {
  type: EntryType
  label: string
}

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

const DH_FILTERS: FilterItem[] = [
  { type: 'daggerheart', label: 'Daggerheart (All)' }
]

export function SettingsPanel({ onClose }: Props): React.JSX.Element {
  const visibleTypes = useDetectionStore((s) => s.visibleTypes)
  const toggleVisibleType = useDetectionStore((s) => s.toggleVisibleType)

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Settings</h2>
        <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className={styles.divider} />

      <h3 className={styles.sectionTitle}>D&D 2024</h3>
      <p className={styles.sectionHint}>
        Choose which entry types appear when a keyword is heard or searched.
      </p>

      <div className={styles.checkList}>
        {DND_FILTERS.map(({ type, label }) => (
          <label key={type} className={styles.checkRow}>
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
        {DH_FILTERS.map(({ type, label }) => (
          <label key={type} className={styles.checkRow}>
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
    </div>
  )
}
