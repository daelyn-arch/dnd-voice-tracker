import type { ImageData, ModelId, ScanResult } from '../types'
import { SYSTEM_PROMPT, USER_PROMPT, VERIFY_SYSTEM_PROMPT, buildVerifyUserPrompt } from './prompts'

interface AnalyzeRequest {
  apiKey: string
  image: ImageData
  model: ModelId
}

async function callClaude(
  apiKey: string,
  model: string,
  system: string,
  messages: unknown[],
  maxTokens: number,
): Promise<string> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      model,
      system,
      max_tokens: maxTokens,
      messages,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || `API error: ${response.status}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text ?? ''
}

function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    throw new Error(`Failed to parse Claude response as JSON. Raw response:\n${text.slice(0, 500)}`)
  }
}

export async function analyzeImage({ apiKey, image, model }: AnalyzeRequest): Promise<ScanResult> {
  // Pass 1: Extract all entries from the image
  const extractionText = await callClaude(apiKey, model, SYSTEM_PROMPT, [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: image.mediaType,
            data: image.base64,
          },
        },
        { type: 'text', text: USER_PROMPT },
      ],
    },
  ], 16384)

  const result = parseJSON<ScanResult>(extractionText)

  // Pass 2: Verification — send the image again with the extracted data
  // and ask Claude to specifically verify all numerical values
  const verifyText = await callClaude(apiKey, model, VERIFY_SYSTEM_PROMPT, [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: image.mediaType,
            data: image.base64,
          },
        },
        { type: 'text', text: buildVerifyUserPrompt(result) },
      ],
    },
  ], 16384)

  const corrections = parseJSON<VerifyResult>(verifyText)

  // Apply corrections
  if (corrections.corrections && corrections.corrections.length > 0) {
    for (const fix of corrections.corrections) {
      const entry = result.entries.find(
        (e) => e.name.toLowerCase() === fix.entryName.toLowerCase(),
      )
      if (!entry) continue

      if (fix.fieldPath === 'description') {
        entry.description = entry.description.replace(fix.wrong, fix.corrected)
      } else {
        // Handle nested field paths like "fields.damage" or just "fields.range"
        const parts = fix.fieldPath.split('.')
        let target: Record<string, unknown> = entry as unknown as Record<string, unknown>
        for (let i = 0; i < parts.length - 1; i++) {
          target = target[parts[i]] as Record<string, unknown>
          if (!target) break
        }
        if (target) {
          const key = parts[parts.length - 1]
          const current = target[key]
          if (typeof current === 'string') {
            target[key] = current.replace(fix.wrong, fix.corrected)
          } else {
            target[key] = fix.corrected
          }
        }
      }
    }
  }

  return result
}

interface VerifyCorrection {
  entryName: string
  fieldPath: string
  wrong: string
  corrected: string
  reason: string
}

interface VerifyResult {
  corrections: VerifyCorrection[]
}
