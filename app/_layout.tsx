import 'react-native-gesture-handler';

import { CormorantGaramond_600SemiBold_Italic } from '@expo-google-fonts/cormorant-garamond/600SemiBold_Italic';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router/react-navigation';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
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

SplashScreen.preventAutoHideAsync();

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
            <Stack.Screen name="business-info" options={{ headerShown: false }} />
            <Stack.Screen name="gst-details" options={{ headerShown: false }} />
            <Stack.Screen name="registration-addresses" options={{ headerShown: false }} />
            <Stack.Screen name="pending-approval" options={{ headerShown: false }} />
            <Stack.Screen name="cart" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="company-profile" options={{ headerShown: false }} />
            <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
            <Stack.Screen name="profile-placeholder" options={{ headerShown: false }} />
            <Stack.Screen name="outstanding-payments" options={{ headerShown: false }} />
            <Stack.Screen name="invoices" options={{ headerShown: false }} />
            <Stack.Screen name="invoice-details" options={{ headerShown: false }} />
            <Stack.Screen name="return-request" options={{ headerShown: false }} />
            <Stack.Screen name="returns" options={{ headerShown: false }} />
            <Stack.Screen name="return-details" options={{ headerShown: false }} />
            <Stack.Screen name="order-details" options={{ headerShown: false }} />
            <Stack.Screen name="rx-orders" options={{ headerShown: false }} />
            <Stack.Screen name="inventory" options={{ headerShown: false }} />
            <Stack.Screen name="attendance" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_600SemiBold_Italic,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

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
