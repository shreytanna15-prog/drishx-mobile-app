import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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
  fetchWalkInHistory,
  lookupWalkInMobile,
  sendWalkInMobileOtp,
  verifyWalkInMobileOtp,
  WalkInApiError,
} from '@/lib/walk-in-customer-api';

type Props = {
  onCreated: (customer: CustomerCompany) => void;
};

type Phase = 'idle' | 'need_otp' | 'need_create';

function customerLabel(c: CustomerCompany): string {
  return c.businessName || c.name || c.email || c.id;
}

export function EmployeeWalkInCreatePanel({ onCreated }: Props) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);

  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [shop, setShop] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CustomerCompany[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    void fetchWalkInHistory({ page: 1, limit: 20 })
      .then((page) => {
        if (!cancelled) setHistory(page.items);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLookup() {
    setError(null);
    setBusy(true);
    setPhase('idle');
    setChallengeId(null);
    setSessionId(null);
    setCode('');
    try {
      const result = await lookupWalkInMobile(mobile.trim());
      setMobile(result.mobileNumber || mobile.trim());

      if (result.kind === 'path_a') {
        setError(
          result.message ??
            'This mobile is a self-signup customer. Use Order on behalf instead.'
        );
        return;
      }
      if (result.kind === 'staff_created' && !result.orderable) {
        setError(result.message ?? 'This customer cannot be used for walk-in.');
        return;
      }
      if (
        result.kind === 'staff_created' &&
        result.skipOtp &&
        result.customer?.id
      ) {
        onCreated(result.customer);
        return;
      }
      setPhase('need_otp');
    } catch (err) {
      setError(
        err instanceof WalkInApiError || err instanceof Error
          ? err.message
          : 'Failed to look up mobile.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    setError(null);
    setBusy(true);
    try {
      const res = await sendWalkInMobileOtp(mobile.trim());
      setSessionId(res.providerSessionId);
      setMobile(res.mobileNumber);
    } catch (err) {
      setError(
        err instanceof WalkInApiError || err instanceof Error
          ? err.message
          : 'Failed to send OTP.'
      );
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
      setMobile(res.mobileNumber);

      if (res.walkInKind === 'path_a' || res.code === 'WALK_IN_PATH_A') {
        setError(
          res.message ??
            'This mobile is a self-signup customer. Use Order on behalf instead.'
        );
        setPhase('idle');
        return;
      }
      if (res.code === 'WALK_IN_NOT_ORDERABLE') {
        setError(res.message ?? 'This customer cannot be used for walk-in.');
        setPhase('idle');
        return;
      }
      if (res.user?.id) {
        onCreated(res.user);
        return;
      }
      setPhase('need_create');
    } catch (err) {
      setError(
        err instanceof WalkInApiError || err instanceof Error
          ? err.message
          : 'Failed to verify OTP.'
      );
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
      setPhase('idle');
      setChallengeId(null);
    } catch (err) {
      setError(
        err instanceof WalkInApiError || err instanceof Error
          ? err.message
          : 'Failed to create walk-in customer.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Walk-in customer</Text>
      <Text style={styles.hint}>
        Staff-created only. Verified mobiles skip OTP; new mobiles need OTP then
        create.
      </Text>

      <TextInput
        value={mobile}
        onChangeText={(v) => {
          setMobile(v);
          if (phase !== 'idle') setPhase('idle');
        }}
        placeholder="10-digit mobile"
        placeholderTextColor={colors.placeholder}
        keyboardType="phone-pad"
        editable={!busy && phase !== 'need_create'}
        style={styles.input}
      />
      <Pressable
        style={[
          styles.secondaryBtn,
          (busy || !mobile.trim() || phase === 'need_create') && styles.disabled,
        ]}
        disabled={busy || !mobile.trim() || phase === 'need_create'}
        onPress={() => void handleLookup()}
      >
        {busy && phase === 'idle' ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.secondaryBtnText}>Continue</Text>
        )}
      </Pressable>

      {phase === 'need_otp' || phase === 'need_create' ? (
        <>
          <Pressable
            style={[
              styles.secondaryBtn,
              (busy || phase === 'need_create') && styles.disabled,
            ]}
            disabled={busy || phase === 'need_create'}
            onPress={() => void handleSend()}
          >
            <Text style={styles.secondaryBtnText}>Send OTP</Text>
          </Pressable>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="OTP code"
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
            editable={!busy && phase !== 'need_create'}
            style={styles.input}
          />
          <Pressable
            style={[
              styles.secondaryBtn,
              (busy || !code.trim() || phase === 'need_create') &&
                styles.disabled,
            ]}
            disabled={busy || !code.trim() || phase === 'need_create'}
            onPress={() => void handleVerify()}
          >
            <Text style={styles.secondaryBtnText}>Verify</Text>
          </Pressable>
        </>
      ) : null}

      {phase === 'need_create' ? (
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

      <View style={styles.historyBox}>
        <Text style={styles.historyTitle}>Recent staff-created</Text>
        {historyLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : history.length === 0 ? (
          <Text style={styles.hint}>No prior walk-in customers yet.</Text>
        ) : (
          <ScrollView style={styles.historyList} nestedScrollEnabled>
            {history.map((c) => (
              <Pressable
                key={c.id}
                style={styles.historyItem}
                disabled={busy}
                onPress={() => onCreated(c)}
              >
                <Text style={styles.historyItemText}>{customerLabel(c)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
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
    historyBox: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.inputBorder,
      paddingTop: 10,
      marginTop: 4,
      gap: 6,
    },
    historyTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
    },
    historyList: { maxHeight: 140 },
    historyItem: {
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: 8,
    },
    historyItemText: { fontSize: 12, fontWeight: '600', color: colors.text },
  });
}
