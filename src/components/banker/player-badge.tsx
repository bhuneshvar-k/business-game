'use client';

import { PlayerState } from '@/lib/ledger/types';
import { PLAYER_COLORS, PLAYER_TOKENS } from '@/lib/ledger/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PlayerBadgeProps {
  player: PlayerState;
  rank?: number;
  isSelectedFrom?: boolean;
  isSelectedTo?: boolean;
  onSelectFrom?: () => void;
  onSelectTo?: () => void;
}

export function PlayerBadge({
  player,
  rank,
  isSelectedFrom = false,
  isSelectedTo = false,
  onSelectFrom,
  onSelectTo,
}: PlayerBadgeProps) {
  const colorMeta = PLAYER_COLORS[player.color] || PLAYER_COLORS.emerald;
  const tokenMeta = PLAYER_TOKENS.find((t) => t.id === player.token) || PLAYER_TOKENS[0];

  const isSelected = isSelectedFrom || isSelectedTo;

  return (
    <Card
      className={`relative transition-all duration-200 border-2 ${
        isSelected
          ? isSelectedFrom
            ? 'border-destructive/80 bg-destructive/5 ring-4 ring-destructive/10'
            : 'border-emerald-500 bg-emerald-50/40 ring-4 ring-emerald-500/10'
          : 'hover:border-primary/30'
      }`}
    >
      {isSelectedFrom && (
        <Badge
          variant="destructive"
          className="absolute -top-2.5 left-4 text-[10px] font-bold uppercase tracking-wider shadow-sm"
        >
          FROM (Payer)
        </Badge>
      )}
      {isSelectedTo && (
        <Badge
          className="absolute -top-2.5 right-4 text-[10px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-600 shadow-sm"
        >
          TO (Receiver)
        </Badge>
      )}

      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner border ${colorMeta.badgeClass}`}
            >
              {tokenMeta.emoji}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base truncate">{player.name}</span>
                {player.isBanker && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Banker
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span>{tokenMeta.label}</span>
                {rank && <span>•</span>}
                {rank && <span className="font-semibold">Rank #{rank}</span>}
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Balance</div>
            <div
              className={`text-xl font-black font-mono tracking-tight ${
                player.balance < 0 ? 'text-destructive' : 'text-foreground'
              }`}
            >
              ${player.balance.toLocaleString()}
            </div>
          </div>
        </div>

        {(onSelectFrom || onSelectTo) && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t">
            <Button
              type="button"
              variant={isSelectedFrom ? 'destructive' : 'outline'}
              size="sm"
              onClick={onSelectFrom}
              className="text-xs font-bold"
            >
              Pay From
            </Button>
            <Button
              type="button"
              variant={isSelectedTo ? 'default' : 'outline'}
              size="sm"
              onClick={onSelectTo}
              className={`text-xs font-bold ${
                isSelectedTo ? 'bg-emerald-600 hover:bg-emerald-700' : ''
              }`}
            >
              Pay To
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
