import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PauseBars } from '../brand/PauseBars';
import { colors } from '../brand/colors';
import * as Hold from '../native/HoldAppBlocker';
import type { HoldStatus, HoldTarget } from '../native/HoldAppBlocker';
import { saveOnboarding } from '../storage/local';
import { AppRow } from '../ui/AppRow';
import { useTypewriter } from './useTypewriter';

type Step = 'intro' | 'name' | 'hello' | 'how' | 'pick' | 'perms';

type Line = {
  id: string;
  text: string;
  name?: string;
};

const HOW = [
  'The first time, you wait a few seconds.',
  'The second, I ask why you opened it.',
  'The third, you type open. Go Home always wins.',
];

type Props = {
  onDone: (firstName: string) => void;
};

export function Onboarding({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('intro');
  const [lines, setLines] = useState<Line[]>([
    { id: 'intro', text: 'I’ll pause you before you scroll.' },
  ]);
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [howIndex, setHowIndex] = useState(0);
  const [targets, setTargets] = useState<HoldTarget[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<HoldStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const current = lines[lines.length - 1];
  const typed = useTypewriter(current?.text ?? '');

  const refreshStatus = useCallback(async () => {
    const next = await Hold.getStatus();
    setStatus(next);
    const apps = await Hold.getInstalledTargets();
    setTargets(apps);
    setSelected(
      prev => prev ?? next.packages[0] ?? apps[0]?.packageName ?? null,
    );
  }, []);

  useEffect(() => {
    refreshStatus();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refreshStatus();
      }
    });
    return () => sub.remove();
  }, [refreshStatus]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [howIndex, lines.length, step, typed.shown]);

  useEffect(() => {
    if (step !== 'how' || !typed.done) {
      return;
    }
    if (howIndex >= HOW.length - 1) {
      return;
    }
    const wait = setTimeout(() => {
      const next = howIndex + 1;
      setHowIndex(next);
      setLines(currentLines => {
        const id = `how-${next}`;
        if (currentLines.some(line => line.id === id)) {
          return currentLines;
        }
        return [...currentLines, { id, text: HOW[next] }];
      });
    }, 340);
    return () => clearTimeout(wait);
  }, [howIndex, step, typed.done]);

  function push(line: Line, next: Step) {
    setLines(currentLines => [...currentLines, line]);
    setStep(next);
    setError(null);
  }

  function goName() {
    push({ id: 'ask-name', text: 'What should I call you?' }, 'name');
  }

  function skipName() {
    push({ id: 'how-0', text: HOW[0] }, 'how');
    setHowIndex(0);
  }

  function acceptName() {
    const trimmed = name.trim();
    if (!trimmed) {
      skipName();
      return;
    }
    setSavedName(trimmed);
    push({ id: 'hello', text: `Hi, ${trimmed}.`, name: trimmed }, 'hello');
  }

  function goHow() {
    push({ id: 'how-0', text: HOW[0] }, 'how');
    setHowIndex(0);
  }

  function goPick() {
    push({ id: 'pick', text: 'Which app should I pause first?' }, 'pick');
  }

  function goPerms() {
    push({ id: 'perms', text: 'Two permissions, then you’re set.' }, 'perms');
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      if (
        Platform.OS === 'android' &&
        selected &&
        status?.usageAccess &&
        status?.overlay
      ) {
        if (Number(Platform.Version) >= 33) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
        }
        await Hold.startMonitoring([selected]);
      }
      await saveOnboarding(savedName);
      onDone(savedName);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Hold');
    } finally {
      setBusy(false);
    }
  }

  const showControls = typed.done;
  const howReady = step === 'how' && typed.done && howIndex === HOW.length - 1;
  const canStart = Boolean(selected && status?.usageAccess && status?.overlay);
  const android = Platform.OS === 'android';

  const nameReady = name.trim().length > 0;
  const showFooter =
    howReady ||
    step === 'name' ||
    (showControls &&
      (step === 'intro' ||
        step === 'hello' ||
        step === 'pick' ||
        step === 'perms'));

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior="padding"
      keyboardVerticalOffset={insets.top}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 28, paddingBottom: 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.mark}>
          <PauseBars size={56} />
        </View>
        <View style={styles.transcript}>
          {lines.map((line, index) => {
            const last = index === lines.length - 1;
            const fade = Math.max(0.22, 1 - (lines.length - 1 - index) * 0.28);
            const display = last ? typed.shown : line.text;
            return (
              <Text
                key={line.id}
                style={[
                  styles.line,
                  {
                    opacity: last ? 1 : fade,
                    color: last ? colors.ink : colors.muted,
                  },
                ]}
              >
                {line.name && (!last || typed.done) ? (
                  <>
                    Hi, <Text style={styles.name}>{line.name}</Text>.
                  </>
                ) : (
                  display
                )}
              </Text>
            );
          })}
        </View>

        {step === 'name' ? (
          <TextInput
            autoCorrect={false}
            autoComplete="off"
            importantForAutofill="no"
            value={name}
            onChangeText={setName}
            placeholder="Your first name"
            placeholderTextColor={colors.muted}
            style={styles.input}
            returnKeyType={nameReady ? 'done' : 'next'}
            onSubmitEditing={nameReady ? acceptName : undefined}
            underlineColorAndroid="transparent"
          />
        ) : null}

        {showControls && step === 'pick' ? (
          <View style={styles.block}>
            {targets.length === 0 ? (
              <Text style={styles.hint}>
                {android
                  ? 'Instagram, TikTok, and YouTube show up here when they are on this phone.'
                  : 'The pause runs on Android. Continue to the home screen.'}
              </Text>
            ) : (
              targets.map(app => (
                <AppRow
                  key={app.packageName}
                  label={app.label}
                  hint={app.hint}
                  icon={app.icon}
                  selected={selected === app.packageName}
                  onPress={() => setSelected(app.packageName)}
                />
              ))
            )}
          </View>
        ) : null}

        {showControls && step === 'perms' ? (
          <View style={styles.block}>
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
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {android && !canStart ? (
              <Text style={styles.hint}>
                Grant both permissions, then Hold can sit in front of the app
                you picked.
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {showFooter ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {step === 'intro' ? (
            <Pressable onPress={goName} style={styles.cta}>
              <Text style={styles.ctaText}>Continue</Text>
            </Pressable>
          ) : null}

          {step === 'name' ? (
            nameReady ? (
              <Pressable onPress={acceptName} style={styles.cta}>
                <Text style={styles.ctaText}>Continue</Text>
              </Pressable>
            ) : (
              <Pressable onPress={skipName} style={styles.skipBtn}>
                <Text style={styles.skip}>Skip</Text>
              </Pressable>
            )
          ) : null}

          {step === 'hello' ? (
            <Pressable onPress={goHow} style={styles.cta}>
              <Text style={styles.ctaText}>Continue</Text>
            </Pressable>
          ) : null}

          {howReady ? (
            <Pressable onPress={goPick} style={styles.cta}>
              <Text style={styles.ctaText}>Continue</Text>
            </Pressable>
          ) : null}

          {step === 'pick' ? (
            <Pressable
              onPress={goPerms}
              disabled={android && targets.length > 0 && !selected}
              style={[
                styles.cta,
                android &&
                  targets.length > 0 &&
                  !selected &&
                  styles.ctaDisabled,
              ]}
            >
              <Text style={styles.ctaText}>Continue</Text>
            </Pressable>
          ) : null}

          {step === 'perms' ? (
            <>
              <Pressable
                onPress={finish}
                disabled={busy || (android && !canStart)}
                style={[
                  styles.cta,
                  (busy || (android && !canStart)) && styles.ctaDisabled,
                ]}
              >
                <Text style={styles.ctaText}>
                  {android ? 'Turn Hold on' : 'Continue'}
                </Text>
              </Pressable>
              {android && !canStart ? (
                <Pressable
                  onPress={async () => {
                    await saveOnboarding(savedName);
                    onDone(savedName);
                  }}
                  style={styles.skipBtn}
                >
                  <Text style={styles.skip}>
                    I’ll do this on the home screen
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
    </KeyboardAvoidingView>
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
    flexGrow: 1,
  },
  mark: {
    alignItems: 'center',
  },
  transcript: {
    marginTop: 36,
    gap: 14,
  },
  line: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '600',
  },
  name: {
    color: colors.name,
  },
  block: {
    marginTop: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    backgroundColor: colors.paper,
  },
  cta: {
    marginTop: 12,
    backgroundColor: colors.ink,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    color: colors.ctaText,
    fontSize: 16,
    fontWeight: '600',
  },
  skipBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  skip: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.muted,
  },
  input: {
    marginTop: 28,
    backgroundColor: colors.wash,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
    fontSize: 20,
    color: colors.ink,
  },
  hint: {
    marginTop: 16,
    color: colors.body,
    fontSize: 14,
    lineHeight: 20,
  },
  perm: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
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
  error: {
    marginTop: 16,
    color: colors.warn,
    fontSize: 14,
  },
});
