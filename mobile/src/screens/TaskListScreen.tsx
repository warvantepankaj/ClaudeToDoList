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
import FilterBar from '../components/FilterBar';
import TaskCard from '../components/TaskCard';
import { deleteTodo, listTodos, updateTodo } from '../api/todos';
import { extractErrorMessage } from '../api/client';
import { cancelTodoReminder } from '../utils/notifications';
import { useTheme } from '../context/ThemeContext';
import type { Todo, TodoListParams, TodoPriority, TodoStatus } from '../api/types';
import type { AppStackParamList, MainTabParamList } from '../navigation/RootNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Tasks'>,
  NativeStackScreenProps<AppStackParamList>
>;

type SortKey = NonNullable<TodoListParams['sort']>;

const TaskListScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TodoStatus | 'all'>('all');
  const [priority, setPriority] = useState<TodoPriority | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('created_desc');

  const params = useMemo<TodoListParams>(
    () => ({
      status: status === 'all' ? undefined : status,
      priority: priority === 'all' ? undefined : priority,
      q: search.trim() ? search.trim() : undefined,
      sort,
    }),
    [status, priority, search, sort],
  );

  const fetchTodos = useCallback(async () => {
    setError(null);
    try {
      const data = await listTodos(params);
      setTodos(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load tasks'));
    }
  }, [params]);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTodos();
    setRefreshing(false);
  }, [fetchTodos]);

  const handleToggleStatus = useCallback(
    async (todo: Todo, next: TodoStatus) => {
      const before = todos;
      setTodos(todos.map((t) => (t.id === todo.id ? { ...t, status: next } : t)));
      try {
        const updated = await updateTodo(todo.id, { status: next });
        setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        if (next === 'completed') await cancelTodoReminder(todo.id);
      } catch (err) {
        setTodos(before);
        Alert.alert('Update failed', extractErrorMessage(err));
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Header
        title="Tasks"
        subtitle={`${todos.length} total`}
        actions={[{ label: '+ New', onPress: () => navigation.navigate('TodoForm', {}) }]}
      />

      <FlatList
        data={todos}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              status={status}
              onStatusChange={setStatus}
              priority={priority}
              onPriorityChange={setPriority}
              sort={sort}
              onSortChange={setSort}
            />
            {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <TaskCard
            todo={item}
            onPress={() => navigation.navigate('TodoForm', { todo: item })}
            onToggleStatus={(next) => handleToggleStatus(item, next)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No tasks yet</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Tap + New to create your first task.
              </Text>
            </View>
          )
        }
      />

      <Pressable
        onPress={() => navigation.navigate('TodoForm', {})}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <Text style={{ color: colors.primaryText, fontSize: 28, lineHeight: 30 }}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 96,
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

export default TaskListScreen;
