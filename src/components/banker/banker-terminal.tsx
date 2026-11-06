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

  // Keep state in sync with real-time updates from parent useRoomSync
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
  const recentTransactions = room.transactions.slice(0, 10);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header Card */}
      <Card>
        <CardContent className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow">
              💼
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight">{room.name}</h1>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Live Game
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 font-mono">
                <span>Code: <strong className="text-foreground">{room.code}</strong></span>
                <span>•</span>
                <span>Version: v{room.version}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQrOpen(true)}
              className="gap-1.5 font-semibold"
            >
              <QrCode className="w-4 h-4 text-primary" />
              <span>Join QR Code</span>
            </Button>
            <SoundToggle />
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Bank + Players (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Central Bank Card */}
          <Card
            className={`transition-all duration-200 border-2 ${
              fromId === BANK_ID
                ? 'border-destructive bg-destructive/5 ring-4 ring-destructive/10'
                : toId === BANK_ID
                ? 'border-emerald-500 bg-emerald-50/40 ring-4 ring-emerald-500/10'
                : 'border-border'
            }`}
          >
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base">{BANK_NAME}</span>
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-900 border-amber-300">
                      Unlimited
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Salaries, tax collections and bank loans
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={fromId === BANK_ID ? 'destructive' : 'outline'}
                  onClick={() => setFromId(BANK_ID)}
                  className="text-xs font-bold"
                >
                  Pay From Bank
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={toId === BANK_ID ? 'default' : 'outline'}
                  onClick={() => setToId(BANK_ID)}
                  className={`text-xs font-bold ${toId === BANK_ID ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                >
                  Pay To Bank
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick "Pass GO" Salary Action Card */}
          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>1-Tap Pass GO / Salary (+${room.salaryAmount.toLocaleString()})</span>
                </div>
                <span className="text-xs text-emerald-100">Tap player to credit</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {room.players.map((p) => (
                  <Button
                    key={p.id}
                    disabled={isPending}
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePassGoSalary(p.id)}
                    className="flex-1 min-w-[120px] justify-between font-bold text-xs bg-white/20 hover:bg-white/30 text-white border-white/20"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-amber-300">+${room.salaryAmount}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Player Cards List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              <span>Players & Balances</span>
              <span>Total: ${(room.players.reduce((sum, p) => sum + p.balance, 0)).toLocaleString()}</span>
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

          {/* Recent Activity Log (Last 10 Logs) */}
          <Card>
            <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold">Transaction Log</CardTitle>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                      Last {recentTransactions.length} of 10
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Live audit trail of transfers, salaries, and penalties
                  </p>
                </div>
              </div>

              <Button
                variant={lastTx ? 'destructive' : 'secondary'}
                size="sm"
                onClick={handleUndo}
                disabled={!lastTx || isPending}
                className="gap-1.5 font-bold text-xs h-8 flex-shrink-0"
                title={lastTx ? `Undo: ${lastTx.fromName} → ${lastTx.toName} ($${lastTx.amount.toLocaleString()})` : 'Nothing to undo'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
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
                <div className="divide-y max-h-[340px] overflow-y-auto">
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
                        className={`p-3.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                          tx.isReversed
                            ? 'bg-muted/30 opacity-60'
                            : isLatestActive
                            ? 'bg-primary/5'
                            : 'hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-bold ${tx.isReversed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                {tx.fromName}
                              </span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className={`font-bold ${tx.isReversed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
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
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500 text-emerald-700 bg-emerald-50">
                                  Latest (Undoable)
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                              <span>{timeStr}</span>
                              {tx.note && <span>• {tx.note}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div
                            className={`font-mono font-bold text-sm ${
                              tx.isReversed
                                ? 'line-through text-muted-foreground'
                                : 'text-emerald-600'
                            }`}
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

        {/* Right Column: Keypad & Transfer Terminal (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Transfer Terminal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              
              {/* Direction Indicator */}
              <div className="bg-muted rounded-xl p-3 flex items-center justify-between gap-3 text-center">
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">From</div>
                  <div className="font-extrabold text-sm truncate">
                    {fromId === BANK_ID ? '🏦 Central Bank' : room.players.find((p) => p.id === fromId)?.name || 'Select Payer'}
                  </div>
                </div>
                
                <div className="w-7 h-7 rounded-full bg-background flex items-center justify-center text-muted-foreground shadow-sm">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">To</div>
                  <div className="font-extrabold text-sm truncate">
                    {toId === BANK_ID ? '🏦 Central Bank' : room.players.find((p) => p.id === toId)?.name || 'Select Receiver'}
                  </div>
                </div>
              </div>

              {/* Amount Display */}
              <div className="bg-slate-950 text-white rounded-xl p-4 text-right space-y-0.5 shadow-inner">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Transfer Amount
                </div>
                <div className="text-3xl sm:text-4xl font-mono font-black tracking-tight text-emerald-400 flex items-center justify-end gap-1">
                  <span>$</span>
                  <span>{amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Quick Denomination Chips */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Quick Denominations
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {QUICK_DENOMINATIONS.map((denom) => (
                    <Button
                      key={denom}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddDenomination(denom)}
                      className="font-bold text-xs"
                    >
                      +${denom >= 1000 ? `${denom / 1000}k` : denom}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="font-bold text-xs text-destructive hover:text-destructive"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Keypad Grid */}
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'].map((btn) => (
                  <Button
                    key={btn}
                    type="button"
                    variant={btn === '⌫' ? 'secondary' : 'outline'}
                    size="lg"
                    onClick={() => {
                      if (btn === '⌫') handleBackspace();
                      else handleDigit(btn);
                    }}
                    className="text-lg font-bold h-12"
                  >
                    {btn}
                  </Button>
                ))}
              </div>

              {/* Reason Chips */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Reason / Category
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'SALARY', label: 'Pass GO' },
                    { id: 'RENT', label: 'Rent / Toll' },
                    { id: 'TRADE', label: 'Property / Buy' },
                    { id: 'TAX', label: 'Tax / Fine' },
                    { id: 'LOAN', label: 'Loan / Debt' },
                    { id: 'CUSTOM', label: 'Custom' },
                  ].map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      variant={type === item.id ? 'default' : 'secondary'}
                      size="sm"
                      onClick={() => setType(item.id as TransactionType)}
                      className="text-xs font-bold"
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Execute Button */}
              <Button
                type="button"
                size="lg"
                disabled={isPending || amount <= 0 || !fromId || !toId || fromId === toId}
                onClick={() => executeTransfer(false)}
                className={`w-full py-6 font-extrabold text-base gap-2 ${
                  !(isPending || amount <= 0 || !fromId || !toId || fromId === toId)
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : ''
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span>
                  {isPending ? 'Processing...' : `Confirm Transfer of $${amount.toLocaleString()}`}
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

          <Alert className="bg-amber-50 border-amber-200 text-amber-900">
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
