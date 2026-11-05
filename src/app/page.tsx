'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetupWizard } from '@/components/setup/setup-wizard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, QrCode } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [view, setView] = useState<'create' | 'join'>('create');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Please enter a 4-letter room code');
      return;
    }
    router.push(`/room/${joinCode.trim().toUpperCase()}`);
  };

  return (
    <main className="min-h-screen bg-slate-50/50 py-8 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl space-y-4">
        {/* Toggle between Start New Game and Join Existing */}
        <div className="flex justify-center gap-2">
          <Button
            variant={view === 'create' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('create')}
            className="font-bold text-xs"
          >
            Start New Game
          </Button>
          <Button
            variant={view === 'join' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('join')}
            className="font-bold text-xs"
          >
            Join with Code
          </Button>
        </div>

        {view === 'create' ? (
          <SetupWizard />
        ) : (
          <Card className="max-w-md mx-auto shadow-lg">
            <CardHeader className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-1">
                <QrCode className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl">Join Active Game</CardTitle>
              <CardDescription>
                Enter the 4-letter code displayed on the Banker screen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-1">
                  <Input
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase());
                      setError('');
                    }}
                    placeholder="e.g. ABCD"
                    maxLength={6}
                    className="text-center font-mono font-black text-2xl tracking-widest uppercase h-14"
                  />
                  {error && (
                    <p className="text-xs text-destructive font-medium text-center">{error}</p>
                  )}
                </div>

                <Button type="submit" size="lg" className="w-full font-bold gap-2">
                  <span>Enter Game</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
