'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand-colors';
import { useAuth } from '@/lib/auth';
import { fetchMyTasks, updateTaskStatus, type TaskRecord } from '@/lib/tasks-api';

type FilterKey = 'ALL' | 'PENDING' | 'COMPLETED';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'COMPLETED', label: 'Completed' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'No date';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function TaskRow({
  task,
  onToggleComplete,
  disabled,
}: {
  task: TaskRecord;
  onToggleComplete: () => void;
  disabled: boolean;
}) {
  const isDone = task.status === 'COMPLETED';
  return (
    <View style={styles.taskCard}>
      <View style={styles.taskTopRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          {task.details?.trim() ? <Text style={styles.taskDetails}>{task.details.trim()}</Text> : null}
        </View>
        <Pressable style={[styles.checkbox, isDone && styles.checkboxChecked]} onPress={onToggleComplete} disabled={disabled}>
          {isDone ? <MaterialIcons name="check" size={16} color={BrandColors.primaryText} /> : null}
        </Pressable>
      </View>
      <View style={styles.taskMetaRow}>
        <Text style={styles.taskMetaText}>Due: {formatDate(task.dueDate)}</Text>
        <Text style={[styles.statusText, isDone && styles.statusDone]}>{isDone ? 'Completed' : 'Pending'}</Text>
      </View>
    </View>
  );
}

export default function MyTasksScreen() {
  const { getAuthHeaders } = useAuth();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');

  const loadTasks = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchMyTasks(getAuthHeaders());
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredTasks = useMemo(() => {
    if (activeFilter === 'ALL') return tasks;
    return tasks.filter((task) => task.status === activeFilter);
  }, [activeFilter, tasks]);

  async function toggleTask(task: TaskRecord) {
    const next = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const optimisticTask: TaskRecord = {
      ...task,
      status: next,
      completedAt: next === 'COMPLETED' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };

    // Optimistic UI: reflect completion immediately before server confirms.
    setTasks((prev) => prev.map((current) => (current.id === task.id ? optimisticTask : current)));
    setUpdatingId(task.id);
    try {
      const updated = await updateTaskStatus(task.id, next, getAuthHeaders());
      setTasks((prev) => prev.map((current) => (current.id === updated.id ? { ...current, ...updated } : current)));
    } catch (err) {
      // Roll back the optimistic change if server update fails.
      setTasks((prev) => prev.map((current) => (current.id === task.id ? task : current)));
      setError(err instanceof Error ? err.message : 'Failed to update task.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>My Tasks</Text>
          <Text style={styles.subtitle}>Tasks assigned by admin</Text>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const active = filter.key === activeFilter;
            return (
              <Pressable
                key={filter.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter.key)}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={BrandColors.primary} />
            <Text style={styles.helperText}>Loading tasks...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <MaterialIcons name="error-outline" size={44} color="#f87171" />
            <Text style={[styles.helperText, { color: '#f87171' }]}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadTasks}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadTasks();
                }}
                tintColor={BrandColors.primary}
              />
            }
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <MaterialIcons name="task-alt" size={44} color={BrandColors.textMuted} />
                <Text style={styles.helperText}>No tasks available.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TaskRow task={item} onToggleComplete={() => void toggleTask(item)} disabled={updatingId === item.id} />
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  title: { color: BrandColors.text, fontSize: 30, fontWeight: '800' },
  subtitle: { color: BrandColors.textMuted, fontSize: 14, marginTop: 4 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, gap: 10 },
  filterChip: {
    borderWidth: 1,
    borderColor: BrandColors.cardBorder,
    backgroundColor: BrandColors.card,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  filterChipActive: { borderColor: BrandColors.primary, backgroundColor: 'rgba(240, 161, 50, 0.14)' },
  filterText: { color: BrandColors.textMuted, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: BrandColors.primary },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  taskCard: {
    borderWidth: 1,
    borderColor: BrandColors.cardBorder,
    borderRadius: 14,
    padding: 12,
    backgroundColor: BrandColors.card,
  },
  taskTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  taskTitle: { color: BrandColors.text, fontSize: 15, fontWeight: '700' },
  taskDetails: { color: BrandColors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: BrandColors.primary,
  },
  taskMetaRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskMetaText: { color: BrandColors.textMuted, fontSize: 12 },
  statusText: { color: BrandColors.primary, fontSize: 12, fontWeight: '700' },
  statusDone: { color: BrandColors.success },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  helperText: { color: BrandColors.textMuted, textAlign: 'center' },
  retryButton: {
    marginTop: 8,
    backgroundColor: BrandColors.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: BrandColors.primaryText, fontWeight: '700' },
});
