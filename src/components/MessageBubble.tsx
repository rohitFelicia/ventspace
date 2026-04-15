import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const REACTION_EMOJIS = ['💙', '🫂', '💪'] as const;

interface Props {
  text: string;
  isSent: boolean;
  type?: 'text' | 'gif';
  gifUrl?: string;
  reactions?: Record<string, number>;
  onReact?: (emoji: string) => void;
  accentColor?: string;
}

export default function MessageBubble({
  text,
  isSent,
  type = 'text',
  gifUrl,
  reactions,
  onReact,
  accentColor,
}: Props) {
  const hasReactions = reactions && Object.values(reactions).some((v) => v > 0);

  return (
    <View style={[styles.row, isSent ? styles.rowSent : styles.rowReceived]}>
      {/* Message bubble */}
      {type === 'gif' && gifUrl ? (
        <View style={[styles.gifBubble, isSent ? styles.bubbleSent : styles.bubbleReceived]}>
          <Image source={{ uri: gifUrl }} style={styles.gif} resizeMode="cover" />
        </View>
      ) : (
        <View style={[styles.bubble, isSent ? styles.bubbleSent : styles.bubbleReceived]}>
          <Text style={[styles.text, isSent ? styles.textSent : styles.textReceived]}>
            {text}
          </Text>
        </View>
      )}

      {/* Reaction pills (existing counts) */}
      {hasReactions && (
        <View style={[styles.pillsRow, isSent ? styles.pillsRowSent : styles.pillsRowReceived]}>
          {Object.entries(reactions!).filter(([, c]) => c > 0).map(([emoji, count]) => (
            <View
              key={emoji}
              style={[
                styles.pill,
                { backgroundColor: accentColor ? accentColor + '20' : COLORS.primaryLight },
              ]}
            >
              <Text style={styles.pillText}>{emoji} {count}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Reaction tap row — always shown when onReact is provided */}
      {onReact && (
        <View style={[styles.reactRow, isSent ? styles.reactRowSent : styles.reactRowReceived]}>
          {REACTION_EMOJIS.map((emoji) => {
            const count = reactions?.[emoji] ?? 0;
            return (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.reactChip,
                  count > 0 && { backgroundColor: accentColor ? accentColor + '25' : COLORS.primaryLight },
                ]}
                onPress={() => onReact(emoji)}
              >
                <Text style={[styles.reactChipText, count === 0 && styles.reactChipDimmed]}>
                  {emoji}{count > 0 ? ` ${count}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 3,
  },
  rowSent: {
    alignItems: 'flex-end',
  },
  rowReceived: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  gifBubble: {
    maxWidth: '75%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  gif: {
    width: 200,
    height: 160,
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
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  textSent: {
    color: COLORS.bubbleSentText,
  },
  textReceived: {
    color: COLORS.bubbleReceivedText,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  pillsRowSent: { justifyContent: 'flex-end' },
  pillsRowReceived: { justifyContent: 'flex-start' },
  pill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  pillText: { fontSize: 12, color: COLORS.text },
  reactRow: {
    flexDirection: 'row',
    gap: 2,
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
  reactChipText: { fontSize: 13 },
  reactChipDimmed: { opacity: 0.35 },
});
