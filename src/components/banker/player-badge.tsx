'use client';

import { PlayerState } from '@/lib/ledger/types';
import { PLAYER_COLORS, PLAYER_TOKENS } from '@/lib/ledger/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      className={cn('relative transition-all duration-150 border-2 shadow-sm', {
        'border-destructive bg-destructive/5 ring-2 ring-destructive/20': isSelected && isSelectedFrom,
        'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20': isSelected && !isSelectedFrom,
        'border-border hover:border-primary/40': !isSelected,
      })}
    >
      <CardContent className="p-3.5 sm:p-4 space-y-3">
        {/* Top meta row with selection state badge */}
        <div className="flex items-center justify-between gap-2 min-h-[22px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            {player.isBanker && (
              <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300/40">
                Banker
              </Badge>
            )}
            {rank && (
              <span className="text-[11px] font-semibold text-muted-foreground">
                Rank #{rank}
              </span>
            )}
          </div>

          <div>
            {isSelectedFrom && (
              <Badge
                variant="destructive"
                className="text-[10px] font-bold uppercase tracking-wider py-0 px-2 shadow-sm"
              >
                Payer (FROM)
              </Badge>
            )}
            {isSelectedTo && (
              <Badge
                className="text-[10px] font-bold uppercase tracking-wider py-0 px-2 bg-emerald-600 hover:bg-emerald-600 text-white shadow-sm"
              >
                Receiver (TO)
              </Badge>
            )}
          </div>
        </div>

        {/* Player Info & Balance Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-inner border flex-shrink-0 ${colorMeta.badgeClass}`}
            >
              {tokenMeta.emoji}
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-sm sm:text-base truncate leading-tight">
                {player.name}
              </div>
              <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                {tokenMeta.label}
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Balance</div>
            <div
              className={cn('text-lg sm:text-xl font-black font-mono tracking-tight leading-tight', {
                'text-destructive': player.balance < 0,
                'text-foreground': player.balance >= 0,
              })}
            >
              ${player.balance.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {(onSelectFrom || onSelectTo) && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
            <Button
              type="button"
              variant={isSelectedFrom ? 'destructive' : 'outline'}
              size="sm"
              onClick={onSelectFrom}
              className="text-xs font-bold h-8"
            >
              Pay From
            </Button>
            <Button
              type="button"
              variant={isSelectedTo ? 'default' : 'outline'}
              size="sm"
              onClick={onSelectTo}
              className={cn('text-xs font-bold h-8', {
                'bg-emerald-600 hover:bg-emerald-700 text-white': isSelectedTo,
              })}
            >
              Pay To
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
