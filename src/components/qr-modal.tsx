'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, QrCode as QrIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface QrModalProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QrModal({ roomCode, isOpen, onClose }: QrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/room/${roomCode}` : '';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/room/${roomCode}`;
      QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: {
          dark: '#09090b',
          light: '#ffffff',
        },
      })
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch(() => {});
    }
  }, [roomCode]);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="items-center text-center">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
            <QrIcon className="w-5 h-5" />
          </div>
          <DialogTitle className="text-xl">Join Game Room</DialogTitle>
          <DialogDescription>
            Scan this code with a mobile camera to open your personal Player Card.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-4 py-2">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Room Code
            </span>
            <Badge variant="outline" className="text-3xl font-black font-mono tracking-widest px-4 py-1.5 bg-muted">
              {roomCode}
            </Badge>
          </div>

          <div className="p-3 bg-white rounded-xl border shadow-sm">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`QR code for Room ${roomCode}`}
                className="w-56 h-56 rounded-md"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-sm text-muted-foreground">
                Generating QR code...
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={handleCopy} className="w-full gap-2">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Link Copied to Clipboard' : 'Copy Join Link'}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
