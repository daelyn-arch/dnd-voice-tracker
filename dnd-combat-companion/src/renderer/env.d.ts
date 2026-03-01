/// <reference types="vite/client" />

import type { KeywordDetectedPayload } from './types'

interface ElectronAPI {
  onKeywordDetected: (callback: (payload: KeywordDetectedPayload) => void) => () => void
  onSpeechStatus: (callback: (status: string) => void) => () => void
  onSpeechError: (callback: (msg: string) => void) => () => void
  startListening: () => Promise<void>
  stopListening: () => Promise<void>
  sendAudioChunk: (buffer: ArrayBuffer) => void
  setIgnoreMouseEvents: (ignore: boolean) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
