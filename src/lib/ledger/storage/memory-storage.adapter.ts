import { StorageAdapter, ExecuteTransferParams, ExecuteUndoParams } from './storage-adapter.interface';
import { RoomState, TransactionRecord, TransactionType } from '../types';
import { BANK_ID } from '../constants';

const globalMemoryStore = globalThis as unknown as {
  __memoryRooms?: Map<string, RoomState>;
};

if (!globalMemoryStore.__memoryRooms) {
  globalMemoryStore.__memoryRooms = new Map<string, RoomState>();
}

const rooms = globalMemoryStore.__memoryRooms;

export class MemoryStorageAdapter implements StorageAdapter {
  async getRoomByCode(code: string): Promise<RoomState | null> {
    const normalized = code.trim().toUpperCase();
    const room = rooms.get(normalized);
    if (!room) return null;
    return JSON.parse(JSON.stringify(room));
  }

  async saveRoom(room: RoomState): Promise<RoomState> {
    const normalized = room.code.trim().toUpperCase();
    const cloned: RoomState = JSON.parse(JSON.stringify(room));
    rooms.set(normalized, cloned);
    return JSON.parse(JSON.stringify(cloned));
  }

  async executeTransfer(
    params: ExecuteTransferParams
  ): Promise<{ room: RoomState; transaction: TransactionRecord } | null> {
    const normalized = params.roomCode.trim().toUpperCase();
    const currentRoom = rooms.get(normalized);
    if (!currentRoom) return null;

    // Validate participants first without mutating state
    const sender = params.fromId !== BANK_ID ? currentRoom.players.find((p) => p.id === params.fromId) : null;
    const recipient = params.toId !== BANK_ID ? currentRoom.players.find((p) => p.id === params.toId) : null;

    if (params.fromId !== BANK_ID && !sender) return null;
    if (params.toId !== BANK_ID && !recipient) return null;

    // Atomic balance constraint check inside the storage adapter
    if (sender && !params.overrideInsufficientFunds && sender.balance < params.amount) {
      return null;
    }

    const transaction: TransactionRecord = {
      id: 'tx-' + Math.random().toString(36).substring(2, 10),
      roomId: currentRoom.id,
      fromId: params.fromId,
      fromName: params.fromName,
      toId: params.toId,
      toName: params.toName,
      amount: params.amount,
      type: params.type as TransactionType,
      note: params.note,
      isReversed: false,
      createdAt: new Date().toISOString(),
    };

    // Immutably create updated players array
    const updatedPlayers = currentRoom.players.map((p) => {
      if (p.id === params.fromId) {
        return { ...p, balance: p.balance - params.amount };
      }
      if (p.id === params.toId) {
        return { ...p, balance: p.balance + params.amount };
      }
      return { ...p };
    });

    const updatedRoom: RoomState = {
      ...currentRoom,
      version: currentRoom.version + 1,
      players: updatedPlayers,
      transactions: [transaction, ...currentRoom.transactions],
    };

    rooms.set(normalized, updatedRoom);

    return {
      room: JSON.parse(JSON.stringify(updatedRoom)),
      transaction: JSON.parse(JSON.stringify(transaction)),
    };
  }

  async executeUndo(
    params: ExecuteUndoParams
  ): Promise<{ room: RoomState; reversedTransaction: TransactionRecord } | null> {
    const normalized = params.roomCode.trim().toUpperCase();
    const currentRoom = rooms.get(normalized);
    if (!currentRoom) return null;

    let targetTxIndex = -1;
    if (params.transactionId) {
      targetTxIndex = currentRoom.transactions.findIndex(
        (t) => t.id === params.transactionId && !t.isReversed
      );
    } else {
      targetTxIndex = currentRoom.transactions.findIndex((t) => !t.isReversed);
    }

    if (targetTxIndex === -1) return null;

    const targetTx = currentRoom.transactions[targetTxIndex];

    // Immutably revert player balances
    const updatedPlayers = currentRoom.players.map((p) => {
      let balance = p.balance;
      if (p.id === targetTx.toId && targetTx.toId !== BANK_ID) {
        balance -= targetTx.amount;
      }
      if (p.id === targetTx.fromId && targetTx.fromId !== BANK_ID) {
        balance += targetTx.amount;
      }
      return { ...p, balance };
    });

    const updatedTx: TransactionRecord = {
      ...targetTx,
      isReversed: true,
    };

    const updatedTransactions = [...currentRoom.transactions];
    updatedTransactions[targetTxIndex] = updatedTx;

    const updatedRoom: RoomState = {
      ...currentRoom,
      version: currentRoom.version + 1,
      players: updatedPlayers,
      transactions: updatedTransactions,
    };

    rooms.set(normalized, updatedRoom);

    return {
      room: JSON.parse(JSON.stringify(updatedRoom)),
      reversedTransaction: JSON.parse(JSON.stringify(updatedTx)),
    };
  }

  async getRoomVersion(code: string): Promise<number | null> {
    const normalized = code.trim().toUpperCase();
    const room = rooms.get(normalized);
    return room ? room.version : null;
  }

  clear() {
    rooms.clear();
  }
}
