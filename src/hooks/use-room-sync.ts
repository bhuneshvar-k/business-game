'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RoomState } from '@/lib/ledger/types';
import { soundManager } from '@/lib/sound/audio-effects';

interface UseRoomSyncOptions {
  roomCode: string;
  initialRoom?: RoomState | null;
  activePlayerId?: string | null;
  pollingIntervalMs?: number;
}

export function useRoomSync({
  roomCode,
  initialRoom = null,
  activePlayerId = null,
  pollingIntervalMs = 1500,
}: UseRoomSyncOptions) {
  const [room, setRoom] = useState<RoomState | null>(initialRoom);
  const [isLoading, setIsLoading] = useState(!initialRoom);
  const [isConnected, setIsConnected] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const roomRef = useRef<RoomState | null>(initialRoom);
  roomRef.current = room;

  const fetchRoom = useCallback(async () => {
    if (!roomCode) return;
    try {
      const headers: Record<string, string> = {};
      if (roomRef.current) {
        headers['If-None-Match'] = `"v-${roomRef.current.version}"`;
      }

      const res = await fetch(`/api/rooms/${roomCode}`, {
        headers,
        cache: 'no-store',
      });

      if (res.status === 304) {
        // Nothing changed!
        setIsConnected(true);
        setLastSyncedAt(new Date());
        return;
      }

      if (res.ok) {
        const updatedRoom: RoomState = await res.json();
        const prev = roomRef.current;

        if (prev && updatedRoom.version > prev.version) {
          // Play audio notification based on recent transaction
          const latestTx = updatedRoom.transactions[0];
          if (latestTx && !latestTx.isReversed) {
            if (activePlayerId) {
              if (latestTx.toId === activePlayerId) {
                soundManager.playCashChime();
              } else if (latestTx.fromId === activePlayerId) {
                soundManager.playTransferBeep();
              }
            } else {
              // Banker view
              if (latestTx.type === 'SALARY') {
                soundManager.playCashChime();
              } else {
                soundManager.playTransferBeep();
              }
            }
          }
        }

        setRoom(updatedRoom);
        setIsConnected(true);
        setLastSyncedAt(new Date());
      } else if (res.status === 404) {
        setIsConnected(false);
      }
    } catch {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [roomCode, activePlayerId]);

  useEffect(() => {
    fetchRoom();

    const interval = setInterval(() => {
      // Don't poll aggressively if tab is backgrounded
      if (document.hidden) return;
      fetchRoom();
    }, pollingIntervalMs);

    return () => clearInterval(interval);
  }, [fetchRoom, pollingIntervalMs]);

  return {
    room,
    setRoom,
    isLoading,
    isConnected,
    lastSyncedAt,
    refetch: fetchRoom,
  };
}
