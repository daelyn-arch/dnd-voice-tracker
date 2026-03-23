import React from 'react'
import { SCHOOL_COLORS } from './schoolColors'
import styles from './AboutPanel.module.css'

interface Props {
  onClose: () => void
}

export function AboutPanel({ onClose }: Props): React.JSX.Element {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Log of Beholding</h2>
        <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
      </div>

      <p className={styles.version}>v1.0.0 — Voice-activated TTRPG reference overlay</p>
      <p className={styles.attribution} style={{ fontStyle: 'italic', marginTop: 4 }}>Like a Bag of Holding, but for knowledge.</p>

      <div className={styles.divider} />

      <h3 className={styles.sectionTitle}>Legal Attribution</h3>
      <p className={styles.attribution}>
        This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by
        Wizards of the Coast LLC and available at{' '}
        <span className={styles.link}>https://dnd.wizards.com/resources/systems-reference-document</span>.
        The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License
        available at{' '}
        <span className={styles.link}>https://creativecommons.org/licenses/by/4.0/legalcode</span>.
      </p>

      <div className={styles.divider} />

      <h3 className={styles.sectionTitle}>How to Use</h3>
      <ul className={styles.list}>
        <li>Say a spell name or class feature aloud during your session</li>
        <li>A button appears in the bottom-right corner of your screen</li>
        <li>Click the button to expand the full stat card</li>
        <li>Buttons auto-dismiss after 15 seconds if not clicked</li>
        <li>Click × to dismiss any button immediately</li>
      </ul>

      <div className={styles.divider} />

      <h3 className={styles.sectionTitle}>Color Legend</h3>

      <h4 className={styles.legendHeader}>Spell Schools</h4>
      <div className={styles.legend}>
        {(['Evocation', 'Abjuration', 'Necromancy', 'Illusion', 'Conjuration', 'Enchantment', 'Divination', 'Transmutation'] as const).map((school) => (
          <div key={school} className={styles.legendRow}>
            <span className={styles.legendDot} style={{ background: SCHOOL_COLORS[school] }} />
            <span className={styles.legendLabel}>{school}</span>
          </div>
        ))}
      </div>

      <h4 className={styles.legendHeader}>D&D 5e Categories</h4>
      <div className={styles.legend}>
        {([['Feature', 'Class Features'], ['Feat', 'Feats'], ['Equipment', 'Equipment'], ['Background', 'Backgrounds'], ['Species', 'Species'], ['Rules', 'Rules'], ['MagicItem', 'Magic Items'], ['DiceRoll', 'Dice Rolls']] as const).map(([key, label]) => (
          <div key={key} className={styles.legendRow}>
            <span className={styles.legendDot} style={{ background: SCHOOL_COLORS[key] }} />
            <span className={styles.legendLabel}>{label}</span>
          </div>
        ))}
      </div>

      <h4 className={styles.legendHeader}>Daggerheart</h4>
      <div className={styles.legend}>
        {([['DH-domain', 'Domains'], ['DH-class features', 'Class Features'], ['DH-rules', 'Rules'], ['DH-adversary', 'Adversaries']] as const).map(([key, label]) => (
          <div key={key} className={styles.legendRow}>
            <span className={styles.legendDot} style={{ background: SCHOOL_COLORS[key] }} />
            <span className={styles.legendLabel}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
