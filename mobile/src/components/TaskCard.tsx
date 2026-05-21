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
  compact?: boolean;
};

const formatDue = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const statusLabel: Record<TodoStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
};

const nextStatus = (s: TodoStatus): TodoStatus =>
  s === 'pending' ? 'in_progress' : s === 'in_progress' ? 'completed' : 'pending';

const TaskCard: React.FC<Props> = ({
  todo,
  onPress,
  onToggleStatus,
  onDelete,
  compact = false,
}) => {
  const { colors } = useTheme();
  const due = formatDue(todo.due_date);
  const overdue =
    !!todo.due_date &&
    new Date(todo.due_date).getTime() < Date.now() &&
    todo.status !== 'completed';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed && onPress ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        {onToggleStatus && (
          <Pressable
            onPress={() => onToggleStatus(nextStatus(todo.status))}
            hitSlop={8}
            style={[
              styles.checkbox,
              {
                borderColor: statusColor(todo.status, colors),
                backgroundColor:
                  todo.status === 'completed' ? statusColor(todo.status, colors) : 'transparent',
              },
            ]}
          >
            {todo.status === 'completed' && (
              <Text style={{ color: colors.primaryText, fontWeight: '700' }}>✓</Text>
            )}
          </Pressable>
        )}

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                textDecorationLine: todo.status === 'completed' ? 'line-through' : 'none',
              },
            ]}
            numberOfLines={2}
          >
            {todo.title}
          </Text>
          {!compact && !!todo.description && (
            <Text style={[styles.desc, { color: colors.textMuted }]} numberOfLines={2}>
              {todo.description}
            </Text>
          )}

          <View style={styles.meta}>
            <Badge
              text={todo.priority.toUpperCase()}
              color={priorityColor(todo.priority, colors)}
            />
            {!compact && (
              <Badge
                text={statusLabel[todo.status]}
                color={statusColor(todo.status, colors)}
              />
            )}
            {due && (
              <Text
                style={{
                  fontSize: 12,
                  color: overdue ? colors.danger : colors.textMuted,
                  fontWeight: overdue ? '600' : '400',
                }}
              >
                {overdue ? 'Overdue · ' : 'Due '}
                {due}
              </Text>
            )}
          </View>
        </View>

        {onDelete && (
          <Pressable onPress={onDelete} hitSlop={10} style={styles.delete}>
            <Text style={{ color: colors.danger, fontSize: 18 }}>×</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
};

const Badge: React.FC<{ text: string; color: string }> = ({ text, color }) => (
  <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
    <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardCompact: {
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  desc: {
    fontSize: 13,
    marginTop: 2,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  delete: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TaskCard;
