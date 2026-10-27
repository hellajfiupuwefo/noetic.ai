import React, { useEffect, useRef } from 'react';
import { QuizQuestion } from '../types';
import { triggerConfetti } from '../utils/confetti';
import { 
  Award, 
  RotateCcw, 
  BookOpen, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Target, 
  Layers, 
  ChevronRight, 
  Sparkles,
  Zap,
  TrendingUp,
  Flame
} from 'lucide-react';

interface ResultsViewProps {
  score: number;
  total: number;
  durationSeconds: number;
  missedQuestions: QuizQuestion[];
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Adaptive';
  adaptiveStats?: {
    startTier: string;
    peakTier: string;
    maxStreak: number;
    tierBreakdown: { recall: number; analytical: number; synthesis: number };
  };
  onRetryQuiz: () => void;
  onReviewMissed: () => void;
  onSwitchToFlashcards: () => void;
  onNewDeck: () => void;
  onStartTargetedQuiz?: (missed: QuizQuestion[]) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  score,
  total,
  durationSeconds,
  missedQuestions,
  title,
  difficulty,
  adaptiveStats,
  onRetryQuiz,
  onReviewMissed,
  onSwitchToFlashcards,
  onNewDeck,
  onStartTargetedQuiz
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const paceSecondsPerQ = total > 0 ? Math.round(durationSeconds / total) : 0;

