'use client';

import { useState } from 'react';
import { Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { soundManager } from '@/lib/sound/audio-effects';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SoundToggle() {
  const [soundEnabled, setSoundEnabled] = useState(soundManager.enabled);
  const [voiceEnabled, setVoiceEnabled] = useState(soundManager.voiceEnabled);

  const toggleSound = () => {
    const next = !soundEnabled;
    soundManager.enabled = next;
    setSoundEnabled(next);
    if (next) {
      soundManager.playCashChime();
    }
  };

  const toggleVoice = () => {
    const next = !voiceEnabled;
    soundManager.voiceEnabled = next;
    setVoiceEnabled(next);
    if (next) {
      soundManager.speak('Voice announcements enabled');
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Voice Announcer Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={toggleVoice}
        title={voiceEnabled ? 'Mute Voice Announcements' : 'Enable Voice Announcements'}
        className={cn('h-8 px-2.5 gap-1.5 text-xs font-semibold', {
          'bg-primary/5 text-primary border-primary/30': voiceEnabled,
          'text-muted-foreground': !voiceEnabled,
        })}
      >
        {voiceEnabled ? (
          <>
            <Mic className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Voice On</span>
          </>
        ) : (
          <>
            <MicOff className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="hidden sm:inline text-muted-foreground">Voice Off</span>
          </>
        )}
      </Button>

      {/* Sound Chimes Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={toggleSound}
        title={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
        className={cn('h-8 px-2.5 gap-1.5 text-xs font-semibold', {
          'bg-primary/5 text-primary border-primary/30': soundEnabled,
          'text-muted-foreground': !soundEnabled,
        })}
      >
        {soundEnabled ? (
          <>
            <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Sound On</span>
          </>
        ) : (
          <>
            <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="hidden sm:inline text-muted-foreground">Muted</span>
          </>
        )}
      </Button>
    </div>
  );
}
