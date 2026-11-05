import { z } from 'zod';

export const createPlayerSchema = z.object({
  name: z.string().min(1, 'Player name is required').max(30, 'Name too long'),
  token: z.enum(['car', 'hat', 'dog', 'ship', 'plane', 'boot']),
  color: z.enum(['emerald', 'blue', 'amber', 'rose', 'purple', 'cyan']),
  isBanker: z.boolean().optional(),
});

export const createRoomSchema = z.object({
  name: z.string().max(50).optional(),
  startingCash: z.number().int().positive().default(25000),
  salaryAmount: z.number().int().positive().default(2000),
  players: z
    .array(createPlayerSchema)
    .min(2, 'At least 2 players are required')
    .max(4, 'Maximum 4 players allowed in this game mode'),
});

export const transferSchema = z.object({
  roomCode: z.string().min(4).max(8),
  fromId: z.string().min(1),
  toId: z.string().min(1),
  amount: z.number().int().positive('Amount must be positive'),
  type: z.enum(['SALARY', 'TAX', 'RENT', 'TRADE', 'LOAN', 'CUSTOM']),
  note: z.string().max(100).optional(),
  overrideInsufficientFunds: z.boolean().optional(),
});

export const undoSchema = z.object({
  roomCode: z.string().min(4).max(8),
  transactionId: z.string().optional(),
});
