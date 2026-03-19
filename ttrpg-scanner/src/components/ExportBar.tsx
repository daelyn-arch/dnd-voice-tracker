import { useScanStore } from '../store/scanStore'
import styles from './ExportBar.module.css'
import { useState } from 'react'

export function ExportBar() {
  const entries = useScanStore((s) => s.entries)
  const system = useScanStore((s) => s.system)
  const [copied, setCopied] = useState(false)

  if (entries.length === 0) return null

  function buildExport() {
    return {
      exportedAt: new Date().toISOString(),
      scanner: 'TTRPG Scanner v1.0.0',
      system: system ?? 'Unknown',
      entries: entries.map(({ entryType, name, fields, description, source }) => ({
        entryType,
        name,
        fields,
        description,
        ...(source ? { source } : {}),
      })),
    }
  }

  function downloadJson() {
    const data = buildExport()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ttrpg-scan-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function copyJson() {
    const data = buildExport()
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.bar}>
      <button className={styles.btn} onClick={downloadJson}>
        Download JSON
      </button>
      <button className={styles.btn} onClick={copyJson}>
        {copied ? 'Copied!' : 'Copy to Clipboard'}
      </button>
    </div>
  )
}
