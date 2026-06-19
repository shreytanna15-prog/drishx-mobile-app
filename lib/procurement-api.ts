import { BACKEND_BASE_URL } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-request';
import type { ApiLensType } from '@/lib/types/lens';

export type ProcurementRecord = {
  id: string;
  reference: string;
  amount: number | string;
  currency: string;
  description: string | null;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
};

export type StockIntakePayload = {
  lensType: ApiLensType;
  lensId: string;
  quantityAdded: number;
  /** Total purchase amount for this line (procurement expense). */
  amount: number;
  /** Unit cost stored on the lens record. */
  costPrice: number;
  /** Customer selling price stored on the lens record. */
  sellingPrice: number;
  description?: string;
  /** When set, transitions the linked AWAITING_PROCUREMENT order after stock intake. */
  orderId?: string;
};

export type StockIntakeBatchPayload = {
  notes?: string;
  items: StockIntakePayload[];
};

export type StockIntakeBatchResult = {
  batchReference: string;
  totalAmount: number;
  itemCount: number;
  results: {
    transaction: ProcurementRecord;
    lens: { id: string; quantity: number };
  }[];
};

export type ManualExpensePayload = {
  amount: number;
  description: string;
};

export async function fetchProcurementHistory(
  headers: Record<string, string>
): Promise<ProcurementRecord[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/expenses/procurement`, { headers });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || 'Failed to load procurement history.');
  }

  return result;
}

export async function recordStockIntake(
  payload: StockIntakePayload,
  headers: Record<string, string>
): Promise<{ transaction: ProcurementRecord; lens: { id: string; quantity: number } }> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/expenses/procurement`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    queueWhenOffline: true,
    queueLabel: 'Record stock intake',
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || 'Failed to record stock intake.');
  }

  return result;
}

export async function recordStockIntakeBatch(
  payload: StockIntakeBatchPayload,
  headers: Record<string, string>
): Promise<StockIntakeBatchResult> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/expenses/procurement`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    queueWhenOffline: true,
    queueLabel: 'Record stock intake',
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || 'Failed to record stock intake batch.');
  }

  return result;
}

export async function recordManualExpense(
  payload: ManualExpensePayload,
  headers: Record<string, string>
): Promise<ProcurementRecord> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/expenses/manual`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    queueWhenOffline: true,
    queueLabel: 'Record expense',
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || 'Failed to record manual expense.');
  }

  return result;
}

export async function fetchManualExpenses(
  headers: Record<string, string>
): Promise<ProcurementRecord[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/expenses/manual`, { headers });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || 'Failed to load manual expenses.');
  }

  return result;
}
