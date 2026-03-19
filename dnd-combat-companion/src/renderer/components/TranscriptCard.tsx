import React, { useState } from 'react'
import { useDetectionStore } from '../store/detectionStore'
import styles from './TranscriptCard.module.css'

export function TranscriptCard(): React.JSX.Element | null {
  const showTranscript = useDetectionStore((s) => s.showTranscript)
  const transcriptWords = useDetectionStore((s) => s.transcriptWords)
  const [expanded, setExpanded] = useState(false)

  if (!showTranscript) return null

  const latest = transcriptWords.length > 0
    ? transcriptWords[transcriptWords.length - 1]
    : '...'

  return (
    <div className={styles.card}>
      <div className={styles.header} onClick={() => setExpanded((v) => !v)}>
        <span className={styles.dot} />
        <span className={styles.label}>Hearing:</span>
        <span className={styles.latest}>{latest}</span>
        <span className={styles.toggle}>{expanded ? '−' : '+'}</span>
      </div>
      {expanded && (
        <div className={styles.body}>
          {transcriptWords.length === 0 ? (
            <span className={styles.empty}>No words detected yet</span>
          ) : (
            <ul className={styles.wordList}>
              {transcriptWords.map((w, i) => (
                <li key={i} className={styles.word}>
                  <span className={styles.index}>{i + 1}</span>
                  {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
