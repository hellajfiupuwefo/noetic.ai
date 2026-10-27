import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion } from '../types';
import { 
  Clock, 
  Bookmark, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Send,
  X,
  FileCheck,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface ExamViewProps {
  quiz: QuizQuestion[];
  title: string;
  difficulty: string;
  onSubmitExam: (results: {
    score: number;
    total: number;
    durationSeconds: number;
    missedQuestions: QuizQuestion[];
    userSelections: Array<number | null>;
  }) => void;
  onQuit: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export const ExamView: React.FC<ExamViewProps> = ({
  quiz,
  title,
  difficulty,
  onSubmitExam,
  onQuit,
  isFocusMode = false,
  onToggleFocusMode
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Array<number | null>>(new Array(quiz.length).fill(null));
  const [frqAnswers, setFrqAnswers] = useState<Record<number, string>>({});
  const [flaggedIndices, setFlaggedIndices] = useState<Set<number>>(new Set());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentQ = quiz[currentIndex];

  const handleSelectOption = (idx: number) => {
    setSelectedAnswers(prev => {
      const copy = [...prev];
      copy[currentIndex] = idx;
      return copy;
    });
  };

  const toggleFlag = () => {
    setFlaggedIndices(prev => {
      const next = new Set(prev);
      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }
      return next;
    });
  };

  const answeredCount = selectedAnswers.filter(a => a !== null).length;
  const unansweredCount = quiz.length - answeredCount;

  const handleFinalSubmit = () => {
    let score = 0;
    const missed: QuizQuestion[] = [];

    quiz.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answer) {
        score++;
      } else {
        missed.push(q);
      }
    });

    onSubmitExam({
      score,
      total: quiz.length,
      durationSeconds: elapsedSeconds,
      missedQuestions: missed,
      userSelections: selectedAnswers
    });
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* Top Exam Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl theme-bg-surface theme-border border shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-500 uppercase tracking-wider">
            <FileCheck className="w-3.5 h-3.5" />
            <span>Practice Examination · {difficulty}</span>
          </div>
          <h2 className="text-base font-bold theme-text-primary mt-0.5">{title}</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs theme-text-secondary font-mono tabular-nums">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Elapsed: {formatTime(elapsedSeconds)}</span>
          </div>

          <div className="text-xs theme-text-secondary">
            Progress: <span className="font-bold text-indigo-500 tabular-nums">{answeredCount}</span> / {quiz.length}
          </div>

          {onToggleFocusMode && (
            <button
              onClick={onToggleFocusMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                isFocusMode
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'theme-bg-elevated theme-border theme-text-secondary hover:theme-text-primary'
              }`}
              title={isFocusMode ? "Exit Zen Mode (Esc)" : "Enter Zen Mode"}
            >
              {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFocusMode ? 'Exit Zen' : 'Zen Mode'}</span>
            </button>
          )}

          <button
            onClick={() => setShowSubmitModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Exam</span>
          </button>

          <button
            onClick={onQuit}
            className="p-1.5 rounded-lg theme-text-muted hover:text-rose-500 hover:theme-bg-hover transition-colors"
            title="Quit Exam"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Question Panel */}
        <div className="lg:col-span-3">
          <div className="theme-bg-surface theme-border border rounded-2xl p-6 sm:p-8 theme-shadow mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold theme-text-muted uppercase tracking-wider">
                Question {currentIndex + 1} of {quiz.length}
              </span>

              <button
                onClick={toggleFlag}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                  flaggedIndices.has(currentIndex)
                    ? 'bg-amber-500/15 border-amber-500 text-amber-500'
                    : 'theme-bg-elevated theme-border theme-text-muted hover:theme-text-primary'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{flaggedIndices.has(currentIndex) ? 'Flagged for Review' : 'Flag Question'}</span>
              </button>
            </div>

            <h3 className="text-lg sm:text-xl font-bold theme-text-primary mb-6 leading-relaxed">
              {currentQ.question}
            </h3>

            {currentQ.type === 'frq' || (!Array.isArray(currentQ.options) || currentQ.options.length < 2) ? (
              <div className="space-y-3">
                <div className="text-xs theme-text-muted flex items-center justify-between">
                  <span>Free Response Answer (Type or dictate):</span>
                  <span className="font-mono">
                    {((frqAnswers[currentIndex] || '').trim().split(/\s+/).filter(Boolean).length)} words
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={frqAnswers[currentIndex] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFrqAnswers(prev => ({ ...prev, [currentIndex]: val }));
                    setSelectedAnswers(prev => {
                      const copy = [...prev];
                      copy[currentIndex] = val.trim().length > 0 ? 0 : null;
                      return copy;
                    });
                  }}
                  placeholder="Provide your comprehensive academic response here..."
                  className="w-full p-4 rounded-xl text-sm theme-bg-elevated theme-border border theme-text-primary placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-y"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[currentIndex] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 focus:outline-none ${
                        isSelected
                          ? 'bg-indigo-500/10 border-indigo-500 theme-text-primary font-medium shadow-sm'
                          : 'theme-bg-elevated theme-border theme-text-secondary hover:border-indigo-400'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center shrink-0 font-medium ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'theme-bg-surface theme-text-muted'
                      }`}>
                        {optionLetters[optIdx]}
                      </span>
                      <span className="text-sm leading-relaxed flex-1">
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nav Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                currentIndex === 0
                  ? 'opacity-30 cursor-not-allowed theme-border theme-text-muted'
                  : 'theme-bg-elevated theme-border theme-text-primary hover:theme-bg-hover'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {currentIndex + 1 < quiz.length ? (
              <button
                onClick={() => setCurrentIndex(i => i + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                <span>Review &amp; Submit</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Question Grid Navigator */}
        <div className="theme-bg-surface theme-border border rounded-2xl p-5 theme-shadow h-fit">
          <div className="flex items-center justify-between mb-3 text-xs font-semibold theme-text-muted uppercase tracking-wider">
            <span>Question Navigator</span>
            <span className="text-[11px] font-normal">{answeredCount}/{quiz.length} Answered</span>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-6">
            {quiz.map((_, idx) => {
              const isAnswered = selectedAnswers[idx] !== null;
              const isCurrent = idx === currentIndex;
              const isFlagged = flaggedIndices.has(idx);

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 rounded-lg text-xs font-semibold transition-all relative flex items-center justify-center tabular-nums border ${
                    isCurrent
                      ? 'border-indigo-500 ring-2 ring-indigo-500/40 theme-text-primary bg-indigo-500/10'
                      : isAnswered
                      ? 'theme-bg-elevated theme-border theme-text-primary'
                      : 'theme-bg-input theme-border theme-text-muted hover:border-indigo-400'
                  }`}
                >
                  <span>{idx + 1}</span>
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-slate-900" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-2 text-xs border-t theme-border pt-4 theme-text-muted">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded theme-bg-elevated theme-border border" />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded theme-bg-input theme-border border" />
              <span>Unanswered ({unansweredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-400" />
              <span>Flagged for Review ({flaggedIndices.size})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="theme-bg-surface theme-border border rounded-2xl p-6 max-w-md w-full theme-shadow">
            <h3 className="text-lg font-bold theme-text-primary mb-2">Ready to Submit Examination?</h3>
            <p className="text-sm theme-text-secondary mb-4">
              You have answered <span className="font-semibold theme-text-primary">{answeredCount}</span> out of <span className="font-semibold theme-text-primary">{quiz.length}</span> questions.
              {unansweredCount > 0 && (
                <span className="text-amber-500 block mt-2">
                  Warning: You have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold theme-bg-elevated theme-border border theme-text-primary hover:theme-bg-hover transition-colors"
              >
                Continue Reviewing
              </button>
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  handleFinalSubmit();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                Confirm &amp; Grade Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
