import React, { useEffect, useRef } from 'react'
import type { Detection } from '../types'
import { SpellButton } from './SpellButton'
import { SpellCard } from './SpellCard'
import styles from './DetectionItem.module.css'

const AUTO_DISMISS_MS = 15_000

interface Props {
  detection: Detection
  onExpand: (id: string) => void
  onCollapse: (id: string) => void
  onDismiss: (id: string) => void
  onPin: (id: string) => void
  onStickyToggle: (id: string) => void
  onEdit: (id: string) => void
}

export function DetectionItem({ detection, onExpand, onCollapse, onDismiss, onPin, onStickyToggle, onEdit }: Props): React.JSX.Element {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-dismiss logic: 15s countdown, paused while expanded or pinned
  useEffect(() => {
    if (detection.expanded || detection.pinned) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    timerRef.current = setTimeout(() => {
      onDismiss(detection.id)
    }, AUTO_DISMISS_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [detection.expanded, detection.pinned, detection.detectedAt])

  return (
    <div className={styles.item}>
      {detection.expanded ? (
        <SpellCard
          detection={detection}
          onCollapse={() => onCollapse(detection.id)}
          onDismiss={() => onDismiss(detection.id)}
          onPin={() => onPin(detection.id)}
          onStickyToggle={() => onStickyToggle(detection.id)}
          onEdit={() => onEdit(detection.id)}
        />
      ) : (
        <SpellButton
          detection={detection}
          onExpand={() => onExpand(detection.id)}
          onDismiss={() => onDismiss(detection.id)}
        />
      )}
    </div>
  )
}
