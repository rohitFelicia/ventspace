import { useEffect, useState } from 'react';

export interface StreakData {
  count: number;
  isNew: boolean; // true if streak ticked up today (first visit of the day)
}

export function useStreak(): StreakData {
  const [streak, setStreak] = useState<StreakData>({ count: 0, isNew: false });

  useEffect(() => {
    try {
      const today = new Date().toDateString();
      const lastVisit = localStorage.getItem('vs_lastVisit');
      const savedCount = parseInt(localStorage.getItem('vs_streak') ?? '0', 10);

      let count = savedCount;
      let isNew = false;

      if (!lastVisit) {
        // First ever visit
        count = 1;
        isNew = true;
      } else if (lastVisit === today) {
        // Already visited today — keep streak as-is
        count = savedCount;
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastVisit === yesterday.toDateString()) {
          // Consecutive day — increment
          count = savedCount + 1;
          isNew = true;
        } else {
          // Broke streak — reset
          count = 1;
          isNew = true;
        }
      }

      localStorage.setItem('vs_lastVisit', today);
      localStorage.setItem('vs_streak', String(count));
      setStreak({ count, isNew });
    } catch {
      // localStorage unavailable (private mode, etc.) — silently skip
    }
  }, []);

  return streak;
}
