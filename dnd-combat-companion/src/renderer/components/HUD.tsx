import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDetectionStore } from '../store/detectionStore'
import { DetectionItem } from './DetectionItem'
import { StatusIndicator } from './StatusIndicator'
import { SearchBar } from './SearchBar'
import { AboutPanel } from './AboutPanel'
import { SettingsPanel } from './SettingsPanel'
import { LibraryPanel } from './LibraryPanel'
import { TranscriptCard } from './TranscriptCard'
import styles from './HUD.module.css'

const MIN_WIDTH = 280
const MAX_WIDTH = 860
const DEFAULT_WIDTH = 300

export function HUD(): React.JSX.Element {
  const detections = useDetectionStore((s) => s.detections)
  const expandDetection = useDetectionStore((s) => s.expandDetection)
  const collapseDetection = useDetectionStore((s) => s.collapseDetection)
  const removeDetection = useDetectionStore((s) => s.removeDetection)
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
  const [columnWidth, setColumnWidth] = useState(DEFAULT_WIDTH)

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
  const draggingRef = useRef(false)

  // ── Resize drag logic ──────────────────────────────────────────────────
  // Uses clientX within the fixed-size window. The column grows leftward
  // inside the window — no Electron window resizing needed.

  const onDragMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current) return
    const rightMargin = 16
    const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - e.clientX - rightMargin))
    setColumnWidth(newWidth)
  }, [])

  const onDragEnd = useCallback(() => {
    draggingRef.current = false
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
  }, [onDragMove])

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = true
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragEnd)
  }, [onDragMove, onDragEnd])

  // ── Mouse passthrough ──────────────────────────────────────────────────

  useEffect(() => {
    if (!showSearch && !showAbout && !showSettings && !showLibrary) {
      ignoreRef.current = true
      window.electronAPI.setIgnoreMouseEvents(true)
    }
  }, [showSearch, showAbout, showSettings, showLibrary])

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
      <div className={styles.spellColumn} style={{ width: columnWidth }}>
        <div
          className={styles.resizeHandle}
          onMouseDown={onDragStart}
          title="Drag to resize"
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
            className={`${styles.iconBtn} ${showLibrary ? styles.iconBtnActive : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setShowLibrary((v) => !v); setShowSearch(false); setShowAbout(false); setShowSettings(false) }}
            title="Browse library"
          >
            ☰
          </button>
          <button
            className={`${styles.iconBtn} ${showSearch ? styles.iconBtnActive : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setShowSearch((v) => !v); setShowAbout(false); setShowSettings(false); setShowLibrary(false) }}
            title="Search all entries"
          >
            ?
          </button>
          <button
            className={`${styles.iconBtn} ${showSettings ? styles.iconBtnActive : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setShowSettings((v) => !v); setShowSearch(false); setShowAbout(false); setShowLibrary(false) }}
            title="Settings"
          >
            ⚙
          </button>
          <button
            className={`${styles.iconBtn} ${showAbout ? styles.iconBtnActive : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setShowAbout((v) => !v); setShowSearch(false); setShowSettings(false); setShowLibrary(false) }}
            title="About"
          >
            ℹ
          </button>
        </div>
      </div>
    </div>
  )
}
