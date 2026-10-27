import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PodcastEpisode, PodcastSpeakerTurn } from '../types';
import { 
  Headphones, 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Rewind, 
  Volume2, 
  VolumeX, 
  Download, 
  Sparkles, 
  Mic, 
  Radio, 
  Share2, 
  FileText,
  Clock,
  CheckCircle2,
  ListMusic
} from 'lucide-react';

interface AudioBriefingPlayerProps {
  title: string;
  overview: string;
  keyTakeaways: string[];
  notes?: string;
  onPodcastCompleted?: () => void;
}

export const AudioBriefingPlayer: React.FC<AudioBriefingPlayerProps> = ({
  title,
  overview,
  keyTakeaways,
  notes,
  onPodcastCompleted
}) => {
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showFullTranscript, setShowFullTranscript] = useState<boolean>(true);
  const [hasAwardedXP, setHasAwardedXP] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const currentTurnIndexRef = useRef<number>(0);
  const dialogueEndReportedRef = useRef<boolean>(false);

  // Initialize SpeechSynthesis and voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      const updateVoices = () => {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Keep ref sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    currentTurnIndexRef.current = currentTurnIndex;
  }, [isPlaying, currentTurnIndex]);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Generate Podcast Script from Server
  const handleGeneratePodcast = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          overview,
          keyTakeaways,
          notes: notes?.slice(0, 10000)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to synthesize podcast briefing');
      }

      if (!data.episode || !data.episode.dialogue || data.episode.dialogue.length === 0) {
        throw new Error('Invalid podcast episode format returned');
      }

      setEpisode(data.episode);
      setCurrentTurnIndex(0);
      setIsPlaying(false);
    } catch (err: any) {
      console.error('Podcast generation failed:', err);
      setError(err?.message || 'Could not generate podcast briefing.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Select distinct voices for Alex & Sam
  const getSpeakerVoice = useCallback((speaker: 'Alex' | 'Sam') => {
    if (!voices.length) return null;
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));
    const pool = englishVoices.length ? englishVoices : voices;

    if (speaker === 'Alex') {
      // Alex: Deeper, confident voice
      const preferred = pool.find(v => 
        /male|guy|david|daniel|george|james|alex/i.test(v.name)
      );
      return preferred || pool[0];
    } else {
      // Sam: Inquisitive, higher voice
      const preferred = pool.find(v => 
        /female|woman|samantha|zira|victoria|susan|karen/i.test(v.name)
      );
      return preferred || (pool.length > 1 ? pool[1] : pool[0]);
    }
  }, [voices]);

  // Speak a specific turn
  const speakTurn = useCallback((turnIndex: number) => {
    if (!synthRef.current || !episode || !episode.dialogue[turnIndex]) {
      setIsPlaying(false);
      return;
    }

    synthRef.current.cancel();
    const turn = episode.dialogue[turnIndex];
    const utterance = new SpeechSynthesisUtterance(turn.text);

    const voice = getSpeakerVoice(turn.speaker);
    if (voice) {
      utterance.voice = voice;
    }

    // Differentiate pitch & rate for distinct co-hosts
    if (turn.speaker === 'Alex') {
      utterance.pitch = 0.92;
      utterance.rate = playbackRate * 1.02;
    } else {
      utterance.pitch = 1.15;
      utterance.rate = playbackRate * 0.98;
    }

    utterance.onend = () => {
      if (isPlayingRef.current) {
        const nextIdx = turnIndex + 1;
        if (nextIdx < episode.dialogue.length) {
          setCurrentTurnIndex(nextIdx);
          speakTurn(nextIdx);
        } else {
          setIsPlaying(false);
          if (!hasAwardedXP) {
            setHasAwardedXP(true);
            onPodcastCompleted?.();
          }
        }
      }
    };

    utterance.onerror = (e) => {
      console.warn('Utterance speech error:', e);
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [episode, getSpeakerVoice, playbackRate, hasAwardedXP, onPodcastCompleted]);

  const togglePlay = () => {
    if (!episode) return;

    if (isPlaying) {
      setIsPlaying(false);
      synthRef.current?.cancel();
    } else {
      setIsPlaying(true);
      speakTurn(currentTurnIndex);
    }
  };

  const handleSkipForward = () => {
    if (!episode) return;
    const next = Math.min(episode.dialogue.length - 1, currentTurnIndex + 1);
    setCurrentTurnIndex(next);
    if (isPlaying) {
      speakTurn(next);
    }
  };

  const handleSkipBack = () => {
    if (!episode) return;
    const prev = Math.max(0, currentTurnIndex - 1);
    setCurrentTurnIndex(prev);
    if (isPlaying) {
      speakTurn(prev);
    }
  };

  const handleJumpToTurn = (idx: number) => {
    if (!episode) return;
    setCurrentTurnIndex(idx);
    if (isPlaying) {
      speakTurn(idx);
    }
  };

  const currentTurn = episode?.dialogue[currentTurnIndex];

  return (
    <div className="theme-bg-surface theme-border border rounded-2xl overflow-hidden mb-8 shadow-sm">
      {/* Header Banner */}
      <div className="p-5 border-b theme-border bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold theme-text-primary">
                AI Audio Briefing &amp; Conversational Podcast
              </h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                Multi-Speaker Synthesizer
              </span>
            </div>
            <p className="text-xs theme-text-muted mt-0.5">
              Listen to academic co-hosts Alex &amp; Sam dissect this material on the go.
            </p>
          </div>
        </div>

        {!episode && (
          <button
            onClick={handleGeneratePodcast}
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Co-Host Script...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Synthesize Podcast Episode</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border-b border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Episode Audio Console */}
      {episode ? (
        <div className="p-6 space-y-6">
          {/* Episode Info & Co-Hosts Avatars */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl theme-bg-elevated theme-border border">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold mb-1">
                Now Playing • Episode Brief
              </div>
              <h4 className="text-sm font-bold theme-text-primary">
                {episode.title}
              </h4>
              <p className="text-xs theme-text-muted mt-0.5 max-w-xl">
                {episode.summary}
              </p>
            </div>

            {/* Co-Host Badges */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                currentTurn?.speaker === 'Alex'
                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 ring-2 ring-indigo-500/40'
                  : 'theme-bg-surface theme-border text-slate-400 opacity-60'
              }`}>
                <span className="text-base">🎙️</span>
                <div className="text-left">
                  <div className="text-[11px] font-bold leading-none">Alex</div>
                  <div className="text-[9px] uppercase tracking-wider opacity-70">Lead Tutor</div>
                </div>
              </div>

              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                currentTurn?.speaker === 'Sam'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300 ring-2 ring-purple-500/40'
                  : 'theme-bg-surface theme-border text-slate-400 opacity-60'
              }`}>
                <span className="text-base">🎧</span>
                <div className="text-left">
                  <div className="text-[11px] font-bold leading-none">Sam</div>
                  <div className="text-[9px] uppercase tracking-wider opacity-70">Co-Host</div>
                </div>
              </div>
            </div>
          </div>

          {/* Equalizer Frequency Wave */}
          <div className="flex items-center justify-center gap-1.5 h-12 py-2">
            {[32, 54, 80, 45, 95, 60, 30, 85, 70, 40, 90, 65, 35, 75, 50].map((h, idx) => (
              <div
                key={idx}
                className={`w-1.5 rounded-full transition-all duration-300 ${
                  isPlaying
                    ? 'bg-gradient-to-t from-indigo-500 to-purple-400 animate-pulse'
                    : 'bg-slate-700 h-2'
                }`}
                style={{
                  height: isPlaying ? `${Math.max(8, (h * ((idx % 3) + 1)) % 40)}px` : '6px',
                  animationDelay: `${idx * 0.08}s`
                }}
              />
            ))}
          </div>

          {/* Audio Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            {/* Speed & Jump Controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs theme-text-muted">Speed:</span>
              {[0.8, 1.0, 1.25, 1.5, 2.0].map(rate => (
                <button
                  key={rate}
                  onClick={() => {
                    setPlaybackRate(rate);
                    if (isPlaying) speakTurn(currentTurnIndex);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                    playbackRate === rate
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'theme-bg-elevated theme-border border theme-text-muted hover:theme-text-primary'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Main Playback Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSkipBack}
                className="p-2 rounded-xl theme-bg-elevated theme-border border text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Previous dialogue line"
              >
                <Rewind className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={handleSkipForward}
                className="p-2 rounded-xl theme-bg-elevated theme-border border text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Next dialogue line"
              >
                <FastForward className="w-4 h-4" />
              </button>
            </div>

            {/* Turn Counter & Toggle Transcript */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono theme-text-muted">
                Line {currentTurnIndex + 1} of {episode.dialogue.length}
              </span>
              <button
                onClick={() => setShowFullTranscript(prev => !prev)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold theme-bg-elevated theme-border border theme-text-primary hover:theme-bg-hover transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>{showFullTranscript ? 'Hide Transcript' : 'View Transcript'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Synchronized Transcript */}
          {showFullTranscript && (
            <div className="mt-4 pt-4 border-t theme-border space-y-3 max-h-80 overflow-y-auto pr-2">
              {episode.dialogue.map((turn, idx) => {
                const isActive = currentTurnIndex === idx;
                const isAlex = turn.speaker === 'Alex';

                return (
                  <div
                    key={turn.id || idx}
                    onClick={() => handleJumpToTurn(idx)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? isAlex
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                          : 'bg-purple-950/40 border-purple-500 shadow-md ring-1 ring-purple-500/30'
                        : 'theme-bg-elevated/40 theme-border hover:theme-bg-elevated'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${
                          isAlex ? 'text-indigo-400' : 'text-purple-400'
                        }`}>
                          {isAlex ? '🎙️ Alex (Tutor)' : '🎧 Sam (Co-Host)'}
                        </span>
                        {isActive && isPlaying && (
                          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            Speaking...
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono theme-text-muted">
                        #{idx + 1}
                      </span>
                    </div>

                    <p className={`text-xs leading-relaxed ${
                      isActive ? 'theme-text-primary font-medium' : 'theme-text-secondary'
                    }`}>
                      {turn.text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Empty / Call to Action state */
        <div className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center">
            <Headphones className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold theme-text-primary">
            Turn Your Study Guide Into a 5-Minute Audio Masterclass
          </h4>
          <p className="text-xs theme-text-muted max-w-md mx-auto leading-relaxed">
            Our AI generates an engaging, two-speaker educational podcast conversation between Alex (lead instructor) and Sam (co-host), explaining concepts with analogies and exam strategies.
          </p>
          <button
            onClick={handleGeneratePodcast}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Synthesizing Co-Host Dialogue...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Episode Now</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
