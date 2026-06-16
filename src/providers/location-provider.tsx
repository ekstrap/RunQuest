import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { unavailableLocationSource, type LocationSource } from '@/src/run/location-source';

const LocationContext = createContext<LocationSource | null>(null);

interface LocationProviderProps {
  children: ReactNode;
  /**
   * The location source to inject. Tests pass a fake that emits controlled
   * readings; production will wire an expo-location-backed source (deferred).
   * Defaults to the no-GPS source so the app runs with no native module.
   */
  source?: LocationSource;
}

/**
 * Injects a LocationSource into the tree — the dependency-injection seam that
 * keeps the in-run screen decoupled from GPS hardware (PRD: location is a system
 * boundary, faked in tests). Mirrors RepositoryProvider.
 */
export function LocationProvider({ children, source }: LocationProviderProps) {
  const value = useMemo(() => source ?? unavailableLocationSource, [source]);
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

/** Read the injected LocationSource. Throws if used outside a LocationProvider. */
export function useLocationSource(): LocationSource {
  const source = useContext(LocationContext);
  if (!source) {
    throw new Error('useLocationSource must be used within a LocationProvider');
  }
  return source;
}
