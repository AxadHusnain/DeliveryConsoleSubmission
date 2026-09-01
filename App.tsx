import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { routeController } from './src/route/routeController';
import { RouteScreen } from './src/screens/RouteScreen';
import { ProofOfDeliveryScreen } from './src/screens/ProofOfDeliveryScreen';
import { OutboxScreen } from './src/screens/OutboxScreen';

type ScreenName = 'ROUTE' | 'POD' | 'OUTBOX';

function App(): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<ScreenName>('ROUTE');

  useEffect(() => {
    routeController.initialize().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#2e7bd6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f1f4f3" />
      {screen === 'ROUTE' && (
        <RouteScreen onOpenPod={() => setScreen('POD')} onOpenOutbox={() => setScreen('OUTBOX')} />
      )}
      {screen === 'POD' && <ProofOfDeliveryScreen onDone={() => setScreen('ROUTE')} />}
      {screen === 'OUTBOX' && <OutboxScreen onBack={() => setScreen('ROUTE')} />}
    </View>
  );
}

export default App;
