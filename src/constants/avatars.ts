export type Gender = 'male' | 'female' | 'nonbinary' | 'neutral';

export const GENDER_AVATAR: Record<Gender, string> = {
  male:      '🧑',
  female:    '👩',
  nonbinary: '🧑‍🦱',
  neutral:   '🌸',
};

// Shown while gender is loading or not set
export const DEFAULT_AVATAR = '🙂';

export function avatarFor(gender: string | null | undefined): string {
  if (!gender) return DEFAULT_AVATAR;
  return GENDER_AVATAR[gender as Gender] ?? DEFAULT_AVATAR;
}
