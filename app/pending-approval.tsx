'use client';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand-colors';
import { fetchCurrentUser, mapApiUser } from '@/lib/auth-api';
import { useAuth } from '@/lib/auth';

const POLL_MS = 5000;

export default function PendingApprovalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; userId?: string; rejected?: string; reason?: string }>();
  const { token, user, signIn, signOut, updateUser } = useAuth();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const email = user?.email ?? (params.email ? String(params.email) : '');
  const isRejected =
    user?.approvalStatus === 'REJECTED' || params.rejected === '1';
  const rejectionReason =
    user?.rejectionReason || (params.reason ? String(params.reason) : null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const checkApproval = useCallback(async () => {
    if (!token) return;

    try {
      const result = await fetchCurrentUser(token);
      const mapped = mapApiUser(result.user as unknown as Record<string, unknown>);
      updateUser(mapped);

      if (mapped.approvalStatus === 'APPROVED' && mapped.isApproved) {
        stopPolling();
        signIn(token, mapped);
        router.replace('/(tabs)');
        return;
      }

      if (mapped.approvalStatus === 'REJECTED') {
        stopPolling();
        Alert.alert(
          'Account rejected',
          mapped.rejectionReason || 'Your account was rejected by admin.'
        );
        signOut();
        router.replace('/login');
      }
    } catch {
      // Keep polling on transient network errors
    }
  }, [token, updateUser, signIn, router, signOut, stopPolling]);

  useEffect(() => {
    if (isRejected) return;

    if (!token) {
      return;
    }

    void checkApproval();
    pollRef.current = setInterval(() => {
      void checkApproval();
    }, POLL_MS);

    return () => stopPolling();
  }, [token, isRejected, checkApproval, stopPolling]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.heading}>{isRejected ? 'Account rejected' : 'Waiting for approval'}</Text>
          <Text style={styles.subheading}>
            {isRejected
              ? rejectionReason ||
                'Your account was rejected by admin. Contact support or sign up again.'
              : 'Your GST details were submitted successfully. An admin must approve your account before you can use the app.'}
          </Text>

          {email ? <Text style={styles.email}>Account: {email}</Text> : null}

          {!isRejected && (
            <View style={styles.footer}>
              <ActivityIndicator color={BrandColors.primary} size="small" />
              <Text style={styles.footerText}>
                {token
                  ? 'Checking approval... You will be signed in automatically when your account is ready.'
                  : 'Open the app again and log in with your email to continue. Your account is waiting for admin approval.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BrandColors.background },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  card: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: BrandColors.card,
    borderWidth: 1,
    borderColor: BrandColors.cardBorder,
  },
  heading: { color: BrandColors.text, fontSize: 28, fontWeight: '800', marginBottom: 10 },
  subheading: { color: BrandColors.textMuted, fontSize: 14, lineHeight: 22, marginBottom: 18 },
  email: { color: BrandColors.label, fontSize: 13, marginBottom: 20 },
  footer: {
    marginTop: 8,
    alignItems: 'center',
    gap: 12,
  },
  footerText: {
    color: BrandColors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
