import React, { useEffect, useState } from 'react';
import { AppState, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouteSnapshot } from '../route/useRouteSnapshot';
import { routeController } from '../route/routeController';
import { locationPermissions, LocationPermissionStatus } from '../geofence/permissions';
import { LocationSimulator } from '../devtools/LocationSimulator';
import { DepartureBanner } from './DepartureBanner';

interface Props {
  onOpenPod: () => void;
  onOpenOutbox: () => void;
}

export function RouteScreen({ onOpenPod, onOpenOutbox }: Props) {
  const snapshot = useRouteSnapshot();
  const [permStatus, setPermStatus] = useState<LocationPermissionStatus>(locationPermissions.getStatus());
  const [arriveError, setArriveError] = useState<string | null>(null);

  useEffect(() => {
    void locationPermissions.refresh();
    const unsubscribe = locationPermissions.subscribe(setPermStatus);

    // Re-check whenever the app comes back to the foreground — covers the
    // case where the driver granted the permission from system Settings
    // without ever closing/reopening the app itself.
    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void locationPermissions.refresh();
      }
    });

    return () => {
      unsubscribe();
      appStateSub.remove();
    };
  }, []);

  if (!snapshot.route) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ padding: 16 }}>Loading route…</Text>
      </SafeAreaView>
    );
  }

  const activeStop = routeController.getActiveStop();
  const zone = snapshot.zoneRecord;
  const insideZone = routeController.isLastFixInsideActiveZone();

  const handleArrive = () => {
    const succeeded = routeController.arriveActiveStop();
    setArriveError(succeeded ? null : "You're outside the drop zone — move inside to arrive.");
  };

  const sortedStops = snapshot.route.stops.slice();
  sortedStops.sort((a, b) => a.sequence - b.sequence);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>Route {snapshot.route.routeId}</Text>

        <View style={styles.statusBar}>
          <Text style={snapshot.isOnline ? styles.online : styles.offline}>
            {snapshot.isOnline ? '● Online' : '● Offline'}
          </Text>
          <TouchableOpacity onPress={onOpenOutbox}>
            <Text style={styles.unsyncedBadge}>{snapshot.unsyncedCount} unsynced — Outbox</Text>
          </TouchableOpacity>
        </View>

        {permStatus === 'DENIED' && (
          <View style={styles.permissionBanner}>
            <Text>Location permission is needed to confirm arrival and detect early departures.</Text>
            <TouchableOpacity onPress={() => void locationPermissions.request()}>
              <Text style={styles.permissionButton}>Grant permission</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeStop ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>ACTIVE STOP</Text>
            <Text style={styles.cardName}>{activeStop.customerName}</Text>
            <Text>{activeStop.address}</Text>
            <Text style={insideZone ? styles.inside : styles.outside}>
              {insideZone ? 'Inside drop zone' : 'Outside drop zone'}
            </Text>

            {zone?.state === 'DEPARTED_EARLY' && zone.departedAt != null && (
              <DepartureBanner departedAt={zone.departedAt} />
            )}

            {(!zone || zone.state === 'NOT_ARRIVED') && (
              <>
                <TouchableOpacity
                  style={[styles.primaryButton, !insideZone && styles.buttonDisabled]}
                  onPress={handleArrive}
                >
                  <Text style={styles.buttonText}>Arrive</Text>
                </TouchableOpacity>
                {arriveError && <Text style={styles.errorText}>{arriveError}</Text>}
              </>
            )}

            {zone && zone.state !== 'NOT_ARRIVED' && (
              <TouchableOpacity style={styles.primaryButton} onPress={onOpenPod}>
                <Text style={styles.buttonText}>Complete Delivery</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardName}>All stops completed</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Stops</Text>
        {sortedStops.map(stop => {
          const status = routeController.getStopStatus(stop);
          return (
            <View key={stop.id} style={styles.stopRow}>
              <Text style={styles.stopSequence}>{stop.sequence}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.stopName}>{stop.customerName}</Text>
                <Text style={styles.stopAddress}>{stop.address}</Text>
              </View>
              <Text style={styles.stopStatus}>{status}</Text>
            </View>
          );
        })}

        <LocationSimulator activeStop={activeStop} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f4f3' },
  title: { fontSize: 20, fontWeight: '700', padding: 16 },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  online: { color: '#2f9160', fontWeight: '600' },
  offline: { color: '#c4453d', fontWeight: '600' },
  unsyncedBadge: { backgroundColor: '#fbefdf', padding: 6, borderRadius: 6, fontSize: 12 },
  permissionBanner: { backgroundColor: '#fae8e7', margin: 16, padding: 12, borderRadius: 8 },
  permissionButton: { color: '#2e7bd6', fontWeight: '600', marginTop: 8 },
  card: { backgroundColor: 'white', margin: 16, padding: 16, borderRadius: 10 },
  cardLabel: { fontSize: 11, color: '#7a8894', fontWeight: '600' },
  cardName: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  inside: { color: '#2f9160', fontWeight: '600', marginTop: 8 },
  outside: { color: '#c4453d', fontWeight: '600', marginTop: 8 },
  primaryButton: { backgroundColor: '#2e7bd6', padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#b0bec5' },
  buttonText: { color: 'white', fontWeight: '600' },
  errorText: { color: '#c4453d', marginTop: 6 },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginLeft: 16, marginBottom: 8, color: '#41505e' },
  stopRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 8 },
  stopSequence: { width: 24, fontWeight: '700', color: '#7a8894' },
  stopName: { fontWeight: '600' },
  stopAddress: { fontSize: 12, color: '#7a8894' },
  stopStatus: { fontSize: 11, color: '#41505e' },
});
