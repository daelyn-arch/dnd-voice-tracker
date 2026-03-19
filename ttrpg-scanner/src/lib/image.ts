import type { ImageData } from '../types'

// Claude vision supports up to 1568px on the long side — use full resolution
const MAX_LONG_SIDE = 1568
const MAX_SHORT_SIDE = 1568

function getMediaType(file: File | Blob): ImageData['mediaType'] {
  const type = file.type
  if (type === 'image/png') return 'image/png'
  if (type === 'image/gif') return 'image/gif'
  if (type === 'image/webp') return 'image/webp'
  return 'image/jpeg'
}

function resizeIfNeeded(file: Blob, mediaType: ImageData['mediaType']): Promise<{ base64: string; mediaType: ImageData['mediaType'] }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img

      if (width <= MAX_LONG_SIDE && height <= MAX_SHORT_SIDE) {
        // No resize needed — read original
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          const base64 = dataUrl.split(',')[1]
          resolve({ base64, mediaType })
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
        return
      }

      // Resize with high-quality interpolation, always output PNG for text clarity
      const scale = Math.min(
        MAX_LONG_SIDE / Math.max(width, height),
        MAX_SHORT_SIDE / Math.min(width, height),
      )
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Always use PNG — lossless encoding preserves small text like dice values
      const dataUrl = canvas.toDataURL('image/png')
      const base64 = dataUrl.split(',')[1]
      resolve({
        base64,
        mediaType: 'image/png',
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

export async function fileToImageData(file: File): Promise<ImageData> {
  const mediaType = getMediaType(file)
  const { base64, mediaType: finalType } = await resizeIfNeeded(file, mediaType)
  return { base64, mediaType: finalType, name: file.name }
}

export async function clipboardToImageData(): Promise<ImageData | null> {
  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      const imageType = item.types.find(t => t.startsWith('image/'))
      if (imageType) {
        const blob = await item.getType(imageType)
        const mediaType = getMediaType(blob as File)
        const { base64, mediaType: finalType } = await resizeIfNeeded(blob, mediaType)
        return { base64, mediaType: finalType, name: 'clipboard-image' }
      }
    }
  } catch {
    // Clipboard API not available or no image
  }
  return null
}

export function imageDataToUrl(image: ImageData): string {
  return `data:${image.mediaType};base64,${image.base64}`
}
