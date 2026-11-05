import { LedgerService } from './ledger.service';
import { MemoryStorageAdapter } from './storage/memory-storage.adapter';
import { PrismaStorageAdapter } from './storage/prisma-storage.adapter';
import { StorageAdapter } from './storage/storage-adapter.interface';

export * from './types';
export * from './constants';
export * from './schema';
export * from './ledger.service';

const globalStore = globalThis as unknown as {
  __ledgerService?: LedgerService;
  __storageAdapter?: StorageAdapter;
};

export function getLedgerService(): LedgerService {
  if (globalStore.__ledgerService) {
    return globalStore.__ledgerService;
  }

  let adapter: StorageAdapter;

  // If DATABASE_URL is provided, use Prisma Postgres. Otherwise gracefully fallback to in-memory store.
  if (process.env.DATABASE_URL) {
    adapter = new PrismaStorageAdapter();
  } else {
    adapter = new MemoryStorageAdapter();
  }

  globalStore.__storageAdapter = adapter;
  globalStore.__ledgerService = new LedgerService(adapter);

  return globalStore.__ledgerService;
}
