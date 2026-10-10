import { BACKEND_BASE_URL } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-request';

export type NotificationType = 'ORDER_STATUS_UPDATED' | 'ORDER_PLACED' | 'TASK_ASSIGNED' | string;

export type NotificationRecord = {
  id: string;
  userId: string;
  orderId?: string | null;
  taskId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
  order?: {
    id: string;
    status: string;
    updatedAt: string;
  } | null;
  task?: {
    id: string;
    title: string;
    dueDate: string;
    status: string;
  } | null;
};

export async function fetchNotifications(headers: Record<string, string>): Promise<NotificationRecord[]> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/notifications`, {
    headers,
    authenticated: true,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || 'Failed to load notifications.');
  }
  return response.json();
}

export async function markAllNotificationsRead(headers: Record<string, string>): Promise<void> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/notifications`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({}),
    authenticated: true,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || 'Failed to mark notifications as read.');
  }
}
