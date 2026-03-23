import { contextBridge, ipcRenderer } from 'electron'
import type { KeywordDetectedPayload } from './types'

contextBridge.exposeInMainWorld('electronAPI', {
  /** Subscribe to keyword detections from the speech pipeline (final results) */
  onKeywordDetected: (callback: (payload: KeywordDetectedPayload) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: KeywordDetectedPayload) =>
      callback(payload)
    ipcRenderer.on('keyword-detected', listener)
    return () => ipcRenderer.off('keyword-detected', listener)
  },

  /** Subscribe to partial keyword detections (low-latency, mid-utterance) */
  onKeywordPartial: (callback: (payload: KeywordDetectedPayload) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: KeywordDetectedPayload) =>
      callback(payload)
    ipcRenderer.on('keyword-partial', listener)
    return () => ipcRenderer.off('keyword-partial', listener)
  },

  /** Subscribe to speech pipeline status changes */
  onSpeechStatus: (callback: (status: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: string) => callback(status)
    ipcRenderer.on('speech:status', listener)
    return () => ipcRenderer.off('speech:status', listener)
  },

  /** Subscribe to speech pipeline errors */
  onSpeechError: (callback: (msg: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, msg: string) => callback(msg)
    ipcRenderer.on('speech:error', listener)
    return () => ipcRenderer.off('speech:error', listener)
  },

  startListening: () => ipcRenderer.invoke('speech:start'),
  stopListening: () => ipcRenderer.invoke('speech:stop'),

  /** Send raw Int16 PCM audio chunk from AudioWorklet to main process Vosk pipeline */
  sendAudioChunk: (buffer: ArrayBuffer) => ipcRenderer.send('audio:chunk', buffer),

  /** Toggle window mouse passthrough */
  setIgnoreMouseEvents: (ignore: boolean) => ipcRenderer.send('set-ignore-mouse', ignore),

  /** Resize window width, keeping right edge anchored */
  resizeWidth: (width: number) => ipcRenderer.send('resize-width', width),

  /** Custom library CRUD */
  customLibraryGet: () => ipcRenderer.invoke('custom-library:get'),
  customLibraryAdd: (card: any) => ipcRenderer.invoke('custom-library:add', card),
  customLibraryUpdate: (id: string, updates: any) => ipcRenderer.invoke('custom-library:update', id, updates),
  customLibraryDelete: (id: string) => ipcRenderer.invoke('custom-library:delete', id),
  customLibraryImport: (json: string) => ipcRenderer.invoke('custom-library:import', json)
})
