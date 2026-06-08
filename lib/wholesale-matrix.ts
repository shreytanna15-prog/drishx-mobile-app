import { formatPowerLabel } from '@/lib/cart-utils';
import { formatAxisValue } from '@/lib/lens-display';
import { isAllowedCompoundCombo, powerKey, type WholesaleGridMode } from '@/lib/wholesale-powers';

export const MATRIX_INITIAL_ROWS = 10;
export const MATRIX_INITIAL_COLS = 10;
export const MATRIX_LOAD_MORE_ROWS = 5;
export const MATRIX_LOAD_MORE_COLS = 5;

export type MatrixCell = {
  key: string;
  subLabel?: string;
};

/** One rendered matrix row (SPH, CYL, or SPH+ADD for compound bifocal). */
export type WholesaleMatrixRow = {
  id: string;
  label: string;
  subLabel?: string;
  power?: number;
  sph?: number;
  add?: number;
};

export type WholesaleMatrixSpec = {
  rows: WholesaleMatrixRow[];
  cols: number[];
  rowHeader: string;
  colHeader: string;
  formatCol: (value: number) => string;
  cellsAt: (row: WholesaleMatrixRow, colValue: number) => MatrixCell[];
};

export type GridEntry = {
  key: string;
  label: string;
  sph: number;
  cyl: number | null;
  add: number | null;
  sphAdd: number | null;
  cylAdd: number | null;
  axis: number | null;
};

export type BuildMatrixParams = {
  mode: WholesaleGridMode;
  isBifocalLens: boolean;
  isSingleVision: boolean;
  sphList: number[];
  cylList: number[];
  /** Shared ADD range for Kryptok / Progressive (applies to both SPH and CYL). */
  addList: number[];
  selectedAxis: number;
};

export function qtyKeyCompound(sph: number, cyl: number) {
  return `${powerKey(sph)}|${powerKey(cyl)}`;
}

export function qtyKeySphAdd(sph: number, add: number) {
  return `${powerKey(sph)}|add:${powerKey(add)}`;
}

export function qtyKeyCylAxisAdd(cyl: number, axis: number, add: number) {
  return `${powerKey(cyl)}|axis:${axis}|add:${powerKey(add)}`;
}

/** Compound Kryptok / Progressive: one ADD value shared for SPH and CYL. */
export function qtyKeyCompoundBifocal(
  sph: number,
  cyl: number,
  axis: number,
  add: number
) {
  return `${powerKey(sph)}|${powerKey(cyl)}|axis:${axis}|add:${powerKey(add)}`;
}

/** @deprecated Use qtyKeyCompoundBifocal */
export function qtyKeyCompoundKryptok(
  sph: number,
  cyl: number,
  axis: number,
  add: number,
  _cylAdd?: number
) {
  return qtyKeyCompoundBifocal(sph, cyl, axis, add);
}

function compoundRowValues(sphList: number[], cylList: number[], isSingleVision: boolean): number[] {
  return sphList.filter((sph) =>
    cylList.some((cyl) => !isSingleVision || isAllowedCompoundCombo(sph, cyl))
  );
}

function powerRow(value: number): WholesaleMatrixRow {
  return { id: powerKey(value), label: formatPowerLabel(value), power: value };
}

function compoundBifocalRows(sphList: number[], addList: number[]): WholesaleMatrixRow[] {
  const rows: WholesaleMatrixRow[] = [];
  for (const sph of sphList) {
    for (const add of addList) {
      rows.push({
        id: `${powerKey(sph)}|add:${powerKey(add)}`,
        label: formatPowerLabel(sph),
        subLabel: addList.length > 1 ? formatPowerLabel(add) : undefined,
        sph,
        add,
      });
    }
  }
  return rows;
}

