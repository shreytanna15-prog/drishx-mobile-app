'use client';

import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getCustomerNextRoute } from '@/lib/auth-api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { useBrandColors } from '@/lib/theme-provider';

export default function TabLayout() {
  const router = useRouter();
  const { isSignedIn, isStaff, user, isReady } = useAuth();
  const { itemCount } = useCart();
  const colors = useBrandColors();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isReady) return;

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
  }, [mounted, isReady, isSignedIn, user, router]);

  if (!isReady || !isSignedIn || (user && getCustomerNextRoute(user) !== '/(tabs)')) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-tasks"
        options={{
          title: 'My Tasks',
          href: isStaff ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="checklist" color={color} />,
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
        name="cart"
        options={{
          title: 'Cart',
          href: isStaff ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="cart.fill" color={color} />,
          tabBarBadge: !isStaff && itemCount > 0 ? itemCount : undefined,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          href: isStaff ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
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
          href: undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
