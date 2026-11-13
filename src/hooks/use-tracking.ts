import { useEffect, useState, useSyncExternalStore } from 'react';

import { getTrackingSnapshot, subscribeTracking } from '@/modules/location/state';
import type { TrackingSnapshot } from '@/modules/location';
import { deriveTrackingStatus } from '@/modules/location/watchdog';

/**
 * Live snapshot plus a 5 s tick so ages and freshness thresholds advance even
 * when no new sample arrives. Status is recomputed here rather than in the
 * store, which keeps the stored snapshot identity stable.
 */
export function useTracking(): TrackingSnapshot {
  const snapshot = useSyncExternalStore(
    subscribeTracking,
    getTrackingSnapshot,
    getTrackingSnapshot,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const status = deriveTrackingStatus({
    lastSampleAt: snapshot.lastSampleAt,
    now,
    paused: snapshot.status === 'paused',
    idle: snapshot.status === 'idle',
  });

  return { ...snapshot, status };
}
