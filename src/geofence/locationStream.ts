import { LatLng } from '../types/route';
import { Fix } from './zoneStateMachine';

type FixListener = (fix: Fix) => void;

class LocationStream {
  private listeners = new Set<FixListener>();
  private lastFix: Fix | null = null;

  getLastFix(): Fix | null {
    return this.lastFix;
  }

  subscribe(listener: FixListener): () => void {
    this.listeners.add(listener);
    if (this.lastFix) {
      listener(this.lastFix); 
    }
    return () => this.listeners.delete(listener);
  }

 
  injectFix(location: LatLng, timestamp: number = Date.now()): void {
    const fix: Fix = { location, timestamp };
    this.lastFix = fix;
    this.listeners.forEach(listener => listener(fix));
  }

 
  playScriptedTrack(points: LatLng[], intervalMs = 1500): () => void {
    let i = 0;
    const handle = setInterval(() => {
      if (i >= points.length) {
        clearInterval(handle);
        return;
      }
      this.injectFix(points[i]);
      i += 1;
    }, intervalMs);

    return () => clearInterval(handle); 
  }
}

export const locationStream = new LocationStream();
