export type TopicKey = 'breakup' | 'work' | 'family' | 'anxiety' | 'general';

export interface Topic {
  key: TopicKey;
  label: string;
  emoji: string;
  description: string;
  color: string;
}

export const TOPICS: Topic[] = [
  {
    key: 'breakup',
    label: 'Heartbreak',
    emoji: '💔',
    description: 'Going through a breakup or relationship pain',
    color: '#FF6B8A',
  },
  {
    key: 'work',
    label: 'Work Stress',
    emoji: '😤',
    description: 'Office pressure, toxic workplace, burnout',
    color: '#FF9F40',
  },
  {
    key: 'family',
    label: 'Family Issues',
    emoji: '🏠',
    description: 'Family conflicts or difficult home situations',
    color: '#4ECDC4',
  },
  {
    key: 'anxiety',
    label: 'Anxiety',
    emoji: '😰',
    description: 'Overthinking, panic, or general anxiety',
    color: '#9B59B6',
  },
  {
    key: 'general',
    label: 'Just Venting',
    emoji: '💬',
    description: 'Anything on your mind — no topic needed',
    color: '#5B8DEF',
  },
];
