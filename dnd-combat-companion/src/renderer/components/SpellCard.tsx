import React from 'react'
import type { Detection, DiceRollEntry } from '../types'
import { useDetectionStore } from '../store/detectionStore'
import { getEntryColor, SCHOOL_COLORS } from './schoolColors'
import { isModifiedEntry } from '../data'
import styles from './SpellCard.module.css'

/** Parse dice notation like "8d6" or "2d10+5", roll, and return an entry */
function rollDice(notation: string): DiceRollEntry {
  const match = notation.match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/)
  if (!match) throw new Error(`Invalid dice notation: ${notation}`)

  const count = parseInt(match[1], 10)
  const sides = parseInt(match[2], 10)
  const modSign = match[3] === '-' ? -1 : 1
  const modifier = match[4] ? modSign * parseInt(match[4], 10) : 0

  const rolls: number[] = []
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1)
  }
  const sum = rolls.reduce((a, b) => a + b, 0)
  const total = sum + modifier

  return {
    _type: 'diceRoll',
    id: `roll-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${notation}: ${total}`,
    description: `Rolled ${notation}: ${rolls.join(' + ')}${modifier !== 0 ? ` + ${modifier}` : ''} = ${total}`,
    modifier,
    roll: sum,
    total,
    notation,
    rolls
  }
}

interface Props {
  detection: Detection
  onCollapse: () => void
  onDismiss: () => void
  onPin: () => void
  onStickyToggle: () => void
  onEdit: () => void
}

export function SpellCard({ detection, onCollapse, onDismiss, onPin, onStickyToggle, onEdit }: Props): React.JSX.Element {
  const { entry } = detection
  const color = getEntryColor(entry)
  const showSticky = entry._type === 'diceRoll' && detection.pinned

  return (
    <div className={styles.card} style={{ '--accent': color } as React.CSSProperties}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.dot} />
          <h2 className={styles.name}>
            {entry._type === 'diceRoll'
              ? entry.notation
                ? <><span style={{ color }}>{entry.notation}</span>{`: ${entry.total}`}</>
                : <>d20<span style={{ color }}>{`+${entry.modifier}`}</span>{`: ${entry.total}`}</>
              : <>{entry.name}{isModifiedEntry(entry.id) && <span style={{ color: SCHOOL_COLORS.Modified, fontSize: '10px' }}> ★</span>}</>}
          </h2>
        </div>
        <div className={styles.controls}>
          {showSticky && (
            <button
              className={`${styles.btn} ${detection.stickyRoll ? styles.btnSticky : ''}`}
              onClick={onStickyToggle}
              title={detection.stickyRoll ? 'Sticky ON — new rolls update this card' : 'Sticky OFF — new rolls create new cards'}
            >
              ⊙
            </button>
          )}
          <button
            className={`${styles.btn} ${detection.pinned ? styles.btnPinned : ''}`}
            onClick={onPin}
            title={detection.pinned ? 'Unpin — will auto-dismiss when collapsed' : 'Pin — keep until manually dismissed'}
          >
            ◈
          </button>
          {entry._type !== 'diceRoll' && (
            <button className={styles.btn} onClick={onEdit} title="Edit this card">✎</button>
          )}
          <button className={styles.btn} onClick={onCollapse} title="Collapse">−</button>
          {!detection.pinned && (
            <button className={styles.btn} onClick={onDismiss} title="Dismiss">×</button>
          )}
        </div>
      </div>

      <div className={styles.body}>
        <CardBody entry={entry} sourceId={detection.id} />
      </div>
    </div>
  )
}

function SrdBadge({ entry }: { entry: Detection['entry'] }): React.JSX.Element | null {
  if (!(entry as any).srd) return null
  return <MetaRow label="Source" value="SRD" />
}

