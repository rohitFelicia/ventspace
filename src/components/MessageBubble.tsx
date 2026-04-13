import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface Props {
  text: string;
  isSent: boolean;
  type?: 'text' | 'gif';
  gifUrl?: string;
}

export default function MessageBubble({ text, isSent, type = 'text', gifUrl }: Props) {
  return (
    <View style={[styles.row, isSent ? styles.rowSent : styles.rowReceived]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 3,
  },
  rowSent: {
    justifyContent: 'flex-end',
  },
  rowReceived: {
    justifyContent: 'flex-start',
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
});
