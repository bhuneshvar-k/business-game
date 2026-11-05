import { StorageAdapter, ExecuteTransferParams, ExecuteUndoParams } from './storage-adapter.interface';
import { RoomState, TransactionRecord, PlayerState, TransactionType, PlayerColor, PlayerToken } from '../types';
import { BANK_ID } from '../constants';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

type RoomWithRelations = Prisma.RoomGetPayload<{
  include: {
    players: true;
    transactions: true;
  };
}>;

export class PrismaStorageAdapter implements StorageAdapter {
  private formatRoom(roomRecord: RoomWithRelations): RoomState {
    return {
      id: roomRecord.id,
      code: roomRecord.code,
      name: roomRecord.name,
      startingCash: roomRecord.startingCash,
      salaryAmount: roomRecord.salaryAmount,
      version: roomRecord.version,
      status: roomRecord.status as 'ACTIVE' | 'COMPLETED',
      createdAt: roomRecord.createdAt.toISOString(),
      players: (roomRecord.players || []).map((p): PlayerState => ({
        id: p.id,
        roomId: p.roomId,
        name: p.name,
        token: p.token as PlayerToken,
        color: p.color as PlayerColor,
        balance: p.balance,
        isBanker: p.isBanker,
        createdAt: p.createdAt.toISOString(),
      })),
      transactions: (roomRecord.transactions || []).map((t): TransactionRecord => ({
        id: t.id,
        roomId: t.roomId,
        fromId: t.fromId,
        fromName: t.fromName,
        toId: t.toId,
        toName: t.toName,
        amount: t.amount,
        type: t.type as TransactionType,
        note: t.note || undefined,
        isReversed: t.isReversed,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  async getRoomByCode(code: string): Promise<RoomState | null> {
    const normalized = code.trim().toUpperCase();
    const room = await prisma.room.findUnique({
      where: { code: normalized },
      include: {
        players: { orderBy: { createdAt: 'asc' } },
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });

    if (!room) return null;
    return this.formatRoom(room);
  }

  async saveRoom(room: RoomState): Promise<RoomState> {
    const normalized = room.code.trim().toUpperCase();
    const created = await prisma.room.create({
      data: {
        id: room.id,
        code: normalized,
        name: room.name,
        startingCash: room.startingCash,
        salaryAmount: room.salaryAmount,
        version: room.version,
        status: room.status,
        players: {
          create: room.players.map((p) => ({
            id: p.id,
            name: p.name,
            token: p.token,
            color: p.color,
            balance: p.balance,
            isBanker: p.isBanker,
          })),
        },
      },
      include: {
        players: true,
        transactions: true,
      },
    });

    return this.formatRoom(created);
  }

  async executeTransfer(
    params: ExecuteTransferParams
  ): Promise<{ room: RoomState; transaction: TransactionRecord } | null> {
    const normalized = params.roomCode.trim().toUpperCase();

    return await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { code: normalized },
        include: { players: true },
      });

      if (!room) return null;

      // Validate participants and check balance atomically inside the transaction
      if (params.fromId !== BANK_ID) {
        const sender = room.players.find((p) => p.id === params.fromId);
        if (!sender) return null;

        if (!params.overrideInsufficientFunds && sender.balance < params.amount) {
          return null; // Atomic protection against concurrent overdrafts
        }

        await tx.player.update({
          where: { id: params.fromId },
          data: { balance: { decrement: params.amount } },
        });
      }

      if (params.toId !== BANK_ID) {
        const recipient = room.players.find((p) => p.id === params.toId);
        if (!recipient) return null;

        await tx.player.update({
          where: { id: params.toId },
          data: { balance: { increment: params.amount } },
        });
      }

      // Record transaction
      const newTx = await tx.transaction.create({
        data: {
          roomId: room.id,
          fromId: params.fromId,
          fromName: params.fromName,
          toId: params.toId,
          toName: params.toName,
          amount: params.amount,
          type: params.type,
          note: params.note,
          isReversed: false,
        },
      });

      // Increment room version atomically
      const updatedRoom = await tx.room.update({
        where: { id: room.id },
        data: { version: { increment: 1 } },
        include: {
          players: { orderBy: { createdAt: 'asc' } },
          transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
        },
      });

      const formattedRoom = this.formatRoom(updatedRoom);
      const formattedTx: TransactionRecord = {
        id: newTx.id,
        roomId: newTx.roomId,
        fromId: newTx.fromId,
        fromName: newTx.fromName,
        toId: newTx.toId,
        toName: newTx.toName,
        amount: newTx.amount,
        type: newTx.type as TransactionType,
        note: newTx.note || undefined,
        isReversed: newTx.isReversed,
        createdAt: newTx.createdAt.toISOString(),
      };

      return { room: formattedRoom, transaction: formattedTx };
    });
  }

  async executeUndo(
    params: ExecuteUndoParams
  ): Promise<{ room: RoomState; reversedTransaction: TransactionRecord } | null> {
    const normalized = params.roomCode.trim().toUpperCase();

    return await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { code: normalized },
        include: { players: true },
      });

      if (!room) return null;

      let targetTx = null;
      if (params.transactionId) {
        targetTx = await tx.transaction.findFirst({
          where: { id: params.transactionId, roomId: room.id, isReversed: false },
        });
      } else {
        targetTx = await tx.transaction.findFirst({
          where: { roomId: room.id, isReversed: false },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (!targetTx) return null;

      // Atomic conditional update to guard against concurrent double-reversal
      const updateResult = await tx.transaction.updateMany({
        where: { id: targetTx.id, isReversed: false },
        data: { isReversed: true },
      });

      if (updateResult.count === 0) {
        // Concurrently reversed by another request
        return null;
      }

      // Revert balances
      if (targetTx.toId !== BANK_ID) {
        await tx.player.update({
          where: { id: targetTx.toId },
          data: { balance: { decrement: targetTx.amount } },
        });
      }

      if (targetTx.fromId !== BANK_ID) {
        await tx.player.update({
          where: { id: targetTx.fromId },
          data: { balance: { increment: targetTx.amount } },
        });
      }

      const updatedRoom = await tx.room.update({
        where: { id: room.id },
        data: { version: { increment: 1 } },
        include: {
          players: { orderBy: { createdAt: 'asc' } },
          transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
        },
      });

      return {
        room: this.formatRoom(updatedRoom),
        reversedTransaction: {
          id: targetTx.id,
          roomId: targetTx.roomId,
          fromId: targetTx.fromId,
          fromName: targetTx.fromName,
          toId: targetTx.toId,
          toName: targetTx.toName,
          amount: targetTx.amount,
          type: targetTx.type as TransactionType,
          note: targetTx.note || undefined,
          isReversed: true,
          createdAt: targetTx.createdAt.toISOString(),
        },
      };
    });
  }

  async getRoomVersion(code: string): Promise<number | null> {
    const normalized = code.trim().toUpperCase();
    const room = await prisma.room.findUnique({
      where: { code: normalized },
      select: { version: true },
    });
    return room ? room.version : null;
  }
}