function CardBody({ entry, sourceId }: { entry: Detection['entry']; sourceId: string }): React.JSX.Element {
  switch (entry._type) {
    case 'spell':
      return (
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
          <p className={styles.description}><RichText text={entry.description} sourceId={sourceId} /></p>
          {entry.higherLevels && (
            <>
              <div className={styles.divider} />
              <p className={styles.higherLevels}>
                <span className={styles.hlLabel}>At Higher Levels.</span>{' '}
                <RichText text={entry.higherLevels} sourceId={sourceId} />
              </p>
            </>
          )}
        </>
      )

    case 'feature':
      return (
        <>
          <div className={styles.meta}>
            <MetaRow label="Class" value={entry.class} />
            <MetaRow label="Available at" value={entry.levelAvailable === 0 ? 'Class Intro' : `Level ${entry.levelAvailable}`} />
            {entry.subclass && <MetaRow label="Subclass" value={entry.subclass} />}
            {entry.usesPerRest && <MetaRow label="Uses" value={entry.usesPerRest} />}
            {entry.restType && entry.restType !== 'none' && (
              <MetaRow label="Recharges" value={`${entry.restType} rest`} />
            )}
            <SrdBadge entry={entry} />
          </div>
          <div className={styles.divider} />
          <p className={styles.description}><RichText text={entry.description} sourceId={sourceId} /></p>
        </>
      )

    case 'feat':
      return (
        <>
          <div className={styles.meta}>
            <MetaRow label="Type" value={entry.featType ?? 'Feat'} />
            <SrdBadge entry={entry} />
          </div>
          <div className={styles.divider} />
          <p className={styles.description}><RichText text={entry.description} sourceId={sourceId} /></p>
        </>
      )

    case 'magicItem':
      return (
        <>
          <div className={styles.meta}>
            {entry.rarity && <MetaRow label="Rarity" value={entry.rarity} />}
            {entry.attunement !== undefined && (
              <MetaRow label="Attunement" value={entry.attunement ? 'Required' : 'No'} />
            )}
            <SrdBadge entry={entry} />
          </div>
          <div className={styles.divider} />
          <p className={styles.description}><RichText text={entry.description} sourceId={sourceId} /></p>
        </>
      )

    case 'daggerheart': {
      const catLabel = entry.category === 'class features' ? 'Class Feature'
        : entry.category.charAt(0).toUpperCase() + entry.category.slice(1)

      // Parse structured metadata from the description for domain cards
      const desc = entry.description
      const levelMatch = desc.match(/^Level\s+(\d+)\s+(\w[\w ]*?)(?:\s+Spell|\s+Ability|\s+Grimoire)/m)
      const recallMatch = desc.match(/^Recall Cost:\s*(\d+)/m)
      const tierMatch = desc.match(/^(Tier\s+\d+)\s+(\w[\w ]*)/m)

      // Get the body text after metadata lines
      let bodyText = desc
      if (entry.category === 'domain' && (levelMatch || recallMatch)) {
        // Skip metadata lines at the top
        const lines = desc.split('\n')
        const bodyStart = lines.findIndex((l, idx) =>
          idx > 0 && l.trim() !== '' && !l.match(/^Level\s+\d+/) && !l.match(/^Recall Cost:/)
        )
        bodyText = bodyStart >= 0 ? lines.slice(bodyStart).join('\n') : desc
      }

      return (
        <>
          <div className={styles.meta}>
            <MetaRow label="System" value="Daggerheart" />
            <MetaRow label="Category" value={catLabel} />
            {levelMatch && <MetaRow label="Level" value={levelMatch[1]} />}
            {levelMatch && <MetaRow label="Type" value={levelMatch[2].trim()} />}
            {recallMatch && <MetaRow label="Recall" value={recallMatch[1]} />}
            {tierMatch && <MetaRow label="Tier" value={tierMatch[1]} />}
            {tierMatch && <MetaRow label="Role" value={tierMatch[2].trim()} />}
          </div>
          <div className={styles.divider} />
          <p className={styles.description}>
            <RichText text={entry.category === 'domain' ? bodyText : desc} sourceId={sourceId} isDaggerheart />
          </p>
        </>
      )
    }

    case 'diceRoll':
      if (entry.notation && entry.rolls) {
        return (
          <>
            <div className={styles.meta}>
              <MetaRow label="Dice" value={entry.notation} />
              <MetaRow label="Rolls" value={entry.rolls.join(' + ')} />
              {entry.modifier !== 0 && <MetaRow label="Modifier" value={`+${entry.modifier}`} />}
              <MetaRow label="Total" value={`${entry.total}`} />
            </div>
          </>
        )
      }
      return (
        <>
          <div className={styles.meta}>
            <MetaRow label="d20 Roll" value={`${entry.roll}`} />
            <MetaRow label="Modifier" value={`+${entry.modifier}`} />
            <MetaRow label="Total" value={`${entry.total}`} />
          </div>
        </>
      )

    // equipment, background, species, rules — simple description cards
    default:
      return (
        <>
          {(entry as any).srd && (
            <>
              <div className={styles.meta}><SrdBadge entry={entry} /></div>
              <div className={styles.divider} />
            </>
          )}
          <p className={styles.description}><RichText text={entry.description} sourceId={sourceId} /></p>
        </>
      )
  }
}

function MetaRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className={styles.metaRow}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  )
}

// ─── Rich text patterns ──────────────────────────────────────────────────────
// Dice (8d6, d12+4), DC values (DC 16), D&D ability scores,
// Daggerheart traits (Agility, Strength, Finesse, Instinct, Presence, Knowledge),
// Daggerheart keywords (Hope, Fear, Stress, Armor Slot, Hit Point, Evasion, Proficiency, Spellcast),
// Feature labels ("Name - Action/Passive/Reaction:"), recall costs, variable (X),
// and parenthesized numbers like (14).
const RICH_RE =
  /(\d*d\d+(?:[+-]\d+)?|\bDC\s+\d+|\b(?:strength|dexterity|constitution|intelligence|wisdom|charisma)\b|\b(?:Agility|Finesse|Instinct|Presence|Knowledge)\b|\b(?:Hope|Fear|Stress|Evasion|Proficiency|Spellcast)\b(?:\s+(?:Roll|Die|Pool|trait))?|\b(?:Armor Slot|Hit Point|Recall Cost|Very Close|Very Far|Melee|Close|Far)s?\b|\b(?:Restrained|Vulnerable|Enraptured|Horrified|Stunned|Asleep|Corroded|Dazed|Distracted)\b|\b(?:Passive|Action|Reaction)\b(?=:)|\b(?:Once per (?:rest|long rest|session))\b|\(\d+\))/gi

// Secondary pattern for feature name labels like "Feature Name - Action:" or "FEATURES"
const FEATURE_LABEL_RE = /^([A-Z][A-Za-z'\- ]+)\s*[-–—]\s*(Passive|Action|Reaction)\s*:/
const SECTION_HEADER_RE = /^(FEATURES|EXPERIENCE|Motives & Tactics)(?::|\b)/

function RichText({ text, sourceId, isDaggerheart }: { text: string; sourceId: string; isDaggerheart?: boolean }): React.JSX.Element {

  function handleDiceClick(notation: string): void {
    const entry = rollDice(notation)
    const store = useDetectionStore.getState()
    const existing = store.detections.find(
      (d) => d.entry._type === 'diceRoll' && (d.entry as DiceRollEntry).notation
    )
    if (existing) {
      const without = store.detections.filter((d) => d.id !== existing.id)
      const sourceIdx = without.findIndex((d) => d.id === sourceId)
      const updated = { ...existing, entry, keyword: entry.id, detectedAt: Date.now(), expanded: true }
      if (sourceIdx >= 0) {
        without.splice(sourceIdx, 0, updated)
      } else {
        without.unshift(updated)
      }
      useDetectionStore.setState({ detections: without })
    } else {
      const newDet = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        keyword: entry.id,
        entry,
        detectedAt: Date.now(),
        expanded: true,
        pinned: false,
        stickyRoll: false
      }
      const sourceIdx = store.detections.findIndex((d) => d.id === sourceId)
      const list = [...store.detections]
      if (sourceIdx >= 0) {
        list.splice(sourceIdx, 0, newDet)
      } else {
        list.unshift(newDet)
      }
      useDetectionStore.setState({ detections: list.slice(0, 128) })
    }
  }

  // Split text into lines, then process each line for rich formatting
  const lines = text.split('\n')

  return (
    <>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim()

        // Section headers like "FEATURES" — bold and colored
        if (isDaggerheart && SECTION_HEADER_RE.test(trimmed)) {
          return (
            <React.Fragment key={lineIdx}>
              {lineIdx > 0 && '\n'}
              <strong className={styles.dhSectionHeader}>{line}</strong>
            </React.Fragment>
          )
        }

        // Feature labels like "Climber - Passive:" — bold name, colored tag
        if (isDaggerheart) {
          const featureMatch = trimmed.match(FEATURE_LABEL_RE)
          if (featureMatch) {
            const [fullMatch, featureName, featureType] = featureMatch
            const rest = trimmed.slice(fullMatch.length)
            return (
              <React.Fragment key={lineIdx}>
                {lineIdx > 0 && '\n'}
                <strong className={styles.dhFeatureName}>{featureName}</strong>
                <span className={styles.dhFeatureTag}>{` - ${featureType}: `}</span>
                <RichLine parts={rest.split(RICH_RE)} onDiceClick={handleDiceClick} isDaggerheart={isDaggerheart} />
              </React.Fragment>
            )
          }
        }

        // Regular line — apply inline rich formatting
        const parts = line.split(RICH_RE)
        return (
          <React.Fragment key={lineIdx}>
            {lineIdx > 0 && '\n'}
            <RichLine parts={parts} onDiceClick={handleDiceClick} isDaggerheart={isDaggerheart} />
          </React.Fragment>
        )
      })}
    </>
  )
}

