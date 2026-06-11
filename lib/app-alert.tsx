'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { AppAlertModal } from '@/components/app-alert-modal';

export type AppAlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AppAlertButton = {
  text: string;
  style?: AppAlertButtonStyle;
  onPress?: () => void;
};

export type AppAlertVariant = 'info' | 'danger' | 'success' | 'error';

type AlertConfig = {
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
  variant?: AppAlertVariant;
};

type AlertState = AlertConfig & {
  visible: boolean;
};

function inferVariant(title: string, buttons?: AppAlertButton[]): AppAlertVariant {
  if (buttons?.some((button) => button.style === 'destructive')) {
    return 'danger';
  }

  const normalized = title.toLowerCase();
  if (
    normalized.includes('fail') ||
    normalized.includes('error') ||
    normalized.includes('invalid') ||
    normalized.includes('missing') ||
    normalized.includes('rejected')
  ) {
    return 'error';
  }

  if (
    normalized.includes('success') ||
    normalized.includes('placed') ||
    normalized.includes('recorded') ||
    normalized.includes('added') ||
    normalized.includes('coming soon')
  ) {
    return 'success';
  }

  return 'info';
}

function normalizeButtons(buttons?: AppAlertButton[]): AppAlertButton[] {
  if (!buttons || buttons.length === 0) {
    return [{ text: 'OK', style: 'default' }];
  }

  return buttons;
}

let showAlertRef: ((config: AlertConfig) => void) | null = null;

/** Drop-in replacement for React Native `Alert.alert`. */
export function appAlert(title: string, message?: string, buttons?: AppAlertButton[]): void {
  if (showAlertRef) {
    showAlertRef({ title, message, buttons });
    return;
  }

  // Fallback if provider is not mounted yet.
  console.warn('[appAlert] AppAlertProvider is not mounted:', title, message);
}

type AppAlertContextValue = {
  showAlert: (config: AlertConfig) => void;
};

const AppAlertContext = createContext<AppAlertContextValue | undefined>(undefined);

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AlertState | null>(null);

  const showAlert = useCallback((config: AlertConfig) => {
    setState({
      ...config,
      visible: true,
      buttons: normalizeButtons(config.buttons),
      variant: config.variant ?? inferVariant(config.title, config.buttons),
    });
  }, []);

  useEffect(() => {
    showAlertRef = showAlert;
    return () => {
      showAlertRef = null;
    };
  }, [showAlert]);

  const dismiss = useCallback(() => {
    setState((current) => (current ? { ...current, visible: false } : null));
    setTimeout(() => setState(null), 220);
  }, []);

  const handlePressButton = useCallback(
    (button: AppAlertButton) => {
      dismiss();
      button.onPress?.();
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showAlert }), [showAlert]);

  return (
    <AppAlertContext.Provider value={value}>
      {children}
      {state ? (
        <AppAlertModal
          visible={state.visible}
          title={state.title}
          message={state.message}
          variant={state.variant ?? 'info'}
          buttons={state.buttons ?? [{ text: 'OK' }]}
          onDismiss={dismiss}
          onPressButton={handlePressButton}
        />
      ) : null}
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  const context = useContext(AppAlertContext);
  if (!context) {
    throw new Error('useAppAlert must be used within AppAlertProvider');
  }
  return context;
}
