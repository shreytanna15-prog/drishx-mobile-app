import { BACKEND_BASE_URL } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-request';

export type InvoiceUser = {
  id: string;
  name: string | null;
  email: string;
  gstNumber?: string | null;
  businessName?: string | null;
  businessAddress?: string | null;
  state?: string | null;
  pincode?: string | null;
};

export type InvoiceOrder = {
  id: string;
  lensType: string;
  quantity: number;
  unitPrice: number | string;
  totalAmount: number | string;
  status: string;
  createdAt: string;
  /** Customer-selected prescription at checkout (not catalog defaults). */
  sph?: number | string | null;
  cyl?: number | string | null;
  axis?: number | null;
  add?: number | string | null;
  eye?: string | null;
  singleVisionLens?: { sph: number | string; cyl: number | string | null } | null;
  kryptokLens?: {
    sph: number | string;
    cyl: number | string | null;
    axis: number | null;
    add: number | string;
  } | null;
  progressiveLens?: {
    sph: number | string;
    cyl: number | string | null;
    axis: number | null;
    add: number | string;
    eye: string;
  } | null;
};

export type InvoiceLine = {
  description: string;
  hsnCode?: string | null;
  powerLabel?: string | null;
  lineTotal: number | string;
};

export type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  userId: string;
  orderId: string;
  amount: number | string;
  amountPaid?: number | string;
  amountOutstanding?: number | string;
  taxableAmount?: number | string;
  cgstAmount?: number | string;
  sgstAmount?: number | string;
  igstAmount?: number | string;
  status: 'PAID' | 'UNPAID' | 'ISSUED' | 'PARTIALLY_PAID' | string;
  issuedAt: string;
  createdAt: string;
  updatedAt?: string;
  user?: InvoiceUser;
  order?: InvoiceOrder;
  lines?: InvoiceLine[];
};

function formatPrescriptionParts(parts: {
  sph?: number | string | null;
  cyl?: number | string | null;
  axis?: number | null;
  add?: number | string | null;
  eye?: string | null;
}): string | null {
  const tokens: string[] = [];
  if (parts.sph != null && parts.sph !== '') tokens.push(`SPH ${parts.sph}`);
  if (parts.cyl != null && parts.cyl !== '') tokens.push(`CYL ${parts.cyl}`);
  if (parts.axis != null) tokens.push(`AXIS ${parts.axis}`);
  if (parts.add != null && parts.add !== '') tokens.push(`ADD ${parts.add}`);
  const eye = typeof parts.eye === 'string' ? parts.eye.trim() : '';
  if (eye) tokens.push(`Eye ${eye}`);
  return tokens.length ? tokens.join(', ') : null;
}

/** Prefer checkout prescription on the order, then catalog lens defaults. */
export function formatLensOrderDetails(order: InvoiceOrder | undefined): string {
  if (!order) return '—';

  const fromOrder = formatPrescriptionParts({
    sph: order.sph,
    cyl: order.cyl,
    axis: order.axis,
    add: order.add,
    eye: order.eye,
  });
  if (fromOrder) return fromOrder;

  if (order.progressiveLens) {
    const lens = order.progressiveLens;
    return (
      formatPrescriptionParts({
        sph: lens.sph,
        cyl: lens.cyl,
        axis: lens.axis,
        add: lens.add,
        eye: lens.eye,
      }) ?? '—'
    );
  }
  if (order.kryptokLens) {
    const lens = order.kryptokLens;
    return (
      formatPrescriptionParts({
        sph: lens.sph,
        cyl: lens.cyl,
        axis: lens.axis,
        add: lens.add,
      }) ?? '—'
    );
  }
  if (order.singleVisionLens) {
    const lens = order.singleVisionLens;
    return (
      formatPrescriptionParts({
        sph: lens.sph,
        cyl: lens.cyl,
      }) ?? '—'
    );
  }
  return order.lensType || '—';
}

/**
 * FIN-01: Prefer frozen InvoiceLine.powerLabel (matches tax PDF), then order
 * prescription fields, then catalog lens defaults.
 */
export function formatInvoiceLensDetails(invoice: {
  lines?: { powerLabel?: string | null }[] | null;
  order?: InvoiceOrder | null;
}): string {
  const labels = (invoice.lines ?? [])
    .map((line) => line.powerLabel?.trim())
    .filter((label): label is string => Boolean(label));
  if (labels.length === 1) return labels[0]!;
  if (labels.length > 1) return labels.join('; ');
  return formatLensOrderDetails(invoice.order ?? undefined);
}

