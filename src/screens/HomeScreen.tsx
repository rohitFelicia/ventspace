import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useUser } from '../context/UserContext';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { alias, logout } = useUser();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Top bar with alias + logout */}
      <View style={styles.topBar}>
        <Text style={styles.aliasText}>👤 {alias ?? 'Anonymous'}</Text>
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
  aliasText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
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
});
