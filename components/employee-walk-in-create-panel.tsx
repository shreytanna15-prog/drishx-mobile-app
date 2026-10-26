import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import type { CustomerCompany } from '@/lib/customers-api';
import { useBrandColors } from '@/lib/theme-provider';
import {
  createWalkInCustomer,
  sendWalkInMobileOtp,
  verifyWalkInMobileOtp,
} from '@/lib/walk-in-customer-api';

type Props = {
  onCreated: (customer: CustomerCompany) => void;
};

export function EmployeeWalkInCreatePanel({ onCreated }: Props) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);

  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [shop, setShop] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setError(null);
    setBusy(true);
    setVerified(false);
    setChallengeId(null);
    try {
      const res = await sendWalkInMobileOtp(mobile.trim());
      setSessionId(res.providerSessionId);
      setMobile(res.mobileNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setBusy(true);
    try {
      const res = await verifyWalkInMobileOtp({
        mobileNumber: mobile.trim(),
        code: code.trim(),
        providerSessionId: sessionId,
      });
      setChallengeId(res.challengeId);
      setVerified(true);
      setMobile(res.mobileNumber);
      if (res.user?.id) onCreated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify OTP.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (!challengeId) {
      setError('Verify mobile OTP first.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const customer = await createWalkInCustomer({
        mobileNumber: mobile.trim(),
        challengeId,
        name: name.trim() || undefined,
        shopName: shop.trim() || undefined,
      });
      onCreated(customer);
      setCode('');
      setName('');
      setShop('');
      setVerified(false);
      setChallengeId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create walk-in customer.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Create walk-in customer</Text>
      <Text style={styles.hint}>
        Phone + OTP, then place order while Admin finishes setup.
      </Text>

      <TextInput
        value={mobile}
        onChangeText={setMobile}
        placeholder="10-digit mobile"
        placeholderTextColor={colors.placeholder}
        keyboardType="phone-pad"
        editable={!busy && !verified}
        style={styles.input}
      />
      <Pressable
        style={[styles.secondaryBtn, (busy || !mobile.trim() || verified) && styles.disabled]}
        disabled={busy || !mobile.trim() || verified}
        onPress={() => void handleSend()}
      >
        {busy ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.secondaryBtnText}>Send OTP</Text>
        )}
      </Pressable>

      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="OTP code"
        placeholderTextColor={colors.placeholder}
        keyboardType="number-pad"
        editable={!busy && !verified}
        style={styles.input}
      />
      <Pressable
        style={[styles.secondaryBtn, (busy || !code.trim() || verified) && styles.disabled]}
        disabled={busy || !code.trim() || verified}
        onPress={() => void handleVerify()}
      >
        <Text style={styles.secondaryBtnText}>{verified ? 'Verified' : 'Verify'}</Text>
      </Pressable>

      {verified ? (
        <>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name (optional)"
            placeholderTextColor={colors.placeholder}
            editable={!busy}
            style={styles.input}
          />
          <TextInput
            value={shop}
            onChangeText={setShop}
            placeholder="Shop name (optional)"
            placeholderTextColor={colors.placeholder}
            editable={!busy}
            style={styles.input}
          />
          <Pressable
            style={[styles.primaryBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => void handleCreate()}
          >
            {busy ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={styles.primaryBtnText}>Create walk-in & select</Text>
            )}
          </Pressable>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors: BrandColorScheme) {
  return StyleSheet.create({
    box: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      borderRadius: 16,
      padding: 14,
      marginBottom: 16,
      gap: 8,
      backgroundColor: colors.card,
    },
    title: { fontSize: 14, fontWeight: '700', color: colors.text },
    hint: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
    input: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      backgroundColor: colors.background,
    },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    secondaryBtnText: { color: colors.primary, fontWeight: '700' },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryBtnText: { color: colors.primaryText, fontWeight: '800' },
    disabled: { opacity: 0.55 },
    error: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  });
}
