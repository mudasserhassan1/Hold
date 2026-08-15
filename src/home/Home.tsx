import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../brand/colors';
import * as Hold from '../native/HoldAppBlocker';
import type { HoldStatus, HoldTarget } from '../native/HoldAppBlocker';
import { Paywall } from '../paywall/Paywall';
import type { PlanId } from '../paywall/plans';
import { AppRow } from '../ui/AppRow';

type Props = {
  firstName?: string;
};

export function Home({ firstName = '' }: Props) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<HoldStatus | null>(null);
  const [targets, setTargets] = useState<HoldTarget[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [plan, setPlan] = useState<PlanId>('yearly');
  const dismissedPaywall = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const refresh = useCallback(async () => {
    const next = await Hold.getStatus();
    setStatus(next);
    const apps = await Hold.getInstalledTargets();
    setTargets(apps);
    setSelected(prev => {
      if (prev.length) {
        return prev;
      }
      if (next.packages.length) {
        return next.packages;
      }
      return apps[0] ? [apps[0].packageName] : [];
    });
    if (next.isPro) {
      setShowPaywall(false);
    } else if (next.todayContinued >= 2 && !dismissedPaywall.current) {
      setShowPaywall(true);
    }
  }, []);

  useEffect(() => {
    if (showPaywall) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [showPaywall]);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh();
      }
    });
    const unsub = Hold.subscribe(event => {
      setStatus(current => {
        if (!current) {
          return current;
        }
        const next = {
          ...current,
          todayOpens: event.todayOpens,
          todayContinued: event.todayContinued,
          todayClosed: event.todayClosed,
        };
        if (
          !current.isPro &&
          event.action === 'continued' &&
          event.todayContinued >= 2 &&
          !dismissedPaywall.current
        ) {
          setShowPaywall(true);
        }
        return next;
      });
    });
    return () => {
      sub.remove();
      unsub();
    };
  }, [refresh]);

  const ready = Boolean(
    status?.usageAccess && status?.overlay && selected.length,
  );
  const isPro = status?.isPro ?? false;
  const needsPerms = Boolean(
    status && (!status.usageAccess || !status.overlay),
  );
  const guarded = targets.filter(app => selected.includes(app.packageName));

  async function applySelection(next: string[]) {
    setSelected(next);
    if (!status?.monitoring) {
      return;
    }
    try {
      await Hold.startMonitoring(isPro ? next : next.slice(0, 1));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update Hold');
    }
  }

  function pickApp(packageName: string) {
    setError(null);
    if (isPro) {
      const next = selected.includes(packageName)
        ? selected.filter(pkg => pkg !== packageName)
        : [...selected, packageName];
      if (!next.length) {
        setError('Keep at least one app on.');
        return;
      }
      applySelection(next);
      return;
    }
    if (selected.length && !selected.includes(packageName)) {
      setShowPaywall(true);
      return;
    }
    applySelection([packageName]);
  }

  async function toggle() {
    if (!status) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (status.monitoring) {
        await Hold.stopMonitoring();
      } else if (!selected.length) {
        setError('Pick an app to pause.');
      } else {
        if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
        }
        await Hold.startMonitoring(isPro ? selected : selected.slice(0, 1));
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Hold');
    } finally {
      setBusy(false);
    }
  }

  async function unlock() {
    setBusy(true);
    setError(null);
    try {
      await Hold.setPro(plan);
      setShowPaywall(false);
      if (status?.monitoring && selected.length) {
        await Hold.startMonitoring(selected);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Pro');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <Text style={styles.kicker}>HOLD</Text>
      <Text style={styles.title}>
        {status?.monitoring
          ? guarded.length
            ? `Guarding ${guarded.map(app => app.label).join(', ')}.`
            : 'Hold is on.'
          : firstName
          ? `${firstName}, pause before you scroll.`
          : 'Pause before you scroll.'}
      </Text>

      <Pressable
        onPress={toggle}
        disabled={busy || (!status?.monitoring && !ready)}
        style={[
          styles.cta,
          (busy || (!status?.monitoring && !ready)) && styles.ctaDisabled,
          status?.monitoring && styles.ctaStop,
        ]}
      >
        <Text style={styles.ctaText}>
          {status?.monitoring ? 'Turn Hold off' : 'Turn Hold on'}
        </Text>
      </Pressable>

      {needsPerms ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Two permissions first</Text>
          <Text style={styles.bannerBody}>
            Hold needs these so it can sit in front of the app you just opened.
          </Text>
          <PermissionRow
            title="Usage access"
            ok={status?.usageAccess ?? false}
            detail="See which app came to the front"
            onPress={() => Hold.openUsageAccessSettings()}
          />
          <PermissionRow
            title="Display over other apps"
            ok={status?.overlay ?? false}
            detail="Show the pause on top"
            onPress={() => Hold.openOverlaySettings()}
          />
        </View>
      ) : null}

      <Text style={styles.section}>Today</Text>
      <View style={styles.stats}>
        <Stat label="Paused" value={status?.todayOpens ?? 0} />
        <Stat label="Went Home" value={status?.todayClosed ?? 0} />
        <Stat label="Continued" value={status?.todayContinued ?? 0} />
      </View>

      <Text style={styles.section}>
        {isPro ? 'Apps to pause' : 'App to pause'}
      </Text>
      {targets.length === 0 ? (
        <Text style={styles.hint}>
          Instagram, TikTok, YouTube, and the usual suspects show up here when
          they are on this phone.
        </Text>
      ) : (
        targets.map(app => (
          <AppRow
            key={app.packageName}
            label={app.label}
            hint={app.hint}
            icon={app.icon}
            selected={selected.includes(app.packageName)}
            onPress={() => pickApp(app.packageName)}
          />
        ))
      )}

      {isPro ? (
        <Text style={styles.proOn}>Pro is on.</Text>
      ) : (
        <Pressable onPress={() => setShowPaywall(true)} style={styles.linkBtn}>
          <Text style={styles.link}>Unlock Pro — every app, $34.99 / year</Text>
        </Pressable>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {showPaywall && !isPro ? (
        <Paywall
          selected={plan}
          onSelect={setPlan}
          onUnlock={unlock}
          onClose={() => {
            dismissedPaywall.current = true;
            setShowPaywall(false);
          }}
          busy={busy}
        />
      ) : null}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PermissionRow({
  title,
  ok,
  detail,
  onPress,
}: {
  title: string;
  ok: boolean;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.perm}>
      <View style={styles.permText}>
        <Text style={styles.permTitle}>{title}</Text>
        <Text style={styles.permDetail}>{detail}</Text>
      </View>
      <Text style={[styles.permState, ok ? styles.permOn : styles.permOff]}>
        {ok ? 'On' : 'Grant'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: 24,
  },
  kicker: {
    letterSpacing: 1.4,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.ink,
  },
  cta: {
    marginTop: 22,
    backgroundColor: colors.ink,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaStop: {
    backgroundColor: '#44403C',
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    color: colors.ctaText,
    fontSize: 16,
    fontWeight: '600',
  },
  banner: {
    marginTop: 24,
    backgroundColor: colors.wash,
    padding: 16,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  bannerBody: {
    marginTop: 6,
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.body,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.wash,
    padding: 14,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
  },
  statLabel: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
  },
  section: {
    marginTop: 32,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: colors.muted,
  },
  perm: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  permText: {
    flex: 1,
    paddingRight: 12,
  },
  permTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  permDetail: {
    marginTop: 4,
    color: '#57534E',
    fontSize: 13,
  },
  permState: {
    fontSize: 14,
    fontWeight: '600',
  },
  permOn: {
    color: colors.name,
  },
  permOff: {
    color: colors.warn,
  },
  hint: {
    color: '#57534E',
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    marginTop: 16,
    color: colors.warn,
    fontSize: 14,
  },
  linkBtn: {
    marginTop: 18,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  proOn: {
    marginTop: 18,
    fontSize: 14,
    fontWeight: '600',
    color: colors.name,
  },
});
