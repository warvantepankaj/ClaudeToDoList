import type { Todo } from '../api/types';

const isToday = (d: Date): boolean => {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

/**
 * For lists that show "current state" of a recurring task:
 *   - If the task is recurring AND was completed today, swap in a synthetic
 *     completed snapshot dated to the completion time. This lets the user
 *     see today's check-off without exposing the freshly bumped future instance.
 *   - Otherwise return the task unchanged (so future instances stay invisible
 *     until their day arrives).
 */
export const getDisplayTask = (t: Todo): Todo => {
  if (t.recurrence && t.last_completed_at) {
    const lc = new Date(t.last_completed_at);
    if (!Number.isNaN(lc.getTime()) && isToday(lc)) {
      return { ...t, status: 'completed', due_date: t.last_completed_at };
    }
  }
  return t;
};

export const isCompletedSnapshot = (display: Todo): boolean =>
  display.status === 'completed' && !!display.recurrence;

/**
 * For "today" filters: include the task if its due_date is today,
 * OR if it's a recurring task completed today (snapshot will render),
 * OR if it's overdue and still active.
 */
export const matchesToday = (t: Todo): boolean => {
  if (t.due_date) {
    const d = new Date(t.due_date);
    if (!Number.isNaN(d.getTime()) && isToday(d)) return true;
  }
  if (t.last_completed_at) {
    const lc = new Date(t.last_completed_at);
    if (!Number.isNaN(lc.getTime()) && isToday(lc)) return true;
  }
  if (
    t.due_date &&
    new Date(t.due_date).getTime() < Date.now() &&
    t.status !== 'completed'
  ) {
    return true;
  }
  return false;
};
