import { useState } from 'react'
import { useScanStore } from '../store/scanStore'
import styles from './ApiKeyModal.module.css'

export function ApiKeyModal() {
  const showApiKeyModal = useScanStore((s) => s.showApiKeyModal)
  const apiKey = useScanStore((s) => s.apiKey)
  const setApiKey = useScanStore((s) => s.setApiKey)
  const setShowApiKeyModal = useScanStore((s) => s.setShowApiKeyModal)

  const [draft, setDraft] = useState(apiKey)

  if (!showApiKeyModal) return null

  const canClose = !!apiKey

  function handleSave() {
    if (draft.trim()) {
      setApiKey(draft.trim())
    }
  }

  function handleClose() {
    if (canClose) {
      setShowApiKeyModal(false)
      setDraft(apiKey)
    }
  }

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.heading}>API Key Required</h2>
        <p className={styles.description}>
          Enter your Anthropic API key to use the scanner. Your key is stored locally in your browser and sent directly to the Anthropic API — it never touches our servers.
        </p>
        <label className={styles.label}>
          Anthropic API Key
          <input
            type="password"
            className={styles.input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="sk-ant-..."
            autoFocus
          />
        </label>
        <div className={styles.actions}>
          {canClose && (
            <button className={styles.cancelBtn} onClick={handleClose}>
              Cancel
            </button>
          )}
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={!draft.trim()}
          >
            Save Key
          </button>
        </div>
        <p className={styles.hint}>
          Get your key at{' '}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>
        </p>
      </div>
    </div>
  )
}
