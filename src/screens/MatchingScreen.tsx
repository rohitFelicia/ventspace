import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useUser } from '../context/UserContext';
import { useMatchmaking } from '../hooks/useMatchmaking';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Matching'>;

export default function MatchingScreen({ navigation, route }: Props) {
  const { topicKey, topicLabel, topicColor } = route.params;
  const { user } = useUser();
  const { status, sessionId, startMatching, cancelMatching } = useMatchmaking(
    user?.uid,
    topicKey,
  );
  const matchedRef = useRef(false);

  useEffect(() => {
    startMatching();
    return () => {
      // Only cancel the queue if we never matched (e.g. user pressed back)
      if (!matchedRef.current) {
        cancelMatching();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === 'matched' && sessionId) {
      matchedRef.current = true;
      navigation.replace('Chat', { sessionId, topicLabel, topicColor });
    }
  }, [status, sessionId, navigation, topicLabel, topicColor]);

  const handleCancel = async () => {
    await cancelMatching();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔍</Text>
        <Text style={styles.title}>Finding someone for you…</Text>
        <Text style={[styles.topicBadge, { color: topicColor }]}>{topicLabel}</Text>
        <Text style={styles.subtitle}>
          Looking for someone who wants to talk about the same thing.{'\n'}
          Usually takes under a minute.
        </Text>

        <ActivityIndicator size="large" color={topicColor} style={styles.spinner} />

        {status === 'error' && (
          <Text style={styles.error}>Something went wrong. Please try again.</Text>
        )}

        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emoji: {
    fontSize: 72,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  topicBadge: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: SPACING.md,
  },
  spinner: {
    marginVertical: SPACING.xl,
  },
  error: {
    color: COLORS.error,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  cancelButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.textMuted,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
