import type { ImageSourcePropType } from 'react-native';

import type { TimeOfDay } from '@/hooks/use-time-of-day';
import { getTimeOfDayBucket } from '@/hooks/use-time-of-day';

export type TimeOfDayGreeting =
  | 'Good Morning'
  | 'Good Afternoon'
  | 'Good Evening';

export type HeroColorScheme = 'light' | 'dark';

export const TIME_OF_DAY_HERO_IMAGES: Record<
  HeroColorScheme,
  Record<TimeOfDay, ImageSourcePropType>
> = {
  light: {
    morning: require('@/public/morning-light.jpeg'),
    afternoon: require('@/public/afternoon-light.jpeg'),
    evening: require('@/public/evening-light.jpeg'),
  },
  dark: {
    morning: require('@/public/morning-black.jpeg'),
    afternoon: require('@/public/afternoon-black.jpeg'),
    evening: require('@/public/evening-black.jpeg'),
  },
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
  bucket: TimeOfDay,
  scheme: HeroColorScheme = 'dark'
): ImageSourcePropType {
  return TIME_OF_DAY_HERO_IMAGES[scheme][bucket];
}

/** Local asset for the time-of-day home hero banner. */
export function getTimeOfDayHeroImage(
  date: Date = new Date(),
  scheme: HeroColorScheme = 'dark'
): ImageSourcePropType {
  return getTimeOfDayHeroImageFromBucket(getTimeOfDayBucket(date), scheme);
}

export function getTimeOfDayAccentIcon(
  bucket: TimeOfDay
): 'weather-sunny' | 'weather-partly-cloudy' | 'weather-night' {
  if (bucket === 'morning') return 'weather-sunny';
  if (bucket === 'afternoon') return 'weather-partly-cloudy';
  return 'weather-night';
}
