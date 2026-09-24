'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appAlert } from '@/lib/app-alert';
import {
  fetchAttendanceCalendar,
  fetchAttendanceMe,
  scanAttendanceQr,
  type AttendanceCalendarResponse,
  type AttendanceMeResponse,
} from '@/lib/attendance-api';
import { useAuth } from '@/lib/auth';
import { useBrandColors } from '@/lib/theme-provider';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import type { BrandColorScheme } from '@/constants/brand-colors';

export default function AttendanceScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { isStaff, getAuthHeaders } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<AttendanceMeResponse | null>(null);
  const [calendar, setCalendar] = useState<AttendanceCalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meData, calData] = await Promise.all([
        fetchAttendanceMe(getAuthHeaders),
        fetchAttendanceCalendar(year, month, getAuthHeaders),
      ]);
      setMe(meData);
      setCalendar(calData);
    } catch (err) {
      appAlert('Attendance', err instanceof Error ? err.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, year, month]);

  useFocusEffect(
    useCallback(() => {
      if (!isStaff) {
        router.replace('/(tabs)' as never);
        return;
      }
      void load();
    }, [isStaff, load, router])
  );

  async function handleBarcode(data: string) {
    if (!scanning || busy) return;
    const token = data.trim();
    if (!token) return;
    setScanning(false);
    setBusy(true);
    try {
      const result = await scanAttendanceQr(token, getAuthHeaders);
      appAlert(result.alreadyPresent ? 'Already marked' : 'Present', result.message);
      await load();
    } catch (err) {
      appAlert('Scan failed', err instanceof Error ? err.message : 'Could not mark present.');
      setScanning(true);
    } finally {
      setBusy(false);
    }
  }

  function shiftMonth(delta: number) {
    let y = year;
    let m = month + delta;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setYear(y);
    setMonth(m);
  }

  const monthLabel = useMemo(() => {
    const d = new Date(Date.UTC(year, month - 1, 1));
    return new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);
  }, [year, month]);

  const calendarGrid = useMemo(() => {
    if (!calendar) return [];
    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const cells: Array<(typeof calendar.days)[number] | null> = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (const day of calendar.days) cells.push(day);
    return cells;
  }, [calendar, year, month]);

  if (!isStaff) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Attendance</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Today</Text>
          {loading && !me ? (
            <ActivityIndicator color={colors.primary} />
          ) : me ? (
            <>
              <Text style={[styles.meta, { color: colors.textMuted }]}>{me.today.date}</Text>
              <Text
                style={[
                  styles.status,
                  { color: me.today.present ? colors.success : colors.danger },
                ]}>
                {me.today.present ? 'Present' : 'Not marked yet'}
              </Text>
              {me.today.record ? (
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {me.today.record.method === 'QR_SCAN' ? 'Via office QR' : 'Marked by admin'} ·{' '}
                  {new Date(me.today.record.markedAt).toLocaleTimeString('en-IN')}
                </Text>
              ) : null}
            </>
          ) : null}
        </View>

        <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Scan office QR</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Point your camera at the QR shown on the office attendance screen.
          </Text>
          {!permission?.granted ? (
            <Pressable
              style={[styles.primary, { backgroundColor: colors.primary }]}
              onPress={() => void requestPermission()}>
              <Text style={styles.primaryText}>Allow camera</Text>
            </Pressable>
          ) : (
            <View style={styles.cameraWrap}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={
                  scanning && !busy
                    ? ({ data }) => {
                        void handleBarcode(data);
                      }
                    : undefined
                }
              />
              {busy ? (
                <View style={styles.cameraOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : null}
            </View>
          )}
          {!scanning && !busy ? (
            <Pressable
              style={[styles.secondary, { borderColor: colors.primary }]}
              onPress={() => setScanning(true)}>
              <Text style={[styles.secondaryText, { color: colors.primary }]}>Scan again</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
          <View style={styles.monthRow}>
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={10}>
              <MaterialIcons name="chevron-left" size={28} color={colors.text} />
            </Pressable>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{monthLabel}</Text>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={10}>
              <MaterialIcons name="chevron-right" size={28} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.weekHeader}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={`${d}-${i}`} style={[styles.weekDay, { color: colors.textMuted }]}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {calendarGrid.map((day, idx) => {
              if (!day) {
                return <View key={`e-${idx}`} style={styles.dayCell} />;
              }
              const present = day.present === true || day.presentCount > 0;
              return (
                <View
                  key={day.date}
                  style={[
                    styles.dayCell,
                    styles.dayFilled,
                    {
                      borderColor: present ? colors.success : colors.cardBorder,
                      backgroundColor: present ? 'rgba(125, 211, 168, 0.12)' : 'transparent',
                    },
                  ]}>
                  <Text style={[styles.dayNum, { color: colors.text }]}>
                    {Number(day.date.slice(-2))}
                  </Text>
                  <Text style={[styles.dayMark, { color: present ? colors.success : colors.textMuted }]}>
                    {present ? 'P' : '—'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (_c: BrandColorScheme) =>
  StyleSheet.create({
    safe: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 18, fontWeight: '800' },
    content: { padding: 14, gap: 12, paddingBottom: 40 },
    card: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      gap: 8,
    },
    cardTitle: { fontSize: 15, fontWeight: '800' },
    meta: { fontSize: 12 },
    status: { fontSize: 18, fontWeight: '800' },
    hint: { fontSize: 13, lineHeight: 18 },
    primary: {
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    primaryText: { color: '#fff', fontWeight: '800' },
    secondary: {
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    secondaryText: { fontWeight: '800' },
    cameraWrap: {
      height: 260,
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 4,
    },
    camera: { flex: 1 },
    cameraOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    weekHeader: { flexDirection: 'row', marginTop: 4 },
    weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: {
      width: '14.28%',
      minHeight: 44,
      padding: 2,
    },
    dayFilled: {
      borderWidth: 1,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayNum: { fontSize: 12, fontWeight: '700' },
    dayMark: { fontSize: 10, fontWeight: '800' },
  });
