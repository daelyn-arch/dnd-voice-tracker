import React, { useMemo, useState } from 'react'
import { getEntriesByType, getDaggerheartByCategory } from '../data'
import { useDetectionStore } from '../store/detectionStore'
import { getEntryColor, getEntryBadge, SCHOOL_COLORS } from './schoolColors'
import type { Entry } from '../types'
import styles from './LibraryPanel.module.css'

interface Props {
  onClose: () => void
}

interface CategoryDef {
  key: string
  label: string
  color: string
  getEntries: () => Entry[]
}

const DND_CATEGORIES: CategoryDef[] = [
  { key: 'spell', label: 'Spells', color: SCHOOL_COLORS.Evocation, getEntries: () => getEntriesByType('spell') },
  { key: 'feature', label: 'Class Features', color: SCHOOL_COLORS.Feature, getEntries: () => getEntriesByType('feature') },
  { key: 'feat', label: 'Feats', color: SCHOOL_COLORS.Feat, getEntries: () => getEntriesByType('feat') },
  { key: 'equipment', label: 'Equipment', color: SCHOOL_COLORS.Equipment, getEntries: () => getEntriesByType('equipment') },
  { key: 'background', label: 'Backgrounds', color: SCHOOL_COLORS.Background, getEntries: () => getEntriesByType('background') },
  { key: 'species', label: 'Species', color: SCHOOL_COLORS.Species, getEntries: () => getEntriesByType('species') },
  { key: 'rules', label: 'Rules', color: SCHOOL_COLORS.Rules, getEntries: () => getEntriesByType('rules') },
  { key: 'magicItem', label: 'Magic Items', color: SCHOOL_COLORS.MagicItem, getEntries: () => getEntriesByType('magicItem') }
]

const DH_CATEGORIES: CategoryDef[] = [
  { key: 'dh-domain', label: 'Domains', color: SCHOOL_COLORS['DH-domain'], getEntries: () => getDaggerheartByCategory('domain') },
  { key: 'dh-class', label: 'Class Features', color: SCHOOL_COLORS['DH-class features'], getEntries: () => getDaggerheartByCategory('class features') },
  { key: 'dh-rules', label: 'Rules', color: SCHOOL_COLORS['DH-rules'], getEntries: () => getDaggerheartByCategory('rules') },
  { key: 'dh-adversary', label: 'Adversaries', color: SCHOOL_COLORS['DH-adversary'], getEntries: () => getDaggerheartByCategory('adversary') }
]

const ALL_CATEGORIES = [...DND_CATEGORIES, ...DH_CATEGORIES]

export function LibraryPanel({ onClose }: Props): React.JSX.Element {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const addDetection = useDetectionStore((s) => s.addDetection)
  const expandDetection = useDetectionStore((s) => s.expandDetection)

  const selectedCategory = selectedKey
    ? ALL_CATEGORIES.find((c) => c.key === selectedKey) ?? null
    : null

  const entries = useMemo(() => {
    if (!selectedCategory) return []
    return selectedCategory.getEntries().sort((a, b) => a.name.localeCompare(b.name))
  }, [selectedCategory])

  function handleSelectEntry(entry: Entry): void {
    const keyword = entry.name.toLowerCase()
    addDetection(keyword, entry)
    const detection = useDetectionStore.getState().detections.find((d) => d.keyword === keyword)
    if (detection) expandDetection(detection.id)
  }

  // ── Category view ──────────────────────────────────────────
  if (!selectedCategory) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>☰</span>
          <span className={styles.headerTitle}>Library</span>
          <button
            className={styles.closeBtn}
            onMouseDown={(e) => { e.preventDefault(); onClose() }}
            aria-label="Close library"
          >
            ×
          </button>
        </div>
        <div className={styles.divider} />
        <div className={styles.categoryList}>
          <div className={styles.sectionLabel}>D&D 5e</div>
          {DND_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              className={styles.categoryBtn}
              onMouseDown={(e) => { e.preventDefault(); setSelectedKey(cat.key) }}
            >
              <span className={styles.dot} style={{ background: cat.color }} />
              <span className={styles.categoryName}>{cat.label}</span>
              <span className={styles.categoryCount}>{cat.getEntries().length}</span>
            </button>
          ))}
          <div className={styles.divider} />
          <div className={styles.sectionLabel}>Daggerheart</div>
          {DH_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              className={styles.categoryBtn}
              onMouseDown={(e) => { e.preventDefault(); setSelectedKey(cat.key) }}
            >
              <span className={styles.dot} style={{ background: cat.color }} />
              <span className={styles.categoryName}>{cat.label}</span>
              <span className={styles.categoryCount}>{cat.getEntries().length}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Entry list view ────────────────────────────────────────
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>☰</span>
        <span className={styles.headerTitle}>Library</span>
        <button
          className={styles.closeBtn}
          onMouseDown={(e) => { e.preventDefault(); onClose() }}
          aria-label="Close library"
        >
          ×
        </button>
      </div>
      <div className={styles.divider} />
      <div className={styles.entryList}>
        {entries.map((entry) => (
          <button
            key={entry.id}
            className={styles.entryBtn}
            onMouseDown={(e) => { e.preventDefault(); handleSelectEntry(entry) }}
          >
            <span className={styles.dot} style={{ background: getEntryColor(entry) }} />
            <span className={styles.entryName}>{entry.name}</span>
            <span className={styles.entryBadge}>{getEntryBadge(entry)}</span>
          </button>
        ))}
      </div>
      <button
        className={styles.pinnedCategory}
        onMouseDown={(e) => { e.preventDefault(); setSelectedKey(null) }}
      >
        <span className={styles.backArrow}>←</span>
        <span className={styles.dot} style={{ background: selectedCategory.color }} />
        <span className={styles.categoryName}>{selectedCategory.label}</span>
        <span className={styles.categoryCount}>{entries.length}</span>
      </button>
    </div>
  )
}
