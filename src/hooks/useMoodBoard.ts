import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface MoodEntry {
  key: string;
  label: string;
  emoji: string;
  color: string;
  count: number; // total members currently online across all subrooms
}

// Listens to all topics and their subroom member counts in real-time.
// Returns the top entries sorted by live member count descending.
export function useMoodBoard() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);

  useEffect(() => {
    // First: listen to all topics
    const topicsUnsub = onSnapshot(
      query(collection(db, 'topics')),
      (topicSnap) => {
        if (topicSnap.empty) return;

        const topics = topicSnap.docs.map((d) => ({
          key: d.id,
          label: d.data().label as string,
          emoji: d.data().emoji as string,
          color: d.data().color as string,
        }));

        // For each topic, listen to its subrooms
        const counts: Record<string, number> = {};
        const subroomUnsubs = topics.map((topic) => {
          return onSnapshot(
            query(collection(db, 'rooms', topic.key, 'subrooms')),
            (subroomSnap) => {
              counts[topic.key] = subroomSnap.docs.reduce(
                (sum, d) => sum + ((d.data().memberCount as number) ?? 0),
                0,
              );
              // Rebuild entries whenever any subroom updates
              setEntries(
                topics
                  .map((t) => ({ ...t, count: counts[t.key] ?? 0 }))
                  .filter((t) => t.count > 0)
                  .sort((a, b) => b.count - a.count),
              );
            },
          );
        });

        return () => subroomUnsubs.forEach((u) => u());
      },
    );

    return topicsUnsub;
  }, []);

  return entries;
}
