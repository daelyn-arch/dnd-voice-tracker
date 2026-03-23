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

  // Custom library CRUD — lazy import to avoid early app.getPath() calls
  ipcMain.handle('custom-library:get', async () => {
    const lib = await import('./custom-library')
    return lib.getCustomCards()
  })
  ipcMain.handle('custom-library:add', async (_event, card: any) => {
    const lib = await import('./custom-library')
    return lib.addCustomCard(card)
  })
  ipcMain.handle('custom-library:update', async (_event, id: string, updates: any) => {
    const lib = await import('./custom-library')
    return lib.updateCustomCard(id, updates)
  })
  ipcMain.handle('custom-library:delete', async (_event, id: string) => {
    const lib = await import('./custom-library')
    return lib.deleteCustomCard(id)
  })
  ipcMain.handle('custom-library:import', async (_event, json: string) => {
    const lib = await import('./custom-library')
    return lib.importLibrary(json)
  })
}
