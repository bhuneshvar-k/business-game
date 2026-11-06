'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRoomSync } from '@/hooks/use-room-sync';
import { RoomState } from '@/lib/ledger/types';
import { BankerTerminal } from '@/components/banker/banker-terminal';
import { PlayerWallet } from '@/components/player/player-wallet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Smartphone } from 'lucide-react';

interface RoomClientProps {
  initialRoom: RoomState;
  roomCode: string;
}

export function RoomClient({ initialRoom, roomCode }: RoomClientProps) {
  const searchParams = useSearchParams();
  const defaultMode = searchParams.get('mode') === 'banker' ? 'banker' : 'player';
  const [mode, setMode] = useState<'banker' | 'player'>(defaultMode);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const { room, setRoom, isLoading, isConnected } = useRoomSync({
    roomCode,
    initialRoom,
    activePlayerId: mode === 'player' ? selectedPlayerId : null,
  });

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Room Not Found</h2>
          <p className="text-sm text-muted-foreground">
            Could not find game room with code <strong>{roomCode}</strong>.
          </p>
          <Button onClick={() => (window.location.href = '/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Top Bar for Mode Switching */}
      <div className="bg-background border-b py-2 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {room.code}
          </Badge>
          {!isConnected && (
            <Badge variant="destructive" className="text-[10px]">
              Offline
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg">
          <Button
            variant={mode === 'banker' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('banker')}
            className="text-xs h-7 font-bold gap-1"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Banker Terminal</span>
          </Button>
          <Button
            variant={mode === 'player' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('player')}
            className="text-xs h-7 font-bold gap-1"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Player Wallet</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="p-4 sm:p-6">
        {mode === 'banker' ? (
          <BankerTerminal initialRoom={room} onRoomUpdate={setRoom} />
        ) : (
          <PlayerWallet
            room={room}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
          />
        )}
      </main>
    </div>
  );
}
