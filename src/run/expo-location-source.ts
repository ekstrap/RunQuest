import * as ExpoLocation from 'expo-location';

import type { LocationSource } from './location-source';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Production LocationSource backed by expo-location. Requests foreground
 * permission on first subscribe; emits null readings if permission is denied
 * (GPS must never block run completion — DESIGN.md §3.9).
 */
export const expoLocationSource: LocationSource = {
  subscribe(listener) {
    let subscription: ExpoLocation.LocationSubscription | null = null;
    let prevLat: number | null = null;
    let prevLon: number | null = null;
    let accumulatedMeters = 0;

    void (async () => {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        listener({ coordinate: null, distanceMeters: null });
        return;
      }

      subscription = await ExpoLocation.watchPositionAsync(
        { accuracy: ExpoLocation.Accuracy.BestForNavigation, distanceInterval: 5 },
        ({ coords: { latitude, longitude } }) => {
          if (prevLat !== null && prevLon !== null) {
            accumulatedMeters += haversineMeters(prevLat, prevLon, latitude, longitude);
          }
          prevLat = latitude;
          prevLon = longitude;
          listener({ coordinate: { latitude, longitude }, distanceMeters: accumulatedMeters });
        },
      );
    })();

    return () => {
      subscription?.remove();
    };
  },
};
