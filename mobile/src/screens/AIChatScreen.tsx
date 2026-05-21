import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import Header from '../components/Header';
import ChatBubble from '../components/ChatBubble';
import InputBox from '../components/InputBox';
import { planAI } from '../api/ai';
import { createTodo } from '../api/todos';
import { extractErrorMessage } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import type {
  PlanResponse,
  PlanScheduleSlot,
  PlanTaskDraft,
} from '../api/types';
import type { AppStackParamList, MainTabParamList } from '../navigation/RootNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'AIChat'>,
  NativeStackScreenProps<AppStackParamList>
>;

type Msg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  pending?: boolean;
  plan?: PlanResponse;
};

const INITIAL: Msg = {
  id: 'welcome',
  role: 'assistant',
  text:
    "Hi! Tell me about a task and I'll add it. If something's unclear (when? priority?), I'll ask. Examples:\n• Dinner at 10pm\n• I need to prepare a report\n• Buy milk tomorrow morning",
};

const toDeadlineISO = (timeHHMM: string): string | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(timeHHMM);
  if (!m) return null;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.toISOString();
};

const AIChatScreen: React.FC<Props> = () => {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Msg[]>([INITIAL]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showHours, setShowHours] = useState(false);
  const [startHour, setStartHour] = useState('9');
  const [endHour, setEndHour] = useState('18');
  const [creating, setCreating] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const conversationForApi = useMemo(
    () =>
      messages
        .filter((m) => m.id !== 'welcome' && !m.pending)
        .map((m) => ({ role: m.role, text: m.text })),
    [messages],
  );

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const callPlan = useCallback(
    async (userText: string) => {
      const sh = parseInt(startHour, 10);
      const eh = parseInt(endHour, 10);
      const timeRange =
        showHours &&
        Number.isFinite(sh) &&
        Number.isFinite(eh) &&
        sh >= 0 &&
        eh > sh &&
        eh <= 24
          ? { start_hour: sh, end_hour: eh }
          : undefined;
      return planAI({
        message: userText,
        conversation: conversationForApi,
        time_range: timeRange,
      });
    },
    [conversationForApi, startHour, endHour, showHours],
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text };
    const placeholderId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: placeholderId, role: 'assistant', text: '', pending: true },
    ]);
    setInput('');
    setSending(true);
    scrollToEnd();

    try {
      const res = await callPlan(text);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? { ...m, pending: false, text: res.message || '', plan: res }
            : m,
        ),
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...m,
                pending: false,
                text: extractErrorMessage(err, 'AI failed to respond'),
              }
            : m,
        ),
      );
    } finally {
      setSending(false);
      scrollToEnd();
    }
  }, [input, sending, callPlan, scrollToEnd]);

  const createFromTasks = useCallback(
    async (tasks: PlanTaskDraft[]) => {
      setCreating(true);
      try {
        for (const t of tasks) {
          await createTodo({
            title: t.title,
            priority: t.priority,
            due_date: t.deadline || null,
            recurrence: t.recurrence || null,
          });
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `s-${Date.now()}`,
            role: 'assistant',
            text:
              tasks.length === 1
                ? `Added "${tasks[0].title}" to your tasks.`
                : `Added ${tasks.length} tasks.`,
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            text: extractErrorMessage(err, 'Could not create task(s)'),
          },
        ]);
      } finally {
        setCreating(false);
        scrollToEnd();
      }
    },
    [scrollToEnd],
  );

  const createFromSchedule = useCallback(
    async (slots: PlanScheduleSlot[]) => {
      const tasks: PlanTaskDraft[] = slots.map((s) => ({
        title: s.task,
        priority: s.priority,
        deadline: toDeadlineISO(s.time) ?? '',
      }));
      await createFromTasks(tasks);
    },
    [createFromTasks],
  );

  const renderItem = useCallback(
    ({ item }: { item: Msg }) => {
      const plan = item.plan;
      return (
        <View>
          <ChatBubble role={item.role} text={item.text} pending={item.pending} />

          {plan?.type === 'question' && plan.questions.length > 0 && (
            <View style={styles.qBlock}>
              {plan.questions.map((q, i) => (
                <Text
                  key={i}
                  style={[styles.qLine, { color: colors.textMuted }]}
                >
                  • {q}
                </Text>
              ))}
            </View>
          )}

          {(plan?.type === 'create_task' || plan?.type === 'create_tasks') &&
            plan.tasks.length > 0 && (
              <View
                style={[
                  styles.previewBox,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                {plan.tasks.map((t, i) => (
                  <View key={`${i}-${t.title}`} style={styles.previewRow}>
                    <Text style={[styles.previewTitle, { color: colors.text }]}>
                      {t.title}
                    </Text>
                    <Text style={[styles.previewMeta, { color: colors.textMuted }]}>
                      {t.priority}
                      {t.deadline
                        ? ` · ${new Date(t.deadline).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })}`
                        : ''}
                      {t.recurrence ? ` · ↻ ${t.recurrence}` : ''}
                    </Text>
                  </View>
                ))}
                <Pressable
                  onPress={() => createFromTasks(plan.tasks)}
                  disabled={creating}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: pressed || creating ? 0.7 : 1,
                    },
                  ]}
                >
                  {creating ? (
                    <ActivityIndicator color={colors.primaryText} />
                  ) : (
                    <Text style={{ color: colors.primaryText, fontWeight: '700' }}>
                      {plan.tasks.length === 1 ? 'Add task' : `Add ${plan.tasks.length} tasks`}
                    </Text>
                  )}
                </Pressable>
              </View>
            )}

          {plan?.type === 'schedule' && plan.schedule.length > 0 && (
            <View
              style={[
                styles.previewBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {plan.schedule.map((s, i) => (
                <View key={`${i}-${s.time}`} style={styles.scheduleRow}>
                  <Text style={[styles.scheduleTime, { color: colors.primary }]}>
                    {s.time}
                  </Text>
                  <Text style={[styles.scheduleTask, { color: colors.text }]} numberOfLines={2}>
                    {s.task}
                  </Text>
                </View>
              ))}
              <Pressable
                onPress={() => createFromSchedule(plan.schedule)}
                disabled={creating}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed || creating ? 0.7 : 1,
                  },
                ]}
              >
                {creating ? (
                  <ActivityIndicator color={colors.primaryText} />
                ) : (
                  <Text style={{ color: colors.primaryText, fontWeight: '700' }}>
                    Add {plan.schedule.length} tasks to today
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      );
    },
    [colors, creating, createFromTasks, createFromSchedule],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Header
        title="AI Assistant"
        subtitle="Tell me a task — I'll ask if anything's unclear"
        actions={[
          {
            label: showHours ? 'Hours ▴' : 'Hours ▾',
            onPress: () => setShowHours((v) => !v),
          },
        ]}
      />

      {showHours && (
        <View style={[styles.formRow, { borderColor: colors.border }]}>
          <View style={styles.hourGroup}>
            <Text style={[styles.hourLabel, { color: colors.textMuted }]}>Start</Text>
            <TextInput
              value={startHour}
              onChangeText={setStartHour}
              keyboardType="number-pad"
              maxLength={2}
              style={[
                styles.hourInput,
                {
                  color: colors.text,
                  borderColor: colors.inputBorder,
                  backgroundColor: colors.inputBg,
                },
              ]}
            />
          </View>
          <Text style={{ color: colors.textMuted }}>—</Text>
          <View style={styles.hourGroup}>
            <Text style={[styles.hourLabel, { color: colors.textMuted }]}>End</Text>
            <TextInput
              value={endHour}
              onChangeText={setEndHour}
              keyboardType="number-pad"
              maxLength={2}
              style={[
                styles.hourInput,
                {
                  color: colors.text,
                  borderColor: colors.inputBorder,
                  backgroundColor: colors.inputBg,
                },
              ]}
            />
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          onContentSizeChange={scrollToEnd}
        />

        <View style={styles.inputWrap}>
          <InputBox
            placeholder='e.g. "Dinner at 10pm" or "Buy milk"'
            value={input}
            onChangeText={setInput}
            onSend={handleSend}
            sending={sending}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  inputWrap: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 6 : 10,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  hourGroup: {
    flex: 1,
  },
  hourLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  hourInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    textAlign: 'center',
  },
  qBlock: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    marginTop: -4,
  },
  qLine: {
    fontSize: 13,
    paddingVertical: 2,
  },
  previewBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  previewRow: {
    paddingVertical: 6,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewMeta: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  scheduleRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    gap: 12,
    alignItems: 'center',
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
  actionBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
});

export default AIChatScreen;
