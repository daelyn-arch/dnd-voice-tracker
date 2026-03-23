import React, { useState } from 'react'
import styles from './AddCardPanel.module.css'
import type { CustomCardData } from '../data'

interface Props {
  onClose: () => void
  onSave: (card: CustomCardData) => void
  editCard?: CustomCardData | null
}

const CATEGORIES = [
  { value: 'spell', label: 'Spell' },
  { value: 'feature', label: 'Class Feature' },
  { value: 'feat', label: 'Feat' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'rules', label: 'Rule' },
  { value: 'magicItem', label: 'Magic Item' },
  { value: 'other', label: 'Other' }
]

const GAMES = [
  { value: 'dnd', label: 'D&D 5e' },
  { value: 'daggerheart', label: 'Daggerheart' },
  { value: 'other', label: 'Other' }
]

export function AddCardPanel({ onClose, onSave, editCard }: Props): React.JSX.Element {
  const [name, setName] = useState(editCard?.name ?? '')
  const [description, setDescription] = useState(editCard?.description ?? '')
  const [game, setGame] = useState<'dnd' | 'daggerheart' | 'other'>(editCard?.game ?? 'dnd')
  const [category, setCategory] = useState(editCard?.category ?? 'spell')

  // Spell-specific fields
  const [spellLevel, setSpellLevel] = useState(editCard?.spellLevel?.toString() ?? '0')
  const [spellSchool, setSpellSchool] = useState(editCard?.spellSchool ?? '')
  const [castingTime, setCastingTime] = useState(editCard?.castingTime ?? '')
  const [range, setRange] = useState(editCard?.range ?? '')
  const [components, setComponents] = useState(editCard?.components ?? '')
  const [duration, setDuration] = useState(editCard?.duration ?? '')
  const [classes, setClasses] = useState(editCard?.classes?.join(', ') ?? '')

  function handleSave(): void {
    if (!name.trim() || !description.trim()) return

    const card: CustomCardData = {
      id: editCard?.id ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      description: description.trim(),
      game,
      category,
      createdAt: editCard?.createdAt ?? Date.now(),
      ...(category === 'spell' ? {
        spellLevel: parseInt(spellLevel) || 0,
        spellSchool: spellSchool || undefined,
        castingTime: castingTime || undefined,
        range: range || undefined,
        components: components || undefined,
        duration: duration || undefined,
        classes: classes ? classes.split(',').map((c) => c.trim()).filter(Boolean) : undefined
      } : {})
    }

    onSave(card)
    onClose()
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>{editCard ? 'Edit Card' : 'Add Custom Card'}</h2>
        <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className={styles.form}>
        <label className={styles.label}>
          Name
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Silvery Barbs"
            autoFocus
          />
        </label>

        <div className={styles.row}>
          <label className={styles.label}>
            Game
            <select className={styles.select} value={game} onChange={(e) => setGame(e.target.value as any)}>
              {GAMES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </label>

          <label className={styles.label}>
            Category
            <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
        </div>

        {category === 'spell' && (
          <>
            <div className={styles.row}>
              <label className={styles.label}>
                Level
                <input className={styles.input} type="number" min="0" max="9" value={spellLevel} onChange={(e) => setSpellLevel(e.target.value)} />
              </label>
              <label className={styles.label}>
                School
                <input className={styles.input} value={spellSchool} onChange={(e) => setSpellSchool(e.target.value)} placeholder="Enchantment" />
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.label}>
                Casting Time
                <input className={styles.input} value={castingTime} onChange={(e) => setCastingTime(e.target.value)} placeholder="1 reaction" />
              </label>
              <label className={styles.label}>
                Range
                <input className={styles.input} value={range} onChange={(e) => setRange(e.target.value)} placeholder="60 feet" />
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.label}>
                Components
                <input className={styles.input} value={components} onChange={(e) => setComponents(e.target.value)} placeholder="V, S" />
              </label>
              <label className={styles.label}>
                Duration
                <input className={styles.input} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Instantaneous" />
              </label>
            </div>
            <label className={styles.label}>
              Classes
              <input className={styles.input} value={classes} onChange={(e) => setClasses(e.target.value)} placeholder="Bard, Sorcerer, Wizard" />
            </label>
          </>
        )}

        <label className={styles.label}>
          Description
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter the full card text..."
            rows={6}
          />
        </label>

        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={!name.trim() || !description.trim()}
        >
          {editCard ? 'Save Changes' : 'Add Card'}
        </button>
      </div>
    </div>
  )
}
