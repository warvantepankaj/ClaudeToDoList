import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';

type Action = {
  label: string;
  onPress: () => void;
};

type Props = {
  title: string;
  subtitle?: string;
  actions?: Action[];
  rightSlot?: React.ReactNode;
};

const Header: React.FC<Props> = ({ title, subtitle, actions, rightSlot }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        {subtitle && (
          <Text
            style={[styles.eyebrow, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {rightSlot ? (
        <View style={styles.actions}>{rightSlot}</View>
      ) : (
        actions && actions.length > 0 && (
          <View style={styles.actions}>
            {actions.map((a, i) => (
              <Pressable
                key={a.label}
                onPress={a.onPress}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    backgroundColor:
                      i === actions.length - 1
                        ? colors.text
                        : colors.surfaceMuted,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      i === actions.length - 1
                        ? colors.textInverse
                        : colors.text,
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 34,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Header;
