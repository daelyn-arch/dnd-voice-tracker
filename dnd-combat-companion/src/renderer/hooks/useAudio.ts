import { useEffect, useRef } from 'react'
import { useDetectionStore } from '../store/detectionStore'

/**
 * Sets up getUserMedia → AudioWorklet → IPC pipeline.
 * Audio chunks are sent to main process as ArrayBuffer (Int16 PCM, 16kHz mono).
 * Call after speech:start has been acknowledged (Vosk model loaded).
 */
export function useAudio(): void {
  const setError = useDetectionStore((s) => s.setError)
  const contextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const workletRef = useRef<AudioWorkletNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let alive = true

    async function start(): Promise<void> {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        if (!alive) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream

        const ctx = new AudioContext()
        contextRef.current = ctx

        // Load the worklet processor from public/ (served as static asset)
        await ctx.audioWorklet.addModule('./audio-processor.js')
        if (!alive) { ctx.close(); return }

        const worklet = new AudioWorkletNode(ctx, 'pcm-capture')
        workletRef.current = worklet

        // Receive PCM buffers from the worklet and forward to main via IPC
        worklet.port.onmessage = (ev: MessageEvent<ArrayBuffer>) => {
          if (alive) {
            window.electronAPI.sendAudioChunk(ev.data)
          }
        }

        const source = ctx.createMediaStreamSource(stream)
        sourceRef.current = source
        source.connect(worklet)
        worklet.connect(ctx.destination)  // required: worklet must be connected

      } catch (err) {
        if (!alive) return
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[audio] Failed to start mic capture:', msg)
        setError(`Mic error: ${msg}`)
      }
    }

    start()

    return () => {
      alive = false
      workletRef.current?.port.close()
      sourceRef.current?.disconnect()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      contextRef.current?.close()
    }
  }, [])
}
