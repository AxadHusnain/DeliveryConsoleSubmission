import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stop, LatLng } from '../types/route';
import { locationStream } from '../geofence/locationStream';

interface Props {
  activeStop: Stop | null;
}

function centreOf(polygon: LatLng[]): LatLng {
  let latSum = 0;
  let lngSum = 0;
  for (const point of polygon) {
    latSum += point.latitude;
    lngSum += point.longitude;
  }
  return { latitude: latSum / polygon.length, longitude: lngSum / polygon.length };
}

const FAR_AWAY: LatLng = { latitude: 0, longitude: 0 };

// Real GPS fixes for "the same spot" are never bit-identical — they wobble a
// little. Two identical points in a row would get eaten by our own 10m
// movement filter and never advance the confirmation streak, so every
// simulated reading gets a small, guaranteed-different nudge (cycles through
// 3 offsets, so consecutive calls always differ from each other).
const JITTER_OFFSETS: LatLng[] = [
  { latitude: 0, longitude: 0 },
  { latitude: 0.0003, longitude: 0.0001 },
  { latitude: 0.0006, longitude: 0.0002 },
];

export function LocationSimulator({ activeStop }: Props) {
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');
  const jitterCounter = React.useRef(0);

  const insidePoint = activeStop ? centreOf(activeStop.dropZone) : null;

  const withJitter = (point: LatLng): LatLng => {
    const offset = JITTER_OFFSETS[jitterCounter.current % JITTER_OFFSETS.length];
    jitterCounter.current += 1;
    return { latitude: point.latitude + offset.latitude, longitude: point.longitude + offset.longitude };
  };

  const jumpInside = () => {
    if (insidePoint) {
      locationStream.injectFix(withJitter(insidePoint));
    }
  };

  const jumpAway = () => {
    locationStream.injectFix(withJitter(FAR_AWAY));
  };

  const playScript = () => {
    if (!insidePoint) {
      return;
    }
    const track = [
      withJitter(FAR_AWAY), withJitter(FAR_AWAY), withJitter(FAR_AWAY),
      withJitter(insidePoint), withJitter(insidePoint), withJitter(insidePoint),
      withJitter(FAR_AWAY), withJitter(FAR_AWAY), withJitter(FAR_AWAY),
      withJitter(insidePoint), withJitter(insidePoint), withJitter(insidePoint),
    ];
    locationStream.playScriptedTrack(track, 800);
  };

  const injectCustom = () => {
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      locationStream.injectFix({ latitude: lat, longitude: lng });
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Dev GPS Simulator</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={jumpInside}>
          <Text style={styles.buttonText}>Jump inside zone</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={jumpAway}>
          <Text style={styles.buttonText}>Jump far away</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={playScript}>
          <Text style={styles.buttonText}>Play: arrive → depart → return</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TextInput style={styles.input} placeholder="lat" value={customLat} onChangeText={setCustomLat} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="lng" value={customLng} onChangeText={setCustomLng} keyboardType="numeric" />
        <TouchableOpacity style={styles.button} onPress={injectCustom}>
          <Text style={styles.buttonText}>Inject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: 16, padding: 14, backgroundColor: '#f0f0f0', borderRadius: 10 },
  title: { fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' },
  button: { backgroundColor: '#2e7bd6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 13 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, width: 90, backgroundColor: 'white', color: '#16212c' },
});
