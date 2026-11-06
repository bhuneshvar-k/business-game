'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Building2,
  ArrowRight,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  History,
  QrCode,
  CheckCircle,
  Delete,
  CreditCard,
  LayoutGrid,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RoomState, TransactionType } from '@/lib/ledger/types';
import { BANK_ID, BANK_NAME, QUICK_DENOMINATIONS } from '@/lib/ledger/constants';
import { PlayerBadge } from './player-badge';
import { transferAction, undoAction } from '@/app/actions/room.actions';
import { soundManager } from '@/lib/sound/audio-effects';
import { QrModal } from '../qr-modal';
import { SoundToggle } from '../sound-toggle';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface BankerTerminalProps {
  initialRoom: RoomState;
  onRoomUpdate?: (room: RoomState) => void;
}

export function BankerTerminal({ initialRoom, onRoomUpdate }: BankerTerminalProps) {
  const [room, setRoom] = useState<RoomState>(initialRoom);
  const [fromId, setFromId] = useState<string>(BANK_ID);
  const [toId, setToId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('0');
  const [type, setType] = useState<TransactionType>('CUSTOM');
  const [note, setNote] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<'table' | 'terminal' | 'history'>('table');

  // Keep state synchronized with polling updates
  useEffect(() => {
    setRoom(initialRoom);
  }, [initialRoom]);

  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [warningModal, setWarningModal] = useState<{
    show: boolean;
    required: number;
    available: number;
    fromName: string;
  } | null>(null);

  const amount = parseInt(amountStr, 10) || 0;

  const updateState = (newRoom: RoomState) => {
    setRoom(newRoom);
    if (onRoomUpdate) onRoomUpdate(newRoom);
  };

  const handlePassGoSalary = (playerId: string) => {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    startTransition(async () => {
      const res = await transferAction({
        roomCode: room.code,
        fromId: BANK_ID,
        toId: player.id,
        amount: room.salaryAmount,
        type: 'SALARY',
        note: 'Pass GO / Salary',
      });

      if (res.success) {
        updateState(res.room);
        soundManager.playCashChime();
        soundManager.announceTransaction({
          id: res.transaction.id,
          fromId: BANK_ID,
          fromName: BANK_NAME,
          toId: player.id,
          toName: player.name,
          amount: room.salaryAmount,
          type: 'SALARY',
        });
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
        });
      } else {
        soundManager.playWarningBeep();
        alert(res.error);
      }
    });
  };

  const executeTransfer = (overrideInsufficient = false) => {
    if (!fromId || !toId || fromId === toId || amount <= 0) return;

    startTransition(async () => {
      const res = await transferAction({
        roomCode: room.code,
        fromId,
        toId,
        amount,
        type,
        note: note.trim() || undefined,
        overrideInsufficientFunds: overrideInsufficient,
      });

      if (res.success) {
        updateState(res.room);
        setWarningModal(null);
        setAmountStr('0');
        setNote('');

        if (type === 'SALARY') {
          soundManager.playCashChime();
        } else {
          soundManager.playTransferBeep();
        }

        soundManager.announceTransaction({
          id: res.transaction.id,
          fromId: res.transaction.fromId,
          fromName: res.transaction.fromName,
          toId: res.transaction.toId,
          toName: res.transaction.toName,
          amount: res.transaction.amount,
          type: res.transaction.type,
        });
      } else {
        if (res.code === 'INSUFFICIENT_FUNDS') {
          const fromPlayer = room.players.find((p) => p.id === fromId);
          soundManager.playWarningBeep();
          setWarningModal({
            show: true,
            required: res.required || amount,
            available: res.available || 0,
            fromName: fromPlayer?.name || 'Player',
          });
        } else {
          alert(res.error);
        }
      }
    });
  };

  const handleUndo = () => {
    startTransition(async () => {
      const res = await undoAction({
        roomCode: room.code,
      });

      if (res.success) {
        updateState(res.room);
        soundManager.playUndoSound();
        soundManager.announceUndo({
          id: res.reversedTransaction.id,
          fromId: res.reversedTransaction.fromId,
          fromName: res.reversedTransaction.fromName,
          toId: res.reversedTransaction.toId,
          toName: res.reversedTransaction.toName,
          amount: res.reversedTransaction.amount,
        });
      } else {
        alert(res.error);
      }
    });
  };

  const handleDigit = (digit: string) => {
    if (amountStr === '0') {
      setAmountStr(digit);
    } else {
      if (amountStr.length < 8) {
        setAmountStr(amountStr + digit);
      }
    }
  };

  const handleClear = () => setAmountStr('0');
  const handleBackspace = () => {
    if (amountStr.length <= 1) {
      setAmountStr('0');
    } else {
      setAmountStr(amountStr.slice(0, -1));
    }
  };

  const handleAddDenomination = (denom: number) => {
    const current = parseInt(amountStr, 10) || 0;
    setAmountStr((current + denom).toString());
  };

  const sortedPlayers = [...room.players].sort((a, b) => b.balance - a.balance);
  const lastTx = room.transactions.find((t) => !t.isReversed);
  const recentTransactions = room.transactions.slice(0, 50);

  const fromPlayer = room.players.find((p) => p.id === fromId);
  const toPlayer = room.players.find((p) => p.id === toId);

  const canConfirm = !isPending && amount > 0 && !!fromId && !!toId && fromId !== toId;

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12">
      {/* Top Header Card */}
      <Card className="shadow-sm border-border">
        <CardContent className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm">
              💼
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">{room.name}</h1>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300/30 text-[11px] font-bold">
                  Live Game
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 font-mono">
                <span>Code: <strong className="text-foreground font-black">{room.code}</strong></span>
                <span>•</span>
                <span>Version: v{room.version}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQrOpen(true)}
              className="gap-1.5 font-bold text-xs h-8"
            >
              <QrCode className="w-3.5 h-3.5 text-primary" />
              <span>Join QR</span>
            </Button>
            <SoundToggle />
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Left Column (Bank, Pass GO, Players, History) + Right Column (Sticky Terminal) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column (7 Cols on desktop) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Central Bank Card */}
          <Card
            className={cn('transition-all duration-150 border-2 shadow-sm', {
              'border-primary bg-primary/5 ring-2 ring-primary/20': fromId === BANK_ID,
              'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20': toId === BANK_ID,
              'border-border': fromId !== BANK_ID && toId !== BANK_ID,
            })}
          >
            <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base">{BANK_NAME}</span>
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300/40 font-bold">
                      Unlimited
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Salaries, tax collections, loans & property sales
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex gap-2 flex-shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant={fromId === BANK_ID ? 'default' : 'outline'}
                  onClick={() => setFromId(BANK_ID)}
                  className={cn('text-xs font-bold h-8', {
                    'bg-primary text-primary-foreground': fromId === BANK_ID,
                  })}
                >
                  Pay From Bank
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={toId === BANK_ID ? 'default' : 'outline'}
                  onClick={() => setToId(BANK_ID)}
                  className={cn('text-xs font-bold h-8', {
                    'bg-emerald-600 hover:bg-emerald-700 text-white': toId === BANK_ID,
                  })}
                >
                  Pay To Bank
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick "Pass GO" Salary Action Card */}
          <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md">
            <CardContent className="p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                  <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0" />
                  <span>1-Tap Pass GO / Salary (+${room.salaryAmount.toLocaleString()})</span>
                </div>
                <span className="text-[11px] text-emerald-100 hidden sm:inline">Tap player to credit</span>
              </div>
              
              {/* Responsive grid for Pass GO buttons: exactly 2 cols on mobile, 4 on desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {room.players.map((p) => (
                  <Button
                    key={p.id}
                    disabled={isPending}
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePassGoSalary(p.id)}
                    className="w-full justify-between font-bold text-xs bg-white/20 hover:bg-white/30 active:scale-95 text-white border-white/20 h-9 px-2.5 shadow-sm"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-amber-300 font-mono flex-shrink-0">+${room.salaryAmount}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Player Cards Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              <span>Players & Balances</span>
              <span>Total Active Capital: ${(room.players.reduce((sum, p) => sum + p.balance, 0)).toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {room.players.map((player) => {
                const rank = sortedPlayers.findIndex((p) => p.id === player.id) + 1;
                return (
                  <PlayerBadge
                    key={player.id}
                    player={player}
                    rank={rank}
                    isSelectedFrom={fromId === player.id}
                    isSelectedTo={toId === player.id}
                    onSelectFrom={() => setFromId(player.id)}
                    onSelectTo={() => setToId(player.id)}
                  />
                );
              })}
            </div>
          </div>

          {/* Recent Activity Log (Last 50 Logs) */}
          <Card className="shadow-sm border-border">
            <CardHeader className="p-3.5 sm:p-4 pb-2.5 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold">Transaction History</CardTitle>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                      Last {recentTransactions.length} of 50
                    </Badge>
                  </div>
                </div>
              </div>

              <Button
                variant={lastTx ? 'destructive' : 'secondary'}
                size="sm"
                onClick={handleUndo}
                disabled={!lastTx || isPending}
                className="gap-1.5 font-bold text-xs h-7 px-2.5 flex-shrink-0"
                title={lastTx ? `Undo: ${lastTx.fromName} → ${lastTx.toName} ($${lastTx.amount.toLocaleString()})` : 'Nothing to undo'}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo Last</span>
              </Button>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              {recentTransactions.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No transactions yet. Money transfers and salaries will appear here.
                </div>
              ) : (
                <div className="divide-y divide-border/60 max-h-[300px] overflow-y-auto">
                  {recentTransactions.map((tx) => {
                    const isLatestActive = !tx.isReversed && tx.id === lastTx?.id;
                    const date = new Date(tx.createdAt);
                    const timeStr = date.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    return (
                      <div
                        key={tx.id}
                        className={cn('p-3 flex items-center justify-between gap-2.5 text-xs transition-colors', {
                          'bg-muted/40 opacity-60': tx.isReversed,
                          'bg-primary/5': !tx.isReversed && isLatestActive,
                          'hover:bg-muted/30': !tx.isReversed && !isLatestActive,
                        })}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={cn('font-bold', {
                                  'line-through text-muted-foreground': tx.isReversed,
                                  'text-foreground': !tx.isReversed,
                                })}
                              >
                                {tx.fromName}
                              </span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span
                                className={cn('font-bold', {
                                  'line-through text-muted-foreground': tx.isReversed,
                                  'text-foreground': !tx.isReversed,
                                })}
                              >
                                {tx.toName}
                              </span>

                              <Badge variant="secondary" className="text-[10px] font-semibold py-0 px-1.5">
                                {tx.type}
                              </Badge>

                              {tx.isReversed && (
                                <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                                  Reversed
                                </Badge>
                              )}

                              {isLatestActive && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
                                  Undo Target
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                              <span>{timeStr}</span>
                              {tx.note && <span>• {tx.note}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div
                            className={cn('font-mono font-bold text-sm', {
                              'line-through text-muted-foreground': tx.isReversed,
                              'text-emerald-600 dark:text-emerald-400': !tx.isReversed,
                            })}
                          >
                            ${tx.amount.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column: Sticky Transfer Terminal (5 Cols on desktop) */}
        <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-3">
          <Card className="shadow-lg border-2 border-border">
            <CardHeader className="p-3.5 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Transfer Terminal
                </CardTitle>
                {amount > 0 && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    ${amount.toLocaleString()}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-3.5 pt-0 space-y-3.5">
              
              {/* Direction Indicator */}
              <div className="bg-muted/60 rounded-xl p-2.5 flex items-center justify-between gap-2 text-center border">
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] uppercase font-bold text-muted-foreground">Payer (From)</div>
                  <div className="font-extrabold text-xs sm:text-sm truncate">
                    {fromId === BANK_ID ? '🏦 Central Bank' : fromPlayer?.name || 'Select Payer'}
                  </div>
                </div>
                
                <div className="w-6 h-6 rounded-full bg-background flex items-center justify-center text-muted-foreground shadow-sm flex-shrink-0 border">
                  <ArrowRight className="w-3 h-3" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[9px] uppercase font-bold text-muted-foreground">Receiver (To)</div>
                  <div className="font-extrabold text-xs sm:text-sm truncate">
                    {toId === BANK_ID ? '🏦 Central Bank' : toPlayer?.name || 'Select Receiver'}
                  </div>
                </div>
              </div>

              {/* Amount Display */}
              <div className="bg-slate-950 text-white rounded-xl p-3 text-right space-y-0.5 shadow-inner">
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                  Amount to Move
                </div>
                <div className="text-3xl font-mono font-black tracking-tight text-emerald-400 flex items-center justify-end gap-1">
                  <span>$</span>
                  <span>{amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Quick Denomination Chips */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span>Quick Add</span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-destructive hover:underline text-[10px] font-bold uppercase"
                  >
                    Clear All
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {QUICK_DENOMINATIONS.map((denom) => (
                    <Button
                      key={denom}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddDenomination(denom)}
                      className="font-mono font-bold text-xs h-8 px-1"
                    >
                      +${denom >= 1000 ? `${denom / 1000}k` : denom}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleClear}
                    className="font-bold text-xs h-8 px-1 text-destructive hover:text-destructive"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Compact Keypad Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((btn) => (
                  <Button
                    key={btn}
                    type="button"
                    variant="outline"
                    onClick={() => handleDigit(btn)}
                    className="text-base font-bold h-10 shadow-sm"
                  >
                    {btn}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleBackspace}
                  className="h-10 text-muted-foreground hover:text-foreground"
                  title="Backspace"
                >
                  <Delete className="w-4 h-4" />
                </Button>
              </div>

              {/* Reason Chips (Compact) */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Category
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'SALARY', label: 'Pass GO' },
                    { id: 'RENT', label: 'Rent / Toll' },
                    { id: 'TRADE', label: 'Property' },
                    { id: 'TAX', label: 'Tax / Fine' },
                    { id: 'LOAN', label: 'Loan' },
                    { id: 'CUSTOM', label: 'Custom' },
                  ].map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      variant={type === item.id ? 'default' : 'secondary'}
                      size="sm"
                      onClick={() => setType(item.id as TransactionType)}
                      className="text-xs font-semibold h-7 px-1"
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Confirm Transfer Button */}
              <Button
                type="button"
                size="lg"
                disabled={!canConfirm}
                onClick={() => executeTransfer(false)}
                className={cn('w-full py-5 font-black text-sm sm:text-base gap-2 shadow-md transition-all', {
                  'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]': canConfirm,
                  'opacity-50 cursor-not-allowed': !canConfirm,
                })}
              >
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>
                  {isPending
                    ? 'Processing...'
                    : !toId
                    ? 'Select Receiver'
                    : fromId === toId
                    ? 'Cannot Transfer to Self'
                    : amount <= 0
                    ? 'Enter Transfer Amount'
                    : `Confirm Transfer of $${amount.toLocaleString()}`}
                </span>
              </Button>

            </CardContent>
          </Card>
        </div>

      </div>

      {/* Warning Dialog for Insufficient Funds with Banker Override */}
      <Dialog
        open={!!warningModal?.show}
        onOpenChange={(open) => !open && setWarningModal(null)}
      >
        <DialogContent className="sm:max-w-md space-y-3">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              <DialogTitle className="text-lg">Insufficient Funds</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              <strong>{warningModal?.fromName}</strong> has only{' '}
              <span className="font-bold text-foreground font-mono">
                ${warningModal?.available.toLocaleString()}
              </span>
              , but owes{' '}
              <span className="font-bold text-destructive font-mono">
                ${warningModal?.required.toLocaleString()}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300">
            <AlertTitle className="font-bold text-xs">Banker Override Permitted</AlertTitle>
            <AlertDescription className="text-xs">
              Allow this transfer if the player mortgaged a property, struck a trade deal, or borrowed from the Bank.
            </AlertDescription>
          </Alert>

          <DialogFooter className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" onClick={() => setWarningModal(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => executeTransfer(true)}
            >
              Override & Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <QrModal
        roomCode={room.code}
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
      />
    </div>
  );
}