export function buildWholesaleMatrixSpec(params: BuildMatrixParams): WholesaleMatrixSpec | null {
  const {
    mode,
    isBifocalLens,
    isSingleVision,
    sphList,
    cylList,
    addList,
    selectedAxis,
  } = params;

  if (mode === 'sph-only') {
    const cols = isBifocalLens ? addList : [0];
    if (sphList.length === 0 || cols.length === 0) return null;
    return {
      rows: sphList.map((sph) => powerRow(sph)),
      cols,
      rowHeader: 'SPH',
      colHeader: isBifocalLens ? 'ADD' : 'QTY',
      formatCol: (value) => (isBifocalLens ? formatPowerLabel(value) : '—'),
      cellsAt: (row, col) => {
        const sph = row.power;
        if (sph == null) return [];
        if (isBifocalLens) {
          return [{ key: qtyKeySphAdd(sph, col) }];
        }
        return [{ key: powerKey(sph) }];
      },
    };
  }

  if (mode === 'cyl-only') {
    const cols = isBifocalLens ? addList : [0];
    if (cylList.length === 0 || cols.length === 0) return null;
    return {
      rows: cylList.map((cyl) => powerRow(cyl)),
      cols,
      rowHeader: 'CYL',
      colHeader: isBifocalLens ? 'ADD' : 'QTY',
      formatCol: (value) => (isBifocalLens ? formatPowerLabel(value) : '—'),
      cellsAt: (row, col) => {
        const cyl = row.power;
        if (cyl == null) return [];
        if (isBifocalLens) {
          return [{ key: qtyKeyCylAxisAdd(cyl, selectedAxis, col) }];
        }
        return [{ key: powerKey(cyl) }];
      },
    };
  }

  if (mode === 'compound') {
    if (sphList.length === 0 || cylList.length === 0) return null;
    const sphRows = compoundRowValues(sphList, cylList, isSingleVision);
    if (sphRows.length === 0) return null;

    if (isBifocalLens) {
      return {
        rows: compoundBifocalRows(sphRows, addList),
        cols: cylList,
        rowHeader: 'SPH',
        colHeader: 'CYL',
        formatCol: formatPowerLabel,
        cellsAt: (row, cyl) => {
          const sph = row.sph;
          const add = row.add;
          if (sph == null || add == null) return [];
          if (!isAllowedCompoundCombo(sph, cyl)) return [];
          return [{ key: qtyKeyCompoundBifocal(sph, cyl, selectedAxis, add) }];
        },
      };
    }

    return {
      rows: sphRows.map((sph) => powerRow(sph)),
      cols: cylList,
      rowHeader: 'SPH',
      colHeader: 'CYL',
      formatCol: formatPowerLabel,
      cellsAt: (row, cyl) => {
        const sph = row.power;
        if (sph == null) return [];
        if (isSingleVision && !isAllowedCompoundCombo(sph, cyl)) return [];
        return [{ key: qtyKeyCompound(sph, cyl) }];
      },
    };
  }

  return null;
}

export function resolveGridEntryFromKey(key: string, params: BuildMatrixParams): GridEntry | null {
  const { mode, isBifocalLens, selectedAxis } = params;

  if (mode === 'sph-only') {
    if (isBifocalLens) {
      const match = key.match(/^([^|]+)\|add:(.+)$/);
      if (!match) return null;
      const sph = Number(match[1]);
      const add = Number(match[2]);
      if (!Number.isFinite(sph) || !Number.isFinite(add)) return null;
      return {
        key,
        label: `SPH ${formatPowerLabel(sph)} · ADD ${formatPowerLabel(add)}`,
        sph,
        cyl: null,
        add,
        sphAdd: add,
        cylAdd: null,
        axis: null,
      };
    }
    const sph = Number(key);
    if (!Number.isFinite(sph)) return null;
    return {
      key,
      label: formatPowerLabel(sph),
      sph,
      cyl: null,
      add: null,
      sphAdd: null,
      cylAdd: null,
      axis: null,
    };
  }

  if (mode === 'cyl-only') {
    if (isBifocalLens) {
      const match = key.match(/^([^|]+)\|axis:(\d+)\|add:(.+)$/);
      if (!match) return null;
      const cyl = Number(match[1]);
      const axis = Number(match[2]);
      const add = Number(match[3]);
      if (!Number.isFinite(cyl) || !Number.isFinite(add)) return null;
      return {
        key,
        label: `CYL ${formatPowerLabel(cyl)} · AXIS ${formatAxisValue(axis)} · ADD ${formatPowerLabel(add)}`,
        sph: 0,
        cyl,
        add,
        sphAdd: null,
        cylAdd: add,
        axis,
      };
    }
    const cyl = Number(key);
    if (!Number.isFinite(cyl)) return null;
    return {
      key,
      label: formatPowerLabel(cyl),
      sph: 0,
      cyl,
      add: null,
      sphAdd: null,
      cylAdd: null,
      axis: null,
    };
  }

  if (mode === 'compound') {
    if (isBifocalLens) {
      const sharedAddMatch = key.match(/^([^|]+)\|([^|]+)\|axis:(\d+)\|add:(.+)$/);
      if (sharedAddMatch) {
        const sph = Number(sharedAddMatch[1]);
        const cyl = Number(sharedAddMatch[2]);
        const axis = Number(sharedAddMatch[3]);
        const add = Number(sharedAddMatch[4]);
        if (![sph, cyl, add].every(Number.isFinite)) return null;
        return {
          key,
          label: `SPH ${formatPowerLabel(sph)} · CYL ${formatPowerLabel(cyl)} · ADD ${formatPowerLabel(add)} · AXIS ${formatAxisValue(axis)}`,
          sph,
          cyl,
          add,
          sphAdd: add,
          cylAdd: add,
          axis,
        };
      }
      const legacyMatch = key.match(/^([^|]+)\|([^|]+)\|axis:(\d+)\|sphAdd:([^|]+)\|cylAdd:(.+)$/);
      if (!legacyMatch) return null;
      const sph = Number(legacyMatch[1]);
      const cyl = Number(legacyMatch[2]);
      const axis = Number(legacyMatch[3]);
      const sphAdd = Number(legacyMatch[4]);
      const cylAdd = Number(legacyMatch[5]);
      if (![sph, cyl, sphAdd, cylAdd].every(Number.isFinite)) return null;
      const add = sphAdd;
      return {
        key,
        label: `SPH ${formatPowerLabel(sph)} · CYL ${formatPowerLabel(cyl)} · ADD ${formatPowerLabel(add)} · AXIS ${formatAxisValue(axis)}`,
        sph,
        cyl,
        add,
        sphAdd: add,
        cylAdd: add,
        axis,
      };
    }
    const match = key.match(/^([^|]+)\|([^|]+)$/);
    if (!match) return null;
    const sph = Number(match[1]);
    const cyl = Number(match[2]);
    if (!Number.isFinite(sph) || !Number.isFinite(cyl)) return null;
    return {
      key,
      label: `SPH ${formatPowerLabel(sph)} / CYL ${formatPowerLabel(cyl)}`,
      sph,
      cyl,
      add: null,
      sphAdd: null,
      cylAdd: null,
      axis: null,
    };
  }

  return null;
}

