import React from 'react'
import { useDetectionStore } from '../store/detectionStore'
import styles from './StatusIndicator.module.css'

export function StatusIndicator(): React.JSX.Element {
  const isListening = useDetectionStore((s) => s.isListening)
  const errorMsg = useDetectionStore((s) => s.errorMsg)

  if (errorMsg) {
    return (
      <div className={styles.container}>
        <span className={styles.dotError} />
        <span className={styles.label}>Error</span>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <span className={isListening ? styles.dotListening : styles.dotOff} />
      <span className={styles.label}>{isListening ? 'Listening' : 'Off'}</span>
    </div>
  )
}
