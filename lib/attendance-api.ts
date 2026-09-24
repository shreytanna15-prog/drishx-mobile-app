import { BACKEND_BASE_URL } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-request';

export type AttendanceMeResponse = {
  today: {
    date: string;
    present: boolean;
    record: {
      id: string;
      method: 'QR_SCAN' | 'BY_ADMIN';
      markedAt: string;
      markedBy: { id: string; name: string | null; email: string } | null;
    } | null;
  };
  recent: Array<{
    id: string;
    date: string;
    method: 'QR_SCAN' | 'BY_ADMIN';
    markedAt: string;
    markedBy: { id: string; name: string | null; email: string } | null;
  }>;
};

export type AttendanceCalendarResponse = {
  year: number;
  month: number;
  timezone: string;
  days: Array<{
    date: string;
    presentCount: number;
    absentCount: number;
    present?: boolean;
  }>;
};

export type ScanAttendanceResult = {
  alreadyPresent: boolean;
  message: string;
};

export async function fetchAttendanceMe(
  getAuthHeaders: () => Record<string, string>
): Promise<AttendanceMeResponse> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/attendance/me`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string' ? data.error : 'Failed to load attendance.'
    );
  }
  return data as AttendanceMeResponse;
}

export async function fetchAttendanceCalendar(
  year: number,
  month: number,
  getAuthHeaders: () => Record<string, string>
): Promise<AttendanceCalendarResponse> {
  const qs = new URLSearchParams({ year: String(year), month: String(month) });
  const response = await apiFetch(
    `${BACKEND_BASE_URL}/api/attendance/calendar?${qs.toString()}`,
    { headers: getAuthHeaders() }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string' ? data.error : 'Failed to load calendar.'
    );
  }
  return data as AttendanceCalendarResponse;
}

export async function scanAttendanceQr(
  token: string,
  getAuthHeaders: () => Record<string, string>
): Promise<ScanAttendanceResult> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/attendance/scan`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string' ? data.error : 'Failed to mark attendance.'
    );
  }
  return {
    alreadyPresent: Boolean(data.alreadyPresent),
    message:
      typeof data.message === 'string' ? data.message : 'Marked present for today.',
  };
}
