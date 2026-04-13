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
import { RootStackParamList } from '../navigation/AppNavigator';
import { useUser } from '../context/UserContext';
import { useRoomChat, RoomMessage } from '../hooks/useRoomChat';
import { useRoomJoin } from '../hooks/useRoomJoin';
import EmojiPicker from '../components/EmojiPicker';
import GifPicker from '../components/GifPicker';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomChat'>;

export default function RoomChatScreen({ navigation, route }: Props) {
  const { topicKey, topicLabel, topicColor, roomId } = route.params;
  const { user, alias } = useUser();
  const { messages, senderAlias, sendMessage, sendGif } = useRoomChat(topicKey, roomId, user?.uid, alias);
  const { leaveRoom } = useRoomJoin();
  const [inputText, setInputText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const flatListRef = useRef<FlatList<RoomMessage>>(null);

  // Leave the subroom when navigating away
  useEffect(() => {
    return () => {
      if (user?.uid) leaveRoom(user.uid, topicKey, roomId);
    };
  }, [user?.uid, topicKey, roomId]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    await sendMessage(text);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: topicColor + '40' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.leaveText, { color: topicColor }]}>← Leave</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{topicLabel} Room</Text>
        <Text style={styles.myAlias}>{senderAlias}</Text>
      </View>

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
            <Text style={styles.emptyText}>
              No messages yet.{'\n'}Be the first to say something 👋
            </Text>
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
              </View>
            );
          }}
        />

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
              onChangeText={setInputText}
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  myAlias: { fontSize: 12, color: COLORS.textMuted },
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
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    marginTop: SPACING.xxl,
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
