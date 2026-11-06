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
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

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
        setIsConnected(true);
        setLastSyncedAt(new Date());
        return;
      }

      if (res.ok) {
        const updatedRoom: RoomState = await res.json();
        const prev = roomRef.current;

        if (prev && updatedRoom.version > prev.version) {
          // 1. Check if a transaction was reversed (Undo)
          const newlyReversedTx = updatedRoom.transactions.find(
            (tx) => tx.isReversed && !prev.transactions.find((p) => p.id === tx.id)?.isReversed
          );

          if (newlyReversedTx) {
            const isRelevant =
              !activePlayerId ||
              newlyReversedTx.fromId === activePlayerId ||
              newlyReversedTx.toId === activePlayerId;

            if (isRelevant) {
              soundManager.playUndoSound();
              soundManager.announceUndo(newlyReversedTx);
            }
          } else {
            // 2. Check for newly added transaction
            const latestTx = updatedRoom.transactions[0];
            if (latestTx && !latestTx.isReversed && latestTx.id !== prev.transactions[0]?.id) {
              const isRelevant =
                !activePlayerId ||
                latestTx.fromId === activePlayerId ||
                latestTx.toId === activePlayerId;

              if (isRelevant) {
                if (latestTx.type === 'SALARY') {
                  soundManager.playCashChime();
                } else {
                  soundManager.playTransferBeep();
                }
                soundManager.announceTransaction(latestTx);
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
    let isMounted = true;
    const load = async () => {
      if (isMounted) {
        await fetchRoom();
      }
    };
    void load();

    const interval = setInterval(() => {
      if (document.hidden) return;
      void fetchRoom();
    }, pollingIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
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
