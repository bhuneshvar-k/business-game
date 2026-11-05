export type TransactionType =
  | 'SALARY'
  | 'TAX'
  | 'RENT'
  | 'TRADE'
  | 'LOAN'
  | 'CUSTOM';

export type PlayerColor =
  | 'emerald'
  | 'blue'
  | 'amber'
  | 'rose'
  | 'purple'
  | 'cyan';

export type PlayerToken = 'car' | 'hat' | 'dog' | 'ship' | 'plane' | 'boot';

export interface PlayerState {
  id: string;
  roomId: string;
  name: string;
  token: PlayerToken;
  color: PlayerColor;
  balance: number;
  isBanker: boolean;
  createdAt: string;
}

export interface TransactionRecord {
  id: string;
  roomId: string;
  fromId: string; // 'BANK' or playerId
  fromName: string;
  toId: string; // 'BANK' or playerId
  toName: string;
  amount: number;
  type: TransactionType;
  note?: string;
  isReversed: boolean;
  createdAt: string;
}

export interface RoomState {
  id: string;
  code: string;
  name: string;
  startingCash: number;
  salaryAmount: number;
  version: number;
  status: 'ACTIVE' | 'COMPLETED';
  players: PlayerState[];
  transactions: TransactionRecord[];
  createdAt: string;
}

export interface CreatePlayerInput {
  name: string;
  token: PlayerToken;
  color: PlayerColor;
  isBanker?: boolean;
}

export interface CreateRoomInput {
  name?: string;
  startingCash?: number;
  salaryAmount?: number;
  players: CreatePlayerInput[];
}

export interface TransferInput {
  roomCode: string;
  fromId: string; // 'BANK' or playerId
  toId: string; // 'BANK' or playerId
  amount: number;
  type: TransactionType;
  note?: string;
  overrideInsufficientFunds?: boolean;
}

export type TransferResult =
  | {
      success: true;
      room: RoomState;
      transaction: TransactionRecord;
    }
  | {
      success: false;
      error: string;
      code: 'INSUFFICIENT_FUNDS' | 'INVALID_PARTICIPANTS' | 'ROOM_NOT_FOUND' | 'INVALID_AMOUNT';
      required?: number;
      available?: number;
    };

export interface UndoInput {
  roomCode: string;
  transactionId?: string; // If omitted, undoes the latest unreversed transaction
}

export type UndoResult =
  | {
      success: true;
      room: RoomState;
      reversedTransaction: TransactionRecord;
    }
  | {
      success: false;
      error: string;
      code: 'NOTHING_TO_UNDO' | 'TRANSACTION_NOT_FOUND' | 'ROOM_NOT_FOUND';
    };
