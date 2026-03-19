import { Header } from './components/Header'
import { ApiKeyModal } from './components/ApiKeyModal'
import { ImageUpload } from './components/ImageUpload'
import { ImagePreview } from './components/ImagePreview'
import { ScanButton } from './components/ScanButton'
import { ResultsPanel } from './components/ResultsPanel'
import { ExportBar } from './components/ExportBar'
import { LoadingOverlay } from './components/LoadingOverlay'
import { useClipboardPaste } from './hooks/useClipboardPaste'
import styles from './App.module.css'

export function App() {
  useClipboardPaste()

  return (
    <div className={styles.app}>
      <Header />
      <main className={styles.main}>
        <div className={styles.inputColumn}>
          <ImageUpload />
          <ImagePreview />
          <ScanButton />
        </div>
        <div className={styles.resultsColumn}>
          <ResultsPanel />
          <ExportBar />
        </div>
      </main>
      <ApiKeyModal />
      <LoadingOverlay />
    </div>
  )
}
