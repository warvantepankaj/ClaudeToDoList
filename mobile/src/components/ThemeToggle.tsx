import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';

/**
 * Segmented sun/moon toggle. Both options are always visible; the active
 * one wears the lime pill. Matches the tab bar's active-state vocabulary.
 */
const ThemeToggle: React.FC = () => {
  const { name, toggle, colors } = useTheme();
  const isDark = name === 'dark';

  return (
    <Pressable
      onPress={() => void toggle()}
      hitSlop={6}
      style={[
        styles.wrap,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <Segment
        active={!isDark}
        glyph="☼"
        primary={colors.primary}
        primaryText={colors.primaryText}
        muted={colors.textMuted}
      />
      <Segment
        active={isDark}
        glyph="☾"
        primary={colors.primary}
        primaryText={colors.primaryText}
        muted={colors.textMuted}
      />
    </Pressable>
  );
};

const Segment: React.FC<{
  active: boolean;
  glyph: string;
  primary: string;
  primaryText: string;
  muted: string;
}> = ({ active, glyph, primary, primaryText, muted }) => (
  <View
    style={[
      styles.segment,
      { backgroundColor: active ? primary : 'transparent' },
    ]}
  >
    <Text
      style={{
        fontSize: 14,
        fontWeight: '800',
        color: active ? primaryText : muted,
      }}
    >
      {glyph}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  // borderRadius is half the size (pill). Android sometimes fails to re-clip
  // the background when borderRadius is much larger than the bounds AND the
  // background color toggles between set/unset across renders, so we (a) use
  // an actual half-size radius and (b) always declare backgroundColor so the
  // style diff is always a value change, never an insert/remove.
  segment: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default ThemeToggle;
