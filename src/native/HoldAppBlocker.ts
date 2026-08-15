import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

export type HoldTarget = {
  packageName: string;
  label: string;
  hint: string;
  icon?: string;
};

export type HoldStatus = {
  usageAccess: boolean;
  overlay: boolean;
  monitoring: boolean;
  todayOpens: number;
  todayContinued: number;
  todayClosed: number;
  packages: string[];
  isPro: boolean;
  plan: string;
};

export type HoldEvent = {
  action: 'shown' | 'continued' | 'closed' | string;
  packageName?: string;
  label?: string;
  todayOpens: number;
  todayContinued: number;
  todayClosed: number;
};

const native = NativeModules.HoldAppBlocker;

export const isAndroidHold = Platform.OS === 'android' && native != null;

export async function getStatus(): Promise<HoldStatus> {
  if (!isAndroidHold) {
    return {
      usageAccess: false,
      overlay: false,
      monitoring: false,
      todayOpens: 0,
      todayContinued: 0,
      todayClosed: 0,
      packages: [],
      isPro: false,
      plan: '',
    };
  }
  return native.getStatus();
}

export async function getInstalledTargets(): Promise<HoldTarget[]> {
  if (!isAndroidHold) {
    return [];
  }
  return native.getInstalledTargets();
}

export async function openUsageAccessSettings(): Promise<void> {
  if (isAndroidHold) {
    await native.openUsageAccessSettings();
  }
}

export async function openOverlaySettings(): Promise<void> {
  if (isAndroidHold) {
    await native.openOverlaySettings();
  }
}

export async function startMonitoring(packages: string[]): Promise<void> {
  if (!isAndroidHold) {
    throw new Error('Hold’s pause is on Android right now.');
  }
  await native.startMonitoring(packages);
}

export async function stopMonitoring(): Promise<void> {
  if (isAndroidHold) {
    await native.stopMonitoring();
  }
}

export async function setPro(plan: string): Promise<void> {
  if (!isAndroidHold) {
    return;
  }
  await native.setPro(plan);
}

export async function clearPro(): Promise<void> {
  if (isAndroidHold) {
    await native.clearPro();
  }
}

export function subscribe(listener: (event: HoldEvent) => void) {
  if (!isAndroidHold) {
    return () => {};
  }
  const emitter = new NativeEventEmitter(native);
  const sub = emitter.addListener('HoldEvent', listener);
  return () => sub.remove();
}
