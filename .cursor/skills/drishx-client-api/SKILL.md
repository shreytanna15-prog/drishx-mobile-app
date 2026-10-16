---
name: drishx-client-api
description: >-
  Mobile client API calling pattern without React Query — pure api functions,
  useApiQuery / useApiMutation hooks, centralized loading and error handling via
  apiFetch / authFetch. Use when adding or changing Expo screen data fetching,
  mutations, loading states, API hooks, or lib/*-api.ts client wrappers.
---

# DrishX Mobile — Client API Calling

**No TanStack Query / SWR.** One pattern for reads and writes. Screens never call `apiFetch` / `authFetch` directly.

## Stack (this repo)

| Layer | Location |
|-------|----------|
| Transport | `apiFetch` in `lib/api-request.ts` (adds `X-Client`, offline queue options; uses `authFetch` when authenticated). Base URL: `BACKEND_BASE_URL` from `lib/api-config.ts`. |
| Feature API | Existing `lib/<feature>-api.ts` or `lib/modules/<feature>/api.ts` |
| Shared hooks | `lib/hooks/use-api-query.ts`, `use-api-mutation.ts` |
| Registry | `lib/constants/api-registry.ts` |
| Shared types | `lib/types/api-client.ts` |
| User-facing errors | `appAlert` from `lib/app-alert` — use from `onError` / `onSuccess` options, not inside api files |

## Folder rules

1. **`api`** — pure async functions (no React, no `appAlert`).
2. **`types`** — Payload / Response / Params.
3. **`query`** — `use-get-<entity>.ts` → `useApiQuery`.
4. **`mutation`** — `use-<action>-<entity>.ts` → `useApiMutation`.

Incremental OK: keep `lib/orders-api.ts`, `lib/cart-api.ts`, `lib/procurement-api.ts`, etc.; add hooks when touching a screen.

```
lib/modules/<feature>/
  api.ts
  types.ts
  query/use-get-procurement-orders.ts
  mutation/use-create-stock-intake.ts
```

## Shared primitives (create once if missing)

### `QueryOptions` / `MutationOptions`

```ts
// lib/types/api-client.ts
export type QueryOptions<TData> = {
  enabled?: boolean;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
};

export type MutationOptions<TData, TVariables> = {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
};
```

- No response → `TData = void`
- No payload → `TVariables = null`

### Registry

```ts
// lib/constants/api-registry.ts
export const QUERY_REGISTRY = {
  getOrders: "getOrders",
  getProcurementOrders: "getProcurementOrders",
} as const;

export const MUTATION_REGISTRY = {
  createStockIntake: "createStockIntake",
} as const;
```

### `useApiQuery` / `useApiMutation`

Under `lib/hooks/`. Contract:

| | Query | Mutation |
|---|--------|----------|
| Trigger | mount + deps (if enabled) | `mutate(variables)` |
| Loading | `loading` / `refreshing` | `pending` |
| Error | `error` | `error` |
| Retry | `refetch()` | call `mutate` again |

**401 / auth:** do not `appAlert` — `authFetch` refresh / session failure already handled. Skip UI `onError` for auth failures.

**Offline queue:** `OfflineQueuedError` from `apiFetch` is a special success-ish path — surface via `onError` or dedicated handling with a clear “saved offline” message; do not treat as a generic hard failure unless product requires it.

**Other errors:** default pattern is `onError: (e) => appAlert('Error', e.message)` from the screen or a thin wrapper; api files stay silent.

## Gold standard hooks

### Query

```ts
import { listProcurementOrders } from "@/lib/procurement-api";
import { QUERY_REGISTRY } from "@/lib/constants/api-registry";
import { useApiQuery } from "@/lib/hooks/use-api-query";
import type { QueryOptions } from "@/lib/types/api-client";

export function useGetProcurementOrders(
  options?: QueryOptions<ProcurementRecord[]>,
) {
  return useApiQuery(
    QUERY_REGISTRY.getProcurementOrders,
    () => listProcurementOrders(),
    [],
    options,
  );
}
```

Params as 1st arg when needed; `options` last.

### Mutation

```ts
export function useCreateStockIntake(
  options?: MutationOptions<StockIntakeBatchResult, StockIntakeBatchPayload>,
) {
  return useApiMutation((payload) => createStockIntakeBatch(payload), options);
}
```

**Strict payload rule:** one argument. Id + body → `{ id, data }`.

## Essential rules

1. Screens → hooks only. Never `apiFetch` / `authFetch` / raw `fetch` in screen components.
2. Api files build full URLs with `BACKEND_BASE_URL` and call `apiFetch` (set `authenticated: true` when required).
3. Loading/error from hook flags — no duplicated `useState`/`useEffect` fetch in screens for new work.
4. Non-auth errors → `error` state + `appAlert` via `onError` when the user must notice.
5. No React Query / Axios for new work.
6. Migrate opportunistically when editing a screen.
7. Respect offline queue options already used by that api function — don’t strip `queueWhenOffline` when wrapping.

## Screen shape

```tsx
const { data, loading, error, refetch } = useGetProcurementOrders({
  onError: (e) => appAlert("Error", e.message),
});
const { mutate, pending } = useCreateStockIntake({
  onSuccess: () => {
    appAlert("Saved", "Stock intake recorded.");
    void refetch();
  },
  onError: (e) => appAlert("Error", e.message),
});

if (loading) return <ActivityIndicator />;
```

## Checklist

- [ ] Registry entry
- [ ] Pure api function (existing `*-api.ts` OK)
- [ ] Query or mutation hook
- [ ] Screen uses `loading` / `pending` / `error`
- [ ] Auth errors not alerted again
- [ ] Mutation single-arg payload
- [ ] Offline queue behavior preserved where applicable
