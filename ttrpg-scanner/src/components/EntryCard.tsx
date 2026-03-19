import type { ScannedEntry, SpellFields, StatBlockFields, ClassFeatureFields, FeatFields, MagicItemFields, TableFields } from '../types'
import { ENTRY_TYPE_COLORS, ENTRY_TYPE_LABELS } from '../types'
import styles from './EntryCard.module.css'

interface Props {
  entry: ScannedEntry
}

function MetaRow({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null
  return (
    <div className={styles.metaRow}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  )
}

function SpellMeta({ fields }: { fields: SpellFields }) {
  const level = fields.level !== undefined
    ? (fields.level === 0 ? 'Cantrip' : `Level ${fields.level}`)
    : undefined
  return (
    <>
      <MetaRow label="Level" value={level} />
      <MetaRow label="School" value={fields.school} />
      <MetaRow label="Casting Time" value={fields.castingTime} />
      <MetaRow label="Range" value={fields.range} />
      <MetaRow label="Components" value={fields.components} />
      <MetaRow label="Duration" value={fields.duration} />
      {fields.classes && <MetaRow label="Classes" value={fields.classes.join(', ')} />}
      {fields.ritual && <MetaRow label="Ritual" value="Yes" />}
      {fields.concentration && <MetaRow label="Concentration" value="Yes" />}
    </>
  )
}

function AbilityScore({ label, value }: { label: string; value?: number }) {
  if (value === undefined) return null
  const mod = Math.floor((value - 10) / 2)
  const sign = mod >= 0 ? '+' : ''
  return (
    <div className={styles.ability}>
      <span className={styles.abilityLabel}>{label}</span>
      <span className={styles.abilityValue}>{value}</span>
      <span className={styles.abilityMod}>{sign}{mod}</span>
    </div>
  )
}

function StatBlockMeta({ fields }: { fields: StatBlockFields }) {
  return (
    <>
      <MetaRow label="CR" value={fields.cr} />
      <MetaRow label="Type" value={[fields.size, fields.type, fields.alignment].filter(Boolean).join(' ')} />
      <MetaRow label="AC" value={String(fields.ac ?? '')} />
      <MetaRow label="HP" value={fields.hp} />
      <MetaRow label="Speed" value={fields.speed} />
      <div className={styles.abilityGrid}>
        <AbilityScore label="STR" value={fields.str} />
        <AbilityScore label="DEX" value={fields.dex} />
        <AbilityScore label="CON" value={fields.con} />
        <AbilityScore label="INT" value={fields.int} />
        <AbilityScore label="WIS" value={fields.wis} />
        <AbilityScore label="CHA" value={fields.cha} />
      </div>
      <MetaRow label="Saving Throws" value={fields.savingThrows} />
      <MetaRow label="Skills" value={fields.skills} />
      <MetaRow label="Senses" value={fields.senses} />
      <MetaRow label="Languages" value={fields.languages} />
      {fields.traits?.map((t, i) => (
        <div key={i} className={styles.subSection}>
          <span className={styles.subName}>{t.name}.</span> {t.description}
        </div>
      ))}
      {fields.actions && fields.actions.length > 0 && (
        <>
          <div className={styles.subHeading}>Actions</div>
          {fields.actions.map((a, i) => (
            <div key={i} className={styles.subSection}>
              <span className={styles.subName}>{a.name}.</span> {a.description}
            </div>
          ))}
        </>
      )}
      {fields.legendaryActions && fields.legendaryActions.length > 0 && (
        <>
          <div className={styles.subHeading}>Legendary Actions</div>
          {fields.legendaryActions.map((a, i) => (
            <div key={i} className={styles.subSection}>
              <span className={styles.subName}>{a.name}.</span> {a.description}
            </div>
          ))}
        </>
      )}
    </>
  )
}

function TableMeta({ fields }: { fields: TableFields }) {
  if (!fields.headers && !fields.rows) return null
  return (
    <div className={styles.tableWrap}>
      {fields.caption && <div className={styles.caption}>{fields.caption}</div>}
      <table className={styles.table}>
        {fields.headers && (
          <thead>
            <tr>
              {fields.headers.map((h, i) => <th key={i}>{h}</th>)}
            </tr>
          </thead>
        )}
        {fields.rows && (
          <tbody>
            {fields.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => <td key={j}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  )
}

function GenericMeta({ fields }: { fields: Record<string, unknown> }) {
  return (
    <>
      {Object.entries(fields).map(([key, value]) => {
        if (value === null || value === undefined) return null
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
        const display = typeof value === 'object' ? JSON.stringify(value) : String(value)
        return <MetaRow key={key} label={label} value={display} />
      })}
    </>
  )
}

function CardBody({ entry }: Props) {
  const f = entry.fields
  switch (entry.entryType) {
    case 'spell':
      return <SpellMeta fields={f as SpellFields} />
    case 'statBlock':
      return <StatBlockMeta fields={f as StatBlockFields} />
    case 'classFeature':
      return (
        <>
          <MetaRow label="Class" value={(f as ClassFeatureFields).class} />
          <MetaRow label="Level" value={String((f as ClassFeatureFields).level ?? '')} />
          <MetaRow label="Subclass" value={(f as ClassFeatureFields).subclass} />
          <MetaRow label="Uses" value={(f as ClassFeatureFields).uses} />
          <MetaRow label="Rest Type" value={(f as ClassFeatureFields).restType} />
        </>
      )
    case 'feat':
      return (
        <>
          <MetaRow label="Prerequisite" value={(f as FeatFields).prerequisite} />
          <MetaRow label="Category" value={(f as FeatFields).category} />
        </>
      )
    case 'magicItem':
      return (
        <>
          <MetaRow label="Rarity" value={(f as MagicItemFields).rarity} />
          <MetaRow label="Attunement" value={
            (f as MagicItemFields).attunement === true ? 'Yes'
            : (f as MagicItemFields).attunement === false ? 'No'
            : (f as MagicItemFields).attunement as string | undefined
          } />
          <MetaRow label="Type" value={(f as MagicItemFields).itemType} />
        </>
      )
    case 'table':
      return <TableMeta fields={f as TableFields} />
    default:
      return <GenericMeta fields={f} />
  }
}

export function EntryCard({ entry }: Props) {
  const accent = ENTRY_TYPE_COLORS[entry.entryType] ?? '#9e9e9e'

  return (
    <div className={styles.card} style={{ '--accent': accent } as React.CSSProperties}>
      <div className={styles.header}>
        <h3 className={styles.name}>{entry.name}</h3>
        <span className={styles.badge}>{ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType}</span>
      </div>
      <div className={styles.meta}>
        <CardBody entry={entry} />
      </div>
      {entry.description && entry.entryType !== 'statBlock' && (
        <div className={styles.description}>{entry.description}</div>
      )}
      {entry.source && (
        <div className={styles.source}>{entry.source}</div>
      )}
    </div>
  )
}
