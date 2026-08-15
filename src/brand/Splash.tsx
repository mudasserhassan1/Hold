import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { PauseBars } from './PauseBars';
import { colors } from './colors';

const WORD = 'HOLD';

type Props = {
  onDone: () => void;
};

export function Splash({ onDone }: Props) {
  const scale = useRef(new Animated.Value(0.72)).current;
  const barOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const [letters, setLetters] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let cancelled = false;
    let tick: ReturnType<typeof setInterval> | undefined;
    let hold: ReturnType<typeof setTimeout> | undefined;
    BootSplash.hide({ fade: false }).catch(() => {});

    Animated.parallel([
      Animated.timing(barOpacity, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 68,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (cancelled) {
        return;
      }
      let i = 0;
      tick = setInterval(() => {
        i += 1;
        setLetters(i);
        if (i >= WORD.length) {
          if (tick) {
            clearInterval(tick);
          }
          hold = setTimeout(() => {
            Animated.timing(screenOpacity, {
              toValue: 0,
              duration: 280,
              useNativeDriver: true,
            }).start(() => {
              if (!cancelled) {
                onDoneRef.current();
              }
            });
          }, 520);
        }
      }, 90);
    });

    return () => {
      cancelled = true;
      if (tick) {
        clearInterval(tick);
      }
      if (hold) {
        clearTimeout(hold);
      }
    };
  }, [barOpacity, scale, screenOpacity]);

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
      <Animated.View style={{ opacity: barOpacity, transform: [{ scale }] }}>
        <PauseBars size={88} />
      </Animated.View>
      <Text style={styles.word}>
        {WORD.slice(0, letters)}
        <Text style={styles.ghost}>{WORD.slice(letters)}</Text>
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: {
    marginTop: 28,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    color: colors.ink,
  },
  ghost: {
    color: 'transparent',
  },
});
