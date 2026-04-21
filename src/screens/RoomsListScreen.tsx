import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { RootStackParamList } from '../navigation/AppNavigator';
import { TOPICS } from '../constants/topics';
import { useUser } from '../context/UserContext';
import { useRoomJoin } from '../hooks/useRoomJoin';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

export interface FirestoreTopic {
  key: string;
  label: string;
  emoji: string;
  color: string;
  description: string;
  createdBy: string;
  isDefault?: boolean;
}

const COLOR_PALETTE = [
  '#FF6B8A', '#FF9F40', '#4ECDC4', '#9B59B6', '#5B8DEF',
  '#2ECC71', '#E74C3C', '#F39C12', '#1ABC9C', '#8E44AD',
];

const PICK_EMOJIS = [
  '💬', '😤', '💔', '😰', '🏠', '🔥', '🌊', '😢', '😩', '🤯',
  '🧠', '💪', '🌈', '🎭', '🙃', '😶', '🤔', '😮', '🥺', '🫂',
  '🌙', '☀️', '⛈️', '🤝', '👊', '🕊️', '🎯', '📢', '🗣️', '🌿',
  '🍃', '💊', '📚', '🎮', '🎵', '☕', '🐾', '🏋️', '🧘', '🎨',
];

type Props = NativeStackScreenProps<RootStackParamList, 'RoomsList'>;

// Single listener for all member counts — avoids N parallel Firestore listeners
function useAllMemberCounts(topicKeys: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!topicKeys.length) return;
    const unsubs = topicKeys.map((key) => {
      const q = query(collection(db, 'rooms', key, 'subrooms'));
      return onSnapshot(q, (snap) => {
        const total = snap.docs.reduce(
          (sum, d) => sum + ((d.data().memberCount as number) ?? 0), 0,
        );
        setCounts((prev) => ({ ...prev, [key]: total }));
      });
    });
    return () => unsubs.forEach((u) => u());
  }, [topicKeys.join(',')]);
  return counts;
}

const TopicCard = memo(function TopicCard({
  item,
  count,
  onPress,
  isJoining,
}: {
  item: FirestoreTopic;
  count: number | undefined;
  onPress: () => void;
  isJoining: boolean;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} disabled={isJoining} activeOpacity={0.8}>
      <View style={[styles.iconWrap, { backgroundColor: item.color + '20' }]}>
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.label}</Text>
        {!!item.description && <Text style={styles.cardDesc}>{item.description}</Text>}
        <Text style={[styles.onlineCount, { color: item.color }]}>
          {count === undefined ? '…' : count === 0 ? 'Be the first to join' : `${count} ${count === 1 ? 'person' : 'people'} online`}
        </Text>
      </View>
      {isJoining ? (
        <ActivityIndicator size="small" color={item.color} />
      ) : (
        <Text style={styles.arrow}>›</Text>
      )}
    </TouchableOpacity>
  );
});

function CreateRoomModal({
  visible,
  onClose,
  uid,
  topicCount,
}: {
  visible: boolean;
  onClose: () => void;
  uid: string;
  topicCount: number;
}) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💬');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmed = label.trim();
    if (!trimmed) { setError('Please enter a room name'); return; }
    if (trimmed.length > 30) { setError('Name must be 30 characters or less'); return; }
    setCreating(true);
    setError(null);
    try {
      const color = COLOR_PALETTE[topicCount % COLOR_PALETTE.length];
      await addDoc(collection(db, 'topics'), {
        label: trimmed,
        description: description.trim().slice(0, 80),
        emoji: selectedEmoji,
        color,
        createdBy: uid,
        createdAt: serverTimestamp(),
        isDefault: false,
      });
      setLabel('');
      setDescription('');
      setSelectedEmoji('💬');
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <Text style={styles.sheetTitle}>Create a Room</Text>

          <Text style={styles.fieldLabel}>Room Name *</Text>
          <TextInput
            style={styles.textInput}
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. Late Night Thoughts"
            placeholderTextColor={COLORS.textMuted}
            maxLength={30}
            autoFocus
          />

          <Text style={styles.fieldLabel}>Description (optional)</Text>
          <TextInput
            style={styles.textInput}
            value={description}
            onChangeText={setDescription}
            placeholder="What's this room about?"
            placeholderTextColor={COLORS.textMuted}
            maxLength={80}
          />

          <Text style={styles.fieldLabel}>Pick an Emoji</Text>
          <View style={styles.emojiGrid}>
            {PICK_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiOption, selectedEmoji === e && styles.emojiOptionSelected]}
                onPress={() => setSelectedEmoji(e)}
              >
                <Text style={styles.emojiOptionText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.createBtn, creating && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={creating}
          >
            {creating
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.createBtnText}>Create Room</Text>
            }
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function RoomsListScreen({ navigation }: Props) {
  const { user, alias } = useUser();
  const { joinRoom } = useRoomJoin();
  const [topics, setTopics] = useState<FirestoreTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [joiningTopic, setJoiningTopic] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const memberCounts = useAllMemberCounts(topics.map((t) => t.key));

  // Seed hardcoded defaults into Firestore on first ever load
  const seedDefaultTopics = async (uid: string) => {
    for (const t of TOPICS) {
      await setDoc(doc(db, 'topics', t.key), {
        label: t.label,
        description: t.description,
        emoji: t.emoji,
        color: t.color,
        createdBy: uid,
        createdAt: serverTimestamp(),
        isDefault: true,
      });
    }
  };

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'topics'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) {
        await seedDefaultTopics(user.uid);
        return;
      }
      setTopics(snap.docs.map((d) => ({ key: d.id, ...d.data() } as FirestoreTopic)));
      setLoadingTopics(false);
    });
    return unsub;
  }, [user?.uid]);

  const handleJoin = useCallback(async (item: FirestoreTopic) => {
    if (!user?.uid) return;
    setJoiningTopic(item.key);
    const result = await joinRoom(user.uid, item.key, alias ?? undefined);
    setJoiningTopic(null);
    if (result) {
      navigation.navigate('RoomChat', {
        topicKey: item.key,
        topicLabel: item.label,
        topicColor: item.color,
        roomId: result.roomId,
      });
    }
  }, [user?.uid, alias, joinRoom, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Open Rooms</Text>
          <Text style={styles.subtitle}>Tap a topic to join instantly. All anonymous.</Text>
        </View>
        <TouchableOpacity style={styles.newRoomBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.newRoomBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loadingTopics ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={topics}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TopicCard
              item={item}
              count={memberCounts[item.key]}
              onPress={() => handleJoin(item)}
              isJoining={joiningTopic === item.key}
            />
          )}
        />
      )}

      <CreateRoomModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        uid={user?.uid ?? ''}
        topicCount={topics.length}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
  },
  back: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  newRoomBtn: {
    marginTop: 4,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  newRoomBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  list: {
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 28 },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  onlineCount: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  arrow: {
    fontSize: 22,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    fontSize: 15,
    color: COLORS.text,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  emojiOption: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emojiOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  emojiOptionText: { fontSize: 20 },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    marginTop: SPACING.sm,
  },
  createBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    padding: SPACING.md,
    alignItems: 'center',
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
