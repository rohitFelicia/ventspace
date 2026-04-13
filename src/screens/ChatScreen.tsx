import React, { useRef, useState } from 'react';
import {
  Alert,
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
import { useChat } from '../hooks/useChat';
import MessageBubble from '../components/MessageBubble';
import EmojiPicker from '../components/EmojiPicker';
import GifPicker from '../components/GifPicker';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ navigation, route }: Props) {
  const { sessionId, topicLabel, topicColor } = route.params;
  const { user } = useUser();
  const { messages, partnerLeft, sessionActive, sendMessage, sendGif, endSession } = useChat(
    sessionId,
    user?.uid,
  );
  const [inputText, setInputText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    await sendMessage(text);
  };

  const handleEnd = () => {
    Alert.alert('End Conversation', 'Are you sure you want to end this chat?', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: async () => {
          await endSession();
          navigation.replace('Home');
        },
      },
    ]);
  };

  const chatEnded = !sessionActive || partnerLeft;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: topicColor + '40' }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.activeDot, { backgroundColor: chatEnded ? COLORS.textMuted : topicColor }]} />
          <Text style={styles.headerTitle}>{topicLabel}</Text>
        </View>
        {sessionActive && !partnerLeft && (
          <TouchableOpacity style={styles.endButton} onPress={handleEnd}>
            <Text style={styles.endButtonText}>End</Text>
          </TouchableOpacity>
        )}
      </View>

      {partnerLeft && (
        <View style={styles.bannerError}>
          <Text style={styles.bannerText}>💔 The other person has left the chat.</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              text={item.text}
              isSent={item.senderId === user?.uid}
              type={item.type}
              gifUrl={item.gifUrl}
            />
          )}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              You're connected! Say hi 👋{'\n'}This is a safe space — vent away.
            </Text>
          }
        />

        {!chatEnded ? (
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
        ) : (
          <View style={styles.endedBar}>
            <Text style={styles.endedText}>This conversation has ended.</Text>
            <TouchableOpacity style={styles.homeButton} onPress={() => navigation.replace('Home')}>
              <Text style={styles.homeButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        )}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  endButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.error + '15',
  },
  endButtonText: {
    color: COLORS.error,
    fontWeight: '600',
    fontSize: 14,
  },
  bannerError: {
    backgroundColor: COLORS.error + '15',
    padding: SPACING.sm,
    alignItems: 'center',
  },
  bannerText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '500',
  },
  messageList: {
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
    flexGrow: 1,
  },
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
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  endedBar: {
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  endedText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  homeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
