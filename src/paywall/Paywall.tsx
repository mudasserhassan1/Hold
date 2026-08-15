import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PLANS, type PlanId } from './plans';

type Props = {
  selected: PlanId;
  onSelect: (id: PlanId) => void;
  onUnlock: () => void;
  onClose: () => void;
  busy?: boolean;
};

export function Paywall({
  selected,
  onSelect,
  onUnlock,
  onClose,
  busy,
}: Props) {
  return (
    <View style={styles.sheet}>
      <Text style={styles.kicker}>HOLD PRO</Text>
      <Text style={styles.title}>It still works in week 3.</Text>
      <Text style={styles.body}>
        Free guards one app. Pro unlocks every app you pick, and keeps the pause
        honest when you have learned to tap through.
      </Text>

      {PLANS.map(plan => {
        const on = selected === plan.id;
        return (
          <Pressable
            key={plan.id}
            onPress={() => onSelect(plan.id)}
            style={[styles.plan, on && styles.planOn]}
          >
            <View style={styles.planRow}>
              <Text style={styles.planTitle}>{plan.title}</Text>
              {plan.recommended ? (
                <Text style={styles.badge}>Best value</Text>
              ) : null}
            </View>
            <Text style={styles.price}>{plan.price}</Text>
            <Text style={styles.planDetail}>{plan.detail}</Text>
          </Pressable>
        );
      })}

      <Pressable
        onPress={onUnlock}
        disabled={busy}
        style={[styles.cta, busy && styles.ctaDisabled]}
      >
        <Text style={styles.ctaText}>{busy ? 'Starting…' : 'Start Pro'}</Text>
      </Pressable>
      <Text style={styles.note}>Cancel anytime. Closing is always free.</Text>
      <Pressable onPress={onClose}>
        <Text style={styles.later}>Not now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#EDE8DF',
    padding: 20,
    marginTop: 28,
  },
  kicker: {
    letterSpacing: 1.6,
    fontSize: 12,
    fontWeight: '600',
    color: '#8A8175',
  },
  title: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1917',
  },
  body: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 15,
    lineHeight: 22,
    color: '#44403C',
  },
  plan: {
    padding: 14,
    marginBottom: 8,
    backgroundColor: '#F4F1EA',
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  planOn: {
    borderColor: '#1C1917',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1917',
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3F6212',
  },
  price: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1917',
  },
  planDetail: {
    marginTop: 2,
    fontSize: 13,
    color: '#78716C',
  },
  cta: {
    marginTop: 12,
    backgroundColor: '#1C1917',
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    color: '#F4F1EA',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: '#78716C',
  },
  later: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 15,
    color: '#57534E',
  },
});
