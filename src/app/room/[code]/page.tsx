import { Suspense } from 'react';
import { getLedgerService } from '@/lib/ledger';
import { RoomClient } from './room-client';
import { notFound } from 'next/navigation';

export const instant = false;

async function RoomContent({ paramsPromise }: { paramsPromise: Promise<{ code: string }> }) {
  const { code } = await paramsPromise;
  if (!code) notFound();

  const ledger = getLedgerService();
  const room = await ledger.getRoom(code.toUpperCase());

  if (!room) {
    notFound();
  }

  return <RoomClient initialRoom={room} roomCode={code.toUpperCase()} />;
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading game room...</div>}>
      <RoomContent paramsPromise={params} />
    </Suspense>
  );
}
