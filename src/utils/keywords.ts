/**
 * Lightweight keyword extractor and cosine-similarity scorer.
 *
 * Used to build per-user, per-topic "vibe profiles" from their group-chat
 * messages so we can find a better 1-on-1 match for them.
 *
 * Design goals:
 * - Runs entirely on the client — no cloud function needed.
 * - Very small output (≤ 30 words) so Firestore write is cheap.
 * - Deterministic and fast (< 1 ms on a typical message).
 */

/** Words to exclude from the keyword vector. */
const STOPWORDS = new Set([
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they',
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'is', 'am',
  'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
  'can', 'could', 'not', 'no', 'so', 'as', 'just', 'like', 'that', 'this',
  'what', 'when', 'where', 'who', 'which', 'how', 'all', 'also', 'very',
  'its', 'it\'s', 'don\'t', 'im', 'ive', 'its', 'id', 'too', 'more', 'get',
  'got', 'one', 'know', 'think', 'feel', 'really', 'much', 'even', 'than',
  'then', 'there', 'their', 'them', 'us', 'him', 'her', 'out', 'now', 'still',
]);

/**
 * Extracts meaningful words from a single message.
 * Returns a frequency map { word → count }.
 */
export function extractKeywords(text: string): Record<string, number> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));

  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] ?? 0) + 1;
  }
  return freq;
}

/**
 * Merges a new message's keywords into an existing cumulative profile.
 * Caps each word at 50 and the total dictionary at 60 entries (keeps the
 * Firestore doc small) by dropping the lowest-frequency words when over limit.
 */
export function mergeKeywords(
  existing: Record<string, number>,
  incoming: Record<string, number>,
): Record<string, number> {
  const merged = { ...existing };
  for (const [w, n] of Object.entries(incoming)) {
    merged[w] = Math.min((merged[w] ?? 0) + n, 50);
  }

  // Trim to top-60 by frequency
  const entries = Object.entries(merged).sort((a, b) => b[1] - a[1]);
  const trimmed: Record<string, number> = {};
  for (const [w, n] of entries.slice(0, 60)) {
    trimmed[w] = n;
  }
  return trimmed;
}

/**
 * Cosine similarity between two keyword-frequency vectors.
 * Returns a value in [0, 1]. Returns 0 if either vector is empty.
 */
export function cosineSimilarity(
  a: Record<string, number>,
  b: Record<string, number>,
): number {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  if (allKeys.size === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const k of allKeys) {
    const va = a[k] ?? 0;
    const vb = b[k] ?? 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
