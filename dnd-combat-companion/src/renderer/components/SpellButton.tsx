import React from 'react'
import type { Detection } from '../types'
import { getEntryColor, getEntryBadge } from './schoolColors'
import styles from './SpellButton.module.css'

interface Props {
  detection: Detection
  onExpand: () => void
  onDismiss: () => void
}

export function SpellButton({ detection, onExpand, onDismiss }: Props): React.JSX.Element {
  const { entry } = detection
  const color = getEntryColor(entry)
  const badge = getEntryBadge(entry)

  return (
    <button
      className={styles.button}
      style={{ '--accent': color } as React.CSSProperties}
      onClick={onExpand}
    >
      <span className={styles.dot} />
      <span className={styles.name}>
        {entry._type === 'diceRoll'
          ? entry.notation
            ? <><span style={{ color }}>{entry.notation}</span>{`: ${entry.total}`}</>
            : <>d20<span style={{ color }}>{`+${entry.modifier}`}</span>{`: ${entry.total}`}</>
          : entry.name}
      </span>
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
