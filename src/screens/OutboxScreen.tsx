import React, { useEffect, useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { outboxStore } from '../outbox/outboxStore';
import { syncEngine } from '../outbox/syncEngine';
import { OutboxDelivery } from '../types/delivery';

interface Props {
  onBack: () => void;
}

const STATE_LABEL: Record<OutboxDelivery['state'], string> = {
  QUEUED: 'Queued',
  SYNCING: 'Syncing…',
  RETRYING: 'Retrying',
  FAILED: 'Failed',
  SYNCED: 'Synced',
};

export function OutboxScreen({ onBack }: Props) {
  const [deliveries, setDeliveries] = useState<OutboxDelivery[]>(outboxStore.getAll());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => outboxStore.subscribe(setDeliveries), []);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncEngine.runSyncPass();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.link}>Route</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Outbox</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.link}>Sync now</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {deliveries.length === 0 && <Text>No deliveries yet.</Text>}

        {deliveries.map(delivery => (
          <View key={delivery.clientDeliveryId} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.stopId}>{delivery.payload.stopId}</Text>
              <Text style={styles.pill}>{STATE_LABEL[delivery.state]}</Text>
            </View>
            <Text style={styles.meta}>
              Created {new Date(delivery.createdAt).toLocaleTimeString()} · retry {delivery.retryCount}/5
            </Text>
            {delivery.lastError && <Text style={styles.errorText}>{delivery.lastError}</Text>}
            {delivery.state === 'FAILED' && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => syncEngine.triggerManualRetry(delivery.clientDeliveryId)}
              >
                <Text style={styles.retryButtonText}>Retry now</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f4f3' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  link: { color: '#2e7bd6', fontWeight: '600', fontSize: 17 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backArrow: { color: '#2e7bd6', fontWeight: '700', fontSize: 28, lineHeight: 28, marginTop: 2 },
  card: { backgroundColor: 'white', borderRadius: 10, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  stopId: { fontWeight: '600' },
  pill: { backgroundColor: '#e7f0fb', color: '#2e7bd6', fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  meta: { fontSize: 12, color: '#7a8894', marginTop: 4 },
  errorText: { color: '#c4453d', fontSize: 12, marginTop: 4 },
  retryButton: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#c4453d', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  retryButtonText: { color: 'white', fontSize: 12, fontWeight: '600' },
});
