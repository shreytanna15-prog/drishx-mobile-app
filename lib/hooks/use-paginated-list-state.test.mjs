import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function mergePaginatedItems(prev, page) {
  if (page.page <= 1) return page.items;
  const seen = new Set(prev.map((row) => row.id));
  const merged = [...prev];
  for (const row of page.items) {
    if (!seen.has(row.id)) merged.push(row);
  }
  return merged;
}

function applyPaginatedPageSuccess(prev, page) {
  if (page.page > 1 && prev.length === 0) return prev;
  return mergePaginatedItems(prev, page);
}

describe("usePaginatedListState helpers (mobile)", () => {
  it("page 1 replaces; later pages append with dedupe", () => {
    assert.deepEqual(
      mergePaginatedItems([{ id: "a" }], { page: 1, items: [{ id: "b" }] }),
      [{ id: "b" }]
    );
    assert.deepEqual(
      mergePaginatedItems([{ id: "a" }], {
        page: 2,
        items: [{ id: "a" }, { id: "c" }],
      }).map((r) => r.id),
      ["a", "c"]
    );
  });

  it("drops stale append after filter reset", () => {
    assert.deepEqual(
      applyPaginatedPageSuccess([], { page: 2, items: [{ id: "x" }] }),
      []
    );
  });

  it("source keeps stale-page guard", () => {
    const src = readFileSync(
      join(root, "lib/hooks/use-paginated-list-state.ts"),
      "utf8"
    );
    assert.match(src, /applyPaginatedPageSuccess/);
    assert.match(src, /page\.page > 1 && prev\.length === 0/);
  });
});
