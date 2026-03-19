import { useScanStore } from '../store/scanStore'
import { MODEL_OPTIONS } from '../types'
import styles from './ScanButton.module.css'

export function ScanButton() {
  const image = useScanStore((s) => s.image)
  const scanning = useScanStore((s) => s.scanning)
  const model = useScanStore((s) => s.model)
  const setModel = useScanStore((s) => s.setModel)
  const startScan = useScanStore((s) => s.startScan)

  if (!image) return null

  return (
    <div className={styles.container}>
      <select
        className={styles.modelSelect}
        value={model}
        onChange={(e) => setModel(e.target.value as typeof model)}
        disabled={scanning}
      >
        {MODEL_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        className={styles.scanBtn}
        onClick={startScan}
        disabled={scanning}
      >
        {scanning ? 'Scanning...' : 'Scan Page'}
      </button>
    </div>
  )
}
