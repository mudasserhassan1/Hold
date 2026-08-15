import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  onboardingComplete: 'hold.onboardingComplete',
  firstName: 'hold.firstName',
};

export type LocalState = {
  onboardingComplete: boolean;
  firstName: string;
};

export async function loadLocal(): Promise<LocalState> {
  const values = await AsyncStorage.getMany([
    KEYS.onboardingComplete,
    KEYS.firstName,
  ]);
  return {
    onboardingComplete: values[KEYS.onboardingComplete] === '1',
    firstName: values[KEYS.firstName] ?? '',
  };
}

export async function saveOnboarding(firstName: string): Promise<void> {
  await AsyncStorage.setMany({
    [KEYS.onboardingComplete]: '1',
    [KEYS.firstName]: firstName.trim(),
  });
}
