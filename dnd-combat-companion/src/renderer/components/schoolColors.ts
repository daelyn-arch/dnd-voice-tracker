import type { Entry, EntryType, DaggerheartEntry } from '../types'

export const SCHOOL_COLORS: Record<string, string> = {
  // Spell schools
  Evocation: '#e74c3c',
  Abjuration: '#4a90d9',
  Necromancy: '#2ecc71',
  Illusion: '#1abc9c',
  Conjuration: '#8e44ad',
  Enchantment: '#e91e63',
  Divination: '#f39c12',
  Transmutation: '#e67e22',
  // Class features fallback
  Feature: '#607d8b',
  // New categories
  Feat: '#ff7043',
  Equipment: '#78909c',
  Background: '#ab47bc',
  Species: '#26a69a',
  Rules: '#5c6bc0',
  MagicItem: '#ffd54f',
  // Dice rolls
  DiceRoll: '#ffab40',
  // Daggerheart categories
  'DH-domain': '#ef5350',
  'DH-class features': '#42a5f5',
  'DH-rules': '#66bb6a',
  'DH-adversary': '#ff8a65'
}

export function getSchoolColor(school: string): string {
  return SCHOOL_COLORS[school] ?? '#607d8b'
}

/** Get the accent color for any entry type */
export function getEntryColor(entry: Entry): string {
  switch (entry._type) {
    case 'spell':
      return getSchoolColor(entry.school)
    case 'feature':
      return SCHOOL_COLORS.Feature
    case 'feat':
      return SCHOOL_COLORS.Feat
    case 'equipment':
      return SCHOOL_COLORS.Equipment
    case 'background':
      return SCHOOL_COLORS.Background
    case 'species':
      return SCHOOL_COLORS.Species
    case 'rules':
      return SCHOOL_COLORS.Rules
    case 'magicItem':
      return SCHOOL_COLORS.MagicItem
    case 'daggerheart':
      return SCHOOL_COLORS[`DH-${(entry as DaggerheartEntry).category}`] ?? '#607d8b'
    case 'diceRoll':
      return SCHOOL_COLORS.DiceRoll
    default:
      return '#607d8b'
  }
}

/** Get a short badge label for any entry */
export function getEntryBadge(entry: Entry): string {
  switch (entry._type) {
    case 'spell':
      return entry.level === 0 ? 'Cantrip' : `L${entry.level} ${entry.school.slice(0, 4)}`
    case 'feature':
      return entry.class
    case 'feat':
      return entry.featType ?? 'Feat'
    case 'equipment':
      return 'Equip'
    case 'background':
      return 'BG'
    case 'species':
      return 'Species'
    case 'rules':
      return 'Rules'
    case 'magicItem':
      return entry.rarity ?? 'Magic'
    case 'daggerheart': {
      const cat = (entry as DaggerheartEntry).category
      if (cat === 'domain') return 'Domain'
      if (cat === 'class features') return 'DH Class'
      if (cat === 'adversary') return 'Adversary'
      return 'DH Rules'
    }
    case 'diceRoll':
      return 'd20'
    default:
      return ''
  }
}
