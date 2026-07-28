import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useUser } from '../context/UserContext';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

export default function LogoutButton() {
  const { logout } = useUser();
  return (
    <TouchableOpacity onPress={logout} style={styles.btn} activeOpacity={0.7}>
      <Text style={styles.text}>Log out</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  text: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
