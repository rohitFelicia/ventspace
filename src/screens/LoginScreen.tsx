import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

export default function LoginScreen() {
  const { signUp, signIn } = useUser();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    const trimmedPhone = phone.trim();
    const trimmedAlias = alias.trim();

    if (!trimmedPhone || !password) {
      setError('Please enter your phone number and password.');
      return;
    }
    if (mode === 'register' && !trimmedAlias) {
      setError('Please choose an anonymous name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await signUp(trimmedPhone, password, trimmedAlias);
      } else {
        await signIn(trimmedPhone, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err.code, err.message);
      const msg =
        err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
          ? 'Wrong phone number or password.'
          : err.code === 'auth/email-already-in-use'
          ? 'This phone number is already registered. Try logging in instead.'
          : err.code === 'auth/operation-not-allowed'
          ? 'Email/Password sign-in is not enabled yet. Check Firebase console.'
          : err.message ?? 'Something went wrong.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.logo}>💜</Text>
            <Text style={styles.appName}>VentSpace</Text>
            <Text style={styles.tagline}>A safe, anonymous space to be heard.</Text>
          </View>

          <View style={styles.card}>
            {/* Tab toggle */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && styles.tabActive]}
                onPress={() => setMode('login')}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                  Log In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'register' && styles.tabActive]}
                onPress={() => setMode('register')}
              >
                <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Phone */}
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+1 555 000 0000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {/* Alias — only on register */}
            {mode === 'register' && (
              <>
                <Text style={styles.label}>Your Anonymous Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. QuietFox, BlueMoon42"
                  placeholderTextColor={COLORS.textMuted}
                  value={alias}
                  onChangeText={setAlias}
                  maxLength={24}
                  autoCapitalize="words"
                />
                <Text style={styles.hint}>
                  This is the only name other users will ever see — not your phone number.
                </Text>
              </>
            )}

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === 'register' ? '🚀  Create my account' : '🔐  Log In'}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Your phone number is never shown to anyone. Only your chosen name is visible.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.primaryLight },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },
  hero: { alignItems: 'center', marginBottom: SPACING.xl },
  logo: { fontSize: 56 },
  appName: { fontSize: 34, fontWeight: '800', color: COLORS.primary, marginTop: 8 },
  tagline: { fontSize: 15, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: COLORS.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: SPACING.sm },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  hint: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, lineHeight: 17 },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disclaimer: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#FFF0F0',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    lineHeight: 18,
  },
});
