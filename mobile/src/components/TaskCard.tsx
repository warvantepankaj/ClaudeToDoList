import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { priorityColor, statusColor } from '../theme/colors';
import type { Todo, TodoStatus } from '../api/types';

type Props = {
  todo: Todo;
  onPress?: () => void;
  onToggleStatus?: (next: TodoStatus) => void;
  onDelete?: () => void;
};

const statusLabel: Record<TodoStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
};

const nextStatus = (s: TodoStatus): TodoStatus =>
  s === 'pending' ? 'in_progress' : s === 'in_progress' ? 'completed' : 'pending';

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDue = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (isSameDay(d, now)) return `Today, ${time}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(d, tomorrow)) return `Tomorrow, ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) return `Yesterday, ${time}`;

  const dayDiff = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  if (dayDiff > 1 && dayDiff < 7) {
    const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
    return `${dayName}, ${time}`;
  }
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
};

/* Status indicator: three visually distinct states.
 *   pending      → empty ring
 *   in_progress  → ring with a centered dot (clearly "started")
 *   completed    → filled circle with ✓ */
const StatusIndicator: React.FC<{
  status: TodoStatus;
  color: string;
  primaryText: string;
  onPress: () => void;
}> = ({ status, color, primaryText, onPress }) => (
  <Pressable
    onPress={onPress}
    hitSlop={10}
    style={[
      styles.indicator,
      {
        borderColor: color,
        backgroundColor: status === 'completed' ? color : 'transparent',
      },
    ]}
  >
    {status === 'in_progress' && (
      <View style={[styles.indicatorDot, { backgroundColor: color }]} />
    )}
    {status === 'completed' && (
      <Text style={{ color: primaryText, fontSize: 13, fontWeight: '800' }}>✓</Text>
    )}
  </Pressable>
);

const TaskCard: React.FC<Props> = ({ todo, onPress, onToggleStatus, onDelete }) => {
  const { colors } = useTheme();
  const due = formatDue(todo.due_date);
  const overdue =
    !!todo.due_date &&
    new Date(todo.due_date).getTime() < Date.now() &&
    todo.status !== 'completed';
  const pColor = priorityColor(todo.priority, colors);
  const sColor = statusColor(todo.status, colors);
  const completed = todo.status === 'completed';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed && onPress ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.priorityStripe, { backgroundColor: pColor }]} />

      <View style={styles.body}>
        {onToggleStatus && (
          <StatusIndicator
            status={todo.status}
            color={sColor}
            primaryText={colors.primaryText}
            onPress={() => onToggleStatus(nextStatus(todo.status))}
          />
        )}

        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                {
                  color: completed ? colors.textMuted : colors.text,
                  textDecorationLine: completed ? 'line-through' : 'none',
                },
              ]}
              numberOfLines={2}
            >
              {todo.title}
            </Text>
            {onDelete && (
              <Pressable onPress={onDelete} hitSlop={10} style={styles.deleteBtn}>
                <Text style={{ color: colors.textMuted, fontSize: 18 }}>×</Text>
              </Pressable>
            )}
          </View>

          {!!todo.description && !completed && (
            <Text
              style={[styles.desc, { color: colors.textMuted }]}
              numberOfLines={2}
            >
              {todo.description}
            </Text>
          )}

          <View style={styles.meta}>
            <View style={styles.statusGroup}>
              <View style={[styles.statusDot, { backgroundColor: sColor }]} />
              <Text style={[styles.statusText, { color: sColor }]}>
                {statusLabel[todo.status]}
              </Text>
            </View>

            <Text style={[styles.priorityLabel, { color: pColor }]}>
              {todo.priority.toUpperCase()}
            </Text>

            {due && (
              <Text
                style={[
                  styles.dueText,
                  {
                    color: overdue ? colors.danger : colors.textMuted,
                    fontWeight: overdue ? '700' : '500',
                  },
                ]}
              >
                {overdue ? 'Overdue · ' : ''}
                {due}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  priorityStripe: {
    width: 4,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  indicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
  },
  desc: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priorityLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dueText: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  deleteBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TaskCard;
