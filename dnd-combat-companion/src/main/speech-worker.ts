/**
 * speech-worker.ts — runs as a child_process.fork() subprocess using system Node.js.
 * Uses process.on('message') / process.send() for IPC with the Electron main process.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const vosk = require('vosk')

let recognizer: {
  acceptWaveform: (buf: Buffer) => boolean
  result: () => { text: string }
  free: () => void
} | null = null

process.on('message', (msg: Record<string, unknown>) => {
  if (msg.type === 'init') {
    const modelPath = msg.modelPath as string
    const keywords = msg.keywords as string[]

    try {
      // vosk npm package calls JSON.stringify internally — pass the raw array
      const grammar = [...keywords, '[unk]']
      vosk.setLogLevel(-1)
      const model = new vosk.Model(modelPath)
      recognizer = new vosk.Recognizer({ model, sampleRate: 16000, grammar })
      process.send!({ type: 'status', status: 'ready' })
      console.log(`[worker] Ready — ${keywords.length} keywords`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      process.send!({ type: 'error', message })
    }

  } else if (msg.type === 'audio') {
    if (!recognizer) return
    const buf = Buffer.from(msg.data as number[])
    if (recognizer.acceptWaveform(buf)) {
      const result = recognizer.result()
      const text = result.text.trim()
      if (text && text !== '[unk]') {
        process.send!({ type: 'detected', keyword: text })
      }
    }

  } else if (msg.type === 'stop') {
    recognizer?.free()
    recognizer = null
    process.send!({ type: 'status', status: 'stopped' })
    process.exit(0)
  }
})
