'use client';

import { useState } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Trophy,
  History,
  UserCheck,
} from 'lucide-react';
import { RoomState } from '@/lib/ledger/types';
import { PLAYER_COLORS, PLAYER_TOKENS } from '@/lib/ledger/constants';
import { SoundToggle } from '../sound-toggle';
import { cn } from '@/lib/utils';

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
      <div className="max-w-md mx-auto space-y-5 py-6 px-4">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground text-2xl shadow-sm">
            💼
          </div>
          <h1 className="text-2xl font-black tracking-tight">{room.name}</h1>
          <p className="text-xs text-muted-foreground">
            Tap your player name below to access your live digital wallet.
          </p>
        </div>

        <Card className="shadow-md border-2 border-border">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Select Your Player Card
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {room.code}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              All balances update live automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2.5">
            {room.players.map((player) => {
              const tokenMeta = PLAYER_TOKENS.find((t) => t.id === player.token) || PLAYER_TOKENS[0];
              const colorMeta = PLAYER_COLORS[player.color] || PLAYER_COLORS.emerald;

              return (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayerId(player.id)}
                  className="w-full p-3.5 rounded-xl border bg-card hover:border-primary/50 hover:bg-muted/40 transition-all flex items-center justify-between text-left shadow-sm group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-inner border flex-shrink-0 ${colorMeta.badgeClass}`}
                    >
                      {tokenMeta.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-foreground group-hover:text-primary transition truncate">
                        {player.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{tokenMeta.label}</div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
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

  // Filter player's personal transactions (show up to 50 most recent)
  const personalTransactions = room.transactions
    .filter((t) => t.fromId === activePlayer.id || t.toId === activePlayer.id)
    .slice(0, 50);

  return (
    <div className="max-w-md mx-auto space-y-4 py-2 px-3 sm:px-4 pb-12">
      {/* Top Header Card */}
      <Card className="border shadow-sm">
        <CardContent className="p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className="font-mono text-xs font-bold">
              {room.code}
            </Badge>
            <span className="text-[11px] text-muted-foreground font-mono">v{room.version}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPlayerId(null)}
              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              <UserCheck className="w-3.5 h-3.5 mr-1" />
              <span>Switch</span>
            </Button>
          </div>

          <SoundToggle />
        </CardContent>
      </Card>

      {/* Main Digital Balance Card */}
      <Card className="border-2 shadow-lg overflow-hidden">
        <div className={`h-2.5 w-full bg-gradient-to-r ${colorMeta.gradientClass}`} />
        <CardContent className="p-4 sm:p-5 space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner border flex-shrink-0 ${colorMeta.badgeClass}`}
              >
                {tokenMeta.emoji}
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight leading-tight">{activePlayer.name}</h2>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <span>{tokenMeta.label}</span>
                  <span>•</span>
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
                    Rank #{playerRank} of {room.players.length}
                  </Badge>
                </div>
              </div>
            </div>

            <Wallet className="w-6 h-6 text-muted-foreground/40 flex-shrink-0" />
          </div>

          {/* Balance Big Display */}
          <div className="bg-slate-950 text-white rounded-2xl p-4 sm:p-5 shadow-inner space-y-1 text-center border border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Current Liquid Balance
            </div>
            <div
              className={cn('text-3xl sm:text-4xl font-mono font-black tracking-tight', {
                'text-destructive': activePlayer.balance < 0,
                'text-emerald-400': activePlayer.balance >= 0,
              })}
            >
              ${activePlayer.balance.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 font-medium pt-0.5">
              Starting Cash: ${room.startingCash.toLocaleString()}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Tabs: Personal Feed vs Live Leaderboard */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-10">
          <TabsTrigger value="history" className="gap-1.5 font-bold text-xs">
            <History className="w-3.5 h-3.5" />
            <span>My Transactions</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-1.5 font-bold text-xs">
            <Trophy className="w-3.5 h-3.5" />
            <span>Table Leaderboard</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Personal Transaction Stream */}
        <TabsContent value="history" className="space-y-2 pt-2">
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
                  <Card
                    key={tx.id}
                    className={cn('shadow-none border transition-opacity', {
                      'opacity-50 bg-muted/30': tx.isReversed,
                    })}
                  >
                    <CardContent className="p-3 flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', {
                            'bg-muted text-muted-foreground': tx.isReversed,
                            'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400': !tx.isReversed && isIncoming,
                            'bg-destructive/15 text-destructive': !tx.isReversed && !isIncoming,
                          })}
                        >
                          {isIncoming ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={cn('text-xs font-bold text-foreground truncate', {
                                'line-through text-muted-foreground': tx.isReversed,
                              })}
                            >
                              {isIncoming ? `From ${tx.fromName}` : `To ${tx.toName}`}
                            </span>
                            {tx.isReversed && (
                              <Badge variant="destructive" className="text-[9px] py-0 px-1 font-bold">
                                Reversed
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 truncate">
                            <span className="font-semibold uppercase">{tx.type}</span>
                            {tx.note && <span>• {tx.note}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span
                          className={cn('font-mono font-black text-sm', {
                            'line-through text-muted-foreground': tx.isReversed,
                            'text-emerald-600 dark:text-emerald-400': !tx.isReversed && isIncoming,
                            'text-destructive': !tx.isReversed && !isIncoming,
                          })}
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
                      <TableRow
                        key={player.id}
                        className={cn({
                          'bg-primary/5 font-bold': isMe,
                        })}
                      >
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
