import React from 'react'
import { HUD } from './components/HUD'
import { BootSplash } from './components/BootSplash'
import { useIPC } from './hooks/useIPC'

export default function App(): React.JSX.Element {
  // Subscribes to IPC events and wires them into the Zustand store.
  // Must be mounted at the root level.
  useIPC()

  return (
    <>
      <HUD />
      <BootSplash />
    </>
  )
}
