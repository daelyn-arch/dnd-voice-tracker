import { useScanStore } from '../store/scanStore'
import styles from './LoadingOverlay.module.css'

export function LoadingOverlay() {
  const scanning = useScanStore((s) => s.scanning)

  if (!scanning) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.spinner} />
        <div className={styles.text}>Analyzing page with Claude Vision...</div>
        <div className={styles.hint}>This may take 10-30 seconds</div>
      </div>
    </div>
  )
}