  useEffect(() => {
    if (percentage >= 70 && canvasRef.current) {
      const timer = setTimeout(() => {
        triggerConfetti(canvasRef.current, 140);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [percentage]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const getFeedbackMessage = () => {
    if (percentage >= 90) return { title: 'Great Job!', desc: 'You have a solid grasp of these concepts.' };
    if (percentage >= 75) return { title: 'Good Work!', desc: 'Review the few missed questions to lock in what you learned.' };
    if (percentage >= 50) return { title: 'Nice Effort!', desc: 'A quick review of your notes or flashcards will help boost your score.' };
    return { title: 'Keep Practicing', desc: 'Try studying the flashcards or summary before taking another quiz.' };
  };

  const feedback = getFeedbackMessage();

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 py-8">
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-50 w-full h-full"
      />

      {/* Main Scorecard Banner */}
      <div className="theme-bg-surface theme-border border rounded-3xl p-8 sm:p-10 theme-shadow text-center mb-8 relative overflow-hidden transition-colors">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2">
          <span>{title}</span>
          <span aria-hidden="true">·</span>
          <span>{difficulty}</span>
          {difficulty === 'Adaptive' && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/30">
              <Zap className="w-3 h-3 fill-amber-500" />
              Adaptive
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold theme-text-primary mb-2">
          {feedback.title}
        </h1>
        <p className="text-sm theme-text-secondary max-w-md mx-auto mb-8">
          {feedback.desc}
        </p>

        {/* Large Score Metric */}
        <div className="flex items-baseline justify-center gap-2 mb-8">
          <span className={`text-6xl sm:text-7xl font-bold font-mono tabular-nums tracking-tight ${
            percentage >= 80 ? 'text-emerald-500' : percentage >= 60 ? 'text-amber-500' : 'text-rose-500'
          }`}>
            {percentage}%
          </span>
          <span className="text-xl theme-text-muted font-medium">accuracy</span>
        </div>

        {/* 4 Quantitative Rigor Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8 text-left">
          <div className="p-4 rounded-xl theme-bg-elevated theme-border border">
            <span className="text-xs theme-text-muted block mb-1">Total Score</span>
            <div className="text-lg font-bold theme-text-primary font-mono tabular-nums">
              {score} / {total}
            </div>
            <span className="text-[11px] theme-text-muted">Correct answers</span>
          </div>

          <div className="p-4 rounded-xl theme-bg-elevated theme-border border">
            <span className="text-xs theme-text-muted block mb-1">Duration</span>
            <div className="text-lg font-bold theme-text-primary font-mono tabular-nums">
              {formatDuration(durationSeconds)}
            </div>
            <span className="text-[11px] theme-text-muted">Total elapsed</span>
          </div>

          <div className="p-4 rounded-xl theme-bg-elevated theme-border border">
            <span className="text-xs theme-text-muted block mb-1">Average Pace</span>
            <div className="text-lg font-bold theme-text-primary font-mono tabular-nums">
              {paceSecondsPerQ}s
            </div>
            <span className="text-[11px] theme-text-muted">Per question</span>
          </div>

          <div className="p-4 rounded-xl theme-bg-elevated theme-border border">
            <span className="text-xs theme-text-muted block mb-1">To Review</span>
            <div className={`text-lg font-bold font-mono tabular-nums ${missedQuestions.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {missedQuestions.length}
            </div>
            <span className="text-[11px] theme-text-muted">Missed items</span>
          </div>
        </div>

        {/* Adaptive Cognitive Velocity Summary if Adaptive Mode */}
        {difficulty === 'Adaptive' && adaptiveStats && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 max-w-2xl mx-auto mb-8 text-left">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-amber-500 uppercase tracking-wider">
              <Zap className="w-4 h-4 fill-amber-500" />
              <span>Adaptive Difficulty Profile</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs mb-3">
              <div className="p-2.5 rounded-lg theme-bg-surface">
                <span className="text-[11px] theme-text-muted block">Peak Difficulty</span>
                <span className="font-bold theme-text-primary capitalize">{adaptiveStats.peakTier || 'Level 2'}</span>
              </div>
              <div className="p-2.5 rounded-lg theme-bg-surface">
                <span className="font-bold text-amber-500 inline-flex items-center gap-1">
                  <span>{adaptiveStats.maxStreak || 0}</span>
                  <Flame className="w-3.5 h-3.5 fill-current" />
                </span>
              </div>
              <div className="p-2.5 rounded-lg theme-bg-surface">
                <span className="text-[11px] theme-text-muted block">Mastery Classification</span>
                <span className="font-bold text-emerald-500">
                  {percentage >= 80 ? 'Superior Mastery' : percentage >= 60 ? 'Proficient' : 'Developing'}
                </span>
              </div>
            </div>

            <p className="text-[11px] theme-text-secondary leading-relaxed">
              Noetic continuously adjusted cognitive depth based on your active recall accuracy, escalating towards deep analytical synthesis questions upon consecutive streaks.
            </p>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {missedQuestions.length > 0 && onStartTargetedQuiz && (
            <button
              onClick={() => onStartTargetedQuiz(missedQuestions)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Generate Targeted Follow-up Quiz ({missedQuestions.length} weak concepts)</span>
            </button>
          )}

          {missedQuestions.length > 0 && (
            <button
              onClick={onReviewMissed}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-colors shadow-sm cursor-pointer"
            >
              <Target className="w-4 h-4" />
              <span>Drill Missed ({missedQuestions.length})</span>
            </button>
          )}

          <button
            onClick={onRetryQuiz}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm theme-bg-elevated hover:theme-bg-hover theme-text-primary theme-border border transition-colors shadow-sm cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Complete Quiz</span>
          </button>

          <button
            onClick={onSwitchToFlashcards}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm theme-bg-elevated hover:theme-bg-hover theme-text-primary theme-border border transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>Study Flashcards</span>
          </button>

          <button
            onClick={onNewDeck}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm theme-text-muted hover:theme-text-primary transition-colors cursor-pointer"
          >
            <span>New Deck</span>
          </button>
        </div>
      </div>

      {/* Missed Questions Pedagogical Review Section */}
      {missedQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold theme-text-primary">
              Diagnostic Breakdown of Missed Questions
            </h2>
            <span className="text-xs theme-text-muted">
              {missedQuestions.length} item{missedQuestions.length > 1 ? 's' : ''} to reinforce
            </span>
          </div>

          <div className="space-y-3">
            {missedQuestions.map((q, idx) => (
              <div key={idx} className="p-5 rounded-2xl theme-bg-surface theme-border border text-xs shadow-sm">
                <div className="flex items-center gap-2 text-rose-500 font-semibold mb-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>Question {idx + 1}: {q.concept || 'Concept Review'}</span>
                  {q.tier && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Tier: {q.tier}
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold theme-text-primary mb-3">
                  {q.question}
                </p>

                <div className="p-3 rounded-xl theme-bg-elevated theme-border border theme-text-secondary mb-3 space-y-1">
                  <div className="text-emerald-500 font-medium">
                    Correct Answer: {q.options[q.answer]}
                  </div>
                </div>

                <div className="text-xs theme-text-muted leading-relaxed border-t theme-border pt-2.5">
                  <strong className="theme-text-secondary">Pedagogical Explanation:</strong> {q.explanation}
                </div>

                {q.sourceExcerpt && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300">
                    <strong className="text-indigo-400 block mb-0.5">Source Note Excerpt:</strong>
                    <span className="italic opacity-90">&ldquo;{q.sourceExcerpt}&rdquo;</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
