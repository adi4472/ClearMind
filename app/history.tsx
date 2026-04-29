import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  ConversationPayload,
  FullEntry,
  deleteEntry,
  deriveEntryTitle,
  listFullEntries,
  togglePin,
} from '../lib/entries';
import { useSessionStore } from '../store/useSessionStore';
import { theme } from '../constants/theme';
import { PRESET_TAGS, PresetTag, TAG_LABELS, isPresetTag } from '../constants/tags';

const TYPE_LABEL: Record<FullEntry['type'], string> = {
  thought: 'Thought',
  manual_breakdown: 'Manual breakdown',
  ai_breakdown: 'AI breakdown',
  conversation: 'Conversation',
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function HistoryScreen() {
  const [entries, setEntries] = useState<FullEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PresetTag | null>(null);
  const setMessages = useSessionStore((state) => state.setMessages);
  const setCurrentConversationId = useSessionStore((state) => state.setCurrentConversationId);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await listFullEntries();
      setEntries(list);
    } catch (err) {
      console.warn('listFullEntries failed:', err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visible = useMemo(() => {
    if (!filter) return entries;
    return entries.filter((e) => e.payload.tags?.includes(filter));
  }, [entries, filter]);

  const handleLongPress = (entry: FullEntry) => {
    Alert.alert('Entry actions', undefined, [
      {
        text: entry.pinned ? 'Unpin' : 'Pin',
        onPress: async () => {
          try {
            await togglePin(entry.id);
            const list = await listFullEntries();
            setEntries(list);
          } catch (err) {
            Alert.alert('Could not update', err instanceof Error ? err.message : 'Unknown error');
          }
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDelete(entry),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmDelete = (entry: FullEntry) => {
    Alert.alert('Delete this entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEntry(entry.id);
            setEntries((prev) => prev.filter((e) => e.id !== entry.id));
          } catch (err) {
            Alert.alert('Could not delete', err instanceof Error ? err.message : 'Unknown error');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  const filterRow = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {PRESET_TAGS.map((tag) => {
        const active = filter === tag;
        return (
          <Pressable
            key={tag}
            onPress={() => setFilter(active ? null : tag)}
            style={[styles.filterChip, active && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, active && styles.filterTextActive]}>
              {TAG_LABELS[tag]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={filterRow}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => {
              if (item.type === 'conversation') {
                const p = item.payload as ConversationPayload;
                setMessages(p.messages);
                setCurrentConversationId(item.id);
                router.push('/chat');
              } else {
                router.push({ pathname: '/history/[id]', params: { id: item.id } });
              }
            }}
            onLongPress={() => handleLongPress(item)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.type}>{TYPE_LABEL[item.type]}</Text>
              {item.pinned ? <Text style={styles.pinned}>Pinned</Text> : null}
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {deriveEntryTitle(item)}
            </Text>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
            {item.payload.tags && item.payload.tags.length > 0 ? (
              <View style={styles.rowTagPills}>
                {item.payload.tags.map((tag) => (
                  <View key={tag} style={styles.rowTagPill}>
                    <Text style={styles.rowTagPillText}>
                      {isPresetTag(tag) ? TAG_LABELS[tag] : tag}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>
              {filter ? `No entries tagged ${TAG_LABELS[filter]}.` : 'No entries yet.'}
            </Text>
            <Text style={styles.emptyHint}>
              {filter ? 'Tap the active filter to clear it.' : 'Long-press an entry to pin or delete it.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: theme.spacing.lg, gap: theme.spacing.sm },
  filterRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: { color: theme.colors.text, fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontSize: 12, color: theme.colors.subtext, fontWeight: '600', letterSpacing: 0.4 },
  title: { fontSize: 15, fontWeight: '600', color: theme.colors.text, lineHeight: 21 },
  pinned: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
  date: { fontSize: 13, color: theme.colors.subtext },
  rowTagPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  rowTagPill: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  rowTagPillText: { color: theme.colors.text, fontSize: 11, fontWeight: '500' },
  emptyWrap: { alignItems: 'center', marginTop: 64, gap: theme.spacing.xs },
  empty: { color: theme.colors.subtext, fontSize: 16 },
  emptyHint: { color: theme.colors.subtext, fontSize: 13 },
});
