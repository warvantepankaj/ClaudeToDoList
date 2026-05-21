import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import Header from '../components/Header';
import TaskCard from '../components/TaskCard';
import { extractErrorMessage } from '../api/client';
import { listTodos, updateTodo } from '../api/todos';
import { cancelTodoReminder } from '../utils/notifications';
import { useTheme } from '../context/ThemeContext';
import { priorityColor } from '../theme/colors';
import type { Todo, TodoStatus } from '../api/types';
import type { AppStackParamList, MainTabParamList } from '../navigation/RootNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Calendar'>,
  NativeStackScreenProps<AppStackParamList>
>;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const startOfDay = (d: Date): Date => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* Project a task's occurrences within a date window.
 * - Non-recurring or completed tasks: the actual due_date only (if in range).
 * - Recurring pending/in_progress tasks: every occurrence in the window. */
const expandOccurrences = (
  task: Todo,
  windowStart: Date,
  windowEnd: Date,
): Date[] => {
  if (!task.due_date) return [];
  const baseDue = new Date(task.due_date);
  if (Number.isNaN(baseDue.getTime())) return [];

  if (!task.recurrence || task.status === 'completed') {
    return baseDue >= windowStart && baseDue <= windowEnd ? [baseDue] : [];
  }

  const dates: Date[] = [];
  const current = new Date(baseDue);
  const MAX = 400;
  let i = 0;
  while (current <= windowEnd && i++ < MAX) {
    if (current >= windowStart) dates.push(new Date(current));
    if (task.recurrence === 'daily') {
      current.setDate(current.getDate() + 1);
    } else if (task.recurrence === 'weekly') {
      current.setDate(current.getDate() + 7);
    } else if (task.recurrence === 'monthly') {
      const targetDay = baseDue.getDate();
      const next = new Date(current);
      next.setMonth(next.getMonth() + 1);
      // Clamp e.g. Jan 31 → Feb 28
      if (next.getDate() !== current.getDate()) next.setDate(0);
      // Restore intended day if previous month had been clamped
      if (next.getDate() < targetDay) {
        const candidate = new Date(next.getFullYear(), next.getMonth(), targetDay);
        if (candidate.getMonth() === next.getMonth()) next.setDate(targetDay);
      }
      current.setTime(next.getTime());
    } else {
      break;
    }
  }
  return dates;
};

const CalendarScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selected, setSelected] = useState(() => startOfDay(new Date()));

  const fetchTodos = useCallback(async () => {
    setError(null);
    try {
      setTodos(await listTodos());
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
    return navigation.addListener('focus', () => {
      void fetchTodos();
    });
  }, [navigation, fetchTodos]);

  const tasksByDay = useMemo(() => {
    const map: Record<string, Todo[]> = {};
    const windowStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const windowEnd = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    for (const t of todos) {
      // 1) Pending/in_progress occurrences (real + projected for recurring).
      const occurrences = expandOccurrences(t, windowStart, windowEnd);
      const baseDue = t.due_date ? new Date(t.due_date) : null;
      const projectedKeys = new Set<string>();
      for (const d of occurrences) {
        let cloned: Todo = t;
        if (baseDue && !Number.isNaN(baseDue.getTime())) {
          const occ = new Date(d);
          occ.setHours(
            baseDue.getHours(),
            baseDue.getMinutes(),
            baseDue.getSeconds(),
            0,
          );
          cloned = { ...t, due_date: occ.toISOString() };
        }
        const k = dayKey(d);
        projectedKeys.add(k);
        if (!map[k]) map[k] = [];
        map[k].push(cloned);
      }

      // 2) For recurring tasks: render a "completed snapshot" on the day they
      // were last completed. Skip if a projection already lives on that day
      // (avoids duplicate entries when due_date and last_completed_at overlap
      // — e.g., the user edited the task and shifted due_date backwards).
      if (t.recurrence && t.last_completed_at) {
        const lc = new Date(t.last_completed_at);
        if (!Number.isNaN(lc.getTime()) && lc >= windowStart && lc <= windowEnd) {
          const k = dayKey(lc);
          if (!projectedKeys.has(k)) {
            if (!map[k]) map[k] = [];
            map[k].push({
              ...t,
              status: 'completed',
              due_date: t.last_completed_at,
            });
          }
        }
      }
    }
    return map;
  }, [todos, cursor]);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const offset = first.getDay();
    const result: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) result.push(null);
    for (let d = 1; d <= lastDay; d++) result.push(new Date(year, month, d));
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [cursor]);

  const today = useMemo(() => startOfDay(new Date()), []);
  const selectedTasks = useMemo(
    () => tasksByDay[dayKey(selected)] ?? [],
    [selected, tasksByDay],
  );

  const handleToggle = useCallback(
    async (todo: Todo, next: TodoStatus) => {
      const before = todos;
      setTodos(todos.map((t) => (t.id === todo.id ? { ...t, status: next } : t)));
      try {
        await updateTodo(todo.id, { status: next });
        if (next === 'completed') await cancelTodoReminder(todo.id);
        // Refetch so a spawned recurrence instance shows up.
        await fetchTodos();
      } catch (err) {
        setTodos(before);
        setError(extractErrorMessage(err));
      }
    },
    [todos, fetchTodos],
  );

  const goPrev = () =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  const goNext = () =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  const goToday = () => {
    const t = new Date();
    t.setDate(1);
    t.setHours(0, 0, 0, 0);
    setCursor(t);
    setSelected(startOfDay(new Date()));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Header
        title="Calendar"
        subtitle={`${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`}
        actions={[{ label: 'Today', onPress: goToday }]}
      />

      <View style={styles.monthRow}>
        <Pressable
          onPress={goPrev}
          hitSlop={10}
          style={[styles.navBtn, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>‹</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.text }]}>
          {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
        </Text>
        <Pressable
          onPress={goNext}
          hitSlop={10}
          style={[styles.navBtn, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>›</Text>
        </Pressable>
      </View>

      <View style={styles.calendarBox}>
        <View style={styles.gridRow}>
          {WEEKDAYS.map((w) => (
            <View key={w} style={styles.cellWrap}>
              <Text style={[styles.weekHeader, { color: colors.textMuted }]}>{w}</Text>
            </View>
          ))}
        </View>

        {Array.from({ length: Math.ceil(cells.length / 7) }).map((_, rowIdx) => (
          <View key={`r-${rowIdx}`} style={styles.gridRow}>
            {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((d, colIdx) => {
              if (!d) {
                return <View key={`e-${rowIdx}-${colIdx}`} style={styles.cellWrap} />;
              }
              const key = dayKey(d);
              const ts = tasksByDay[key] ?? [];
              const isToday = isSameDay(d, today);
              const isSelected = isSameDay(d, selected);

              const seen = new Set<string>();
              const dots: string[] = [];
              for (const t of ts) {
                const c = priorityColor(t.priority, colors);
                if (!seen.has(c)) {
                  seen.add(c);
                  dots.push(c);
                  if (dots.length >= 3) break;
                }
              }

              return (
                <View key={key} style={styles.cellWrap}>
                  <Pressable
                    onPress={() => setSelected(d)}
                    style={[
                      styles.cell,
                      isToday && { backgroundColor: colors.surfaceMuted },
                      isSelected && { borderColor: colors.primary, borderWidth: 2 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNum,
                        {
                          color: isSelected ? colors.primary : colors.text,
                          fontWeight: isToday ? '800' : '500',
                        },
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                    <View style={styles.dots}>
                      {dots.map((c, idx) => (
                        <View key={idx} style={[styles.dot, { backgroundColor: c }]} />
                      ))}
                      {ts.length > dots.length && (
                        <Text style={[styles.dotMore, { color: colors.textMuted }]}>
                          +{ts.length - dots.length}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={[styles.dayHeader, { borderTopColor: colors.border }]}>
        <Text style={[styles.dayHeaderText, { color: colors.text }]}>
          {selected.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {selectedTasks.length} task{selectedTasks.length === 1 ? '' : 's'}
        </Text>
      </View>

      {error && (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={selectedTasks}
          keyExtractor={(t) => `${t.id}-${t.due_date ?? 'na'}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const source = todos.find((t) => t.id === item.id) ?? item;
            const isCompletedSnapshotItem =
              item.status === 'completed' && !!item.recurrence;
            // Lock only RECURRING projections in the future. Non-recurring tasks
            // scheduled for future dates stay editable (they're real records,
            // not projections). Today's instance is editable too.
            const itemDate = item.due_date ? new Date(item.due_date) : null;
            const itemDay = itemDate ? startOfDay(itemDate) : null;
            const isFutureRecurring =
              !!item.recurrence && !!itemDay && itemDay > today;
            const readOnly = isCompletedSnapshotItem || isFutureRecurring;
            return (
              <TaskCard
                todo={item}
                onPress={readOnly ? undefined : () => navigation.navigate('TodoForm', { todo: source })}
                onToggleStatus={readOnly ? undefined : (next) => handleToggle(item, next)}
              />
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              No tasks scheduled.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const GRID_PADDING = 8;

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  calendarBox: {
    paddingHorizontal: GRID_PADDING,
  },
  gridRow: {
    flexDirection: 'row',
  },
  cellWrap: {
    flex: 1,
  },
  weekHeader: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 6,
  },
  cell: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayNum: {
    fontSize: 14,
  },
  dots: {
    flexDirection: 'row',
    marginTop: 3,
    gap: 3,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotMore: {
    fontSize: 9,
    marginLeft: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  dayHeaderText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  list: {
    paddingHorizontal: 18,
    paddingBottom: 120,
  },
  empty: {
    textAlign: 'center',
    paddingTop: 20,
    fontSize: 14,
  },
  error: {
    paddingHorizontal: 16,
    marginTop: 8,
    fontSize: 13,
  },
});

export default CalendarScreen;
