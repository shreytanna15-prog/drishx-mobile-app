import { useEffect, useState } from 'react';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

/** Local-time bucket: morning 5–11:59, afternoon 12–17:59, evening 18–4:59. */
export function getTimeOfDayBucket(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

/** Re-checks the time bucket every 60s while the screen is mounted. */
export function useTimeOfDay(date?: Date): TimeOfDay {
  const [bucket, setBucket] = useState<TimeOfDay>(() =>
    getTimeOfDayBucket(date ?? new Date())
  );

  useEffect(() => {
    if (date) {
      setBucket(getTimeOfDayBucket(date));
      return;
    }

    setBucket(getTimeOfDayBucket());
    const id = setInterval(() => {
      setBucket(getTimeOfDayBucket());
    }, 60_000);
    return () => clearInterval(id);
  }, [date]);

  return bucket;
}
