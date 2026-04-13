import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

// Use Giphy public beta key for development.
// For production replace with your own key from developers.giphy.com (free).
const GIPHY_KEY = process.env.EXPO_PUBLIC_GIPHY_API_KEY ?? 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';
const PAGE_SIZE = 24;

interface GifResult {
  id: string;
  url: string;
  preview: string;
  title: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string, title: string) => void;
}

export default function GifPicker({ visible, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchGifs = useCallback(async (q: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const endpoint = q.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=${PAGE_SIZE}&rating=pg-13`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=${PAGE_SIZE}&rating=pg-13`;

      const res = await fetch(endpoint);
      const json = await res.json();
      const items: GifResult[] = (json.data ?? []).map((g: any) => ({
        id: g.id,
        url: g.images.downsized_medium?.url ?? g.images.original.url,
        preview: g.images.fixed_width_small?.url ?? g.images.preview_gif.url,
        title: g.title,
      }));
      setGifs(items);
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trending when modal opens
  React.useEffect(() => {
    if (visible && !searched) fetchGifs('');
  }, [visible, searched, fetchGifs]);

  const handleClose = () => {
    setQuery('');
    setGifs([]);
    setSearched(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
      <View style={styles.sheet}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search GIFs…"
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => fetchGifs(query)}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={() => fetchGifs(query)}>
            <Text style={styles.searchBtnText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color={COLORS.primary} />
        ) : (
          <FlatList
            data={gifs}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            ListEmptyComponent={
              searched ? <Text style={styles.empty}>No GIFs found. Try a different search.</Text> : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.gifItem}
                onPress={() => { onSelect(item.url, item.title); handleClose(); }}
              >
                <Image source={{ uri: item.preview }} style={styles.gifThumb} resizeMode="cover" />
              </TouchableOpacity>
            )}
          />
        )}

        <Text style={styles.poweredBy}>Powered by GIPHY</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: 420,
    paddingBottom: SPACING.md,
  },
  searchRow: {
    flexDirection: 'row',
    padding: SPACING.sm,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  searchBtn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
  },
  searchBtnText: { fontSize: 20 },
  loader: { marginTop: SPACING.xl },
  grid: { padding: SPACING.xs },
  gifItem: {
    flex: 1,
    margin: 2,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    aspectRatio: 1,
    backgroundColor: COLORS.border,
  },
  gifThumb: { width: '100%', height: '100%' },
  empty: { textAlign: 'center', color: COLORS.textMuted, padding: SPACING.lg },
  poweredBy: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textMuted,
    paddingVertical: 4,
  },
});
