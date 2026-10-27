/**
 * Voice-Only Quiz Mode Utilities
 * Handles speech recognition (webkitSpeechRecognition), synthesized spoken prompts,
 * Web Audio chimes, and fuzzy speech-to-choice matching.
 */

// Simple Web Audio API Synthesizer for instant audible feedback chimes without external assets
class SoundFX {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playCorrectChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.24); // G5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // Ignore audio context errors
    }
  }

  playIncorrectChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Ignore audio context errors
    }
  }

  playMicListeningBeep() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(880, now); // A5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Ignore
    }
  }
}

export const soundFx = new SoundFX();

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);
}

export interface SpeechRecognitionController {
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export function createSpeechRecognizer(callbacks: {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}): SpeechRecognitionController | null {
  if (typeof window === 'undefined') return null;

  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRec) return null;

  try {
    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      callbacks.onStart?.();
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      const activeText = final || interim;
      callbacks.onTranscript(activeText.trim(), Boolean(final));
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech') {
        callbacks.onError?.(e.error);
      }
    };

    recognition.onend = () => {
      callbacks.onEnd?.();
    };

    return {
      start: () => {
        try {
          recognition.start();
        } catch {
          // already started or busy
        }
      },
      stop: () => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      },
      abort: () => {
        try {
          recognition.abort();
        } catch {
          // ignore
        }
      }
    };
  } catch (err) {
    console.warn('SpeechRecognition initialization error:', err);
    return null;
  }
}

/**
 * Intelligent matcher to convert spoken natural language into an MCQ option index (0, 1, 2, 3)
 */
export function matchSpokenOption(spoken: string, options: string[]): number | null {
  if (!spoken) return null;
  const s = spoken.toLowerCase().trim();

  // 1. Direct letter matching: "A", "B", "C", "D"
  if (/^(option\s+|choice\s+)?a(\b|[.\s])|^letter\s+a\b/i.test(s)) return 0;
  if (/^(option\s+|choice\s+)?b(\b|[.\s])|^letter\s+b\b/i.test(s)) return 1;
  if (/^(option\s+|choice\s+)?c(\b|[.\s])|^letter\s+c\b/i.test(s)) return 2;
  if (/^(option\s+|choice\s+)?d(\b|[.\s])|^letter\s+d\b/i.test(s)) return 3;

  // 2. Numerical / Ordinal matching: "1", "2", "3", "4", "first", "second", etc.
  if (/\b(first|one|1|number\s+1|option\s+1)\b/i.test(s)) return 0;
  if (/\b(second|two|2|number\s+2|option\s+2)\b/i.test(s)) return 1;
  if (/\b(third|three|3|number\s+3|option\s+3)\b/i.test(s)) return 2;
  if (/\b(fourth|four|4|number\s+4|option\s+4)\b/i.test(s)) return 3;

  // 3. Keyword / Semantic matching against actual options text
  let bestIdx: number | null = null;
  let highestOverlap = 0;

  options.forEach((opt, idx) => {
    const cleanOpt = opt.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const optWords = cleanOpt.split(/\s+/).filter(w => w.length > 2);
    let matchCount = 0;

    for (const word of optWords) {
      if (s.includes(word)) {
        matchCount++;
      }
    }

    if (matchCount > 0 && matchCount > highestOverlap) {
      highestOverlap = matchCount;
      bestIdx = idx;
    }
  });

  return highestOverlap >= 1 ? bestIdx : null;
}
