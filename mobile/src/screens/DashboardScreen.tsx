import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import Header from '../components/Header';
import AnalyticsCard from '../components/AnalyticsCard';
import TaskCard from '../components/TaskCard';
import { extractErrorMessage } from '../api/client';
import { deleteTodo, listTodos, uncompleteTodo, updateTodo } from '../api/todos';
import { cancelTodoReminder } from '../utils/notifications';
import { getDisplayTask, matchesToday } from '../utils/recurringDisplay';
import { scheduleDayAI } from '../api/ai';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { ScheduledSlot, Todo, TodoStatus } from '../api/types';
import type { AppStackParamList, MainTabParamList } from '../navigation/RootNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Dashboard'>,
  NativeStackScreenProps<AppStackParamList>
>;

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { colors, name: themeName, toggle } = useTheme();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduledSlot[] | null>(null);
  const [scheduling, setScheduling] = useState(false);

  const fetchTodos = useCallback(async () => {
    setError(null);
    try {
      const data = await listTodos({ sort: 'due_date_asc' });
      setTodos(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load tasks'));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      await fetchTodos();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchTodos]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      void fetchTodos();
    });
    return unsub;
  }, [navigation, fetchTodos]);

  const todaysTasks = useMemo(() => {
    const matches = todos.filter(matchesToday);
    // Active tasks first; completed (including snapshots) sink to the bottom.
    return matches.sort((a, b) => {
      const aDone = getDisplayTask(a).status === 'completed' ? 1 : 0;
      const bDone = getDisplayTask(b).status === 'completed' ? 1 : 0;
      return aDone - bDone;
    });
  }, [todos]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTodos();
    setRefreshing(false);
  }, [fetchTodos]);

  const handleToggle = useCallback(
    async (todo: Todo, next: TodoStatus) => {
      const before = todos;
      // Toggle from a completed-today recurring snapshot → un-complete.
      const isSnapshotUndo =
        !!todo.recurrence && !!todo.last_completed_at && next === 'pending';
      setTodos(todos.map((t) => (t.id === todo.id ? { ...t, status: next } : t)));
      try {
        const updated = isSnapshotUndo
          ? await uncompleteTodo(todo.id)
          : await updateTodo(todo.id, { status: next });
        setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        if (next === 'completed') await cancelTodoReminder(todo.id);
      } catch (err) {
        setTodos(before);
        setError(extractErrorMessage(err));
      }
    },
    [todos],
  );

  const handleDelete = useCallback(
    (todo: Todo) => {
      Alert.alert('Delete task', `Remove "${todo.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const before = todos;
            setTodos(todos.filter((t) => t.id !== todo.id));
            try {
              await deleteTodo(todo.id);
              await cancelTodoReminder(todo.id);
            } catch (err) {
              setTodos(before);
              Alert.alert('Delete failed', extractErrorMessage(err));
            }
          },
        },
      ]);
    },
    [todos],
  );

  const handlePlanDay = useCallback(async () => {
    if (todaysTasks.length === 0) return;
    setScheduling(true);
    setError(null);
    try {
      const slots = await scheduleDayAI(
        todaysTasks.map((t) => ({
          title: t.title,
          priority: t.priority,
          deadline: t.due_date ?? undefined,
        })),
      );
      setSchedule(slots);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not plan your day'));
    } finally {
      setScheduling(false);
    }
  }, [todaysTasks]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Header
        title={user?.name ?? 'there'}
        subtitle="Hello,"
        actions={[
          { label: themeName === 'dark' ? '☀' : '☾', onPress: () => void toggle() },
          { label: 'Logout', onPress: logout },
        ]}
      />

      <FlatList
        data={todaysTasks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <AnalyticsCard todos={todos} />

            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Today</Text>
              <Pressable
                onPress={handlePlanDay}
                disabled={scheduling || todaysTasks.length === 0}
                style={({ pressed }) => [
                  styles.aiBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed || scheduling || todaysTasks.length === 0 ? 0.6 : 1,
                  },
                ]}
              >
                {scheduling ? (
                  <ActivityIndicator color={colors.primaryText} size="small" />
                ) : (
                  <Text style={{ color: colors.primaryText, fontWeight: '700', fontSize: 13 }}>
                    ✦ Plan day
                  </Text>
                )}
              </Pressable>
            </View>

            {schedule && schedule.length > 0 && (
              <View
                style={[styles.scheduleBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.scheduleHeader}>
                  <Text style={[styles.scheduleTitle, { color: colors.text }]}>AI day plan</Text>
                  <Pressable onPress={() => setSchedule(null)} hitSlop={6}>
                    <Text style={{ color: colors.textMuted, fontSize: 18 }}>×</Text>
                  </Pressable>
                </View>
                {schedule.map((s, i) => (
                  <View key={`${s.time}-${i}`} style={styles.scheduleRow}>
                    <Text style={[styles.scheduleTime, { color: colors.primary }]}>{s.time}</Text>
                    <Text style={[styles.scheduleTask, { color: colors.text }]} numberOfLines={2}>
                      {s.task}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
          </View>
        }
        renderItem={({ item }) => {
          const display = getDisplayTask(item);
          return (
            <TaskCard
              todo={display}
              // Always edit the underlying source task, never the snapshot.
              onPress={() => navigation.navigate('TodoForm', { todo: item })}
              // Toggle on a snapshot un-completes via handleToggle's snapshot path.
              onToggleStatus={(next) => handleToggle(item, next)}
              onDelete={() => handleDelete(item)}
            />
          );
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>You're all caught up</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Nothing due today. Add a task to get started.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  aiBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  scheduleBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  scheduleRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    gap: 12,
  },
  scheduleTime: {
    width: 56,
    fontSize: 14,
    fontWeight: '700',
  },
  scheduleTask: {
    flex: 1,
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    marginTop: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  error: {
    marginBottom: 12,
    fontSize: 14,
  },
});

export default DashboardScreen;
