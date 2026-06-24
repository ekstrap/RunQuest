import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { silentCuePlayer, type CuePlayer } from '@/src/run/cue-player';

const CuePlayerContext = createContext<CuePlayer | null>(null);

interface CuePlayerProviderProps {
  children: ReactNode;
  /**
   * The cue player to inject. Tests pass a spy that records the cues played;
   * production wires the text-to-speech-backed player. Defaults to the silent
   * no-op player so the app runs with no native audio module.
   */
  player?: CuePlayer;
}

/**
 * Injects a CuePlayer into the tree — the dependency-injection seam that keeps
 * the in-run screen decoupled from the audio backend (PRD: audio output is a
 * system boundary, faked in tests). Mirrors LocationProvider.
 */
export function CuePlayerProvider({ children, player }: CuePlayerProviderProps) {
  const value = useMemo(() => player ?? silentCuePlayer, [player]);
  return <CuePlayerContext.Provider value={value}>{children}</CuePlayerContext.Provider>;
}

/** Read the injected CuePlayer. Throws if used outside a CuePlayerProvider. */
export function useCuePlayer(): CuePlayer {
  const player = useContext(CuePlayerContext);
  if (!player) {
    throw new Error('useCuePlayer must be used within a CuePlayerProvider');
  }
  return player;
}
