import { useScanStore } from '../store/scanStore'
import styles from './Header.module.css'

export function Header() {
  const setShowApiKeyModal = useScanStore((s) => s.setShowApiKeyModal)
  const apiKey = useScanStore((s) => s.apiKey)

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <h1 className={styles.title}>TTRPG Scanner</h1>
        <span className={styles.subtitle}>Rulebook page scanner powered by Claude Vision</span>
      </div>
      <button
        className={styles.settingsBtn}
        onClick={() => setShowApiKeyModal(true)}
        title="API Key Settings"
      >
        {apiKey ? '⚙' : '🔑'}
      </button>
    </header>
  )
}
