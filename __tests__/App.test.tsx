import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../src/native/HoldAppBlocker', () => ({
  isAndroidHold: false,
  getStatus: async () => ({
    usageAccess: false,
    overlay: false,
    monitoring: false,
    todayOpens: 0,
    todayContinued: 0,
    todayClosed: 0,
    packages: [],
    isPro: false,
    plan: '',
  }),
  getInstalledTargets: async () => [],
  openUsageAccessSettings: async () => {},
  openOverlaySettings: async () => {},
  startMonitoring: async () => {},
  stopMonitoring: async () => {},
  setPro: async () => {},
  clearPro: async () => {},
  subscribe: () => () => {},
}));

jest.mock('react-native-bootsplash', () => ({
  hide: jest.fn().mockResolvedValue(undefined),
  isVisible: jest.fn(() => false),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const memory = new Map();
  return {
    __esModule: true,
    default: {
      getItem: async key => memory.get(key) ?? null,
      setItem: async (key, value) => {
        memory.set(key, value);
      },
      getMany: async keys => {
        const next = {};
        keys.forEach(key => {
          next[key] = memory.get(key) ?? null;
        });
        return next;
      },
      setMany: async entries => {
        Object.entries(entries).forEach(([key, value]) => {
          memory.set(key, value);
        });
      },
    },
  };
});

jest.mock('../src/brand/Splash', () => {
  const ReactLib = require('react');
  return {
    Splash: ({ onDone }) => {
      ReactLib.useEffect(() => {
        onDone();
      }, [onDone]);
      return null;
    },
  };
});

import App from '../App';

test('renders Hold home', async () => {
  await AsyncStorage.setItem('hold.onboardingComplete', '1');
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(
      <SafeAreaProvider>
        <App />
      </SafeAreaProvider>,
    );
  });
});
