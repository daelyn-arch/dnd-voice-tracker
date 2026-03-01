export const SCHOOL_COLORS: Record<string, string> = {
  Evocation: '#e74c3c',
  Abjuration: '#4a90d9',
  Necromancy: '#2ecc71',
  Illusion: '#1abc9c',
  Conjuration: '#8e44ad',
  Enchantment: '#e91e63',
  Divination: '#f39c12',
  Transmutation: '#e67e22',
  // Class features fallback
  Feature: '#607d8b'
}

export function getSchoolColor(school: string): string {
  return SCHOOL_COLORS[school] ?? '#607d8b'
}
