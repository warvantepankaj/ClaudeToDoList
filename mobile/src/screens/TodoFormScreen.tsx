import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../context/ThemeContext';
import { createTodo, updateTodo } from '../api/todos';
import { parseTaskAI } from '../api/ai';
import { extractErrorMessage } from '../api/client';
import { cancelTodoReminder, scheduleTodoReminder } from '../utils/notifications';
import type { TodoPriority, TodoStatus } from '../api/types';
import type { AppStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<AppStackParamList, 'TodoForm'>;

const statusChoices: Array<{ key: TodoStatus; label: string }> = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
];

const priorityChoices: Array<{ key: TodoPriority; label: string }> = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
];

const TodoFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const editing = route.params?.todo;
  const { colors } = useTheme();

  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [status, setStatus] = useState<TodoStatus>(editing?.status ?? 'pending');
  const [priority, setPriority] = useState<TodoPriority>(editing?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState<Date | null>(
    editing?.due_date ? new Date(editing.due_date) : null,
  );
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInfo, setAiInfo] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<string[]>([]);

  const onAIParse = async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    setAiLoading(true);
    setError(null);
    setAiInfo(null);
    try {
      const parsed = await parseTaskAI(text);
      if (parsed.title) setTitle(parsed.title);
      if (parsed.priority) setPriority(parsed.priority);
      if (parsed.deadline) {
        const d = new Date(parsed.deadline);
        if (!Number.isNaN(d.getTime())) setDueDate(d);
      }
      if (parsed.subtasks?.length) {
        setSubtasks(parsed.subtasks);
        if (!description.trim()) {
          setDescription(parsed.subtasks.map((s) => `• ${s}`).join('\n'));
        }
      }
      setAiInfo(`Parsed${parsed.subtasks?.length ? ` · ${parsed.subtasks.length} subtasks` : ''}`);
    } catch (err) {
      setError(extractErrorMessage(err, 'AI parse failed'));
    } finally {
      setAiLoading(false);
    }
  };

  const headerTitle = useMemo(() => (editing ? 'Edit todo' : 'New todo'), [editing]);

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: headerTitle });
  }, [navigation, headerTitle]);

  const onSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      due_date: dueDate ? dueDate.toISOString() : null,
    };
    setSubmitting(true);
    try {
      const saved = editing
        ? await updateTodo(editing.id, payload)
        : await createTodo(payload);

      await cancelTodoReminder(saved.id);
      if (saved.due_date && saved.status !== 'completed') {
        await scheduleTodoReminder({
          todoId: saved.id,
          title: saved.title,
          dueDate: new Date(saved.due_date),
        });
      }
      navigation.goBack();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not save todo'));
    } finally {
      setSubmitting(false);
    }
  };

  const openDatePicker = () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not supported', 'Use a phone or simulator to set a due date.');
      return;
    }
    setPickerMode('date');
  };

  const formattedDue = dueDate
    ? dueDate.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Not set';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {!editing && (
            <View
              style={[
                styles.aiBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.aiHeader}>
                <Text style={[styles.aiTitle, { color: colors.text }]}>✦ AI assist</Text>
                <Text style={[styles.aiHint, { color: colors.textMuted }]}>
                  Describe it naturally
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  styles.aiInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                  },
                ]}
                placeholder='e.g. "Prepare for Java interview next week"'
                placeholderTextColor={colors.placeholder}
                value={aiInput}
                onChangeText={setAiInput}
                multiline
                editable={!aiLoading}
              />
              <Pressable
                onPress={onAIParse}
                disabled={aiLoading || !aiInput.trim()}
                style={({ pressed }) => [
                  styles.aiBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed || aiLoading || !aiInput.trim() ? 0.6 : 1,
                  },
                ]}
              >
                {aiLoading ? (
                  <ActivityIndicator color={colors.primaryText} />
                ) : (
                  <Text style={{ color: colors.primaryText, fontWeight: '700' }}>
                    Generate
                  </Text>
                )}
              </Pressable>
              {aiInfo && (
                <Text style={[styles.aiInfo, { color: colors.success }]}>{aiInfo}</Text>
              )}
            </View>
          )}

          <Text style={[styles.label, { color: colors.textMuted }]}>Title</Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
              },
            ]}
            placeholder="What needs to be done?"
            placeholderTextColor={colors.placeholder}
            value={title}
            onChangeText={setTitle}
            editable={!submitting}
          />

          <Text style={[styles.label, { color: colors.textMuted }]}>Description</Text>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              {
                color: colors.text,
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
              },
            ]}
            placeholder="Add some details (optional)"
            placeholderTextColor={colors.placeholder}
            value={description}
            onChangeText={setDescription}
            multiline
            editable={!submitting}
          />

          <Text style={[styles.label, { color: colors.textMuted }]}>Status</Text>
          <View style={styles.row}>
            {statusChoices.map((c) => (
              <Pressable
                key={c.key}
                onPress={() => setStatus(c.key)}
                style={[
                  styles.choice,
                  {
                    backgroundColor: status === c.key ? colors.primary : colors.surfaceMuted,
                    borderColor: status === c.key ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: status === c.key ? colors.primaryText : colors.text,
                    fontWeight: '600',
                  }}
                >
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.textMuted }]}>Priority</Text>
          <View style={styles.row}>
            {priorityChoices.map((c) => (
              <Pressable
                key={c.key}
                onPress={() => setPriority(c.key)}
                style={[
                  styles.choice,
                  {
                    backgroundColor: priority === c.key ? colors.primary : colors.surfaceMuted,
                    borderColor: priority === c.key ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: priority === c.key ? colors.primaryText : colors.text,
                    fontWeight: '600',
                  }}
                >
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.textMuted }]}>Due date</Text>
          <View style={styles.dueRow}>
            <Pressable
              onPress={openDatePicker}
              style={[
                styles.dueBtn,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              ]}
            >
              <Text style={{ color: colors.text }}>{formattedDue}</Text>
            </Pressable>
            {dueDate && (
              <Pressable
                onPress={() => setDueDate(null)}
                style={[styles.clearBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.danger, fontWeight: '600' }}>Clear</Text>
              </Pressable>
            )}
          </View>

          {pickerMode && (
            <DateTimePicker
              value={dueDate ?? new Date()}
              mode={pickerMode}
              minimumDate={pickerMode === 'date' ? new Date() : undefined}
              onChange={(event, selected) => {
                if (Platform.OS !== 'ios') setPickerMode(null);
                if (event.type === 'dismissed' || !selected) {
                  if (Platform.OS === 'ios') setPickerMode(null);
                  return;
                }
                if (pickerMode === 'date') {
                  const base = dueDate ?? new Date();
                  const next = new Date(selected);
                  next.setHours(base.getHours(), base.getMinutes(), 0, 0);
                  setDueDate(next);
                  if (Platform.OS !== 'ios') setPickerMode('time');
                  else setPickerMode('time');
                } else {
                  const base = dueDate ?? new Date();
                  const next = new Date(base);
                  next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                  setDueDate(next);
                  setPickerMode(null);
                }
              }}
            />
          )}

          {subtasks.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Subtasks</Text>
              {subtasks.map((s, i) => (
                <View key={`${i}-${s}`} style={styles.subtaskRow}>
                  <Text style={{ color: colors.primary, marginRight: 8 }}>•</Text>
                  <Text style={{ color: colors.text, flex: 1 }}>{s}</Text>
                </View>
              ))}
            </View>
          )}

          {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

          <Pressable
            onPress={onSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.submit,
              {
                backgroundColor: colors.primary,
                opacity: pressed || submitting ? 0.85 : 1,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={{ color: colors.primaryText, fontWeight: '700', fontSize: 16 }}>
                {editing ? 'Save changes' : 'Create todo'}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 48,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 18,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  choice: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dueBtn: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  submit: {
    marginTop: 28,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  error: {
    marginTop: 16,
    fontSize: 14,
  },
  aiBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  aiTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  aiHint: {
    fontSize: 12,
  },
  aiInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  aiBtn: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  aiInfo: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
});

export default TodoFormScreen;
