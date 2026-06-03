'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type OrderMode = 'retail' | 'wholesale';

type OrderModeContextValue = {
  mode: OrderMode;
  setMode: (mode: OrderMode) => void;
  isWholesale: boolean;
  isRetail: boolean;
};

const OrderModeContext = createContext<OrderModeContextValue | undefined>(undefined);

export function OrderModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<OrderMode>('retail');

  const setMode = useCallback((next: OrderMode) => {
    setModeState(next);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      isWholesale: mode === 'wholesale',
      isRetail: mode === 'retail',
    }),
    [mode, setMode]
  );

  return <OrderModeContext.Provider value={value}>{children}</OrderModeContext.Provider>;
}

export function useOrderMode() {
  const context = useContext(OrderModeContext);
  if (!context) {
    throw new Error('useOrderMode must be used within OrderModeProvider');
  }
  return context;
}
