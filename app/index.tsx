'use client';

import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

import { BrandSplash } from '@/components/brand-splash';
import { getCustomerNextRoute } from '@/lib/auth-api';
import { useAuth } from '@/lib/auth';

/** Keep native splash visible until our branded screen is ready. */
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function SplashRoute() {
  const router = useRouter();
  const { isSignedIn, user, isReady } = useAuth();
  const hasNavigated = useRef(false);
  const splashFinished = useRef(false);

  const onLayout = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  const navigateFromSplash = useCallback(() => {
    if (hasNavigated.current || !isReady || !splashFinished.current) {
      return;
    }
    hasNavigated.current = true;

    if (isSignedIn && user) {
      const nextRoute = getCustomerNextRoute(user);
      if (nextRoute === '/gst-details') {
        router.replace({
          pathname: '/gst-details',
          params: { userId: user.id, email: user.email },
        });
      } else {
        router.replace(nextRoute);
      }
      return;
    }

    router.replace('/onboarding');
  }, [isReady, isSignedIn, user, router]);

  const handleSplashFinish = useCallback(() => {
    splashFinished.current = true;
    navigateFromSplash();
  }, [navigateFromSplash]);

  useEffect(() => {
    navigateFromSplash();
  }, [navigateFromSplash]);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <BrandSplash onFinish={handleSplashFinish} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
