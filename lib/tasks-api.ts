import { BACKEND_BASE_URL } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-request';

export type TaskStatus = 'PENDING' | 'COMPLETED';

export type TaskRecord = {
  id: string;
  title: string;
  details?: string | null;
  dueDate: string;
  status: TaskStatus;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export async function fetchMyTasks(headers: Record<string, string>): Promise<TaskRecord[]> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/tasks`, {
    headers,
    authenticated: true,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || 'Failed to load tasks.');
  }
  return response.json();
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  headers: Record<string, string>
): Promise<TaskRecord> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
    queueWhenOffline: true,
    queueLabel: 'Update task',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to update task.');
  }
  return result as TaskRecord;
}
