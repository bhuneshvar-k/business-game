// Web Audio API synthesizers and Web Speech API announcer for game feedback
import { BANK_ID, BANK_NAME } from '../ledger/constants';

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  public chimesEnabled: boolean = true;
  public voiceEnabled: boolean = true;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private announcedTxIds: Set<string> = new Set();
  private availableVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  // Backwards compatibility getter / setter
  get enabled(): boolean {
    return this.chimesEnabled;
  }
  set enabled(val: boolean) {
    this.chimesEnabled = val;
  }

  private loadVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.availableVoices = window.speechSynthesis.getVoices();
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playCashChime() {
    if (!this.chimesEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const freqs = [880, 1318.51, 1760]; // A5, E6, A6

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.5);
      });
    } catch {
      // AudioContext policy suppression fallback
    }
  }

  playTransferBeep() {
    if (!this.chimesEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // fallback
    }
  }

  playWarningBeep() {
    if (!this.chimesEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.setValueAtTime(150, now + 0.1);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch {
      // fallback
    }
  }

  playUndoSound() {
    if (!this.chimesEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.2);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch {
      // fallback
    }
  }

  /**
   * Speak arbitrary text via the native Web Speech API.
   * Voice is decoupled from chimes so users can independently control both.
   */
  speak(text: string) {
    if (!this.voiceEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      // Keep strong reference to prevent GC cutting speech off in Safari/Chromium
      this.currentUtterance = utterance;
      utterance.onend = () => {
        this.currentUtterance = null;
      };
      utterance.onerror = () => {
        this.currentUtterance = null;
      };

      const voices = this.availableVoices.length > 0 ? this.availableVoices : window.speechSynthesis.getVoices();
      const englishVoice = voices.find(
        (v) =>
          (v.lang === 'en-US' || v.lang.startsWith('en')) &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.default)
      );

      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis error fallback
    }
  }

  /**
   * Speak formatted voice announcement when a transaction occurs.
   * Uses exact ID checks to avoid misidentifying players named "Banks" or "Banker Joe".
   * Deduplicates by transaction ID to avoid double-speaking during polling sync.
   */
  announceTransaction(tx: {
    id?: string;
    fromId?: string;
    fromName: string;
    toId?: string;
    toName: string;
    amount: number;
    type?: string;
  }) {
    if (tx.id) {
      if (this.announcedTxIds.has(tx.id)) return;
      this.announcedTxIds.add(tx.id);
    }

    let sentence = '';
    const formattedAmount = `${tx.amount.toLocaleString()} dollars`;

    const isFromBank = tx.fromId === BANK_ID || tx.fromName === BANK_NAME;
    const isToBank = tx.toId === BANK_ID || tx.toName === BANK_NAME;

    if (tx.type === 'SALARY') {
      sentence = `${tx.toName} collected ${formattedAmount} salary from the Bank.`;
    } else if (isFromBank) {
      sentence = `Bank transferred ${formattedAmount} to ${tx.toName}.`;
    } else if (isToBank) {
      if (tx.type === 'TAX') {
        sentence = `${tx.fromName} paid ${formattedAmount} tax to the Bank.`;
      } else {
        sentence = `${tx.fromName} paid ${formattedAmount} to the Bank.`;
      }
    } else {
      if (tx.type === 'RENT') {
        sentence = `${tx.fromName} paid ${formattedAmount} rent to ${tx.toName}.`;
      } else {
        sentence = `${tx.fromName} transferred ${formattedAmount} to ${tx.toName}.`;
      }
    }

    this.speak(sentence);
  }

  /**
   * Speak formatted voice announcement when a transaction is undone
   */
  announceUndo(tx: {
    id?: string;
    fromId?: string;
    fromName: string;
    toId?: string;
    toName: string;
    amount: number;
  }) {
    const undoKey = tx.id ? `undo-${tx.id}` : null;
    if (undoKey) {
      if (this.announcedTxIds.has(undoKey)) return;
      this.announcedTxIds.add(undoKey);
    }

    const formattedAmount = `${tx.amount.toLocaleString()} dollars`;
    this.speak(`Transaction undone. ${formattedAmount} returned to ${tx.fromName}.`);
  }
}

export const soundManager = new SoundEffectsManager();
