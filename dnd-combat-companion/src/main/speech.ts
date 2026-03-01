import * as path from 'path'
import * as fs from 'fs'
import { fork, ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import { loadKeywords } from './grammar'
import type { KeywordDetectedPayload } from '../preload/types'

let speechProcess: ChildProcess | null = null
let isListening = false

// Prevent unhandled EPIPE crashes when piped child processes exit unexpectedly
process.stdout?.on('error', () => {})
process.stderr?.on('error', () => {})

function getModelPath(): string {
  const isProd = !process.env['ELECTRON_RENDERER_URL']
  return isProd
    ? path.join(process.resourcesPath, 'vosk-model')
    : path.resolve(__dirname, '../../resources/vosk-model')
}

/**
 * Find the system Node.js binary.
 * npm sets NODE and npm_node_execpath in the environment when running scripts.
 * We persist this value at startup so it's available in production too.
 */
const NODE_PATH: string =
  process.env['NODE'] ||
  process.env['npm_node_execpath'] ||
  (process.platform === 'win32' ? 'node.exe' : 'node')

export function startSpeechPipeline(mainWindow: BrowserWindow): void {
  if (speechProcess !== null || isListening) return  // prevent double spawn

  const modelPath = getModelPath()
  if (!fs.existsSync(modelPath)) {
    const msg =
      'Vosk model not found. Download vosk-model-small-en-us-0.15 from ' +
      'https://alphacephei.com/vosk/models and place it at resources/vosk-model/'
    console.error('[speech]', msg)
    mainWindow.webContents.send('speech:error', msg)
    return
  }

  const keywords = loadKeywords()
  if (keywords.length === 0) {
    console.warn('[speech] No keywords — run scripts/build-data.ts first')
  }

  // In a packaged asar, __dirname resolves inside the archive which system
  // Node.js cannot read. speech-worker.js is in asarUnpack so redirect there.
  const workerPath = path.join(__dirname, 'speech-worker.js')
    .replace(/app\.asar([\\/])/g, 'app.asar.unpacked$1')

  console.log('[speech] Spawning worker with Node:', NODE_PATH)

  // Fork using SYSTEM Node.js (not Electron) so ffi-napi/vosk native modules load.
  // silent: true pipes stdio instead of inheriting, which prevents Windows from
  // opening a visible black console window for the node.exe subprocess.
  speechProcess = fork(workerPath, [], {
    execPath: NODE_PATH,
    execArgv: [],
    silent: true
  })

  // Still forward worker output to Electron's console in dev.
  // Swallow EPIPE errors that occur when the worker exits while streams are piped
  // (common during React StrictMode double-invoke).
  speechProcess.stdout?.on('error', () => {})
  speechProcess.stderr?.on('error', () => {})
  speechProcess.stdout?.pipe(process.stdout)
  speechProcess.stderr?.pipe(process.stderr)

  speechProcess.on('message', (msg: Record<string, unknown>) => {
    if (msg.type === 'status' && msg.status === 'ready') {
      isListening = true
      console.log('[speech] Worker ready')
      mainWindow.webContents.send('speech:status', 'listening')

    } else if (msg.type === 'detected') {
      const payload: KeywordDetectedPayload = {
        keyword: msg.keyword as string,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now()
      }
      console.log('[speech] Detected:', payload.keyword)
      mainWindow.webContents.send('keyword-detected', payload)

    } else if (msg.type === 'error') {
      console.error('[speech] Worker error:', msg.message)
      mainWindow.webContents.send('speech:error', msg.message)
    }
  })

  speechProcess.on('error', (err) => {
    console.error('[speech] Worker process error:', err)
    mainWindow.webContents.send('speech:error', `Worker failed to start: ${err.message}`)
  })

  speechProcess.on('exit', (code) => {
    console.log('[speech] Worker exited with code', code)
    // Only report stopped if no replacement worker is already running.
    // If speechProcess is non-null here, a new worker was spawned after this
    // one was stopped (React StrictMode double-invoke) — don't clobber its state.
    if (speechProcess === null) {
      isListening = false
      mainWindow.webContents.send('speech:status', 'stopped')
    }
  })

  speechProcess.send({ type: 'init', modelPath, keywords })
}

export function processAudioChunk(_mainWindow: BrowserWindow, rawBuffer: ArrayBuffer): void {
  if (!isListening || !speechProcess) return
  speechProcess.send({
    type: 'audio',
    data: Array.from(new Uint8Array(rawBuffer))
  })
}

export function stopSpeechPipeline(mainWindow: BrowserWindow): void {
  const proc = speechProcess  // keep local ref so GC can't close the IPC pipe
  speechProcess = null
  isListening = false
  mainWindow.webContents.send('speech:status', 'stopped')
  if (proc) {
    try { proc.send({ type: 'stop' }) } catch { /* already exited */ }
    // Closure keeps `proc` alive until the timeout fires
    setTimeout(() => { try { proc.kill() } catch { /* already exited */ } }, 500)
  }
}

export function getListeningState(): boolean {
  return isListening
}
