import { RoomState, TransactionRecord } from '../types';

export interface ExecuteTransferParams {
  roomCode: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  type: string;
  note?: string;
  overrideInsufficientFunds?: boolean;
}

export interface ExecuteUndoParams {
  roomCode: string;
  transactionId?: string;
}

export interface StorageAdapter {
  getRoomByCode(code: string): Promise<RoomState | null>;
  saveRoom(room: RoomState): Promise<RoomState>;
  executeTransfer(
    params: ExecuteTransferParams
  ): Promise<{ room: RoomState; transaction: TransactionRecord } | null>;
  executeUndo(
    params: ExecuteUndoParams
  ): Promise<{ room: RoomState; reversedTransaction: TransactionRecord } | null>;
  getRoomVersion(code: string): Promise<number | null>;
}
