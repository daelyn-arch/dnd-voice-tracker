export interface SpellEntry {
  id: string
  name: string
  level: number          // 0 = cantrip
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  concentration: boolean
  classes: string[]
  description: string
  higherLevels?: string
}

export interface FeatureEntry {
  id: string
  name: string
  class: string
  levelAvailable: number
  description: string
  usesPerRest?: string
  restType?: 'short' | 'long' | 'none'
}

export type Entry = SpellEntry | FeatureEntry

export function isSpell(e: Entry): e is SpellEntry {
  return 'school' in e
}

export interface Detection {
  id: string            // nanoid
  keyword: string       // matched keyword (lowercase)
  entry: Entry
  detectedAt: number    // Date.now()
  expanded: boolean
  pinned: boolean       // if true, auto-dismiss timer is suppressed
}

export interface KeywordDetectedPayload {
  keyword: string
  id: string
  timestamp: number
}
