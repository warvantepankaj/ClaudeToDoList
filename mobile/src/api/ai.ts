import { api } from './client';
import type {
  ChatResponse,
  ParsedTask,
  PlanRequest,
  PlanResponse,
  ScheduleTaskInput,
  ScheduledSlot,
} from './types';

export const parseTaskAI = async (text: string): Promise<ParsedTask> => {
  const { data } = await api.post<ParsedTask>('/ai/parse-task', { text });
  return data;
};

export const scheduleDayAI = async (
  tasks: ScheduleTaskInput[],
  opts: { start_hour?: number; end_hour?: number } = {},
): Promise<ScheduledSlot[]> => {
  const { data } = await api.post<ScheduledSlot[]>('/ai/schedule-day', {
    tasks,
    start_hour: opts.start_hour ?? 9,
    end_hour: opts.end_hour ?? 18,
  });
  return data;
};

export const chatAI = async (
  message: string,
  context?: Record<string, unknown>,
): Promise<ChatResponse> => {
  const { data } = await api.post<ChatResponse>('/ai/chat', { message, context });
  return data;
};

export const planAI = async (payload: PlanRequest): Promise<PlanResponse> => {
  const { data } = await api.post<PlanResponse>('/ai/plan', payload);
  return data;
};
