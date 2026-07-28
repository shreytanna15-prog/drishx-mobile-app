import 'react-native-gesture-handler';

import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

LogBox.ignoreLogs(['Unable to activate keep awake']);

import { AppAlertProvider } from '@/lib/app-alert';
import { OfflineSyncProvider } from '@/lib/offline-sync';
import { AuthProvider } from '@/lib/auth';
import { OfflineStatusBanner } from '@/components/offline-status-banner';
import { CartProvider } from '@/lib/cart';
import { OrderModeProvider } from '@/lib/order-mode';
import { ThemeProvider } from '@/lib/theme-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: 'index',
};

function RootNavigation() {
  const colorScheme = useColorScheme();

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <OfflineStatusBanner />
      <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="gst-details" options={{ headerShown: false }} />
            <Stack.Screen name="pending-approval" options={{ headerShown: false }} />
            <Stack.Screen name="cart" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="company-profile" options={{ headerShown: false }} />
            <Stack.Screen name="profile-placeholder" options={{ headerShown: false }} />
            <Stack.Screen name="invoices" options={{ headerShown: false }} />
            <Stack.Screen name="invoice-details" options={{ headerShown: false }} />
            <Stack.Screen name="return-request" options={{ headerShown: false }} />
            <Stack.Screen name="returns" options={{ headerShown: false }} />
            <Stack.Screen name="return-details" options={{ headerShown: false }} />
            <Stack.Screen name="order-details" options={{ headerShown: false }} />
            <Stack.Screen name="inventory" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppAlertProvider>
          <AuthProvider>
            <OfflineSyncProvider>
              <OrderModeProvider>
                <CartProvider>
                  <RootNavigation />
                </CartProvider>
              </OrderModeProvider>
            </OfflineSyncProvider>
          </AuthProvider>
        </AppAlertProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
