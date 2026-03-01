import { BrowserWindow, ipcMain } from 'electron'
import { startSpeechPipeline, stopSpeechPipeline, processAudioChunk } from './speech'

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('speech:start', async () => {
    startSpeechPipeline(mainWindow)
  })

  ipcMain.handle('speech:stop', async () => {
    stopSpeechPipeline(mainWindow)
  })

  // High-frequency: renderer sends raw Int16 PCM chunks from AudioWorklet
  ipcMain.on('audio:chunk', (_event, buffer: ArrayBuffer) => {
    processAudioChunk(mainWindow, buffer)
  })

  // Mouse passthrough toggle
  ipcMain.on('set-ignore-mouse', (_event, ignore: boolean) => {
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true })
  })
}
