'use client';

import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCustomerNextRoute } from '@/lib/auth-api';
import { useAuth } from '@/lib/auth';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { isSignedIn, isStaff, user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!isSignedIn) {
      const timeout = setTimeout(() => {
        router.replace('/signup');
      }, 0);
      return () => clearTimeout(timeout);
    }

    if (user) {
      const nextRoute = getCustomerNextRoute(user);
      if (nextRoute !== '/(tabs)') {
        const timeout = setTimeout(() => {
          if (nextRoute === '/gst-details') {
            router.replace({
              pathname: '/gst-details',
              params: { userId: user.id, email: user.email },
            });
          } else {
            router.replace(nextRoute);
          }
        }, 0);
        return () => clearTimeout(timeout);
      }
    }
  }, [mounted, isSignedIn, user, router]);

  if (!isSignedIn || (user && getCustomerNextRoute(user) !== '/(tabs)')) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          href: isStaff ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bag.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-orders"
        options={{
          title: 'My Orders',
          href: isStaff ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.clipboard.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          href: isStaff ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.clipboard.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="purchase-stock"
        options={{
          title: 'Purchase',
          href: isStaff ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="cart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          href: isStaff ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
