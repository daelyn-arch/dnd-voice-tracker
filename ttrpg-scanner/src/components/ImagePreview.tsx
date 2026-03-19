import { imageDataToUrl } from '../lib/image'
import { useScanStore } from '../store/scanStore'
import styles from './ImagePreview.module.css'

export function ImagePreview() {
  const image = useScanStore((s) => s.image)
  const setImage = useScanStore((s) => s.setImage)
  const scanning = useScanStore((s) => s.scanning)

  if (!image) return null

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.name}>{image.name}</span>
        {!scanning && (
          <button className={styles.removeBtn} onClick={() => setImage(null)} title="Remove image">
            ×
          </button>
        )}
      </div>
      <img src={imageDataToUrl(image)} alt="Uploaded page" className={styles.image} />
    </div>
  )
}
