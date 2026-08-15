import { StyleSheet, View } from 'react-native';
import { colors } from './colors';

type Props = {
  size?: number;
};

export function PauseBars({ size = 72 }: Props) {
  const barW = size * 0.22;
  const gap = size * 0.16;
  return (
    <View style={[styles.row, { width: size, height: size, gap }]}>
      <View
        style={{
          width: barW,
          height: size * 0.52,
          borderRadius: barW / 2,
          backgroundColor: colors.ink,
          transform: [{ translateY: size * 0.04 }],
        }}
      />
      <View
        style={{
          width: barW,
          height: size * 0.62,
          borderRadius: barW / 2,
          backgroundColor: colors.ink,
          transform: [{ translateY: -size * 0.04 }],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
