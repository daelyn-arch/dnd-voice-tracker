import React from 'react'
import { isSpell } from '../types'
import type { Detection } from '../types'
import { getSchoolColor } from './schoolColors'
import styles from './SpellButton.module.css'

interface Props {
  detection: Detection
  onExpand: () => void
  onDismiss: () => void
}

export function SpellButton({ detection, onExpand, onDismiss }: Props): React.JSX.Element {
  const { entry } = detection
  const isSpellEntry = isSpell(entry)
  const color = isSpellEntry ? getSchoolColor(entry.school) : getSchoolColor('Feature')

  const label = entry.name
  const badge = isSpellEntry
    ? entry.level === 0
      ? 'Cantrip'
      : `L${entry.level} ${entry.school.slice(0, 4)}`
    : entry.class

  return (
    <button
      className={styles.button}
      style={{ '--accent': color } as React.CSSProperties}
      onClick={onExpand}
    >
      <span className={styles.dot} />
      <span className={styles.name}>{label}</span>
      <span className={styles.badge}>{badge}</span>
      {detection.pinned && <span className={styles.pinIcon} title="Pinned">◈</span>}
      <button
        className={styles.dismiss}
        onClick={(e) => {
          e.stopPropagation()
          onDismiss()
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </button>
  )
}
