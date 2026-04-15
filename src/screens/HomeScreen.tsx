import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useUser } from '../context/UserContext';
import { useStreak } from '../hooks/useStreak';
import { useMoodBoard } from '../hooks/useMoodBoard';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { user, alias, logout } = useUser();
  const streak = useStreak();
  const moodBoard = useMoodBoard();

  // Handle shared room deep links: ?room=<topicKey>&subroom=<roomId>
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const roomKey = params.get('room');
      const subroomId = params.get('subroom');
      if (!roomKey || !subroomId) return;
      // Clear params so going back doesn't re-trigger
      window.history.replaceState({}, '', window.location.pathname);
      getDoc(doc(db, 'topics', roomKey)).then((snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        navigation.navigate('RoomChat', {
          topicKey: roomKey,
          topicLabel: data.label as string,
          topicColor: data.color as string,
          roomId: subroomId,
        });
      });
    } catch { /* ignore */ }
  }, [user]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Top bar with alias + logout */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.aliasText}>👤 {alias ?? 'Anonymous'}</Text>
          {streak.count > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {streak.count}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.logo}>💜</Text>
          <Text style={styles.appName}>VentSpace</Text>
          <Text style={styles.tagline}>
            A safe, anonymous space to be heard{'\n'}and to listen.
          </Text>
        </View>

        {moodBoard.length > 0 && (
          <View style={styles.moodBoard}>
            <Text style={styles.moodBoardTitle}>Right now on VentSpace</Text>
            <View style={styles.moodPills}>
              {moodBoard.map((entry) => (
                <TouchableOpacity
                  key={entry.key}
                  style={[styles.moodPill, { backgroundColor: entry.color + '20', borderColor: entry.color + '50' }]}
                  onPress={() => navigation.navigate('RoomsList')}
                  activeOpacity={0.75}
                >
                  <Text style={styles.moodPillEmoji}>{entry.emoji}</Text>
                  <Text style={[styles.moodPillLabel, { color: entry.color }]}>{entry.label}</Text>
                  <Text style={styles.moodPillCount}>{entry.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => navigation.navigate('TopicSelect')}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonIcon}>🤝</Text>
            <View style={styles.buttonTextWrap}>
              <Text style={styles.buttonPrimaryTitle}>Talk 1-on-1</Text>
              <Text style={styles.buttonPrimarySubtitle}>
                Match with someone going through the same thing
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => navigation.navigate('RoomsList')}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonIcon}>💬</Text>
            <View style={styles.buttonTextWrap}>
              <Text style={styles.buttonSecondaryTitle}>Join a Room</Text>
              <Text style={styles.buttonSecondarySubtitle}>
                Talk openly in a group setting by topic
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          All conversations are anonymous · Be kind · You are not alone 💙
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  aliasText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  streakBadge: {
    backgroundColor: '#FF6B35' + '20',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FF6B35' + '40',
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
  },
  logoutBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoutText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'space-between',
    paddingVertical: SPACING.xxl,
  },
  hero: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  logo: {
    fontSize: 72,
    marginBottom: SPACING.md,
  },
  appName: {
    fontSize: 38,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 24,
  },
  buttons: {
    gap: SPACING.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonSecondary: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  buttonIcon: {
    fontSize: 36,
  },
  buttonTextWrap: {
    flex: 1,
  },
  buttonPrimaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonPrimarySubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  buttonSecondaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  buttonSecondarySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  moodBoard: {
    gap: SPACING.sm,
  },
  moodBoardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  moodPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  moodPillEmoji: {
    fontSize: 14,
  },
  moodPillLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  moodPillCount: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
