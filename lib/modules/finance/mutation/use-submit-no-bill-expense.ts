import { useAuth } from '@/lib/auth';
import {
  submitNoBillExpense,
  type SubmitNoBillExpensePayload,
} from '@/lib/finance-api';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import type { MutationOptions } from '@/lib/types/api-client';

export function useSubmitNoBillExpense(
  options?: MutationOptions<unknown, SubmitNoBillExpensePayload>,
) {
  const { getAuthHeaders } = useAuth();

  return useApiMutation(
    (payload: SubmitNoBillExpensePayload) =>
      submitNoBillExpense(getAuthHeaders(), payload),
    options,
  );
}
