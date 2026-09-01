import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function DepartureBanner({ departedAt }: { departedAt: number }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>⚠ Left the drop zone — {formatElapsed(now - departedAt)} ago</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#fbefdf', padding: 10, borderRadius: 8, marginTop: 10 },
  text: { color: '#e08a34', fontWeight: '600' },
});
