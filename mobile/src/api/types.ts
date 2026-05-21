export type TodoStatus = 'pending' | 'in_progress' | 'completed';
export type TodoPriority = 'low' | 'medium' | 'high';
export type TodoRecurrence = 'daily' | 'weekly' | 'monthly';

export type User = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type Todo = {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  due_date?: string | null;
  recurrence?: TodoRecurrence | null;
  last_completed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type TodoCreatePayload = {
  title: string;
  description?: string | null;
  status?: TodoStatus;
  priority?: TodoPriority;
  due_date?: string | null;
  recurrence?: TodoRecurrence | null;
};

export type TodoUpdatePayload = Partial<TodoCreatePayload>;

export type TodoListParams = {
  status?: TodoStatus;
  priority?: TodoPriority;
  q?: string;
  sort?: 'due_date_asc' | 'due_date_desc' | 'created_asc' | 'created_desc';
};

// ---- AI ----

export type ParsedTask = {
  title: string;
  subtasks: string[];
  deadline: string;
  priority: TodoPriority | '';
  recurrence?: TodoRecurrence | '';
};

export type ScheduleTaskInput = {
  title: string;
  priority?: TodoPriority;
  deadline?: string;
  duration_minutes?: number;
};

export type ScheduledSlot = {
  time: string;
  task: string;
};

export type ChatIntent =
  | 'create_task'
  | 'list_tasks'
  | 'complete_task'
  | 'schedule'
  | 'summary'
  | 'smalltalk'
  | 'other'
  | string;

export type ChatResponse = {
  intent: ChatIntent;
  response: string;
  actions: Record<string, unknown>;
};

// ---- /ai/plan (smart scheduler) ----

export type PlanChatTurn = {
  role: 'user' | 'assistant';
  text: string;
};

export type PlanExistingTask = {
  title: string;
  priority?: TodoPriority;
  due_date?: string | null;
  status?: TodoStatus;
};

export type PlanTimeRange = {
  start_hour: number;
  end_hour: number;
};

export type PlanRequest = {
  message: string;
  conversation?: PlanChatTurn[];
  existing_tasks?: PlanExistingTask[];
  time_range?: PlanTimeRange;
};

export type PlanTaskDraft = {
  title: string;
  priority: TodoPriority;
  deadline: string;
  recurrence?: TodoRecurrence | '';
};

export type PlanScheduleSlot = {
  time: string;
  task: string;
  priority: TodoPriority;
};

export type PlanResponseType = 'question' | 'create_task' | 'create_tasks' | 'schedule';

export type PlanResponse = {
  type: PlanResponseType;
  message: string;
  questions: string[];
  tasks: PlanTaskDraft[];
  schedule: PlanScheduleSlot[];
};
