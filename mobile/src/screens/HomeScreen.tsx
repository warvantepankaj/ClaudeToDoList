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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { deleteTodo, listTodos, updateTodo } from '../api/todos';
import { extractErrorMessage } from '../api/client';
import { cancelTodoReminder } from '../utils/notifications';
import AnalyticsCard from '../components/AnalyticsCard';
import FilterBar from '../components/FilterBar';
import TodoItem from '../components/TodoItem';
import type { Todo, TodoListParams, TodoPriority, TodoStatus } from '../api/types';
import type { AppStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

type SortKey = NonNullable<TodoListParams['sort']>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { colors, name: themeName, toggle } = useTheme();
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
      setError(extractErrorMessage(err, 'Could not load todos'));
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
      const optimistic = todos.map((t) => (t.id === todo.id ? { ...t, status: next } : t));
      setTodos(optimistic);
      try {
        const updated = await updateTodo(todo.id, { status: next });
        setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        if (next === 'completed') {
          await cancelTodoReminder(todo.id);
        }
      } catch (err) {
        setTodos(todos);
        Alert.alert('Update failed', extractErrorMessage(err));
      }
    },
    [todos],
  );

  const handleDelete = useCallback(
    (todo: Todo) => {
      Alert.alert('Delete todo', `Remove "${todo.title}"?`, [
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

  const headerRight = (
    <View style={styles.headerActions}>
      <Pressable onPress={toggle} style={[styles.iconBtn, { backgroundColor: colors.surfaceMuted }]}>
        <Text style={{ fontSize: 16 }}>{themeName === 'dark' ? '☀' : '☾'}</Text>
      </Pressable>
      <Pressable onPress={logout} style={[styles.iconBtn, { backgroundColor: colors.surfaceMuted }]}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>Logout</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>Hello,</Text>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {user?.name ?? 'there'}
          </Text>
        </View>
        {headerRight}
      </View>

      <FlatList
        data={todos}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <AnalyticsCard todos={todos} />
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
          <TodoItem
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
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No todos yet</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Tap the + button to create your first one.
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 13,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
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

export default HomeScreen;
