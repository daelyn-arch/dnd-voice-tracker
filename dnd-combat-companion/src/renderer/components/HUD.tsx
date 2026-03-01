import React, { useEffect, useRef, useState } from 'react'
import { useDetectionStore } from '../store/detectionStore'
import { DetectionItem } from './DetectionItem'
import { StatusIndicator } from './StatusIndicator'
import { SearchBar } from './SearchBar'
import { AboutPanel } from './AboutPanel'
import { SettingsPanel } from './SettingsPanel'
import styles from './HUD.module.css'

export function HUD(): React.JSX.Element {
  const detections = useDetectionStore((s) => s.detections)
  const expandDetection = useDetectionStore((s) => s.expandDetection)
  const collapseDetection = useDetectionStore((s) => s.collapseDetection)
  const removeDetection = useDetectionStore((s) => s.removeDetection)
  const errorMsg = useDetectionStore((s) => s.errorMsg)
  const catchAllMode = useDetectionStore((s) => s.catchAllMode)
  const toggleCatchAllMode = useDetectionStore((s) => s.toggleCatchAllMode)
  const togglePin = useDetectionStore((s) => s.togglePin)
  const visibleTypes = useDetectionStore((s) => s.visibleTypes)

  const [showSearch, setShowSearch] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const visibleDetections = detections.filter((d) => visibleTypes[d.entry._type])

  const hudRef = useRef<HTMLDivElement>(null)
  const ignoreRef = useRef(true)

  // When both panels close, force window back to ignore mode so no invisible
  // interactive region lingers where the panel used to be.
  useEffect(() => {
    if (!showSearch && !showAbout && !showSettings) {
      ignoreRef.current = true
      window.electronAPI.setIgnoreMouseEvents(true)
    }
  }, [showSearch, showAbout, showSettings])

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
      <div className={styles.spellColumn}>
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
            className={`${styles.iconBtn} ${showSearch ? styles.iconBtnActive : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setShowSearch((v) => !v); setShowAbout(false); setShowSettings(false) }}
            title="Search all entries"
          >
            ?
          </button>
          <button
            className={`${styles.iconBtn} ${showSettings ? styles.iconBtnActive : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setShowSettings((v) => !v); setShowSearch(false); setShowAbout(false) }}
            title="Settings"
          >
            ⚙
          </button>
          <button
            className={`${styles.iconBtn} ${showAbout ? styles.iconBtnActive : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setShowAbout((v) => !v); setShowSearch(false); setShowSettings(false) }}
            title="About"
          >
            ℹ
          </button>
        </div>
      </div>
    </div>
  )
}
