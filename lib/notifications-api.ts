import { BACKEND_BASE_URL } from '@/lib/api-config';

export type NotificationRecord = {
  id: string;
  userId: string;
  orderId?: string | null;
  type: 'ORDER_STATUS_UPDATED' | string;
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
};

export async function fetchNotifications(headers: Record<string, string>): Promise<NotificationRecord[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/notifications`, { headers });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || 'Failed to load notifications.');
  }
  return response.json();
}