export async function fetchInvoices(headers: Record<string, string>): Promise<InvoiceRecord[]> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/invoices`, {
    headers,
    authenticated: true,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || 'Failed to load invoices.');
  }
  return response.json();
}

export async function fetchInvoiceById(id: string, headers: Record<string, string>): Promise<InvoiceRecord> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/invoices/${id}`, {
    headers,
    authenticated: true,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to load invoice.');
  }
  return result as InvoiceRecord;
}

/** Fetches the server tax-invoice HTML and opens the native share/save sheet as PDF. */
export async function downloadInvoicePdf(
  id: string,
  headers: Record<string, string>,
  invoiceNumber?: string
): Promise<void> {
  const Print = await import('expo-print');
  const Sharing = await import('expo-sharing');

  const response = await apiFetch(
    `${BACKEND_BASE_URL}/api/invoices/${encodeURIComponent(id)}/pdf`,
    { headers, authenticated: true }
  );
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(
      (result as { error?: string })?.error || 'Failed to download tax invoice.'
    );
  }

  const html = await response.text();
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: invoiceNumber ? `${invoiceNumber} tax invoice` : 'Tax invoice',
    UTI: 'com.adobe.pdf',
  });
}

export type InvoiceStatusFilter = 'ALL' | 'PAID' | 'UNPAID' | 'ISSUED' | 'PARTIALLY_PAID';
export type InvoiceDateFilter = 'ALL' | 'THIS_MONTH' | 'LAST_30' | 'LAST_90' | 'THIS_YEAR';
export type InvoiceSortOption = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc';

export const INVOICE_STATUS_FILTERS: { key: InvoiceStatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PAID', label: 'Paid' },
  { key: 'ISSUED', label: 'Unpaid' },
  { key: 'PARTIALLY_PAID', label: 'Partial' },
  { key: 'UNPAID', label: 'Unpaid (legacy)' },
];

export const INVOICE_DATE_FILTERS: { key: InvoiceDateFilter; label: string }[] = [
  { key: 'ALL', label: 'All dates' },
  { key: 'THIS_MONTH', label: 'This month' },
  { key: 'LAST_30', label: 'Last 30 days' },
  { key: 'LAST_90', label: 'Last 3 months' },
  { key: 'THIS_YEAR', label: 'This year' },
];

export const INVOICE_SORT_OPTIONS: { value: InvoiceSortOption; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Amount: High → Low' },
  { value: 'amount_asc', label: 'Amount: Low → High' },
];

export const DEFAULT_INVOICE_SORT: InvoiceSortOption = 'newest';

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function matchesInvoiceDateFilter(
  issuedAt: string,
  filter: InvoiceDateFilter,
  now = new Date()
): boolean {
  if (filter === 'ALL') return true;
  const issued = new Date(issuedAt);
  if (Number.isNaN(issued.getTime())) return false;

  if (filter === 'THIS_MONTH') {
    return issued.getFullYear() === now.getFullYear() && issued.getMonth() === now.getMonth();
  }
  if (filter === 'THIS_YEAR') {
    return issued.getFullYear() === now.getFullYear();
  }

  const from = startOfLocalDay(now);
  from.setDate(from.getDate() - (filter === 'LAST_30' ? 29 : 89));
  return issued >= from;
}

export function matchesInvoiceSearch(invoice: InvoiceRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const amount = Number(invoice.amount);
  const amountRaw = Number.isFinite(amount) ? String(amount) : '';
  const amountFormatted = Number.isFinite(amount) ? amount.toLocaleString('en-IN') : '';
  return [invoice.invoiceNumber, amountRaw, amountFormatted, invoice.order?.lensType]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

export function filterAndSortInvoices(
  invoices: InvoiceRecord[],
  options: {
    status: InvoiceStatusFilter;
    date: InvoiceDateFilter;
    search: string;
    sort: InvoiceSortOption;
  }
): InvoiceRecord[] {
  const filtered = invoices.filter((invoice) => {
    if (options.status !== 'ALL') {
      const unpaidLike = options.status === 'UNPAID' || options.status === 'ISSUED';
      if (unpaidLike) {
        if (
          invoice.status !== 'UNPAID' &&
          invoice.status !== 'ISSUED' &&
          invoice.status !== 'OVERDUE'
        ) {
          return false;
        }
      } else if (invoice.status !== options.status) {
        return false;
      }
    }
    if (!matchesInvoiceDateFilter(invoice.issuedAt, options.date)) return false;
    return matchesInvoiceSearch(invoice, options.search);
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    if (options.sort === 'newest' || options.sort === 'oldest') {
      const delta = new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
      return options.sort === 'newest' ? delta : -delta;
    }
    const amountDelta = (Number(b.amount) || 0) - (Number(a.amount) || 0);
    return options.sort === 'amount_desc' ? amountDelta : -amountDelta;
  });
  return sorted;
}
