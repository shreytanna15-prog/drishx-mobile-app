import { BACKEND_BASE_URL } from '@/lib/api-config';

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
  singleVisionLens?: { sph: number | string; cyl: number | string | null } | null;
  kryptokLens?: { sph: number | string; cyl: number | string | null; axis: number | null; add: number | string } | null;
  progressiveLens?: {
    sph: number | string;
    cyl: number | string | null;
    axis: number | null;
    add: number | string;
    eye: string;
  } | null;
};

export type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  userId: string;
  orderId: string;
  amount: number | string;
  status: 'PAID' | 'UNPAID' | string;
  issuedAt: string;
  createdAt: string;
  updatedAt?: string;
  user?: InvoiceUser;
  order?: InvoiceOrder;
};

export async function fetchInvoices(headers: Record<string, string>): Promise<InvoiceRecord[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/invoices`, { headers });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || 'Failed to load invoices.');
  }
  return response.json();
}

export async function fetchInvoiceById(id: string, headers: Record<string, string>): Promise<InvoiceRecord> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/invoices/${id}`, { headers });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to load invoice.');
  }
  return result as InvoiceRecord;
}
