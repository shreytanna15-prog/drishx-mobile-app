import { BACKEND_BASE_URL } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-request';

export type OutstandingReceivables = {
  outstanding: number;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    amountOutstanding: number | string;
  }>;
};

export type SubmitPaymentClaimPayload = {
  amount: number;
  mode?: string;
  reference?: string;
  invoiceIds?: string[];
};

export type SubmitNoBillExpensePayload = {
  amount: number;
  noBillReason: string;
  description?: string;
  category?: string;
};

/** GET /api/finance/receivables — pure api (no React / no appAlert). */
export async function fetchOutstandingReceivables(
  headers: Record<string, string>,
): Promise<OutstandingReceivables> {
  const res = await apiFetch(`${BACKEND_BASE_URL}/api/finance/receivables`, {
    headers,
    authenticated: true,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof json?.error === 'string' ? json.error : 'Failed to load',
    );
  }
  return json as OutstandingReceivables;
}

/** POST /api/finance/payments (action: claim) — pure api. */
export async function submitPaymentClaim(
  headers: Record<string, string>,
  payload: SubmitPaymentClaimPayload,
): Promise<unknown> {
  const res = await apiFetch(`${BACKEND_BASE_URL}/api/finance/payments`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    authenticated: true,
    body: JSON.stringify({
      action: 'claim',
      amount: payload.amount,
      mode: payload.mode ?? 'UPI',
      reference: payload.reference,
      invoiceIds: payload.invoiceIds,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof json?.error === 'string' ? json.error : 'Claim failed',
    );
  }
  return json;
}

/** POST /api/finance/expenses (no-bill) — pure api; queueWhenOffline preserved. */
export async function submitNoBillExpense(
  headers: Record<string, string>,
  payload: SubmitNoBillExpensePayload,
): Promise<unknown> {
  const res = await apiFetch(`${BACKEND_BASE_URL}/api/finance/expenses`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    authenticated: true,
    body: JSON.stringify({
      category: payload.category ?? 'Miscellaneous',
      amount: payload.amount,
      billAvailable: false,
      noBillReason: payload.noBillReason,
      description: payload.description ?? 'Mobile no-bill expense',
      postingClass: 'OPERATING',
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof json?.error === 'string' ? json.error : 'Expense failed',
    );
  }
  return json;
}
