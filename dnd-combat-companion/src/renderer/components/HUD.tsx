import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDetectionStore } from '../store/detectionStore'
import { DetectionItem } from './DetectionItem'
import { StatusIndicator } from './StatusIndicator'
import { SearchBar } from './SearchBar'
import { AboutPanel } from './AboutPanel'
import { SettingsPanel } from './SettingsPanel'
import { LibraryPanel } from './LibraryPanel'
import { AddCardPanel } from './AddCardPanel'
import { TranscriptCard } from './TranscriptCard'
import { setCustomCards, entryToCustomCardData, getCustomCardDataById, lookupEntry, type CustomCardData } from '../data'
import styles from './HUD.module.css'

const MIN_WIDTH = 280
const MAX_WIDTH = 860

const MIN_HEIGHT = 200
const TOP_PADDING = 20

export function HUD(): React.JSX.Element {
  const detections = useDetectionStore((s) => s.detections)
  const expandDetection = useDetectionStore((s) => s.expandDetection)
  const collapseDetection = useDetectionStore((s) => s.collapseDetection)
  const removeDetection = useDetectionStore((s) => s.removeDetection)
  const updateDetectionEntry = useDetectionStore((s) => s.updateDetectionEntry)
  const errorMsg = useDetectionStore((s) => s.errorMsg)
  const catchAllMode = useDetectionStore((s) => s.catchAllMode)
  const toggleCatchAllMode = useDetectionStore((s) => s.toggleCatchAllMode)
  const togglePin = useDetectionStore((s) => s.togglePin)
  const toggleStickyRoll = useDetectionStore((s) => s.toggleStickyRoll)
  const visibleTypes = useDetectionStore((s) => s.visibleTypes)
  const visibleDHCategories = useDetectionStore((s) => s.visibleDHCategories)
  const isEntryVisible = useDetectionStore((s) => s.isEntryVisible)
  const sortByCategory = useDetectionStore((s) => s.sortByCategory)

  // visibleTypes and visibleDHCategories subscriptions ensure re-render on filter changes
  void visibleTypes
  void visibleDHCategories

  const [showSearch, setShowSearch] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [showAddCard, setShowAddCard] = useState(false)
  const [columnWidth, setColumnWidth] = useState(MAX_WIDTH)
  const [columnHeight, setColumnHeight] = useState(() => window.innerHeight - 20 - TOP_PADDING)
  const [editCardData, setEditCardData] = useState<CustomCardData | null>(null)

  // Load custom cards on startup
  useEffect(() => {
    try {
      window.electronAPI.customLibraryGet?.()?.then?.((cards: CustomCardData[]) => {
        if (cards) setCustomCards(cards)
      }).catch(() => {})
    } catch { /* custom library not available yet */ }
  }, [])

  function handleSaveCard(card: CustomCardData): void {
    const keyword = card.name.toLowerCase()
    const existing = getCustomCardDataById(card.id)
    const save = existing
      ? window.electronAPI.customLibraryUpdate(card.id, card)
      : window.electronAPI.customLibraryAdd(card)

    save.then((cards: CustomCardData[]) => {
      setCustomCards(cards)
      // Update any visible detection so the card refreshes immediately
      const updatedEntry = lookupEntry(keyword)
      if (updatedEntry) {
        updateDetectionEntry(keyword, updatedEntry)
      }
    })
    setEditCardData(null)
  }

  function handleEdit(detectionId: string): void {
    const detection = detections.find((d) => d.id === detectionId)
    if (!detection || detection.entry._type === 'diceRoll') return

    const existing = getCustomCardDataById(detection.entry.id)
    if (existing) {
      setEditCardData(existing)
    } else {
      setEditCardData(entryToCustomCardData(detection.entry))
    }
    setShowAddCard(true)
    setShowSearch(false)
    setShowAbout(false)
    setShowSettings(false)
    setShowLibrary(false)
  }

  const CATEGORY_ORDER: Record<string, number> = {
    diceRoll: 0, spell: 1, feature: 2, feat: 3, equipment: 4,
    background: 5, species: 6, rules: 7, magicItem: 8, daggerheart: 9
  }

  const filtered = detections.filter((d) => isEntryVisible(d.entry))
  const visibleDetections = sortByCategory
    ? [...filtered].sort((a, b) => (CATEGORY_ORDER[a.entry._type] ?? 99) - (CATEGORY_ORDER[b.entry._type] ?? 99))
    : filtered

  const hudRef = useRef<HTMLDivElement>(null)
  const ignoreRef = useRef(true)
  const draggingRef = useRef<false | 'width' | 'height'>(false)

  // ── Width resize drag logic ────────────────────────────────────────────
  // Column grows leftward inside the window.

  const onDragMove = useCallback((e: MouseEvent) => {
    if (draggingRef.current === 'width') {
      const rightMargin = 16
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - e.clientX - rightMargin))
      setColumnWidth(newWidth)
    } else if (draggingRef.current === 'height') {
      const bottomMargin = 20
      const maxHeight = window.innerHeight - bottomMargin - TOP_PADDING
      const newHeight = Math.max(MIN_HEIGHT, Math.min(maxHeight, window.innerHeight - e.clientY - bottomMargin))
      setColumnHeight(newHeight)
    }
  }, [])

  const onDragEnd = useCallback(() => {
    draggingRef.current = false
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
  }, [onDragMove])

  const onWidthDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = 'width'
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragEnd)
  }, [onDragMove, onDragEnd])

  const onHeightDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = 'height'
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragEnd)
  }, [onDragMove, onDragEnd])

  // ── Mouse passthrough ──────────────────────────────────────────────────

  useEffect(() => {
    if (!showSearch && !showAbout && !showSettings && !showLibrary && !showAddCard) {
      ignoreRef.current = true
      window.electronAPI.setIgnoreMouseEvents(true)
    }
  }, [showSearch, showAbout, showSettings, showLibrary, showAddCard])

  useEffect(() => {
    function setIgnore(val: boolean): void {
      if (ignoreRef.current !== val) {
        ignoreRef.current = val
        window.electronAPI.setIgnoreMouseEvents(val)
      }
    }

    function onMouseMove(e: MouseEvent): void {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const inside = !!el && !!hudRef.current && hudRef.current.contains(el)
      setIgnore(!inside)
    }

    document.addEventListener('mousemove', onMouseMove)
    return () => document.removeEventListener('mousemove', onMouseMove)
  }, [])

  return (
    <div ref={hudRef} className={styles.hud}>
      <div className={styles.spellColumn} style={{ width: columnWidth, maxHeight: columnHeight }}>
        <div
          className={styles.resizeHandleTop}
          onMouseDown={onHeightDragStart}
          title="Drag to resize height"
        />
        <div
          className={styles.resizeHandle}
          onMouseDown={onWidthDragStart}
          title="Drag to resize width"
        />
        {visibleDetections.length > 0 && (
          <div className={styles.list}>
            {visibleDetections.map((d) => (
              <DetectionItem
                key={d.id}
                detection={d}
                onExpand={expandDetection}
                onCollapse={collapseDetection}
                onDismiss={removeDetection}
                onPin={togglePin}
                onStickyToggle={toggleStickyRoll}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}

        {errorMsg && (
          <div className={styles.error}>
            <span className={styles.errorIcon}>⚠</span>
            {errorMsg}
          </div>
        )}

        {showSearch && <SearchBar onClose={() => setShowSearch(false)} />}
        {showAbout && <AboutPanel onClose={() => setShowAbout(false)} />}
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
        {showLibrary && <LibraryPanel onClose={() => setShowLibrary(false)} />}
        {showAddCard && <AddCardPanel onClose={() => { setShowAddCard(false); setEditCardData(null) }} onSave={handleSaveCard} editCard={editCardData} />}

        <TranscriptCard />

        <div className={styles.statusRow}>
          <StatusIndicator />
          <button
            className={`${styles.iconBtn} ${catchAllMode ? styles.iconBtnActive : ''}`}
            onMouseDown={(e) => { e.preventDefault(); toggleCatchAllMode() }}
            title={catchAllMode ? 'Catch-all mode ON — partial matches' : 'Catch-all mode OFF — exact matches only'}
          >
            ∗
          </button>
          <button
            className={`${styles.iconBtn} ${showAddCard ? styles.iconBtnActive : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setEditCardData(null); setShowAddCard((v) => !v); setShowSearch(false); setShowAbout(false); setShowSettings(false); setShowLibrary(false) }}
            title="Add custom card"
          >
            +
          </button>
          <button
            className={`${styles.iconBtn} ${showLibrary ? styles.iconBtnActive : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setShowLibrary((v) => !v); setShowSearch(false); setShowAbout(false); setShowSettings(false); setShowAddCard(false) }}
            title="Browse library"
          >
            ☰
          </button>
          <button
            className={`${styles.iconBtn} ${showSearch ? styles.iconBtnActive : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setShowSearch((v) => !v); setShowAbout(false); setShowSettings(false); setShowLibrary(false); setShowAddCard(false) }}
            title="Search all entries"
          >
            ?
          </button>
          <button
            className={`${styles.iconBtn} ${showSettings ? styles.iconBtnActive : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setShowSettings((v) => !v); setShowSearch(false); setShowAbout(false); setShowLibrary(false); setShowAddCard(false) }}
            title="Settings"
          >
            ⚙
          </button>
          <button
            className={`${styles.iconBtn} ${showAbout ? styles.iconBtnActive : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setShowAbout((v) => !v); setShowSearch(false); setShowSettings(false); setShowLibrary(false); setShowAddCard(false) }}
            title="About"
          >
            ℹ
          </button>
        </div>
      </div>
    </div>
  )
}
