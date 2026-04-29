import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AIBreakdownPayload,
  ConversationPayload,
  EntryPayload,
  FullEntry,
  ManualBreakdownPayload,
  ThoughtPayload,
  deleteEntry,
  getEntry,
  togglePin,
  updateEntryTags,
} from '../../lib/entries';
import { useSessionStore } from '../../store/useSessionStore';
import { theme } from '../../constants/theme';
import { TAG_LABELS, isPresetTag } from '../../constants/tags';
import TagSelector from '../../components/TagSelector';

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<FullEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState(false);
  const [draftTags, setDraftTags] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await getEntry(id);
        if (!cancelled) {
          setEntry(result);
          if (!result) setError('Entry not found.');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load entry');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePin = async () => {
    if (!entry) return;
    try {
      await togglePin(entry.id);
      setEntry({ ...entry, pinned: !entry.pinned });
    } catch (err) {
      Alert.alert('Could not update', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const beginEditTags = () => {
    if (!entry) return;
    setDraftTags(entry.payload.tags ?? []);
    setEditingTags(true);
  };

  const saveTags = async () => {
    if (!entry) return;
    try {
      await updateEntryTags(entry.id, draftTags);
      setEntry({ ...entry, payload: { ...entry.payload, tags: draftTags } });
      setEditingTags(false);
    } catch (err) {
      Alert.alert('Could not save tags', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDelete = () => {
    if (!entry) return;
    Alert.alert('Delete this entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEntry(entry.id);
            router.back();
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

  if (error || !entry) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.error}>{error || 'Entry unavailable'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.date}>{new Date(entry.created_at).toLocaleString()}</Text>
          <Pressable onPress={handlePin}>
            <Text style={styles.pinToggle}>{entry.pinned ? 'Unpin' : 'Pin'}</Text>
          </Pressable>
        </View>

        {renderBody(entry)}

        <View style={styles.tagSection}>
          <View style={styles.tagHeader}>
            <Text style={styles.tagHeading}>TAGS</Text>
            {editingTags ? (
              <View style={styles.tagActions}>
                <Pressable onPress={() => setEditingTags(false)}>
                  <Text style={styles.tagCancel}>Cancel</Text>
                </Pressable>
                <Pressable onPress={saveTags}>
                  <Text style={styles.tagSave}>Save</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={beginEditTags}>
                <Text style={styles.tagEdit}>Edit</Text>
              </Pressable>
            )}
          </View>
          {editingTags ? (
            <TagSelector selected={draftTags} onChange={setDraftTags} />
          ) : entry.payload.tags && entry.payload.tags.length > 0 ? (
            <View style={styles.tagPillRow}>
              {entry.payload.tags.map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagPillText}>
                    {isPresetTag(tag) ? TAG_LABELS[tag] : tag}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.tagEmpty}>No tags yet.</Text>
          )}
        </View>

        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ResumeConversationButton({ entry }: { entry: FullEntry<EntryPayload> }) {
  const setMessages = useSessionStore((state) => state.setMessages);
  const setCurrentConversationId = useSessionStore((state) => state.setCurrentConversationId);
  const handle = () => {
    const p = entry.payload as ConversationPayload;
    setMessages(p.messages);
    setCurrentConversationId(entry.id);
    router.replace('/chat');
  };
  return (
    <Pressable style={styles.resumeButton} onPress={handle}>
      <Text style={styles.resumeText}>Resume conversation</Text>
    </Pressable>
  );
}

function renderBody(entry: FullEntry<EntryPayload>) {
  if (entry.type === 'conversation') {
    const p = entry.payload as ConversationPayload;
    return (
      <View style={styles.card}>
        <Section heading="Conversation" body={p.title} />
        <View style={styles.transcript}>
          {p.messages.map((m) => (
            <View key={m.id} style={m.role === 'user' ? styles.transcriptUser : styles.transcriptAssistant}>
              <Text style={styles.transcriptRole}>{m.role === 'user' ? 'You' : 'ClearMind'}</Text>
              <Text style={styles.transcriptText}>{m.text}</Text>
            </View>
          ))}
        </View>
        <ResumeConversationButton entry={entry} />
      </View>
    );
  }
  if (entry.type === 'thought') {
    const p = entry.payload as ThoughtPayload;
    return (
      <View style={styles.card}>
        <Section heading="Your thought" body={p.text} />
        <Section heading="What's happening" body={p.summary} />
        {p.pattern ? <Section heading="Pattern" body={p.pattern} /> : null}
        {p.next_step ? <Section heading="Next step" body={p.next_step} /> : null}
      </View>
    );
  }
  if (entry.type === 'manual_breakdown') {
    const p = entry.payload as ManualBreakdownPayload;
    return (
      <View style={styles.card}>
        <Section heading="Problem" body={p.problem} />
        <Section heading="One small step" body={p.step} />
        {p.ignore ? <Section heading="Ignore for now" body={p.ignore} /> : null}
      </View>
    );
  }
  const p = entry.payload as AIBreakdownPayload;
  return (
    <View style={styles.card}>
      <Section heading="Original thought" body={p.source_text} />
      <View style={styles.section}>
        <Text style={styles.heading}>Steps</Text>
        {p.steps.map((step, idx) => (
          <Text key={idx} style={styles.stepText}>
            {idx + 1}. {step}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Section({ heading, body }: { heading: string; body: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{heading}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: theme.colors.subtext },
  container: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 13, color: theme.colors.subtext },
  pinToggle: { color: theme.colors.primary, fontWeight: '600', fontSize: 14 },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  section: { gap: theme.spacing.xs },
  heading: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  body: { fontSize: 16, lineHeight: 24, color: theme.colors.text },
  stepText: { fontSize: 16, lineHeight: 24, color: theme.colors.text, marginTop: 4 },
  deleteButton: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deleteText: { color: '#B33A3A', fontWeight: '600', fontSize: 15 },
  tagSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  tagHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tagHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tagActions: { flexDirection: 'row', gap: theme.spacing.md },
  tagEdit: { color: theme.colors.primary, fontWeight: '600', fontSize: 14 },
  tagSave: { color: theme.colors.primary, fontWeight: '700', fontSize: 14 },
  tagCancel: { color: theme.colors.subtext, fontSize: 14 },
  tagPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  tagPill: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  tagPillText: { color: theme.colors.text, fontSize: 13, fontWeight: '500' },
  tagEmpty: { color: theme.colors.subtext, fontSize: 14 },
  transcript: { gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  transcriptUser: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    gap: 4,
  },
  transcriptAssistant: {
    backgroundColor: theme.colors.secondary,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    gap: 4,
  },
  transcriptRole: { fontSize: 11, fontWeight: '700', color: theme.colors.subtext, letterSpacing: 0.4 },
  transcriptText: { fontSize: 15, lineHeight: 21, color: theme.colors.text },
  resumeButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  resumeText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
