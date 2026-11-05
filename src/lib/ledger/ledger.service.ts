import { StorageAdapter } from './storage/storage-adapter.interface';
import {
  CreateRoomInput,
  RoomState,
  TransferInput,
  TransferResult,
  UndoInput,
  UndoResult,
} from './types';
import { BANK_ID, BANK_NAME, DEFAULT_STARTING_CASH, DEFAULT_SALARY_AMOUNT } from './constants';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class LedgerService {
  constructor(private readonly storage: StorageAdapter) {}

  async createRoom(input: CreateRoomInput): Promise<RoomState> {
    const code = generateRoomCode();
    const startingCash = input.startingCash ?? DEFAULT_STARTING_CASH;
    const salaryAmount = input.salaryAmount ?? DEFAULT_SALARY_AMOUNT;

    const roomId = 'room-' + Math.random().toString(36).substring(2, 10);
    const now = new Date().toISOString();

    const room: RoomState = {
      id: roomId,
      code,
      name: input.name?.trim() || `Game #${code}`,
      startingCash,
      salaryAmount,
      version: 1,
      status: 'ACTIVE',
      createdAt: now,
      players: input.players.map((p, index) => ({
        id: 'p-' + Math.random().toString(36).substring(2, 9),
        roomId,
        name: p.name.trim(),
        token: p.token,
        color: p.color,
        balance: startingCash,
        isBanker: p.isBanker ?? index === 0,
        createdAt: now,
      })),
      transactions: [],
    };

    return await this.storage.saveRoom(room);
  }

  async getRoom(code: string): Promise<RoomState | null> {
    if (!code) return null;
    return await this.storage.getRoomByCode(code);
  }

  async getRoomVersion(code: string): Promise<number | null> {
    return await this.storage.getRoomVersion(code);
  }

  async transfer(input: TransferInput): Promise<TransferResult> {
    if (!input.amount || input.amount <= 0) {
      return {
        success: false,
        code: 'INVALID_AMOUNT',
        error: 'Transfer amount must be greater than zero.',
      };
    }

    if (input.fromId === input.toId) {
      return {
        success: false,
        code: 'INVALID_PARTICIPANTS',
        error: 'Sender and recipient cannot be the same entity.',
      };
    }

    const room = await this.storage.getRoomByCode(input.roomCode);
    if (!room) {
      return {
        success: false,
        code: 'ROOM_NOT_FOUND',
        error: `Room ${input.roomCode} was not found.`,
      };
    }

    // Resolve sender
    let fromName = BANK_NAME;
    let senderBalance = Infinity;

    if (input.fromId !== BANK_ID) {
      const sender = room.players.find((p) => p.id === input.fromId);
      if (!sender) {
        return {
          success: false,
          code: 'INVALID_PARTICIPANTS',
          error: 'Sender player not found in this room.',
        };
      }
      fromName = sender.name;
      senderBalance = sender.balance;
    }

    // Resolve recipient
    let toName = BANK_NAME;
    if (input.toId !== BANK_ID) {
      const recipient = room.players.find((p) => p.id === input.toId);
      if (!recipient) {
        return {
          success: false,
          code: 'INVALID_PARTICIPANTS',
          error: 'Recipient player not found in this room.',
        };
      }
      toName = recipient.name;
    }

    // Check balance if sender is a player
    if (input.fromId !== BANK_ID && senderBalance < input.amount) {
      if (!input.overrideInsufficientFunds) {
        return {
          success: false,
          code: 'INSUFFICIENT_FUNDS',
          error: `${fromName} has insufficient funds ($${senderBalance.toLocaleString()} available, $${input.amount.toLocaleString()} needed).`,
          required: input.amount,
          available: senderBalance,
        };
      }
    }

    const executed = await this.storage.executeTransfer({
      roomCode: input.roomCode,
      fromId: input.fromId,
      fromName,
      toId: input.toId,
      toName,
      amount: input.amount,
      type: input.type,
      note: input.note,
      overrideInsufficientFunds: input.overrideInsufficientFunds,
    });

    if (!executed) {
      return {
        success: false,
        code: 'ROOM_NOT_FOUND',
        error: 'Failed to execute transfer.',
      };
    }

    return {
      success: true,
      room: executed.room,
      transaction: executed.transaction,
    };
  }

  async undoTransaction(input: UndoInput): Promise<UndoResult> {
    const room = await this.storage.getRoomByCode(input.roomCode);
    if (!room) {
      return {
        success: false,
        code: 'ROOM_NOT_FOUND',
        error: `Room ${input.roomCode} was not found.`,
      };
    }

    const executed = await this.storage.executeUndo({
      roomCode: input.roomCode,
      transactionId: input.transactionId,
    });

    if (!executed) {
      return {
        success: false,
        code: 'NOTHING_TO_UNDO',
        error: 'No active transaction found to undo.',
      };
    }

    return {
      success: true,
      room: executed.room,
      reversedTransaction: executed.reversedTransaction,
    };
  }
}