export function countMatrixCells(spec: WholesaleMatrixSpec): number {
  let count = 0;
  for (const row of spec.rows) {
    for (const col of spec.cols) {
      count += spec.cellsAt(row, col).length;
    }
  }
  return count;
}

export function countVisibleMatrixCells(
  spec: WholesaleMatrixSpec,
  visibleRowCount: number,
  visibleColCount: number
): number {
  let count = 0;
  const rows = spec.rows.slice(0, visibleRowCount);
  const cols = spec.cols.slice(0, visibleColCount);
  for (const row of rows) {
    for (const col of cols) {
      count += spec.cellsAt(row, col).length;
    }
  }
  return count;
}

const QTY_MAP_CHUNK_SIZE = 250;

/** Build qty map in chunks so the UI stays responsive on large ranges. */
export async function buildWholesaleQtyMap(
  params: BuildMatrixParams,
  defaultPairs: number
): Promise<Record<string, string>> {
  const {
    mode,
    isBifocalLens,
    isSingleVision,
    sphList,
    cylList,
    addList,
    selectedAxis,
  } = params;
  const pairsText = String(defaultPairs);
  const next: Record<string, string> = {};

  if (mode === 'sph-only') {
    if (isBifocalLens) {
      for (const sph of sphList) {
        for (const add of addList) {
          next[qtyKeySphAdd(sph, add)] = pairsText;
        }
      }
    } else {
      for (const sph of sphList) {
        next[powerKey(sph)] = pairsText;
      }
    }
    return next;
  }

  if (mode === 'cyl-only') {
    if (isBifocalLens) {
      for (const cyl of cylList) {
        for (const add of addList) {
          next[qtyKeyCylAxisAdd(cyl, selectedAxis, add)] = pairsText;
        }
      }
    } else {
      for (const cyl of cylList) {
        next[powerKey(cyl)] = pairsText;
      }
    }
    return next;
  }

  if (mode === 'compound') {
    if (isBifocalLens) {
      let pending = 0;
      for (const sph of sphList) {
        for (const cyl of cylList) {
          if (!isAllowedCompoundCombo(sph, cyl)) {
            continue;
          }
          for (const add of addList) {
            next[qtyKeyCompoundBifocal(sph, cyl, selectedAxis, add)] = pairsText;
            pending += 1;
            if (pending >= QTY_MAP_CHUNK_SIZE) {
              pending = 0;
              await yieldToUi();
            }
          }
        }
      }
    } else {
      let pending = 0;
      for (const sph of sphList) {
        for (const cyl of cylList) {
          if (isSingleVision && !isAllowedCompoundCombo(sph, cyl)) {
            continue;
          }
          next[qtyKeyCompound(sph, cyl)] = pairsText;
          pending += 1;
          if (pending >= QTY_MAP_CHUNK_SIZE) {
            pending = 0;
            await yieldToUi();
          }
        }
      }
    }
  }

  return next;
}

export function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
