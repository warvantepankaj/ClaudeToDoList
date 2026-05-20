export type TodoStatus = 'pending' | 'in_progress' | 'completed';
export type TodoPriority = 'low' | 'medium' | 'high';

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
  created_at: string;
  updated_at: string;
};

export type TodoCreatePayload = {
  title: string;
  description?: string | null;
  status?: TodoStatus;
  priority?: TodoPriority;
  due_date?: string | null;
};

export type TodoUpdatePayload = Partial<TodoCreatePayload>;

export type TodoListParams = {
  status?: TodoStatus;
  priority?: TodoPriority;
  q?: string;
  sort?: 'due_date_asc' | 'due_date_desc' | 'created_asc' | 'created_desc';
};
