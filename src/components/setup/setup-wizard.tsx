'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Trash2, ArrowRight, Dices, ShieldCheck } from 'lucide-react';
import { CreatePlayerInput, PlayerColor, PlayerToken } from '@/lib/ledger/types';
import {
  DEFAULT_STARTING_CASH,
  DEFAULT_SALARY_AMOUNT,
  PLAYER_COLORS,
  PLAYER_TOKENS,
} from '@/lib/ledger/constants';
import { createRoomAction } from '@/app/actions/room.actions';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const COLOR_KEYS: PlayerColor[] = ['emerald', 'blue', 'amber', 'rose', 'purple', 'cyan'];
const TOKEN_KEYS: PlayerToken[] = ['car', 'hat', 'dog', 'ship', 'plane', 'boot'];

export function SetupWizard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [roomName, setRoomName] = useState('Game Night');
  const [startingCash, setStartingCash] = useState(DEFAULT_STARTING_CASH);
  const [salaryAmount, setSalaryAmount] = useState(DEFAULT_SALARY_AMOUNT);

  const [players, setPlayers] = useState<CreatePlayerInput[]>([
    { name: 'Player 1', token: 'car', color: 'emerald', isBanker: true },
    { name: 'Player 2', token: 'hat', color: 'blue', isBanker: false },
    { name: 'Player 3', token: 'dog', color: 'amber', isBanker: false },
    { name: 'Player 4', token: 'ship', color: 'rose', isBanker: false },
  ]);

  const [error, setError] = useState<string | null>(null);

  const handlePlayerCountChange = (count: number) => {
    if (count < 2 || count > 4) return;
    if (count > players.length) {
      const nextPlayers = [...players];
      for (let i = players.length; i < count; i++) {
        nextPlayers.push({
          name: `Player ${i + 1}`,
          token: TOKEN_KEYS[i % TOKEN_KEYS.length],
          color: COLOR_KEYS[i % COLOR_KEYS.length],
          isBanker: false,
        });
      }
      setPlayers(nextPlayers);
    } else {
      setPlayers(players.slice(0, count));
    }
  };

  const updatePlayer = (index: number, updates: Partial<CreatePlayerInput>) => {
    setPlayers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...updates } : p))
    );
  };

  const handleStartGame = () => {
    setError(null);
    if (players.some((p) => !p.name.trim())) {
      setError('All player names must be filled.');
      return;
    }

    startTransition(async () => {
      const result = await createRoomAction({
        name: roomName,
        startingCash,
        salaryAmount,
        players,
      });

      if (result.success) {
        router.push(`/room/${result.room.code}?mode=banker`);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground text-3xl shadow-lg">
          🎲
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Cashless Business Companion</h1>
        <p className="text-sm text-muted-foreground">
          Replace physical paper money with a fast digital ledger for 2 to 4 players.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Game Setup Wizard</CardTitle>
          <CardDescription>
            Configure players, token avatars, starting capital and salary.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Room Name & Player Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Game Session Name
              </label>
              <Input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Saturday Business Night"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Number of Players (2 - 4)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((cnt) => (
                  <Button
                    key={cnt}
                    type="button"
                    variant={players.length === cnt ? 'default' : 'outline'}
                    onClick={() => handlePlayerCountChange(cnt)}
                    className="font-bold text-sm"
                  >
                    {cnt} Players
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Starting Cash & Salary Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-xl border">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Starting Cash per Player (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground font-bold">$</span>
                <Input
                  type="number"
                  value={startingCash}
                  onChange={(e) => setStartingCash(parseInt(e.target.value, 10) || 0)}
                  className="pl-8 font-mono font-bold"
                />
              </div>
              <span className="text-[11px] text-muted-foreground">Standard game rule: $25,000</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Pass GO / Salary Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground font-bold">$</span>
                <Input
                  type="number"
                  value={salaryAmount}
                  onChange={(e) => setSalaryAmount(parseInt(e.target.value, 10) || 0)}
                  className="pl-8 font-mono font-bold"
                />
              </div>
              <span className="text-[11px] text-muted-foreground">Credited on each board lap: $2,000</span>
            </div>
          </div>

          <Separator />

          {/* Player Configurations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Configure Players
              </span>
              <span className="text-xs text-muted-foreground">
                First player is designated Banker
              </span>
            </div>

            <div className="space-y-3">
              {players.map((player, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl shadow-inner border">
                      {PLAYER_TOKENS.find((t) => t.id === player.token)?.emoji || '🎲'}
                    </div>
                    <div className="flex-1 space-y-1">
                      <Input
                        value={player.name}
                        onChange={(e) => updatePlayer(idx, { name: e.target.value })}
                        placeholder={`Player ${idx + 1}`}
                        className="font-bold text-sm h-9"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Token selector */}
                    <select
                      value={player.token}
                      onChange={(e) => updatePlayer(idx, { token: e.target.value as PlayerToken })}
                      className="text-xs font-semibold py-1.5 px-2 rounded-lg border bg-background"
                    >
                      {PLAYER_TOKENS.map((token) => (
                        <option key={token.id} value={token.id}>
                          {token.emoji} {token.label}
                        </option>
                      ))}
                    </select>

                    {/* Color selector */}
                    <select
                      value={player.color}
                      onChange={(e) => updatePlayer(idx, { color: e.target.value as PlayerColor })}
                      className="text-xs font-semibold py-1.5 px-2 rounded-lg border bg-background"
                    >
                      {COLOR_KEYS.map((c) => (
                        <option key={c} value={c}>
                          {PLAYER_COLORS[c].label}
                        </option>
                      ))}
                    </select>

                    {idx === 0 ? (
                      <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                        Banker
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Player
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-xs font-bold border border-destructive/20">
              {error}
            </div>
          )}

          <Button
            type="button"
            size="lg"
            disabled={isPending}
            onClick={handleStartGame}
            className="w-full font-bold text-base py-6 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
          >
            <span>{isPending ? 'Starting Game Room...' : 'Launch Cashless Game'}</span>
            <ArrowRight className="w-5 h-5" />
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
