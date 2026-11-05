import { PlayerColor, PlayerToken } from './types';

export const DEFAULT_STARTING_CASH = 25000;
export const DEFAULT_SALARY_AMOUNT = 2000; // "Pass GO" amount

export const BANK_ID = 'BANK';
export const BANK_NAME = 'Bank of Business';

export const QUICK_DENOMINATIONS = [50, 100, 500, 1000, 2000, 5000, 10000] as const;

export interface TokenMeta {
  id: PlayerToken;
  label: string;
  emoji: string;
}

export const PLAYER_TOKENS: TokenMeta[] = [
  { id: 'car', label: 'Sports Car', emoji: '🏎️' },
  { id: 'hat', label: 'Top Hat', emoji: '🎩' },
  { id: 'dog', label: 'Scottie Dog', emoji: '🐕' },
  { id: 'ship', label: 'Battleship', emoji: '🚢' },
  { id: 'plane', label: 'Jetliner', emoji: '✈️' },
  { id: 'boot', label: 'Boot', emoji: '🥾' },
];

export interface ColorMeta {
  id: PlayerColor;
  label: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  ringClass: string;
  badgeClass: string;
  gradientClass: string;
}

export const PLAYER_COLORS: Record<PlayerColor, ColorMeta> = {
  emerald: {
    id: 'emerald',
    label: 'Emerald Green',
    bgClass: 'bg-emerald-500',
    borderClass: 'border-emerald-500',
    textClass: 'text-emerald-500',
    ringClass: 'ring-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    gradientClass: 'from-emerald-500 to-teal-700',
  },
  blue: {
    id: 'blue',
    label: 'Sapphire Blue',
    bgClass: 'bg-blue-500',
    borderClass: 'border-blue-500',
    textClass: 'text-blue-500',
    ringClass: 'ring-blue-500',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    gradientClass: 'from-blue-500 to-indigo-700',
  },
  amber: {
    id: 'amber',
    label: 'Gold Amber',
    bgClass: 'bg-amber-500',
    borderClass: 'border-amber-500',
    textClass: 'text-amber-500',
    ringClass: 'ring-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    gradientClass: 'from-amber-500 to-orange-700',
  },
  rose: {
    id: 'rose',
    label: 'Ruby Rose',
    bgClass: 'bg-rose-500',
    borderClass: 'border-rose-500',
    textClass: 'text-rose-500',
    ringClass: 'ring-rose-500',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    gradientClass: 'from-rose-500 to-pink-700',
  },
  purple: {
    id: 'purple',
    label: 'Amethyst Purple',
    bgClass: 'bg-purple-500',
    borderClass: 'border-purple-500',
    textClass: 'text-purple-500',
    ringClass: 'ring-purple-500',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    gradientClass: 'from-purple-500 to-fuchsia-700',
  },
  cyan: {
    id: 'cyan',
    label: 'Electric Cyan',
    bgClass: 'bg-cyan-500',
    borderClass: 'border-cyan-500',
    textClass: 'text-cyan-500',
    ringClass: 'ring-cyan-500',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    gradientClass: 'from-cyan-500 to-blue-700',
  },
};
