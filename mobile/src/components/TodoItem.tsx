import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { priorityColor, statusColor } from '../theme/colors';
import type { Todo, TodoStatus } from '../api/types';

type Props = {
  todo: Todo;
  onPress: () => void;
  onToggleStatus: (next: TodoStatus) => void;
  onDelete: () => void;
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

const TodoItem: React.FC<Props> = ({ todo, onPress, onToggleStatus, onDelete }) => {
  const { colors } = useTheme();
  const due = formatDue(todo.due_date);
  const overdue =
    todo.due_date && new Date(todo.due_date).getTime() < Date.now() && todo.status !== 'completed';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={() => onToggleStatus(nextStatus(todo.status))}
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
          {!!todo.description && (
            <Text style={[styles.desc, { color: colors.textMuted }]} numberOfLines={2}>
              {todo.description}
            </Text>
          )}

          <View style={styles.meta}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: priorityColor(todo.priority, colors) + '22',
                  borderColor: priorityColor(todo.priority, colors),
                },
              ]}
            >
              <Text style={{ color: priorityColor(todo.priority, colors), fontSize: 11, fontWeight: '600' }}>
                {todo.priority.toUpperCase()}
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: statusColor(todo.status, colors) + '22',
                  borderColor: statusColor(todo.status, colors),
                },
              ]}
            >
              <Text style={{ color: statusColor(todo.status, colors), fontSize: 11, fontWeight: '600' }}>
                {statusLabel[todo.status]}
              </Text>
            </View>

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

        <Pressable onPress={onDelete} hitSlop={10} style={styles.delete}>
          <Text style={{ color: colors.danger, fontSize: 18 }}>×</Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  title: {
    fontSize: 16,
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

export default TodoItem;
