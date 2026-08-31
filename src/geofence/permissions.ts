import { PermissionsAndroid, Platform } from 'react-native';

export type LocationPermissionStatus = 'GRANTED' | 'DENIED' | 'UNKNOWN';

type Listener = (status: LocationPermissionStatus) => void;

class LocationPermissions {
  private status: LocationPermissionStatus = 'UNKNOWN';
  private listeners = new Set<Listener>();

  getStatus(): LocationPermissionStatus {
    return this.status;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }


  async refresh(): Promise<LocationPermissionStatus> {
    if (Platform.OS !== 'android') {
      this.setStatus('GRANTED'); 
      return this.status;
    }
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    this.setStatus(granted ? 'GRANTED' : 'DENIED');
    return this.status;
  }

  async request(): Promise<LocationPermissionStatus> {
    if (Platform.OS !== 'android') {
      this.setStatus('GRANTED');
      return this.status;
    }
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location permission',
        message: 'This app needs your location to confirm arrival at each stop and detect early departures.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    this.setStatus(result === PermissionsAndroid.RESULTS.GRANTED ? 'GRANTED' : 'DENIED');
    return this.status;
  }

  private setStatus(status: LocationPermissionStatus) {
    this.status = status;
    this.listeners.forEach(listener => listener(status));
  }
}

export const locationPermissions = new LocationPermissions();
