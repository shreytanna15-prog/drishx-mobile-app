import type { CartItem } from '@/lib/types/lens';

export type CartPowerLine = {
  cartLineId: string;
  sphCylLabel: string;
  eye?: string;
  quantity: number;
  lineTotal: number;
  reserveLabel: string | null;
  isBackorder: boolean;
  backorderNote: string | null;
};

export type CartProductSection = {
  key: string;
  title: string;
  subtitle: string;
  totalPairs: number;
  lines: CartPowerLine[];
};

function joinParts(parts: (string | null | undefined)[]): string {
  return parts.map((part) => part?.trim()).filter(Boolean).join(' · ');
}

function getCartProductMeta(item: CartItem): { key: string; title: string; subtitle: string } {
  const lensType = item.lensType ?? 'Progressive';

  return {
    key: `${lensType}-${item.brand ?? ''}-${item.item ?? ''}-${item.coating ?? ''}`,
    title: item.brand?.trim() || lensType,
    subtitle: joinParts([lensType, item.item, item.coating]) || lensType,
  };
}

function formatSphCyl(item: CartItem): string {
  const sphCyl = `${item.sph} / ${item.cyl ?? '—'}`;
  if (item.lensType === 'Single Vision') {
    return sphCyl;
  }
  return item.add != null ? `${sphCyl} · ADD ${item.add}` : sphCyl;
}

function formatExpiresIn(expiresAt?: string): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Reservation expired';
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `Reserved · ${minutes}m left`;
  return `Reserved · ${Math.ceil(minutes / 60)}h left`;
}

function getBackorderNote(item: CartItem): string | null {
  const backorder =
    item.isBackorder ||
    (item.reservedQuantity !== undefined && item.reservedQuantity < item.cartQuantity);

  if (!backorder) return null;
  if (item.reservedQuantity === 0) {
    return 'Out of stock — will be placed for procurement';
  }
  const toProcure = item.cartQuantity - (item.reservedQuantity ?? 0);
  return `${item.reservedQuantity} reserved · ${toProcure} to procure`;
}

export function buildCartProductSections(items: CartItem[]): CartProductSection[] {
  const sections = new Map<string, CartProductSection>();

  for (const item of items) {
    const meta = getCartProductMeta(item);
    const line: CartPowerLine = {
      cartLineId: item.cartLineId,
      sphCylLabel: formatSphCyl(item),
      eye: item.eye,
      quantity: item.cartQuantity,
      lineTotal: item.price * item.cartQuantity,
      reserveLabel: formatExpiresIn(item.expiresAt),
      isBackorder: Boolean(getBackorderNote(item)),
      backorderNote: getBackorderNote(item),
    };

    const existing = sections.get(meta.key);
    if (existing) {
      existing.lines.push(line);
      existing.totalPairs += item.cartQuantity;
      continue;
    }

    sections.set(meta.key, {
      key: meta.key,
      title: meta.title,
      subtitle: meta.subtitle,
      totalPairs: item.cartQuantity,
      lines: [line],
    });
  }

  return [...sections.values()].map((section) => ({
    ...section,
    lines: section.lines.sort((a, b) => a.sphCylLabel.localeCompare(b.sphCylLabel)),
  }));
}

export function getCartSummary(items: CartItem[]) {
  const productCount = buildCartProductSections(items).length;
  const pairCount = items.reduce((sum, item) => sum + item.cartQuantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
  return { productCount, pairCount, totalAmount };
}
