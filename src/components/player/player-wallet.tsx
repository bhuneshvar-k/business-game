'use client';

import { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Trophy,
  History,
  Building2,
  Users,
} from 'lucide-react';
import { RoomState, PlayerState } from '@/lib/ledger/types';
import { PLAYER_COLORS, PLAYER_TOKENS, BANK_ID } from '@/lib/ledger/constants';
import { SoundToggle } from '../sound-toggle';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

interface PlayerWalletProps {
  room: RoomState;
  initialPlayerId?: string | null;
  selectedPlayerId?: string | null;
  onSelectPlayer?: (playerId: string | null) => void;
}

export function PlayerWallet({
  room,
  initialPlayerId = null,
  selectedPlayerId: controlledPlayerId,
  onSelectPlayer,
}: PlayerWalletProps) {
  const [internalPlayerId, setInternalPlayerId] = useState<string | null>(initialPlayerId);

  const selectedPlayerId = controlledPlayerId !== undefined ? controlledPlayerId : internalPlayerId;
  const setSelectedPlayerId = (id: string | null) => {
    if (onSelectPlayer) {
      onSelectPlayer(id);
    } else {
      setInternalPlayerId(id);
    }
  };

  const activePlayer = room.players.find((p) => p.id === selectedPlayerId);
  const sortedPlayers = [...room.players].sort((a, b) => b.balance - a.balance);

  // If no player selected, display the player selection screen
  if (!activePlayer) {
    return (
      <div className="max-w-md mx-auto space-y-6 py-8 px-4">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground text-2xl shadow">
            💼
          </div>
          <h1 className="text-2xl font-black tracking-tight">{room.name}</h1>
          <p className="text-xs text-muted-foreground">
            Select your player name to access your live digital wallet.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Who are you playing as?</CardTitle>
            <CardDescription className="text-xs">
              Room Code: <strong className="font-mono text-foreground">{room.code}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {room.players.map((player) => {
              const tokenMeta = PLAYER_TOKENS.find((t) => t.id === player.token) || PLAYER_TOKENS[0];
              const colorMeta = PLAYER_COLORS[player.color] || PLAYER_COLORS.emerald;

              return (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayerId(player.id)}
                  className="w-full p-4 rounded-xl border bg-card hover:bg-muted/50 transition-all flex items-center justify-between text-left shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-inner border ${colorMeta.badgeClass}`}
                    >
                      {tokenMeta.emoji}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground group-hover:text-primary transition">
                        {player.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{tokenMeta.label}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-base">
                      ${player.balance.toLocaleString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  const tokenMeta = PLAYER_TOKENS.find((t) => t.id === activePlayer.token) || PLAYER_TOKENS[0];
  const colorMeta = PLAYER_COLORS[activePlayer.color] || PLAYER_COLORS.emerald;
  const playerRank = sortedPlayers.findIndex((p) => p.id === activePlayer.id) + 1;

  // Filter player's personal transactions
  const personalTransactions = room.transactions.filter(
    (t) => (t.fromId === activePlayer.id || t.toId === activePlayer.id) && !t.isReversed
  );

  return (
    <div className="max-w-lg mx-auto space-y-5 py-4 px-4 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            Room: {room.code}
          </Badge>
          <span className="text-xs text-muted-foreground">v{room.version}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPlayerId(null)}
            className="text-xs text-muted-foreground"
          >
            Switch Player
          </Button>
          <SoundToggle />
        </div>
      </div>

      {/* Main Digital Balance Card */}
      <Card className="border-2 shadow-lg overflow-hidden relative">
        <div className={`h-2.5 w-full bg-gradient-to-r ${colorMeta.gradientClass}`} />
        <CardContent className="p-6 space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner border ${colorMeta.badgeClass}`}
              >
                {tokenMeta.emoji}
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">{activePlayer.name}</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{tokenMeta.label}</span>
                  <span>•</span>
                  <Badge variant="secondary" className="text-[10px] py-0">
                    Rank #{playerRank} of {room.players.length}
                  </Badge>
                </div>
              </div>
            </div>

            <Wallet className="w-6 h-6 text-muted-foreground/40" />
          </div>

          {/* Balance Big Display */}
          <div className="bg-slate-950 text-white rounded-2xl p-5 shadow-inner space-y-1 text-center">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Current Liquid Balance
            </div>
            <div
              className={`text-4xl font-mono font-black tracking-tight ${
                activePlayer.balance < 0 ? 'text-destructive' : 'text-emerald-400'
              }`}
            >
              ${activePlayer.balance.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 pt-1">
              Started with ${room.startingCash.toLocaleString()}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Tabs: Personal Feed vs Live Leaderboard */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history" className="gap-2 font-bold text-xs">
            <History className="w-3.5 h-3.5" />
            <span>My Transactions</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2 font-bold text-xs">
            <Trophy className="w-3.5 h-3.5" />
            <span>Table Leaderboard</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Personal Transaction Stream */}
        <TabsContent value="history" className="space-y-3 pt-2">
          {personalTransactions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground text-xs">
                No transactions recorded yet. Money movements will appear here live.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {personalTransactions.map((tx) => {
                const isIncoming = tx.toId === activePlayer.id;
                return (
                  <Card key={tx.id} className="shadow-none border">
                    <CardContent className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isIncoming
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {isIncoming ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="text-xs font-bold text-foreground">
                            {isIncoming ? `Received from ${tx.fromName}` : `Paid to ${tx.toName}`}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <span className="font-semibold">{tx.type}</span>
                            {tx.note && <span>• {tx.note}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-mono font-black text-sm ${
                            isIncoming ? 'text-emerald-600' : 'text-destructive'
                          }`}
                        >
                          {isIncoming ? '+' : '-'}${tx.amount.toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Leaderboard */}
        <TabsContent value="leaderboard" className="pt-2">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs">#</TableHead>
                    <TableHead className="text-xs">Player</TableHead>
                    <TableHead className="text-right text-xs">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPlayers.map((player, index) => {
                    const isMe = player.id === activePlayer.id;
                    const token = PLAYER_TOKENS.find((t) => t.id === player.token);
                    return (
                      <TableRow key={player.id} className={isMe ? 'bg-primary/5 font-bold' : ''}>
                        <TableCell className="text-center font-bold text-xs">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{token?.emoji}</span>
                            <span className="text-xs">
                              {player.name} {isMe && '(You)'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs">
                          ${player.balance.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
