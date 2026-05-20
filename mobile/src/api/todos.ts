import { api } from './client';
import type { Todo, TodoCreatePayload, TodoListParams, TodoUpdatePayload } from './types';

export const listTodos = async (params: TodoListParams = {}) => {
  const { data } = await api.get<Todo[]>('/todos', { params });
  return data;
};

export const createTodo = async (payload: TodoCreatePayload) => {
  const { data } = await api.post<Todo>('/todos', payload);
  return data;
};

export const updateTodo = async (id: string, payload: TodoUpdatePayload) => {
  const { data } = await api.put<Todo>(`/todos/${id}`, payload);
  return data;
};

export const deleteTodo = async (id: string) => {
  await api.delete(`/todos/${id}`);
};

export const getTodo = async (id: string) => {
  const { data } = await api.get<Todo>(`/todos/${id}`);
  return data;
};