/** Renders an array of parts (from RICH_RE split) with appropriate styling */
function RichLine({ parts, onDiceClick, isDaggerheart }: {
  parts: string[]
  onDiceClick: (notation: string) => void
  isDaggerheart?: boolean
}): React.JSX.Element {
  return (
    <>
      {parts.map((part, i) => {
        // Dice notation — clickable
        if (/^\d*d\d+/.test(part)) {
          return (
            <strong
              key={i}
              className={`${styles.dice} ${styles.diceClickable}`}
              onClick={() => onDiceClick(part)}
              title={`Click to roll ${part}`}
            >
              {part}
            </strong>
          )
        }
        // DC values
        if (/^DC\s/i.test(part)) {
          return <span key={i} className={styles.dc}>{part}</span>
        }
        // D&D ability scores
        if (/^(?:strength|dexterity|constitution|intelligence|wisdom|charisma)$/i.test(part)) {
          return <em key={i} className={styles.stat}>{part}</em>
        }
        // Daggerheart traits (Agility, Finesse, etc.)
        if (isDaggerheart && /^(?:Agility|Finesse|Instinct|Presence|Knowledge)$/i.test(part)) {
          return <span key={i} className={styles.dhTrait}>{part}</span>
        }
        // "Strength" in Daggerheart context — also a DH trait
        if (isDaggerheart && /^strength$/i.test(part)) {
          return <span key={i} className={styles.dhTrait}>{part}</span>
        }
        // Daggerheart keywords (Hope, Fear, Stress, etc.)
        if (isDaggerheart && /^(?:Hope|Fear|Stress|Evasion|Proficiency|Spellcast)/i.test(part)) {
          return <span key={i} className={styles.dhKeyword}>{part}</span>
        }
        // Daggerheart mechanics (Armor Slots, Hit Points, ranges, recall cost)
        if (isDaggerheart && /^(?:Armor Slot|Hit Point|Recall Cost|Very Close|Very Far|Melee|Close|Far)/i.test(part)) {
          return <span key={i} className={styles.dhMechanic}>{part}</span>
        }
        // Conditions
        if (isDaggerheart && /^(?:Restrained|Vulnerable|Enraptured|Horrified|Stunned|Asleep|Corroded|Dazed|Distracted)$/i.test(part)) {
          return <span key={i} className={styles.dhCondition}>{part}</span>
        }
        // Feature type tags
        if (isDaggerheart && /^(?:Passive|Action|Reaction)$/i.test(part)) {
          return <span key={i} className={styles.dhFeatureTag}>{part}</span>
        }
        // "Once per rest/session" timing
        if (isDaggerheart && /^Once per/i.test(part)) {
          return <span key={i} className={styles.dhTiming}>{part}</span>
        }
        // Parenthesized numbers like (14) — difficulty checks
        if (/^\(\d+\)$/.test(part)) {
          return <span key={i} className={styles.dc}>{part}</span>
        }
        return <React.Fragment key={i}>{part}</React.Fragment>
      })}
    </>
  )
}
