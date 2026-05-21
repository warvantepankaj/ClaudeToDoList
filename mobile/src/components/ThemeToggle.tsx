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
      active && { backgroundColor: primary },
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
  segment: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ThemeToggle;
