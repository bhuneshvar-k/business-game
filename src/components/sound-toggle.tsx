'use client';

import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '@/lib/sound/audio-effects';

export function SoundToggle() {
  const [enabled, setEnabled] = useState(soundManager.enabled);

  const toggle = () => {
    const next = !enabled;
    soundManager.enabled = next;
    setEnabled(next);
    if (next) {
      soundManager.playCashChime();
    }
  };

  return (
    <button
      onClick={toggle}
      title={enabled ? 'Mute Game Sounds' : 'Unmute Game Sounds'}
      className="p-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200 text-slate-700 shadow-sm transition flex items-center gap-1.5 text-xs font-medium"
    >
      {enabled ? (
        <>
          <Volume2 className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Sound On</span>
        </>
      ) : (
        <>
          <VolumeX className="w-4 h-4 text-slate-400" />
          <span className="hidden sm:inline text-slate-400">Muted</span>
        </>
      )}
    </button>
  );
}
