import React from 'react'
import { isSpell } from '../types'
import type { Detection } from '../types'
import { getSchoolColor } from './schoolColors'
import styles from './SpellCard.module.css'

interface Props {
  detection: Detection
  onCollapse: () => void
  onDismiss: () => void
  onPin: () => void
}

export function SpellCard({ detection, onCollapse, onDismiss, onPin }: Props): React.JSX.Element {
  const { entry } = detection
  const isSpellEntry = isSpell(entry)
  const color = isSpellEntry ? getSchoolColor(entry.school) : getSchoolColor('Feature')

  return (
    <div className={styles.card} style={{ '--accent': color } as React.CSSProperties}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.dot} />
          <h2 className={styles.name}>{entry.name}</h2>
        </div>
        <div className={styles.controls}>
          <button
            className={`${styles.btn} ${detection.pinned ? styles.btnPinned : ''}`}
            onClick={onPin}
            title={detection.pinned ? 'Unpin — will auto-dismiss when collapsed' : 'Pin — keep until manually dismissed'}
          >
            ◈
          </button>
          <button className={styles.btn} onClick={onCollapse} title="Collapse">−</button>
          {!detection.pinned && (
            <button className={styles.btn} onClick={onDismiss} title="Dismiss">×</button>
          )}
        </div>
      </div>

      <div className={styles.body}>
        {isSpellEntry ? (
          <>
            <div className={styles.meta}>
              <MetaRow label="Level" value={entry.level === 0 ? 'Cantrip' : `${entry.level}`} />
              <MetaRow label="School" value={entry.school} />
              <MetaRow label="Casting Time" value={entry.castingTime} />
              <MetaRow label="Range" value={entry.range} />
              <MetaRow label="Components" value={entry.components} />
              <MetaRow label="Duration" value={entry.concentration ? `Concentration, ${entry.duration}` : entry.duration} />
              {entry.classes.length > 0 && (
                <MetaRow label="Classes" value={entry.classes.join(', ')} />
              )}
            </div>

            <div className={styles.divider} />
            <p className={styles.description}><RichText text={entry.description} /></p>

            {entry.higherLevels && (
              <>
                <div className={styles.divider} />
                <p className={styles.higherLevels}>
                  <span className={styles.hlLabel}>At Higher Levels.</span>{' '}
                  <RichText text={entry.higherLevels} />
                </p>
              </>
            )}
          </>
        ) : (
          <>
            <div className={styles.meta}>
              <MetaRow label="Class" value={entry.class} />
              <MetaRow label="Available at" value={`Level ${entry.levelAvailable}`} />
              {entry.usesPerRest && (
                <MetaRow label="Uses" value={entry.usesPerRest} />
              )}
              {entry.restType && entry.restType !== 'none' && (
                <MetaRow label="Recharges" value={`${entry.restType} rest`} />
              )}
            </div>

            <div className={styles.divider} />
            <p className={styles.description}><RichText text={entry.description} /></p>
          </>
        )}
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className={styles.metaRow}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  )
}

// Matches dice (8d6), DC values (DC 16), and the six D&D ability scores.
// Using a capture group so split() includes the matched tokens in the result array.
const RICH_RE =
  /(\d+d\d+(?:[+-]\d+)?|\bDC\s+\d+|\b(?:strength|dexterity|constitution|intelligence|wisdom|charisma)\b)/gi

function RichText({ text }: { text: string }): React.JSX.Element {
  const parts = text.split(RICH_RE)
  return (
    <>
      {parts.map((part, i) => {
        if (/^\d+d\d+/.test(part)) {
          return <strong key={i} className={styles.dice}>{part}</strong>
        }
        if (/^DC\s/i.test(part)) {
          return <span key={i} className={styles.dc}>{part}</span>
        }
        if (/^(?:strength|dexterity|constitution|intelligence|wisdom|charisma)$/i.test(part)) {
          return <em key={i} className={styles.stat}>{part}</em>
        }
        return <React.Fragment key={i}>{part}</React.Fragment>
      })}
    </>
  )
}
