import React, { useEffect, useState } from 'react'
import { useDetectionStore } from '../store/detectionStore'
import styles from './BootSplash.module.css'

const BANNER = `
  ####   ##  ##  ####
  ##  #  ### ##  ##  #
  ##  #  ## ###  ##  #
  ####   ##  ##  ####
`.trim()

export function BootSplash(): React.JSX.Element | null {
  const isListening = useDetectionStore((s) => s.isListening)
  const [phase, setPhase] = useState<'booting' | 'ready' | 'gone'>('booting')
  const [tick, setTick] = useState(0)

  // Animate the ellipsis
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 450)
    return () => clearInterval(t)
  }, [])

  // Transition phases
  useEffect(() => {
    if (isListening && phase === 'booting') {
      setPhase('ready')
      const t = setTimeout(() => setPhase('gone'), 1800)
      return () => clearTimeout(t)
    }
  }, [isListening, phase])

  if (phase === 'gone') return null

  const dots = '.'.repeat(tick % 4)
  const barFull = phase === 'ready'
  const bar = barFull
    ? '████████████████'
    : '█'.repeat(Math.min(14, 4 + (tick % 12))) + '░'.repeat(Math.max(0, 14 - (tick % 12) - 4))

  return (
    <div className={`${styles.splash} ${phase === 'ready' ? styles.fadeOut : ''}`}>
      <pre className={styles.banner}>{BANNER}</pre>
      <div className={styles.subtitle}>COMBAT COMPANION v1.0</div>
      <div className={styles.divider}>{'─'.repeat(22)}</div>
      <div className={styles.log}>
        <span className={styles.prompt}>&gt;</span> LOADING SPELLS
        <span className={styles.ok}> ✓</span>
      </div>
      <div className={styles.log}>
        <span className={styles.prompt}>&gt;</span>
        {phase === 'ready'
          ? <> VOICE ONLINE<span className={styles.ok}> ✓</span></>
          : <> INIT VOICE{dots}</>
        }
      </div>
      <div className={styles.barRow}>
        <span className={styles.bar}>[{bar}]</span>
        <span className={styles.barLabel}>{barFull ? ' READY!' : '      '}</span>
      </div>
    </div>
  )
}
