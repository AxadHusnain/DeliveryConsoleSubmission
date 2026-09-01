import AsyncStorage from '@react-native-async-storage/async-storage';

export const persist = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
};

export const STORAGE_KEYS = {
  outbox: 'outbox.deliveries.v1',
  activeStopId: 'route.activeStopId.v1',
  completedStopIds: 'route.completedStopIds.v1',
  zoneState: 'geofence.zoneRecords.v1',
} as const;
