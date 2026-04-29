import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  DailyTask,
  addDailyTask,
  deleteDailyTask,
  listDailyTasks,
  toggleDailyTaskComplete,
} from '../lib/dailyTasks';
import { getActiveTask } from '../lib/entries';
import { theme } from '../constants/theme';

function formatDateHeader(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export default function DailyListScreen() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await listDailyTasks();
      setTasks(list);
    } catch (err) {
      console.warn('listDailyTasks failed:', err instanceof Error ? err.message : err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleAdd = async () => {
    const text = draft.trim();
    if (!text) return;
    try {
      setAdding(true);
      await addDailyTask(text);
      setDraft('');
      await load();
    } catch (err) {
      Alert.alert('Could not add', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (task: DailyTask) => {
    try {
      await toggleDailyTaskComplete(task.id);
      await load();
    } catch (err) {
      Alert.alert('Could not update', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleLongPress = (task: DailyTask) => {
    Alert.alert('Task actions', undefined, [
      {
        text: 'Make active task',
        onPress: () => makeActiveTask(task),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDelete(task),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const makeActiveTask = async (task: DailyTask) => {
    const existing = await getActiveTask();
    if (existing) {
      Alert.alert(
        'You already have an active task',
        'Finish it first, then come back.',
        [
          { text: 'Go to active task', onPress: () => router.push('/active-task') },
          { text: 'OK', style: 'cancel' },
        ],
      );
      return;
    }
    router.push({ pathname: '/manual-breakdown', params: { problem: task.text } });
  };

  const confirmDelete = (task: DailyTask) => {
    Alert.alert('Delete this task?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDailyTask(task.id);
            setTasks((prev) => prev.filter((t) => t.id !== task.id));
          } catch (err) {
            Alert.alert('Could not delete', err instanceof Error ? err.message : 'Unknown error');
          }
        },
      },
    ]);
  };

  const completedCount = tasks.filter((t) => t.completed_at).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Today</Text>
            <Text style={styles.date}>{formatDateHeader()}</Text>
            {tasks.length > 0 ? (
              <Text style={styles.progress}>
                {completedCount} of {tasks.length} done
              </Text>
            ) : null}
          </View>

          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isDone = !!item.completed_at;
              return (
                <Pressable
                  onPress={() => handleToggle(item)}
                  onLongPress={() => handleLongPress(item)}
                  style={styles.row}
                >
                  <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                    {isDone ? <Text style={styles.check}>✓</Text> : null}
                  </View>
                  <Text style={[styles.rowText, isDone && styles.rowTextDone]}>{item.text}</Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.empty}>Nothing on your list yet.</Text>
                <Text style={styles.emptyHint}>Add one below, or brain-dump everything at once.</Text>
              </View>
            }
          />

          <View style={styles.footer}>
            <Pressable onPress={() => router.push('/brain-dump')} style={styles.brainDumpLink}>
              <Text style={styles.brainDumpText}>Brain dump everything →</Text>
            </Pressable>
            <View style={styles.addRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Add one task…"
                placeholderTextColor={theme.colors.subtext}
                style={styles.addInput}
                editable={!adding}
                onSubmitEditing={handleAdd}
                returnKeyType="done"
              />
              <Pressable
                style={[styles.addButton, (!draft.trim() || adding) && styles.addButtonDisabled]}
                onPress={handleAdd}
                disabled={!draft.trim() || adding}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: theme.spacing.lg, gap: theme.spacing.md },
  header: { gap: 4 },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text },
  date: { fontSize: 14, color: theme.colors.subtext },
  progress: { fontSize: 13, color: theme.colors.primary, fontWeight: '600', marginTop: 4 },
  list: { gap: theme.spacing.xs, paddingVertical: theme.spacing.sm },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'flex-start',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxDone: { backgroundColor: theme.colors.primary },
  check: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rowText: { flex: 1, fontSize: 16, lineHeight: 22, color: theme.colors.text },
  rowTextDone: { textDecorationLine: 'line-through', color: theme.colors.subtext },
  emptyWrap: { alignItems: 'center', marginTop: 48, gap: theme.spacing.xs },
  empty: { color: theme.colors.text, fontSize: 16 },
  emptyHint: { color: theme.colors.subtext, fontSize: 13, textAlign: 'center' },
  footer: { gap: theme.spacing.sm },
  brainDumpLink: { alignSelf: 'flex-start', paddingVertical: theme.spacing.xs },
  brainDumpText: { color: theme.colors.primary, fontWeight: '600', fontSize: 14 },
  addRow: { flexDirection: 'row', gap: theme.spacing.sm },
  addInput: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
