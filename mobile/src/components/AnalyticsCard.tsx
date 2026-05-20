import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import type { Todo } from '../api/types';

type Props = { todos: Todo[] };

const AnalyticsCard: React.FC<Props> = ({ todos }) => {
  const { colors } = useTheme();
  const total = todos.length;
  const completed = todos.filter((t) => t.status === 'completed').length;
  const inProgress = todos.filter((t) => t.status === 'in_progress').length;
  const pending = total - completed - inProgress;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: colors.text }]}>Progress</Text>
        <Text style={[styles.pct, { color: colors.primary }]}>{pct}%</Text>
      </View>

      <View style={[styles.barTrack, { backgroundColor: colors.surfaceMuted }]}>
        <View
          style={[
            styles.barFill,
            { width: `${pct}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>

      <View style={styles.stats}>
        <Stat label="Completed" value={completed} color={colors.success} />
        <Stat label="In progress" value={inProgress} color={colors.info} />
        <Stat label="Pending" value={pending} color={colors.textMuted} />
      </View>
    </View>
  );
};

const Stat: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  pct: {
    fontSize: 22,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default AnalyticsCard;
