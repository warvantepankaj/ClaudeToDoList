import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { getDisplayTask } from '../utils/recurringDisplay';
import type { Todo } from '../api/types';

type Props = { todos: Todo[] };

const AnalyticsCard: React.FC<Props> = ({ todos }) => {
  const { colors } = useTheme();
  // Recurring tasks are bumped back to "pending" on completion, so the raw
  // status field hides today's check-offs. Resolve the per-task effective
  // status (same rule used on Dashboard/Tasks) before tallying.
  const effective = useMemo(() => todos.map(getDisplayTask), [todos]);
  const total = effective.length;
  const completed = effective.filter((t) => t.status === 'completed').length;
  const inProgress = effective.filter((t) => t.status === 'in_progress').length;
  const pending = total - completed - inProgress;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <View style={[styles.card, { backgroundColor: colors.primary }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primaryText }]}>
            Velocity
          </Text>
          <Text style={[styles.subtitle, { color: colors.primaryText }]}>
            {completed} of {total} done
          </Text>
        </View>
        <View style={styles.pctWrap}>
          <Text style={[styles.pct, { color: colors.primaryText }]}>{pct}</Text>
          <Text style={[styles.pctUnit, { color: colors.primaryText }]}>%</Text>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${pct}%`, backgroundColor: colors.primaryText },
          ]}
        />
      </View>

      <View style={styles.stats}>
        <Stat label="Done" value={completed} accentColor={colors.primaryText} />
        <Divider color={colors.primaryText} />
        <Stat
          label="In progress"
          value={inProgress}
          accentColor={colors.primaryText}
        />
        <Divider color={colors.primaryText} />
        <Stat label="Pending" value={pending} accentColor={colors.primaryText} />
      </View>
    </View>
  );
};

const Stat: React.FC<{ label: string; value: number; accentColor: string }> = ({
  label,
  value,
  accentColor,
}) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color: accentColor }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: accentColor, opacity: 0.6 }]}>
      {label}
    </Text>
  </View>
);

const Divider: React.FC<{ color: string }> = ({ color }) => (
  <View style={[styles.divider, { backgroundColor: color, opacity: 0.15 }]} />
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
    opacity: 0.8,
  },
  pctWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  pct: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 52,
  },
  pctUnit: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
    marginLeft: 2,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.15)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 28,
  },
});

export default AnalyticsCard;
