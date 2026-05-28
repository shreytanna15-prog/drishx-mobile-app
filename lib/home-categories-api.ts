import { BACKEND_BASE_URL } from '@/lib/api-config';
import type { FilterOption } from '@/lib/types/lens';

type RawLens = {
  id: string;
  category?: string | null;
  brand?: string | null;
  item?: string | null;
};

type LegacyLensesResponse = {
  kryptok?: RawLens[];
  progressive?: RawLens[];
  singleVision?: RawLens[];
};

export type HomeCategoryCard = {
  id: string;
  label: string;
  filter: FilterOption;
};

function toSentenceCase(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!compact) return '';
  return compact.charAt(0).toUpperCase() + compact.slice(1);
}

function toLabel(raw: RawLens): string {
  const category = raw.category?.trim();
  if (category) return toSentenceCase(category);
  const brand = raw.brand?.trim();
  if (brand) return toSentenceCase(brand);
  const item = raw.item?.trim();
  if (item) return toSentenceCase(item);
  return 'Lens';
}

export async function fetchHomeCategoryCards(): Promise<HomeCategoryCard[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/lenses`);
  if (!response.ok) {
    throw new Error('Failed to load categories');
  }

  const data = (await response.json()) as LegacyLensesResponse;
  const cards: HomeCategoryCard[] = [{ id: 'all-lenses-db', label: 'All lenses', filter: 'All' }];
  const seen = new Set<string>();
  seen.add('all lenses');

  const pushUnique = (rows: RawLens[] | undefined, filter: FilterOption) => {
    if (!rows) return;
    for (const row of rows) {
      const label = toLabel(row);
      if (label.toLowerCase() === 'lens') continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({ id: `${filter}-${row.id}`, label, filter });
    }
  };

  pushUnique(data.singleVision, 'Single Vision');
  pushUnique(data.kryptok, 'Kryptok');
  pushUnique(data.progressive, 'Progressive');

  return cards.slice(0, 12);
}
