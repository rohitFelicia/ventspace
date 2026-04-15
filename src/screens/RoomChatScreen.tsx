import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useUser } from '../context/UserContext';
import { useRoomChat, RoomMessage } from '../hooks/useRoomChat';
import { useRoomJoin } from '../hooks/useRoomJoin';
import EmojiPicker from '../components/EmojiPicker';
import GifPicker from '../components/GifPicker';
import BreathingOverlay from '../components/BreathingOverlay';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const VIBES = [
  { emoji: '😢', label: 'Heavy' },
  { emoji: '😤', label: 'Venting' },
  { emoji: '🌱', label: 'Hopeful' },
] as const;

const REACTION_EMOJIS = ['💙', '🫂', '💪'] as const;

type Props = NativeStackScreenProps<RootStackParamList, 'RoomChat'>;

export default function RoomChatScreen({ navigation, route }: Props) {
  const { topicKey, topicLabel, topicColor, roomId } = route.params;
  const { user, alias } = useUser();
  const { messages, senderAlias, typingAliases, sendMessage, sendGif, setTyping, addReaction } = useRoomChat(topicKey, roomId, user?.uid, alias);
  const { leaveRoom } = useRoomJoin();
  const [inputText, setInputText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [vibe, setVibeState] = useState<string | null>(null);
  const [showVibePicker, setShowVibePicker] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const flatListRef = useRef<FlatList<RoomMessage>>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Leave the subroom when navigating away OR closing the browser tab
  useEffect(() => {
    const handleUnload = () => {
      if (user?.uid) leaveRoom(user.uid, topicKey, roomId);
    };
    window.addEventListener('beforeunload', handleUnload);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && user?.uid) {
        leaveRoom(user.uid, topicKey, roomId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (user?.uid) leaveRoom(user.uid, topicKey, roomId);
      setTyping(false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, topicKey, roomId]);

  // Listen to vibe from subroom doc
  useEffect(() => {
    if (!roomId) return;
    const unsubVibe = onSnapshot(
      doc(db, 'rooms', topicKey, 'subrooms', roomId),
      (snap) => { if (snap.exists()) setVibeState(snap.data().vibe ?? null); },
    );
    return unsubVibe;
  }, [topicKey, roomId]);

  const setVibe = async (v: string) => {
    await updateDoc(doc(db, 'rooms', topicKey, 'subrooms', roomId), { vibe: v });
    setShowVibePicker(false);
  };

  const shareRoom = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${topicKey}&subroom=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    }).catch(() => {});
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    setTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    await sendMessage(text);
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    setTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setTyping(false), 2000);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: topicColor + '40' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.leaveText, { color: topicColor }]}>← Leave</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{topicLabel} Room</Text>
          {vibe && (
            <TouchableOpacity onPress={() => setShowVibePicker(v => !v)}>
              <Text style={styles.vibeBadge}>{vibe}</Text>
            </TouchableOpacity>
          )}
          {!vibe && (
            <TouchableOpacity onPress={() => setShowVibePicker(v => !v)}>
              <Text style={[styles.vibeSet, { color: topicColor }]}>set vibe</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.breathBtn} onPress={() => setShowBreathing(true)}>
            <Text style={styles.breathBtnText}>🌬️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={shareRoom} style={styles.shareBtn}>
            <Text style={styles.shareBtnText}>{copyToast ? '✓' : '🔗'}</Text>
          </TouchableOpacity>
          <Text style={styles.myAlias}>{senderAlias}</Text>
        </View>
      </View>

      {showVibePicker && (
        <View style={styles.vibePicker}>
          {VIBES.map(({ emoji, label }) => (
            <TouchableOpacity
              key={emoji}
              style={[styles.vibeOption, vibe === emoji && { backgroundColor: topicColor + '25' }]}
              onPress={() => setVibe(emoji)}
            >
              <Text style={styles.vibeOptionText}>{emoji} {label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No messages yet. Be the first! 👋
              </Text>
              <View style={styles.starterChips}>
                {["What's everyone going through?", "I'm new here, just needed a space", "Can I share something?", "I've been dealing with something similar"].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.starterChip, { borderColor: topicColor }]}
                    onPress={() => setInputText(s)}
                  >
                    <Text style={[styles.starterChipText, { color: topicColor }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const isSent = item.senderId === user?.uid;
            return (
              <View style={[styles.msgRow, isSent ? styles.msgRowSent : styles.msgRowReceived]}>
                {!isSent && (
                  <Text style={styles.alias}>{item.senderAlias}</Text>
                )}
                {item.type === 'gif' && item.gifUrl ? (
                  <View style={[styles.bubble, isSent ? styles.bubbleSent : styles.bubbleReceived, { padding: 0, overflow: 'hidden' }]}>
                    {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
                    <img src={item.gifUrl} style={{ width: 180, height: 140, objectFit: 'cover', borderRadius: 12 }} alt={item.text} />
                  </View>
                ) : (
                  <View style={[styles.bubble, isSent ? styles.bubbleSent : styles.bubbleReceived]}>
                    <Text style={[styles.msgText, isSent ? styles.msgTextSent : styles.msgTextReceived]}>
                      {item.text}
                    </Text>
                  </View>
                )}
                {/* Reaction row */}
                <View style={[styles.reactRow, isSent ? styles.reactRowSent : styles.reactRowReceived]}>
                  {REACTION_EMOJIS.map((emoji) => {
                    const count = item.reactions?.[emoji] ?? 0;
                    return (
                      <TouchableOpacity
                        key={emoji}
                        style={[
                          styles.reactChip,
                          count > 0 && { backgroundColor: topicColor + '25' },
                        ]}
                        onPress={() => addReaction(item.id, emoji)}
                      >
                        <Text style={[styles.reactChipText, count === 0 && styles.reactChipDimmed]}>
                          {emoji}{count > 0 ? ` ${count}` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          }}
        />

        {typingAliases.length > 0 && (
          <View style={styles.typingBar}>
            <Text style={styles.typingText}>
              {typingAliases.length === 1
                ? `${typingAliases[0]} is typing…`
                : `${typingAliases.length} people are typing…`}
            </Text>
          </View>
        )}

        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setShowGif(false); setShowEmoji(v => !v); }}>
              <Text style={styles.iconBtnText}>😊</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setShowEmoji(false); setShowGif(v => !v); }}>
              <Text style={styles.iconBtnText}>GIF</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={handleTyping}
              placeholder="Type something…"
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={500}
              onFocus={() => { setShowEmoji(false); setShowGif(false); }}
            />
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: inputText.trim() ? topicColor : COLORS.border }]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <EmojiPicker
        visible={showEmoji}
        onClose={() => setShowEmoji(false)}
        onSelect={(emoji) => setInputText(t => t + emoji)}
      />
      <GifPicker
        visible={showGif}
        onClose={() => setShowGif(false)}
        onSelect={(gifUrl, title) => { sendGif(gifUrl, title); setShowGif(false); }}
      />
      {showBreathing && <BreathingOverlay onClose={() => setShowBreathing(false)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
  },
  leaveText: { fontSize: 15, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  breathBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathBtnText: { fontSize: 15 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  myAlias: { fontSize: 12, color: COLORS.textMuted },
  vibeBadge: { fontSize: 18, marginTop: 2 },
  vibeSet: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  vibePicker: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    justifyContent: 'center',
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  vibeOption: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vibeOptionText: { fontSize: 14 },
  shareBtn: { padding: 4 },
  shareBtnText: { fontSize: 18 },
  typingBar: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  typingText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  reactRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 3,
  },
  reactRowSent: { justifyContent: 'flex-end' },
  reactRowReceived: { justifyContent: 'flex-start' },
  reactChip: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: COLORS.border,
  },
  reactChipText: { fontSize: 12 },
  reactChipDimmed: { opacity: 0.35 },
  msgList: {
    padding: SPACING.md,
    flexGrow: 1,
    gap: SPACING.xs,
  },
  msgRow: { marginVertical: 2 },
  msgRowSent: { alignItems: 'flex-end' },
  msgRowReceived: { alignItems: 'flex-start' },
  alias: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  bubbleSent: {
    backgroundColor: COLORS.bubbleSent,
    borderBottomRightRadius: RADIUS.sm,
  },
  bubbleReceived: {
    backgroundColor: COLORS.bubbleReceived,
    borderBottomLeftRadius: RADIUS.sm,
  },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTextSent: { color: COLORS.bubbleSentText },
  msgTextReceived: { color: COLORS.bubbleReceivedText },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
  },
  starterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  starterChip: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  starterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputArea: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
});
