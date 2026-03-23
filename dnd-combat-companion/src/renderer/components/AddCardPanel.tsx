import React, { useState } from 'react'
import styles from './AddCardPanel.module.css'
import type { CustomCardData } from '../data'

interface Props {
  onClose: () => void
  onSave: (card: CustomCardData) => void
  editCard?: CustomCardData | null
}

const DND_CATEGORIES = [
  { value: 'spell', label: 'Spell' },
  { value: 'feature', label: 'Class Feature' },
  { value: 'feat', label: 'Feat' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'rules', label: 'Rule' },
  { value: 'magicItem', label: 'Magic Item' },
  { value: 'other', label: 'Other' }
]

const DH_CATEGORIES = [
  { value: 'domain', label: 'Domain Card' },
  { value: 'class features', label: 'Class Feature' },
  { value: 'adversary', label: 'Adversary' },
  { value: 'rules', label: 'Rule' }
]

const GAMES = [
  { value: 'dnd', label: 'D&D 5e' },
  { value: 'daggerheart', label: 'Daggerheart' },
  { value: 'other', label: 'Other' }
]

const DH_DOMAIN_TYPES = ['Spell', 'Ability', 'Grimoire']
const DH_ADVERSARY_ROLES = ['Standard', 'Bruiser', 'Skulk', 'Leader', 'Solo', 'Horde', 'Minion']
const DH_FEATURE_TYPES = ['Passive', 'Action', 'Reaction']

