import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Flashcard } from '../types';
import { speakText, stopSpeaking } from '../utils/tts';
import { exportFlashcardsToPDF, exportFlashcardsToCSV } from '../utils/pdfExport';
import { 
  applySM2, 
  getSM2RatingOptions, 
  filterDueCards, 
  calculateSM2Stats, 
  saveCardSM2State, 
  hydrateCardsWithSM2 
} from '../utils/spacedRepetition';
import { 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Check, 
  X, 
  Shuffle, 
  Play, 
  Pause, 
  ArrowLeft, 
  ArrowRight,
  Layers,
  Sparkles,
  HelpCircle,
  BookmarkCheck,
  RotateCcw,
  Printer,
  Download,
  FileSpreadsheet,
  Scissors,
  Calendar,
  Clock,
  Brain,
  Filter,
  CheckCircle2,
  TrendingUp,
  Zap,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface FlashcardViewProps {
  cards: Flashcard[];
  title: string;
  onStartQuizFromDeck: () => void;
  onSaveWeakCard: (card: Flashcard) => void;
  onQuit: () => void;
  onEarnXP?: (amount: number, reason: string, updates?: any) => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export const FlashcardView: React.FC<FlashcardViewProps> = ({
  cards: initialCards,
  title,
  onStartQuizFromDeck,
  onSaveWeakCard,
  onQuit,
  onEarnXP,
  isFocusMode = false,
  onToggleFocusMode
}) => {
  // Hydrate cards with persistent SuperMemo SM-2 state
  const [deck, setDeck] = useState<Flashcard[]>(() => hydrateCardsWithSM2(initialCards));
  const [filterMode, setFilterMode] = useState<'all' | 'due' | 'learning' | 'mastered'>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastRatedFeedback, setLastRatedFeedback] = useState<string | null>(null);

  const autoPlayRef = useRef<any>(null);

  useEffect(() => {
    const hydrated = hydrateCardsWithSM2(initialCards);
    setDeck(hydrated);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [initialCards]);

  // Filtered sub-deck based on filterMode
  const activeDeck = useMemo(() => {
    if (filterMode === 'due') {
      const due = filterDueCards(deck);
      return due.length > 0 ? due : deck; // fallback to deck if none due
    }
    if (filterMode === 'learning') {
      return deck.filter(c => c.mastery !== 'mastered');
    }
    if (filterMode === 'mastered') {
      return deck.filter(c => c.mastery === 'mastered');
    }
    return deck;
  }, [deck, filterMode]);

  const currentCard = activeDeck[currentIndex] || activeDeck[0];

  // SM-2 Deck Metrics
  const sm2Stats = useMemo(() => calculateSM2Stats(deck), [deck]);

  useEffect(() => {
    stopSpeaking();
    setIsSpeaking(false);
    setIsFlipped(false);
  }, [currentIndex, filterMode]);

  // Autoplay loop
  useEffect(() => {
    if (!isAutoPlaying) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }

    autoPlayRef.current = setInterval(() => {
      setIsFlipped(prev => {
        if (!prev) {
          return true;
        } else {
          setCurrentIndex(curr => (curr + 1) % activeDeck.length);
          return false;
        }
      });
    }, 3500);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, activeDeck.length]);

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  // SuperMemo SM-2 Recall Grading Handler
  const handleGradeSM2 = useCallback((rating: number) => {
    if (!currentCard) return;

    const updatedCard = applySM2(currentCard, rating);
    saveCardSM2State(updatedCard);

    // Update state in main deck
    setDeck(prevDeck =>
      prevDeck.map(c => (c.front.toLowerCase() === updatedCard.front.toLowerCase() ? updatedCard : c))
    );

    // Provide visual toast feedback on calculated interval
    const days = updatedCard.interval ?? 1;
    const intervalStr = days <= 1 ? '1 day' : `${days} days`;
    setLastRatedFeedback(`Next review in ${intervalStr} (Ease: ${updatedCard.easeFactor})`);
    setTimeout(() => setLastRatedFeedback(null), 2500);

    // Award XP
    const xpBonus = rating >= 4 ? 15 : 10;
    onEarnXP?.(xpBonus, `SM-2 Review (${rating >= 4 ? 'Mastered' : 'Reviewed'})`, {
      cards: 1
    });

    if (rating < 3) {
      onSaveWeakCard(currentCard);
    }

    // Advance to next card
    if (currentIndex + 1 < activeDeck.length) {
      setCurrentIndex(i => i + 1);
    } else {
      // Loop or finish
      setCurrentIndex(0);
    }
    setIsFlipped(false);
  }, [currentCard, currentIndex, activeDeck.length, onEarnXP, onSaveWeakCard]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 < activeDeck.length) {
      setCurrentIndex(i => i + 1);
    }
  }, [currentIndex, activeDeck.length]);

  const handleShuffle = () => {
    const copy = [...deck];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setDeck(copy);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const toggleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;

    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      const text = isFlipped ? currentCard.back : currentCard.front;
      setIsSpeaking(true);
      speakText(text, () => setIsSpeaking(false));
    }
  };

  // PDF & Print Handlers
  const handleDownloadCutoutsPDF = () => {
    setIsExporting(true);
    try {
      exportFlashcardsToPDF(deck, title, 'cutouts');
    } finally {
      setTimeout(() => setIsExporting(false), 500);
      setShowExportMenu(false);
    }
  };

  const handleDownloadSheetPDF = () => {
    setIsExporting(true);
    try {
      exportFlashcardsToPDF(deck, title, 'summary');
    } finally {
      setTimeout(() => setIsExporting(false), 500);
      setShowExportMenu(false);
    }
  };

  const handleDownloadCSV = () => {
    exportFlashcardsToCSV(deck, title);
    setShowExportMenu(false);
  };

  const handlePrint = () => {
    window.print();
  };

  // Keyboard navigation & ratings (1 to 5)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (isFlipped) {
        if (e.code === 'Digit1') { e.preventDefault(); handleGradeSM2(1); }
        else if (e.code === 'Digit2') { e.preventDefault(); handleGradeSM2(2); }
        else if (e.code === 'Digit3') { e.preventDefault(); handleGradeSM2(3); }
        else if (e.code === 'Digit4') { e.preventDefault(); handleGradeSM2(4); }
        else if (e.code === 'Digit5') { e.preventDefault(); handleGradeSM2(5); }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleFlip, handleNext, handlePrev, handleGradeSM2, isFlipped]);

  const ratingOptions = useMemo(() => {
    return currentCard ? getSM2RatingOptions(currentCard) : [];
  }, [currentCard]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">
            <Brain className="w-4 h-4" />
            <span>Flashcards</span>
          </div>
          <h1 className="text-2xl font-bold theme-text-primary">
            {title}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {onToggleFocusMode && (
            <button
              onClick={onToggleFocusMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                isFocusMode
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                  : 'theme-bg-surface theme-border theme-text-secondary hover:theme-text-primary'
              }`}
              title={isFocusMode ? "Exit Focus Mode (Esc)" : "Enter Focus Mode"}
            >
              {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isFocusMode ? 'Exit Focus' : 'Focus Mode'}</span>
            </button>
          )}

          <button
            onClick={() => setIsAutoPlaying(p => !p)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              isAutoPlaying 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                : 'theme-bg-surface theme-border theme-text-primary hover:theme-bg-hover'
            }`}
            title="Automatically flip and advance cards"
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isAutoPlaying ? 'Pause Auto' : 'Auto Play'}</span>
          </button>

          <button
            onClick={handleShuffle}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg theme-bg-surface theme-border border text-xs font-medium theme-text-primary hover:theme-bg-hover transition-colors cursor-pointer"
            title="Shuffle deck"
          >
            <Shuffle className="w-3.5 h-3.5 text-indigo-500" />
            <span>Shuffle</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(prev => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg theme-bg-surface theme-border border text-xs font-semibold text-indigo-500 hover:theme-bg-hover transition-colors cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl theme-bg-surface border theme-border shadow-xl z-20 py-1 animate-scaleUp">
                <button
                  onClick={handleDownloadCutoutsPDF}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium theme-text-primary hover:theme-bg-hover flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Scissors className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="font-bold">Cut-Out Flashcards PDF</div>
                    <div className="text-[10px] theme-text-muted">Printable cards with cut lines</div>
                  </div>
                </button>

                <button
                  onClick={handleDownloadSheetPDF}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium theme-text-primary hover:theme-bg-hover flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-bold">Summary Sheet PDF</div>
                    <div className="text-[10px] theme-text-muted">Compact reference sheet</div>
                  </div>
                </button>

                <button
                  onClick={handleDownloadCSV}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium theme-text-primary hover:theme-bg-hover flex items-center gap-2 transition-colors cursor-pointer border-t theme-border"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-bold">Export to CSV</div>
                    <div className="text-[10px] theme-text-muted">Import into Anki / Quizlet</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spaced Review Metrics Strip */}
      <div className="p-4 rounded-2xl theme-bg-surface theme-border border mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <div className="p-2.5 rounded-xl theme-bg-elevated theme-border border">
          <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold mb-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Cards Due</span>
          </div>
          <div className="text-base font-bold theme-text-primary">
            {sm2Stats.dueCount} / {sm2Stats.total}
          </div>
        </div>

        <div className="p-2.5 rounded-xl theme-bg-elevated theme-border border">
          <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold mb-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Mastery</span>
          </div>
          <div className="text-base font-bold text-emerald-400">
            {sm2Stats.retentionPct}% Mastered
          </div>
        </div>

        <div className="p-2.5 rounded-xl theme-bg-elevated theme-border border">
          <div className="text-[10px] font-mono uppercase text-amber-400 font-bold mb-0.5 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Ease Factor</span>
          </div>
          <div className="text-base font-bold theme-text-primary font-mono">
            {sm2Stats.avgEase}
          </div>
        </div>

        <div className="p-2.5 rounded-xl theme-bg-elevated theme-border border">
          <div className="text-[10px] font-mono uppercase text-purple-400 font-bold mb-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Interval</span>
          </div>
          <div className="text-base font-bold theme-text-primary font-mono">
            {sm2Stats.avgInterval} Days
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 print:hidden">
        <button
          onClick={() => { setFilterMode('all'); setCurrentIndex(0); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            filterMode === 'all'
              ? 'bg-indigo-600 text-white shadow'
              : 'theme-bg-surface theme-border border theme-text-secondary hover:theme-text-primary'
          }`}
        >
          All ({deck.length})
        </button>

        <button
          onClick={() => { setFilterMode('due'); setCurrentIndex(0); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            filterMode === 'due'
              ? 'bg-indigo-600 text-white shadow'
              : 'theme-bg-surface theme-border border theme-text-secondary hover:theme-text-primary'
          }`}
        >
          <Clock className="w-3 h-3 text-amber-400" />
          <span>Due for Review ({sm2Stats.dueCount})</span>
        </button>

        <button
          onClick={() => { setFilterMode('learning'); setCurrentIndex(0); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            filterMode === 'learning'
              ? 'bg-indigo-600 text-white shadow'
              : 'theme-bg-surface theme-border border theme-text-secondary hover:theme-text-primary'
          }`}
        >
          Still Learning ({sm2Stats.learningCount})
        </button>

        <button
          onClick={() => { setFilterMode('mastered'); setCurrentIndex(0); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            filterMode === 'mastered'
              ? 'bg-indigo-600 text-white shadow'
              : 'theme-bg-surface theme-border border theme-text-secondary hover:theme-text-primary'
          }`}
        >
          Mastered ({sm2Stats.masteredCount})
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 theme-bg-elevated rounded-full mb-6 overflow-hidden print:hidden">
        <div 
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / activeDeck.length) * 100}%` }}
        />
      </div>

      {/* 3D Flip Card Container */}
      <div className="perspective-1000 w-full min-h-[360px] sm:min-h-[400px] mb-6 cursor-pointer select-none print:hidden" onClick={handleFlip}>
        <div className={`relative w-full h-full min-h-[360px] sm:min-h-[400px] transition-transform duration-500 transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}>
          {/* Card Front */}
          <div className="absolute inset-0 backface-hidden theme-bg-surface theme-border border rounded-3xl p-8 sm:p-12 theme-shadow flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-500 tracking-wider uppercase">
                {currentCard.category || 'Term / Question'}
              </span>

              <div className="flex items-center gap-2">
                {currentCard.interval !== undefined && currentCard.interval > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Interval: {currentCard.interval}d
                  </span>
                )}
                <button
                  type="button"
                  onClick={toggleSpeak}
                  className="p-2 rounded-lg theme-bg-elevated theme-border border theme-text-muted hover:theme-text-primary transition-colors cursor-pointer"
                  title="Speak"
                >
                  {isSpeaking ? (
                    <VolumeX className="w-4 h-4 text-indigo-500 animate-pulse" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <span className="theme-text-muted">Tap to flip</span>
              </div>
            </div>

            <div className="my-auto py-6 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold theme-text-primary tracking-tight leading-snug">
                {currentCard.front}
              </h2>
            </div>

            <div className="flex items-center justify-between text-xs theme-text-muted pt-4 border-t theme-border">
              <span>Card {currentIndex + 1} of {activeDeck.length}</span>
              <span className="flex items-center gap-1.5 text-indigo-500 font-medium">
                <RotateCw className="w-3.5 h-3.5" />
                <span>Click card or Press Space to Reveal</span>
              </span>
            </div>
          </div>

          {/* Card Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 theme-bg-elevated theme-border border rounded-3xl p-8 sm:p-12 theme-shadow flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-500 tracking-wider uppercase">
                Explanation &amp; Definition
              </span>

              <div className="flex items-center gap-2">
                {currentCard.easeFactor && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Ease: {currentCard.easeFactor}
                  </span>
                )}
                <button
                  type="button"
                  onClick={toggleSpeak}
                  className="p-2 rounded-lg theme-bg-surface theme-border border theme-text-muted hover:theme-text-primary transition-colors cursor-pointer"
                  title="Speak"
                >
                  {isSpeaking ? (
                    <VolumeX className="w-4 h-4 text-indigo-500 animate-pulse" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="my-auto py-4">
              <p className="text-lg sm:text-xl theme-text-primary leading-relaxed font-normal">
                {currentCard.back}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs theme-text-secondary pt-4 border-t theme-border">
              <span className="theme-text-muted">Memory Check</span>
              <span className="text-indigo-400 font-medium">Rate how easily you remembered this (1-5)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Feedback for Next Review Date */}
      {lastRatedFeedback && (
        <div className="mb-4 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-mono text-center animate-fadeIn">
          {lastRatedFeedback}
        </div>
      )}

      {/* Recall Rating Buttons (1 to 5) */}
      <div className="mb-6 print:hidden">
        <div className="text-[11px] theme-text-muted uppercase tracking-wider font-semibold mb-2 flex items-center justify-between">
          <span>Rate Your Recall (Keys 1 - 5):</span>
          <span>Schedules your next review automatically</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {ratingOptions.map(opt => (
            <button
              key={opt.rating}
              type="button"
              onClick={() => handleGradeSM2(opt.rating)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${opt.colorClass} hover:scale-[1.02] shadow-sm`}
            >
              <div>
                <div className="flex items-center justify-between font-bold text-xs mb-1">
                  <span>{opt.label}</span>
                  <span className="font-mono text-[10px] opacity-75">#{opt.rating}</span>
                </div>
                <div className="text-[10px] opacity-80 leading-tight mb-2">
                  {opt.sublabel}
                </div>
              </div>
              <div className="mt-1 pt-1.5 border-t border-current/20 font-mono font-bold text-[11px]">
                {opt.intervalPreview}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between text-xs theme-text-secondary pt-4 border-t theme-border print:hidden">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg theme-bg-elevated theme-border border hover:theme-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onStartQuizFromDeck}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-semibold border border-indigo-500/30 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Quiz from Cards</span>
          </button>
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === activeDeck.length - 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg theme-bg-elevated theme-border border hover:theme-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <span>Next</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Print-Only Cut-Out Flashcards */}
      <div className="hidden print:block space-y-6">
        <div className="border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Printable Active Recall Deck · {deck.length} Flashcards · Cut along dotted outlines
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {deck.map((card, idx) => (
            <div key={card.id || idx} className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col justify-between min-h-[180px] break-inside-avoid">
              <div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mb-2 font-mono uppercase">
                  <span>Card #{idx + 1} · {card.category || 'Concept'}</span>
                  <span>✂ Cut line</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-100 mb-2">
                  <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Prompt:</span>
                  <p className="text-xs font-bold text-slate-900">{card.front}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Answer / Definition:</span>
                <p className="text-xs text-slate-700">{card.back}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
