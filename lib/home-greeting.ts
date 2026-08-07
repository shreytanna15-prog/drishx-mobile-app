import type { ImageSourcePropType } from 'react-native';

import type { TimeOfDay } from '@/hooks/use-time-of-day';
import { getTimeOfDayBucket } from '@/hooks/use-time-of-day';

export type TimeOfDayGreeting =
  | 'Good Morning'
  | 'Good Afternoon'
  | 'Good Evening';

export const TIME_OF_DAY_HERO_IMAGES: Record<TimeOfDay, ImageSourcePropType> = {
  morning: require('@/public/morning.png'),
  afternoon: require('@/public/afternoon.png'),
  evening: require('@/public/evening.png'),
};

function getDisplayNameFallback(
  name: string | null | undefined,
  email: string
): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  const local = email.split('@')[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/** Prefer business/company name, then personal name, then email local-part. */
export function getCompanyDisplayName(
  businessName: string | null | undefined,
  name: string | null | undefined,
  email: string
): string {
  const company = businessName?.trim();
  if (company) return company;
  return getDisplayNameFallback(name, email);
}

export function getTimeOfDayGreetingFromBucket(bucket: TimeOfDay): TimeOfDayGreeting {
  if (bucket === 'morning') return 'Good Morning';
  if (bucket === 'afternoon') return 'Good Afternoon';
  return 'Good Evening';
}

/** Local-time greeting: Morning 5–11, Afternoon 12–17, Evening 18–4. */
export function getTimeOfDayGreeting(
  date: Date = new Date()
): TimeOfDayGreeting {
  return getTimeOfDayGreetingFromBucket(getTimeOfDayBucket(date));
}

export function getTimeOfDayTaglineFromBucket(bucket: TimeOfDay): string {
  if (bucket === 'morning') return "Let's make today more productive!";
  if (bucket === 'afternoon') return 'Clear mind. Better focus.';
  return 'Great vision. Stronger tomorrow.';
}

/** Taglines matching the lifestyle hero assets. */
export function getTimeOfDayTagline(date: Date = new Date()): string {
  return getTimeOfDayTaglineFromBucket(getTimeOfDayBucket(date));
}

export function getTimeOfDayHeroImageFromBucket(
  bucket: TimeOfDay
): ImageSourcePropType {
  return TIME_OF_DAY_HERO_IMAGES[bucket];
}

/** Local asset for the time-of-day home hero banner. */
export function getTimeOfDayHeroImage(
  date: Date = new Date()
): ImageSourcePropType {
  return getTimeOfDayHeroImageFromBucket(getTimeOfDayBucket(date));
}

export function getTimeOfDayAccentIcon(
  bucket: TimeOfDay
): 'wb-sunny' | 'wb-cloudy' | 'nights-stay' {
  if (bucket === 'morning') return 'wb-sunny';
  if (bucket === 'afternoon') return 'wb-cloudy';
  return 'nights-stay';
}
