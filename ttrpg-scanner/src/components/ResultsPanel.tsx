import { useScanStore } from '../store/scanStore'
import { EntryCard } from './EntryCard'
import styles from './ResultsPanel.module.css'

export function ResultsPanel() {
  const entries = useScanStore((s) => s.entries)
  const system = useScanStore((s) => s.system)
  const pageDescription = useScanStore((s) => s.pageDescription)
  const error = useScanStore((s) => s.error)

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <div className={styles.errorTitle}>Scan Failed</div>
          <div className={styles.errorMessage}>{error}</div>
        </div>
      </div>
    )
  }

  if (entries.length === 0) return null

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {system && <span className={styles.system}>{system}</span>}
        {pageDescription && <span className={styles.description}>{pageDescription}</span>}
        <span className={styles.count}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'} found</span>
      </div>
      <div className={styles.grid}>
        {entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}
