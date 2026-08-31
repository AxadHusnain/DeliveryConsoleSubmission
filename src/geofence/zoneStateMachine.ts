import { LatLng, Stop } from '../types/route';
import { distanceMeters, isPointInPolygon } from './pointInPolygon';

export type ZoneState = 'NOT_ARRIVED' | 'AT_STOP' | 'DEPARTED_EARLY';

export interface Fix {
  location: LatLng;
  timestamp: number; // epoch ms
}

export interface StopZoneRecord {
  stopId: string;
  state: ZoneState;
  arrivedAt: number | null;
  departedAt: number | null;
}

export class ZoneStateMachine {
  static readonly MOVEMENT_THRESHOLD_M = 10; 
  static readonly CONFIRM_COUNT = 3;

  private record: StopZoneRecord;
  private readonly polygon: LatLng[];
  private lastEvaluatedFix: Fix | null = null;
  private candidateInside = true;
  private candidateStreak = ZoneStateMachine.CONFIRM_COUNT;

  constructor(stop: Stop, initial?: StopZoneRecord) {
    this.polygon = stop.dropZone;
    this.record = initial ?? {
      stopId: stop.id,
      state: 'NOT_ARRIVED',
      arrivedAt: null,
      departedAt: null,
    };
  }

  getState(): StopZoneRecord {
    return this.record;
  }

 
  canArrive(latestFix: Fix | null): boolean {
    if (!latestFix) {
      return false;
    }
    return isPointInPolygon(latestFix.location, this.polygon);
  }

  arrive(fix: Fix | null): boolean {
    if (!this.canArrive(fix)) {
      return false;
    }
    this.record = {
      ...this.record,
      state: 'AT_STOP',
      arrivedAt: fix!.timestamp,
      departedAt: null,
    };
    return true;
  }

  ingest(fix: Fix): StopZoneRecord {
    if (this.record.state === 'NOT_ARRIVED') {
      return this.record; 
    }

    //  movement threshold
    if (this.lastEvaluatedFix) {
      const moved = distanceMeters(this.lastEvaluatedFix.location, fix.location);
      if (moved < ZoneStateMachine.MOVEMENT_THRESHOLD_M) {
        return this.record;
      }
    }
    this.lastEvaluatedFix = fix;

    const rawInside = isPointInPolygon(fix.location, this.polygon);

    //  confirmation streak 
    if (rawInside === this.candidateInside) {
      this.candidateStreak += 1;
    } else {
      this.candidateInside = rawInside;
      this.candidateStreak = 1;
    }

    if (this.candidateStreak >= ZoneStateMachine.CONFIRM_COUNT) {
      this.applyConfirmed(this.candidateInside, fix.timestamp);
    }

    return this.record;
  }

  private applyConfirmed(inside: boolean, timestamp: number) {
    if (inside && this.record.state === 'DEPARTED_EARLY') {
      this.record = { ...this.record, state: 'AT_STOP', departedAt: null };
    } else if (!inside && this.record.state === 'AT_STOP') {
      this.record = { ...this.record, state: 'DEPARTED_EARLY', departedAt: timestamp };
    }
 
  }
}
