'use client';

import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';

const DEFAULT_HOST = Platform.OS === 'android' ? 'http://192.168.10.115:3000' : 'http://localhost:3000';
const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || DEFAULT_HOST;
if (process.env.EXPO_PUBLIC_BACKEND_BASE_URL?.includes('localhost') && Platform.OS !== 'web') {
  console.warn(
    'EXPO_PUBLIC_BACKEND_BASE_URL uses localhost on a native device. Use a LAN IP or emulator host alias instead of localhost.'
  );
}

type LensItem = {
  id?: string | number;
  price?: string | number;
  sph?: string | number;
  cyl?: string | number;
  add?: string | number;
  quantity?: string | number;
};

export default function HomeScreen() {
  const [lensData, setLensData] = useState<{
    type: string;
    title: string;
    items: LensItem[];
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadLensProducts() {
      try {
        const urls = [
          { type: 'kryptok', title: 'Kryptok Lenses' },
          { type: 'progressive', title: 'Progressive Lenses' },
          { type: 'single-vision', title: 'Single Vision Lenses' },
        ];

        const responses = await Promise.all(
          urls.map((entry) =>
            fetch(`${BACKEND_BASE_URL}/api/lenses/${entry.type}`).then(async (res) => {
              if (!res.ok) {
                throw new Error(`Failed to load ${entry.type}`);
              }
              return { entry, data: await res.json() };
            })
          )
        );

        if (!isMounted) {
          return;
        }

        setLensData(
          responses.map((response) => ({
            type: response.entry.type,
            title: response.entry.title,
            items: Array.isArray(response.data) ? response.data : [],
          }))
        );
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }

        console.warn('Lens fetch error', fetchError);
        setError('Unable to load product data from the backend.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadLensProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#FFFFFF', dark: '#0A0A0A' }}>
      <ThemedView style={styles.titleContainer}>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Latest Lens Products</ThemedText>
        {loading ? (
          <ActivityIndicator color="#0f546d" />
        ) : error ? (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        ) : (
          lensData.map((section) => (
            <ThemedView key={section.type} style={styles.productSection}>
              <ThemedText type="subtitle">{section.title}</ThemedText>
              <ThemedText>
                {section.items.length} available
              </ThemedText>
              {section.items.slice(0, 2).map((item, index) => (
                <View key={(item.id as string) ?? `${section.type}-${index}`} style={styles.productCard}>
                  <ThemedText type="defaultSemiBold">Price: ₹{item.price ?? 'N/A'}</ThemedText>
              <ThemedText>
                SPH: {item.sph ?? '—'} • CYL: {item.cyl ?? '—'}{' '}
                {section.type !== 'single-vision' ? `• ADD: ${item.add ?? '—'}` : ''}
              </ThemedText>
              <ThemedText>Qty: {item.quantity ?? 0}</ThemedText>
                </View>
              ))}
            </ThemedView>
          ))
        )}
      </ThemedView>
      
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  productSection: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  productCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  errorText: {
    color: '#b91c1c',
    marginTop: 8,
  },
});