export function AddCardPanel({ onClose, onSave, editCard }: Props): React.JSX.Element {
  const [name, setName] = useState(editCard?.name ?? '')
  const [description, setDescription] = useState(editCard?.description ?? '')
  const [game, setGame] = useState<'dnd' | 'daggerheart' | 'other'>(editCard?.game ?? 'dnd')
  const [category, setCategory] = useState(editCard?.category ?? 'spell')
  const [dhCategory, setDhCategory] = useState<'domain' | 'class features' | 'rules' | 'adversary'>(editCard?.dhCategory ?? 'domain')
  const [showBoth, setShowBoth] = useState(editCard?.showBoth ?? false)

  // D&D spell-specific fields
  const [spellLevel, setSpellLevel] = useState(editCard?.spellLevel?.toString() ?? '0')
  const [spellSchool, setSpellSchool] = useState(editCard?.spellSchool ?? '')
  const [castingTime, setCastingTime] = useState(editCard?.castingTime ?? '')
  const [range, setRange] = useState(editCard?.range ?? '')
  const [components, setComponents] = useState(editCard?.components ?? '')
  const [duration, setDuration] = useState(editCard?.duration ?? '')
  const [classes, setClasses] = useState(editCard?.classes?.join(', ') ?? '')

  // Daggerheart domain fields
  const [dhLevel, setDhLevel] = useState('')
  const [dhType, setDhType] = useState('Spell')
  const [dhRecallCost, setDhRecallCost] = useState('')

  // Daggerheart class feature fields
  const [dhClass, setDhClass] = useState('')
  const [dhFeatureType, setDhFeatureType] = useState('Passive')

  // Daggerheart adversary fields
  const [dhTier, setDhTier] = useState('1')
  const [dhRole, setDhRole] = useState('Standard')
  const [dhDifficulty, setDhDifficulty] = useState('')
  const [dhThresholds, setDhThresholds] = useState('')
  const [dhHP, setDhHP] = useState('')
  const [dhStress, setDhStress] = useState('')
  const [dhAttack, setDhAttack] = useState('')

  function handleGameChange(newGame: 'dnd' | 'daggerheart' | 'other'): void {
    setGame(newGame)
    if (newGame === 'daggerheart') {
      setDhCategory('domain')
    } else {
      setCategory('spell')
    }
  }

  /** Build the formatted description for Daggerheart entries */
  function buildDhDescription(): string {
    const parts: string[] = []

    if (dhCategory === 'domain') {
      if (dhLevel) parts.push(`Level ${dhLevel} ${dhType}`)
      if (dhRecallCost) parts.push(`Recall Cost: ${dhRecallCost}`)
      if (parts.length > 0) parts.push('')
      parts.push(description.trim())
    } else if (dhCategory === 'class features') {
      if (dhClass) parts.push(`Class: ${dhClass}`)
      if (dhFeatureType) parts.push(`${name} - ${dhFeatureType}:`)
      if (parts.length > 0) parts.push('')
      parts.push(description.trim())
    } else if (dhCategory === 'adversary') {
      parts.push(`Tier ${dhTier} ${dhRole}`)
      if (description.trim()) parts.push(description.trim().split('\n')[0]) // first line as flavor
      parts.push('')
      const statLine: string[] = []
      if (dhDifficulty) statLine.push(`Difficulty: ${dhDifficulty}`)
      if (dhThresholds) statLine.push(`Thresholds: ${dhThresholds}`)
      if (dhHP) statLine.push(`HP: ${dhHP}`)
      if (dhStress) statLine.push(`Stress: ${dhStress}`)
      if (statLine.length > 0) parts.push(statLine.join(' | '))
      if (dhAttack) parts.push(`ATK: ${dhAttack}`)
      // remaining description lines (after first line)
      const remaining = description.trim().split('\n').slice(1).join('\n').trim()
      if (remaining) {
        parts.push('')
        parts.push(remaining)
      }
    } else {
      parts.push(description.trim())
    }

    return parts.join('\n')
  }

  function handleSave(): void {
    if (!name.trim() || !description.trim()) return

    const isDH = game === 'daggerheart'
    const finalDescription = isDH ? buildDhDescription() : description.trim()

    const card: CustomCardData = {
      id: editCard?.id ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      description: finalDescription,
      game,
      category: isDH ? dhCategory : category,
      createdAt: editCard?.createdAt ?? Date.now(),
      originalEntryId: editCard?.originalEntryId,
      originalEntryType: editCard?.originalEntryType,
      showBoth: editCard?.originalEntryId ? showBoth : undefined,
      ...(isDH ? { dhCategory } : {}),
      ...(!isDH && category === 'spell' ? {
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

  const isDaggerheart = game === 'daggerheart'
  const categories = isDaggerheart ? DH_CATEGORIES : DND_CATEGORIES
  const activeCategory = isDaggerheart ? dhCategory : category

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
            placeholder={isDaggerheart ? 'e.g. Flame Bolt' : 'e.g. Silvery Barbs'}
            autoFocus
          />
        </label>

        <div className={styles.row}>
          <label className={styles.label}>
            Game
            <select className={styles.select} value={game} onChange={(e) => handleGameChange(e.target.value as any)}>
              {GAMES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </label>

          <label className={styles.label}>
            Category
            <select
              className={styles.select}
              value={activeCategory}
              onChange={(e) => isDaggerheart ? setDhCategory(e.target.value as any) : setCategory(e.target.value)}
            >
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
        </div>

        {/* ── D&D Spell fields ── */}
        {!isDaggerheart && category === 'spell' && (
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

        {/* ── Daggerheart Domain fields ── */}
        {isDaggerheart && dhCategory === 'domain' && (
          <>
            <div className={styles.row}>
              <label className={styles.label}>
                Level
                <input className={styles.input} type="number" min="1" max="10" value={dhLevel} onChange={(e) => setDhLevel(e.target.value)} placeholder="1" />
              </label>
              <label className={styles.label}>
                Type
                <select className={styles.select} value={dhType} onChange={(e) => setDhType(e.target.value)}>
                  {DH_DOMAIN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className={styles.label}>
                Recall Cost
                <input className={styles.input} type="number" min="0" max="10" value={dhRecallCost} onChange={(e) => setDhRecallCost(e.target.value)} placeholder="0" />
              </label>
            </div>
          </>
        )}

        {/* ── Daggerheart Class Feature fields ── */}
        {isDaggerheart && dhCategory === 'class features' && (
          <>
            <div className={styles.row}>
              <label className={styles.label}>
                Class
                <input className={styles.input} value={dhClass} onChange={(e) => setDhClass(e.target.value)} placeholder="e.g. Bard, Guardian" />
              </label>
              <label className={styles.label}>
                Feature Type
                <select className={styles.select} value={dhFeatureType} onChange={(e) => setDhFeatureType(e.target.value)}>
                  {DH_FEATURE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
            </div>
          </>
        )}

        {/* ── Daggerheart Adversary fields ── */}
        {isDaggerheart && dhCategory === 'adversary' && (
          <>
            <div className={styles.row}>
              <label className={styles.label}>
                Tier
                <input className={styles.input} type="number" min="1" max="4" value={dhTier} onChange={(e) => setDhTier(e.target.value)} />
              </label>
              <label className={styles.label}>
                Role
                <select className={styles.select} value={dhRole} onChange={(e) => setDhRole(e.target.value)}>
                  {DH_ADVERSARY_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.label}>
                Difficulty
                <input className={styles.input} type="number" value={dhDifficulty} onChange={(e) => setDhDifficulty(e.target.value)} placeholder="12" />
              </label>
              <label className={styles.label}>
                Thresholds
                <input className={styles.input} value={dhThresholds} onChange={(e) => setDhThresholds(e.target.value)} placeholder="8/14" />
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.label}>
                HP
                <input className={styles.input} type="number" value={dhHP} onChange={(e) => setDhHP(e.target.value)} placeholder="5" />
              </label>
              <label className={styles.label}>
                Stress
                <input className={styles.input} type="number" value={dhStress} onChange={(e) => setDhStress(e.target.value)} placeholder="3" />
              </label>
            </div>
            <label className={styles.label}>
              Attack
              <input className={styles.input} value={dhAttack} onChange={(e) => setDhAttack(e.target.value)} placeholder="+1 | Daggers: Melee | 1d8+1 phy" />
            </label>
          </>
        )}

        <label className={styles.label}>
          Description
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isDaggerheart && dhCategory === 'adversary'
                ? 'Line 1: flavor text\nRemaining lines: features, experience, etc.'
                : isDaggerheart
                  ? 'Enter the card text (mechanics, effects, etc.)...'
                  : 'Enter the full card text...'
            }
            rows={6}
          />
        </label>

        {editCard?.originalEntryId && (
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={showBoth}
              onChange={() => setShowBoth((v) => !v)}
            />
            <span className={styles.checkLabel}>Show both original and modified</span>
          </label>
        )}

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
