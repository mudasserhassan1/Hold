import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../brand/colors';

type Props = {
  label: string;
  hint: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
};

export function AppRow({ label, hint, icon, selected, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.row, selected && styles.rowOn]}>
      {icon ? (
        <Image
          source={{ uri: `data:image/png;base64,${icon}` }}
          style={styles.icon}
        />
      ) : (
        <View style={styles.iconFallback} />
      )}
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Text style={[styles.state, selected && styles.stateOn]}>
        {selected ? 'On' : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowOn: {
    backgroundColor: colors.wash,
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  iconFallback: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.wash,
  },
  text: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  hint: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  state: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
    minWidth: 24,
    textAlign: 'right',
  },
  stateOn: {
    color: colors.name,
  },
});
