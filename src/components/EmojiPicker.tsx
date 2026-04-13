import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'Popular',
    icon: '🔥',
    emojis: ['😂','❤️','😍','🥺','😭','🙏','😊','💜','✨','🤍','💔','😢','🔥','👏','💀','🥰','😎','🤗','😅','🤣','😤','😩','🫶','💯','🙌'],
  },
  {
    label: 'Feelings',
    icon: '😊',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐'],
  },
  {
    label: 'Sad',
    icon: '😢',
    emojis: ['😢','😭','😞','😓','😟','🙁','☹️','😣','😖','😫','😩','🥺','😿','💔','😔','😪','🥀','😧','😥'],
  },
  {
    label: 'Hearts',
    icon: '❤️',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💕','💞','💓','💗','💖','💘','💝','❤️‍🔥','❤️‍🩹','💟','☮️','✌️','🫶','💌'],
  },
  {
    label: 'Gestures',
    icon: '👍',
    emojis: ['👍','👎','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👋','🤚','🖐','✋','🖖','👏','🙌','🤲','🤝','🙏','✍️','💪','🦾','🫂','🫶'],
  },
  {
    label: 'Nature',
    icon: '🌸',
    emojis: ['🌸','🌺','🌻','🌹','🌷','💐','🍀','🌿','🌱','🌳','🌴','🌵','🍁','🍂','⭐','🌟','✨','💫','🌙','☀️','🌈','⚡','❄️','🔥','🌊'],
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ visible, onClose, onSelect }: Props) {
  const [tab, setTab] = React.useState(0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Category tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {EMOJI_CATEGORIES.map((cat, i) => (
            <TouchableOpacity
              key={cat.label}
              style={[styles.tabBtn, tab === i && styles.tabBtnActive]}
              onPress={() => setTab(i)}
            >
              <Text style={styles.tabIcon}>{cat.icon}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Emoji grid */}
        <ScrollView contentContainerStyle={styles.grid}>
          {EMOJI_CATEGORIES[tab].emojis.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.emojiBtn}
              onPress={() => { onSelect(emoji); onClose(); }}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: 340,
    paddingBottom: SPACING.lg,
  },
  tabs: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 4,
    borderRadius: RADIUS.sm,
  },
  tabBtnActive: { backgroundColor: COLORS.primaryLight },
  tabIcon: { fontSize: 22 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.sm,
  },
  emojiBtn: {
    width: '12.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
});
