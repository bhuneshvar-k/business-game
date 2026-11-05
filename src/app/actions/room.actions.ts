'use server';

import { getLedgerService } from '@/lib/ledger';
import {
  createRoomSchema,
  transferSchema,
  undoSchema,
} from '@/lib/ledger/schema';
import {
  CreateRoomInput,
  RoomState,
  TransferInput,
  TransferResult,
  UndoResult,
} from '@/lib/ledger/types';
import { ZodError } from 'zod';

export async function createRoomAction(
  rawInput: CreateRoomInput
): Promise<{ success: true; room: RoomState } | { success: false; error: string }> {
  try {
    const validated = createRoomSchema.parse(rawInput);
    const ledger = getLedgerService();
    const room = await ledger.createRoom(validated);
    return { success: true, room };
  } catch (err: unknown) {
    let message = 'Failed to create room';
    if (err instanceof ZodError) {
      message = err.issues[0]?.message || message;
    } else if (err instanceof Error) {
      message = err.message;
    }
    return {
      success: false,
      error: message,
    };
  }
}

export async function transferAction(rawInput: TransferInput): Promise<TransferResult> {
  try {
    const validated = transferSchema.parse(rawInput);
    const ledger = getLedgerService();
    return await ledger.transfer(validated);
  } catch (err: unknown) {
    let message = 'Invalid transfer parameters';
    if (err instanceof ZodError) {
      message = err.issues[0]?.message || message;
    } else if (err instanceof Error) {
      message = err.message;
    }
    return {
      success: false,
      code: 'INVALID_AMOUNT',
      error: message,
    };
  }
}

export async function undoAction(rawInput: {
  roomCode: string;
  transactionId?: string;
}): Promise<UndoResult> {
  try {
    const validated = undoSchema.parse(rawInput);
    const ledger = getLedgerService();
    return await ledger.undoTransaction(validated);
  } catch (err: unknown) {
    let message = 'Failed to undo transaction';
    if (err instanceof ZodError) {
      message = err.issues[0]?.message || message;
    } else if (err instanceof Error) {
      message = err.message;
    }
    return {
      success: false,
      code: 'NOTHING_TO_UNDO',
      error: message,
    };
  }
}

export async function getRoomAction(code: string): Promise<RoomState | null> {
  const ledger = getLedgerService();
  return await ledger.getRoom(code);
}
