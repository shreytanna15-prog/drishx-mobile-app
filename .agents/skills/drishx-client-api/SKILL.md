---
name: drishx-client-api
description: >-
  Mobile client API calling pattern without React Query — pure api functions,
  useApiQuery / useApiMutation hooks, list pagination (Paginated), summary vs
  detail DTOs, bounded offline list cache, centralized loading and error
  handling via apiFetch / authFetch. Use when adding or changing Expo screen
  data fetching, mutations, list screens, loading states, API hooks, or
  lib/*-api.ts client wrappers.
---

# DrishX Mobile — Client API Calling

**No TanStack Query / SWR.** One pattern for reads and writes. Screens never call `apiFetch` / `authFetch` directly.

This skill also covers **list/table contracts**: pagination params, `Paginated<T>`, summary vs detail DTOs, bounded offline caching, and migration rules for hot lists (orders first).

## Stack (this repo)

| Layer | Location |
|-------|----------|
| Transport | `apiFetch` in `lib/api-request.ts` (adds `X-Client`, offline queue options; uses `authFetch` when authenticated). Base URL: `BACKEND_BASE_URL` from `lib/api-config.ts`. |
| Feature API | Existing `lib/<feature>-api.ts` or `lib/modules/<feature>/api.ts` |
| Shared hooks | `lib/hooks/use-api-query.ts`, `use-api-mutation.ts` |
| Registry | `lib/constants/api-registry.ts` |
| Shared types | `lib/types/api-client.ts` (`QueryOptions`, `MutationOptions`, `Paginated`) |
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

### `QueryOptions` / `MutationOptions` / `Paginated`

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

/** Standard list envelope for list endpoints. */
export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  hasMore: boolean;
  total?: number;
};
```

- No response → `TData = void`
- No payload → `TVariables = null`
- Prefer `page` / `limit` on new list work unless a domain already standardizes on cursor.

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

## List & pagination contract

List query hooks accept **`params` as the first argument**:

```ts
type ListParams = {
  page?: number;
  limit?: number;
  status?: string;
  q?: string;
  // …role-scoped filters the API already accepts
};
```

Rules:

1. Include every request-changing param in `useApiQuery` **`deps`**.
2. Type list responses as `Paginated<OrderListItem>` (summary) for new/migrated list work.
3. UI: `loading` for first page; pull-to-refresh = refetch page 1 (`refreshing`); infinite scroll / “load more” advances `page` when `hasMore`. No second ad-hoc loading flag.
4. Status/search → server query params, not client `.filter` on a downloaded full array.
5. **Forbidden:** fetch unbounded history then filter for primary tabs when the API supports (or should support) those params.
6. Cap `limit` (e.g. 20 default); respect server max.

## List vs detail

| Surface | Type | Endpoint |
|---------|------|----------|
| Order / task list screens | Summary (`OrderListItem`, …) | Paginated list `GET` |
| Order detail | Full detail | `GET …/orders/:id` |

- List: fields needed for rows/cards only — no per-row signed image URLs or fat includes.
- Do not type list rows as full detail models.
- Detail screens keep the rich detail GET.

## Offline list caching (bounded)

- Cache **summary page(s)** or a **bounded recent set** — not an unbounded forever-growing full orders blob.
- Stale summary while offline is OK; do not require full history offline unless product explicitly demands it.
- Document cache key by filters (status/q/page) so pages do not overwrite unrelated tabs.
- Preserve existing `queueWhenOffline` / offline mutation queue behavior on api functions — do not strip those options when wrapping in hooks.
- Pull-to-refresh when online reloads page 1 and refreshes the bounded cache.

## Migration rules

1. **New screens:** hooks only — never `apiFetch` / `authFetch` / raw `fetch` in screen components.
2. **Touched list screens:** migrate to hooks + server params in the same PR.
3. **Hot paths (mandatory for RW-11):**
   - **Orders** — `fetchOrders` + order list UIs (Phase B): paginated summary, pull-to-refresh page 1, load-more, bounded offline cache
4. Opportunistic migration elsewhere; do not rewrite every screen in one PR.
5. After foundation hooks exist, reject new list screens that call transport from components.

## Gold standard hooks

### List query (paginated summary)

```ts
import { fetchOrders } from "@/lib/orders-api";
import { QUERY_REGISTRY } from "@/lib/constants/api-registry";
import { useApiQuery } from "@/lib/hooks/use-api-query";
import type { Paginated, QueryOptions } from "@/lib/types/api-client";

type ListOrdersParams = {
  page?: number;
  limit?: number;
  status?: string;
  q?: string;
};

export function useGetOrders(
  params?: ListOrdersParams,
  options?: QueryOptions<Paginated<OrderListItem>>,
) {
  return useApiQuery(
    QUERY_REGISTRY.getOrders,
    () => fetchOrders(params),
    [params?.page, params?.limit, params?.status, params?.q],
    options,
  );
}
```

### Non-list query (still valid)

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

When a procurement (or other) list gains pagination, switch it to `Paginated` + params/`deps` like orders.

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
6. Lists: `Paginated` + server filters; summary on list; detail on `GET :id`; **bounded** offline cache.
7. Migrate opportunistically; **orders** list is a mandatory hot path.
8. Respect offline queue options already used by that api function — don’t strip `queueWhenOffline` when wrapping.

## Screen shape

```tsx
const { data, loading, refreshing, error, refetch } = useGetOrders(
  { page, limit: 20, status },
  {
    onError: (e) => appAlert("Error", e.message),
  },
);
const { mutate, pending } = useCreateStockIntake({
  onSuccess: () => {
    appAlert("Saved", "Stock intake recorded.");
    void refetch();
  },
  onError: (e) => appAlert("Error", e.message),
});

if (loading) return <ActivityIndicator />;

// data.items — summary; onRefresh → page 1; onEndReached → page+1 if hasMore
```

## Checklist

- [ ] Registry entry
- [ ] Pure api function (existing `*-api.ts` OK)
- [ ] Query or mutation hook
- [ ] Screen uses `loading` / `refreshing` / `pending` / `error`
- [ ] Auth errors not alerted again
- [ ] Mutation single-arg payload
- [ ] Offline queue behavior preserved where applicable
- [ ] List hooks: `params` first; `deps` include every request param
- [ ] List response typed as `Paginated<SummaryDto>`
- [ ] Offline list cache bounded (pages / recent set), not unbounded full history
- [ ] Detail screens use detail GET / detail hook
