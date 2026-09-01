import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { mockApi, mockApiConfig } from '../api/mockApi';
import { Route, Stop } from '../types/route';
import { PodTemplate, FormAnswers } from '../types/template';
import { submitDeliveryLocally } from '../outbox/submitDelivery';
import { ZoneStateMachine, StopZoneRecord, Fix } from '../geofence/zoneStateMachine';
import { locationStream } from '../geofence/locationStream';
import { outboxStore } from '../outbox/outboxStore';
import { syncEngine } from '../outbox/syncEngine';
import { persist, STORAGE_KEYS } from '../storage/persist';

export type StopDisplayStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED';

export interface RouteSnapshot {
  route: Route | null;
  activeStopId: string | null;
  completedStopIds: string[];
  zoneRecord: StopZoneRecord | null;
  lastFix: Fix | null;
  isOnline: boolean;
  unsyncedCount: number;
}

type Listener = (snapshot: RouteSnapshot) => void;

class RouteController {
  private route: Route | null = null;
  private templates = new Map<string, PodTemplate>();
  private activeStopId: string | null = null;
  private completedStopIds = new Set<string>();
  private zoneMachine: ZoneStateMachine | null = null;
  private isOnline = true;
  private listeners = new Set<Listener>();

  async initialize(): Promise<void> {
    await outboxStore.hydrate();

    this.route = await mockApi.getRoute();
    for (const stop of this.route.stops) {
      const template = await mockApi.getPodTemplate(stop.templateId);
      this.templates.set(stop.templateId, template);
    }

    const savedCompleted = await persist.get<string[]>(STORAGE_KEYS.completedStopIds);
    this.completedStopIds = new Set(savedCompleted ?? []);

    const savedActiveId = await persist.get<string>(STORAGE_KEYS.activeStopId);
    const firstIncomplete = this.findFirstIncompleteStop();
    this.activeStopId = savedActiveId ?? firstIncomplete?.id ?? null;

    await this.loadZoneMachineForActiveStop();
    locationStream.subscribe(fix => this.onFix(fix));

    NetInfo.addEventListener(state => this.onNetworkChange(state));
    AppState.addEventListener('change', state => this.onAppStateChange(state));
    setInterval(() => {
      void syncEngine.runSyncPass();
    }, 20000);

    void syncEngine.runSyncPass(); 
    this.notify();
  }

  private onNetworkChange(state: { isConnected: boolean | null; isInternetReachable: boolean | null }) {
    const wasOffline = !this.isOnline;
    this.isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
    mockApiConfig.online = this.isOnline;
    this.notify();

    if (wasOffline && this.isOnline) {
      void syncEngine.runSyncPass();
    }
  }

  private onAppStateChange(state: AppStateStatus) {
    if (state === 'active') {
      void syncEngine.runSyncPass();
    }
  }

  private onFix(fix: Fix) {
    if (!this.zoneMachine) {
      return;
    }
    this.zoneMachine.ingest(fix);
    void this.persistZoneRecord();
    this.notify();
  }

  private async persistZoneRecord() {
    if (!this.zoneMachine) {
      return;
    }
    const savedRecords = (await persist.get<Record<string, StopZoneRecord>>(STORAGE_KEYS.zoneState)) ?? {};
    savedRecords[this.zoneMachine.getState().stopId] = this.zoneMachine.getState();
    await persist.set(STORAGE_KEYS.zoneState, savedRecords);
  }

  private async loadZoneMachineForActiveStop() {
    const stop = this.getActiveStop();
    if (!stop) {
      this.zoneMachine = null;
      return;
    }
    const savedRecords = (await persist.get<Record<string, StopZoneRecord>>(STORAGE_KEYS.zoneState)) ?? {};
    this.zoneMachine = new ZoneStateMachine(stop, savedRecords[stop.id]);
  }

  
  private findFirstIncompleteStop(): Stop | null {
    if (!this.route) {
      return null;
    }

    const sortedStops = this.route.stops.slice();
    sortedStops.sort((a, b) => a.sequence - b.sequence);

    for (const stop of sortedStops) {
      if (!this.completedStopIds.has(stop.id)) {
        return stop;
      }
    }
    return null;
  }

  getActiveStop(): Stop | null {
    if (!this.route || !this.activeStopId) {
      return null;
    }
    return this.route.stops.find(stop => stop.id === this.activeStopId) ?? null;
  }

  getTemplateForStop(stop: Stop): PodTemplate | undefined {
    return this.templates.get(stop.templateId);
  }

  getStopStatus(stop: Stop): StopDisplayStatus {
    if (this.completedStopIds.has(stop.id)) {
      return 'COMPLETED';
    }
    if (stop.id === this.activeStopId) {
      return 'ACTIVE';
    }
    return 'PENDING';
  }

  
  isLastFixInsideActiveZone(): boolean {
    if (!this.zoneMachine) {
      return false;
    }
    return this.zoneMachine.canArrive(locationStream.getLastFix());
  }

  arriveActiveStop(): boolean {
    if (!this.zoneMachine) {
      return false;
    }
    const succeeded = this.zoneMachine.arrive(locationStream.getLastFix());
    if (succeeded) {
      void this.persistZoneRecord();
    }
    this.notify();
    return succeeded;
  }

  async submitProofOfDelivery(answers: FormAnswers): Promise<void> {
    const stop = this.getActiveStop();
    if (!this.route || !stop) {
      return;
    }

    const fix = locationStream.getLastFix();
    submitDeliveryLocally(this.route.routeId, stop, answers, fix?.location ?? { latitude: 0, longitude: 0 });

    this.completedStopIds.add(stop.id);
    await persist.set(STORAGE_KEYS.completedStopIds, Array.from(this.completedStopIds));

    const nextStop = this.findFirstIncompleteStop();
    this.activeStopId = nextStop?.id ?? null;
    await persist.set(STORAGE_KEYS.activeStopId, this.activeStopId);

    await this.loadZoneMachineForActiveStop();
    this.notify();
  }

  getSnapshot(): RouteSnapshot {
    return {
      route: this.route,
      activeStopId: this.activeStopId,
      completedStopIds: Array.from(this.completedStopIds),
      zoneRecord: this.zoneMachine?.getState() ?? null,
      lastFix: locationStream.getLastFix(),
      isOnline: this.isOnline,
      unsyncedCount: outboxStore.unsyncedCount(),
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach(listener => listener(snapshot));
  }
}

export const routeController = new RouteController();
