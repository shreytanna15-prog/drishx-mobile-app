/**
 * Local-calendar helpers for staff task due dates (Home / My Tasks).
 * Overdue = PENDING and due calendar day strictly before today (device local TZ).
 */

export type TaskDueStatus = 'PENDING' | 'COMPLETED' | string;

/** Start of the local calendar day for `date` (or now). */
export function startOfLocalDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** True when `isoDue` falls on the same local calendar day as `now`. */
export function isDueOnLocalCalendarDay(
  isoDue: string,
  now: Date = new Date()
): boolean {
  const due = new Date(isoDue);
  if (Number.isNaN(due.getTime())) return false;
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

/**
 * PENDING task whose due date's local calendar day is before today's local day.
 * Completed tasks are never overdue.
 */
export function isTaskOverdue(
  task: { dueDate: string; status: TaskDueStatus },
  now: Date = new Date()
): boolean {
  if (task.status !== 'PENDING') return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return startOfLocalDay(due).getTime() < startOfLocalDay(now).getTime();
}

export function formatTaskDueDate(isoDue: string): string {
  const d = new Date(isoDue);
  if (Number.isNaN(d.getTime())) return 'No date';
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
