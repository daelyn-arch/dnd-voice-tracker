import { useEffect } from 'react'
import { clipboardToImageData, fileToImageData } from '../lib/image'
import { useScanStore } from '../store/scanStore'

export function useClipboardPaste() {
  const setImage = useScanStore((s) => s.setImage)

  useEffect(() => {
    async function handlePaste(e: ClipboardEvent) {
      // Check if pasting into an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const files = e.clipboardData?.files
      if (files && files.length > 0) {
        const file = files[0]
        if (file.type.startsWith('image/')) {
          e.preventDefault()
          const imageData = await fileToImageData(file)
          setImage(imageData)
          return
        }
      }

      // Try clipboard API for screenshots
      const imageData = await clipboardToImageData()
      if (imageData) {
        e.preventDefault()
        setImage(imageData)
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [setImage])
}
