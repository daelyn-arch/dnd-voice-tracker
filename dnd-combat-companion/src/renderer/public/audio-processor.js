/**
 * AudioWorkletProcessor — runs in a dedicated audio thread.
 *
 * Receives 128-sample float32 frames from the Web Audio graph (at whatever
 * sample rate the audio context uses), downsamples to 16kHz, converts to
 * Int16 PCM, accumulates into 4096-sample chunks, and posts them to the
 * main thread where the IPC bridge sends them to Vosk.
 *
 * The processor is registered via addModule() and loaded as a static asset
 * (not bundled by Vite) to satisfy the AudioWorklet URL constraint.
 */

const TARGET_SAMPLE_RATE = 16000
const CHUNK_SAMPLES = 4096  // ~256ms at 16kHz

class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._ratio = 1          // set on first process()
    this._accumulator = []   // Float32 samples at 16kHz
    this._ratioInitialized = false
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || input.length === 0) return true

    const channelData = input[0]  // mono; if stereo only use ch0
    if (!channelData || channelData.length === 0) return true

    // Initialize downsample ratio from sampleRate (global in AudioWorklet)
    if (!this._ratioInitialized) {
      this._ratio = sampleRate / TARGET_SAMPLE_RATE
      this._ratioInitialized = true
    }

    // Downsample: simple decimation with linear interpolation
    for (let i = 0; i < channelData.length; i += this._ratio) {
      const idx = Math.floor(i)
      const frac = i - idx
      const s0 = channelData[idx] ?? 0
      const s1 = channelData[idx + 1] ?? s0
      this._accumulator.push(s0 + frac * (s1 - s0))
    }

    // Flush when we have enough samples
    while (this._accumulator.length >= CHUNK_SAMPLES) {
      const chunk = this._accumulator.splice(0, CHUNK_SAMPLES)
      const int16 = new Int16Array(chunk.length)
      for (let j = 0; j < chunk.length; j++) {
        // Clamp float [-1,1] → Int16
        int16[j] = Math.max(-32768, Math.min(32767, Math.round(chunk[j] * 32767)))
      }
      this.port.postMessage(int16.buffer, [int16.buffer])
    }

    return true  // keep processor alive
  }
}

registerProcessor('pcm-capture', PCMCaptureProcessor)
