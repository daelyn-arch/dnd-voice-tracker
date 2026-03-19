import { useRef, useState, type DragEvent } from 'react'
import { fileToImageData } from '../lib/image'
import { useScanStore } from '../store/scanStore'
import styles from './ImageUpload.module.css'

export function ImageUpload() {
  const setImage = useScanStore((s) => s.setImage)
  const image = useScanStore((s) => s.image)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.startsWith('image/')) return
    const imageData = await fileToImageData(file)
    setImage(imageData)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  if (image) return null

  return (
    <div
      className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.fileInput}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className={styles.content}>
        <div className={styles.icon}>+</div>
        <p className={styles.text}>
          Drop an image here, click to browse, or <strong>Ctrl+V</strong> to paste
        </p>
        <p className={styles.hint}>Supports PNG, JPG, GIF, WebP</p>
      </div>
    </div>
  )
}
