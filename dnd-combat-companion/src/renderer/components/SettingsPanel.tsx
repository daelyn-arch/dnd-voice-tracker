import React from 'react'
import { useDetectionStore } from '../store/detectionStore'
import styles from './SettingsPanel.module.css'

interface Props {
  onClose: () => void
}

export function SettingsPanel({ onClose }: Props): React.JSX.Element {
  const showSpells = useDetectionStore((s) => s.showSpells)
  const showFeatures = useDetectionStore((s) => s.showFeatures)
  const toggleShowSpells = useDetectionStore((s) => s.toggleShowSpells)
  const toggleShowFeatures = useDetectionStore((s) => s.toggleShowFeatures)

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Settings</h2>
        <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className={styles.divider} />

      <h3 className={styles.sectionTitle}>Detection Filter</h3>
      <p className={styles.sectionHint}>
        Choose which entry types appear when a keyword is heard or searched.
      </p>

      <div className={styles.checkList}>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={showSpells}
            onChange={toggleShowSpells}
          />
          <span className={styles.checkLabel}>Spells</span>
        </label>

        <label className={styles.checkRow}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={showFeatures}
            onChange={toggleShowFeatures}
          />
          <span className={styles.checkLabel}>Class Features</span>
        </label>
      </div>
    </div>
  )
}
