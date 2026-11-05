import { describe, it, expect, beforeEach } from 'vitest';
import { LedgerService } from './ledger.service';
import { MemoryStorageAdapter } from './storage/memory-storage.adapter';
import { BANK_ID, DEFAULT_STARTING_CASH, DEFAULT_SALARY_AMOUNT } from './constants';

describe('LedgerService (Atomic Cashless Ledger)', () => {
  let memoryAdapter: MemoryStorageAdapter;
  let ledger: LedgerService;

  beforeEach(() => {
    memoryAdapter = new MemoryStorageAdapter();
    memoryAdapter.clear();
    ledger = new LedgerService(memoryAdapter);
  });

  it('initializes a game room with default starting cash ($25,000) for all players', async () => {
    const room = await ledger.createRoom({
      name: 'Game Night 1',
      players: [
        { name: 'Alice', color: 'emerald', token: 'car', isBanker: true },
        { name: 'Bob', color: 'blue', token: 'hat' },
        { name: 'Charlie', color: 'amber', token: 'dog' },
      ],
    });

    expect(room.code).toHaveLength(4);
    expect(room.startingCash).toBe(DEFAULT_STARTING_CASH);
    expect(room.salaryAmount).toBe(DEFAULT_SALARY_AMOUNT);
    expect(room.version).toBe(1);
    expect(room.players).toHaveLength(3);

    for (const player of room.players) {
      expect(player.balance).toBe(25000);
    }

    expect(room.players[0].isBanker).toBe(true);
    expect(room.players[1].isBanker).toBe(false);
  });

  it('transfers salary from Bank to a player (Pass GO)', async () => {
    const room = await ledger.createRoom({
      players: [
        { name: 'Alice', color: 'emerald', token: 'car' },
        { name: 'Bob', color: 'blue', token: 'hat' },
      ],
    });

    const alice = room.players[0];

    const result = await ledger.transfer({
      roomCode: room.code,
      fromId: BANK_ID,
      toId: alice.id,
      amount: 2000,
      type: 'SALARY',
      note: 'Passed GO',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const updatedAlice = result.room.players.find((p) => p.id === alice.id);
    expect(updatedAlice?.balance).toBe(27000);
    expect(result.room.version).toBe(2);
    expect(result.transaction.amount).toBe(2000);
    expect(result.transaction.type).toBe('SALARY');
  });

  it('conserves money during Player-to-Player transfers (rent/trade)', async () => {
    const room = await ledger.createRoom({
      players: [
        { name: 'Alice', color: 'emerald', token: 'car' },
        { name: 'Bob', color: 'blue', token: 'hat' },
      ],
    });

    const alice = room.players[0];
    const bob = room.players[1];

    const result = await ledger.transfer({
      roomCode: room.code,
      fromId: alice.id,
      toId: bob.id,
      amount: 5000,
      type: 'RENT',
      note: 'Landed on Mayfair',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const updatedAlice = result.room.players.find((p) => p.id === alice.id);
    const updatedBob = result.room.players.find((p) => p.id === bob.id);

    expect(updatedAlice?.balance).toBe(20000);
    expect(updatedBob?.balance).toBe(30000);
    expect(updatedAlice!.balance + updatedBob!.balance).toBe(50000);
  });

  it('rejects transfer when player has insufficient funds unless banker overrides', async () => {
    const room = await ledger.createRoom({
      players: [
        { name: 'Alice', color: 'emerald', token: 'car' },
        { name: 'Bob', color: 'blue', token: 'hat' },
      ],
    });

    const alice = room.players[0];
    const bob = room.players[1];

    // Try to transfer $30,000 when Alice only has $25,000
    const blockedResult = await ledger.transfer({
      roomCode: room.code,
      fromId: alice.id,
      toId: bob.id,
      amount: 30000,
      type: 'RENT',
    });

    expect(blockedResult.success).toBe(false);
    if (blockedResult.success) return;
    expect(blockedResult.code).toBe('INSUFFICIENT_FUNDS');
    expect(blockedResult.available).toBe(25000);
    expect(blockedResult.required).toBe(30000);

    // Now test Banker Override
    const overrideResult = await ledger.transfer({
      roomCode: room.code,
      fromId: alice.id,
      toId: bob.id,
      amount: 30000,
      type: 'RENT',
      overrideInsufficientFunds: true,
    });

    expect(overrideResult.success).toBe(true);
    if (!overrideResult.success) return;
    const updatedAlice = overrideResult.room.players.find((p) => p.id === alice.id);
    expect(updatedAlice?.balance).toBe(-5000); // Track debt
  });

  it('never loses money if recipient is invalid (atomic validation & immutability)', async () => {
    const room = await ledger.createRoom({
      players: [
        { name: 'Alice', color: 'emerald', token: 'car' },
        { name: 'Bob', color: 'blue', token: 'hat' },
      ],
    });

    const alice = room.players[0];

    // Attempt transfer to non-existent player
    const res = await ledger.transfer({
      roomCode: room.code,
      fromId: alice.id,
      toId: 'non-existent-player-id',
      amount: 5000,
      type: 'TRADE',
    });

    expect(res.success).toBe(false);

    // Alice's balance in storage MUST remain exactly $25,000
    const freshRoom = await ledger.getRoom(room.code);
    const freshAlice = freshRoom?.players.find((p) => p.id === alice.id);
    expect(freshAlice?.balance).toBe(25000);
  });

  it('correctly undos transactions and rolls back exact balances', async () => {
    const room = await ledger.createRoom({
      players: [
        { name: 'Alice', color: 'emerald', token: 'car' },
        { name: 'Bob', color: 'blue', token: 'hat' },
      ],
    });

    const alice = room.players[0];
    const bob = room.players[1];

    await ledger.transfer({
      roomCode: room.code,
      fromId: alice.id,
      toId: bob.id,
      amount: 4000,
      type: 'TRADE',
    });

    const undoResult = await ledger.undoTransaction({
      roomCode: room.code,
    });

    expect(undoResult.success).toBe(true);
    if (!undoResult.success) return;

    expect(undoResult.reversedTransaction.isReversed).toBe(true);

    const revertedAlice = undoResult.room.players.find((p) => p.id === alice.id);
    const revertedBob = undoResult.room.players.find((p) => p.id === bob.id);

    expect(revertedAlice?.balance).toBe(25000);
    expect(revertedBob?.balance).toBe(25000);
  });
});
