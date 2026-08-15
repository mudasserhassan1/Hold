import { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Splash } from './src/brand/Splash';
import { colors } from './src/brand/colors';
import { Home } from './src/home/Home';
import { Onboarding } from './src/onboarding/Onboarding';
import { loadLocal } from './src/storage/local';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const [booted, setBooted] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    loadLocal().then(local => {
      setOnboarded(local.onboardingComplete);
      setFirstName(local.firstName);
      setBooted(true);
    });
  }, []);

  if (showSplash) {
    return <Splash onDone={() => setShowSplash(false)} />;
  }
  if (!booted) {
    return <View style={styles.hold} />;
  }
  if (!onboarded) {
    return (
      <Onboarding
        onDone={name => {
          setFirstName(name);
          setOnboarded(true);
        }}
      />
    );
  }
  return <Home firstName={firstName} />;
}

const styles = StyleSheet.create({
  hold: {
    flex: 1,
    backgroundColor: colors.paper,
  },
});

export default App;
