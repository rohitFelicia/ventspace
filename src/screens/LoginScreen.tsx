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
  const { signInOrSignUp } = useUser();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setError('Please enter a username.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setError('Username can only contain letters, numbers and underscores.');
      return;
    }
    if (trimmedUsername.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signInOrSignUp(trimmedUsername, password);
    } catch (err: any) {
      const msg =
        err.code === 'auth/wrong-password'
          ? 'Wrong password for this username.'
          : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please try again later.'
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
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. QuietFox or BlueMoon42"
              placeholderTextColor={COLORS.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={24}
            />
            <Text style={styles.hint}>
              Your username is your anonymous name — others only see this.
              New username? We'll create your account automatically.
            </Text>

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

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
                <Text style={styles.buttonText}>Continue →</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              No email or phone needed · All chats are anonymous · Be kind 💙
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

