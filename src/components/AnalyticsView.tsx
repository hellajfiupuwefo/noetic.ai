import React, { useState } from 'react';
import { QuizSessionRecord, QuizQuestion, Flashcard, UserGamificationProfile } from '../types';
import { calculateStats } from '../utils/storage';
import { calculateLevel } from '../utils/gamification';
import { 
  BarChart3, 
  Flame, 
  Clock, 
  Target, 
  Award, 
  RotateCcw, 
  Layers, 
  BookOpen, 
  Trash2, 
  Search, 
  Download,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Zap,
  Trophy,
  Sparkles
} from 'lucide-react';

interface AnalyticsViewProps {
  history: QuizSessionRecord[];
  weakCards: Flashcard[];
  allMissedQuestions: QuizQuestion[];
  onReviewMissedQuestions: (questions: QuizQuestion[], sessionTitle: string) => void;
  onReviewWeakCards: (cards: Flashcard[]) => void;
  onClearHistory: () => void;
  onBackToSetup: () => void;
  gamificationProfile?: UserGamificationProfile;
  onOpenLeaderboard?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  history,
  weakCards,
  allMissedQuestions,
  onReviewMissedQuestions,
  onReviewWeakCards,
  onClearHistory,
  onBackToSetup,
  gamificationProfile,
  onOpenLeaderboard
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const stats = calculateStats(history);

  const filteredHistory = history.filter(h => 
    h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.difficulty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ history, weakCards }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `noetic_study_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Study Progress</span>
          </div>
          <h1 className="text-3xl font-bold theme-text-primary">Progress &amp; History</h1>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={handleExportData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg theme-bg-surface theme-border border text-xs font-medium theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Data</span>
            </button>
          )}

          <button
            onClick={onBackToSetup}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            + Create New Deck
          </button>
        </div>
      </div>

      {/* Gamification, XP, Streaks & Achievements Banner */}
      {gamificationProfile && (
        <div className="mb-8 p-6 rounded-2xl theme-bg-surface theme-border border shadow-md relative overflow-hidden transition-colors">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Level {gamificationProfile.level}: {calculateLevel(gamificationProfile.xp).name}
                </span>
                <span className="text-xs text-amber-500 flex items-center gap-1 font-bold">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  {gamificationProfile.streakDays}-Day Streak
                </span>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold theme-text-primary font-mono tracking-tight">
                  {gamificationProfile.xp.toLocaleString()} <span className="text-sm font-semibold text-amber-400">XP</span>
                </span>
                <span className="text-xs theme-text-muted">
                  ({gamificationProfile.xpToNextLevel} XP to next rank)
                </span>
              </div>

              {/* Progress bar to next level */}
              <div className="w-full max-w-md h-2 rounded-full theme-bg-elevated overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${calculateLevel(gamificationProfile.xp).progressPct}%` }}
                />
              </div>

              {/* Daily Goal snippet */}
              {gamificationProfile.dailyGoal && (
                <div className="text-xs theme-text-secondary pt-1 flex items-center gap-2">
                  <span className="font-semibold theme-text-primary">Daily Goal:</span>
                  <span>{gamificationProfile.dailyGoal.title}</span>
                  <span className="font-mono text-indigo-400 font-bold">
                    ({gamificationProfile.dailyGoal.currentCount}/{gamificationProfile.dailyGoal.targetCount})
                  </span>
                  {gamificationProfile.dailyGoal.completed && (
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                      Completed (+{gamificationProfile.dailyGoal.xpReward} XP)
                    </span>
                  )}
                </div>
              )}
            </div>

            {onOpenLeaderboard && (
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-900/30 transition-all cursor-pointer hover:scale-[1.02] shrink-0"
              >
                <Trophy className="w-4 h-4 text-amber-300" />
                <span>Campus Leaderboard &amp; Badges</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top 4 Quantitative Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-2xl theme-bg-surface theme-border border theme-shadow">
          <div className="flex items-center justify-between text-xs theme-text-muted mb-2">
            <span>Overall Accuracy</span>
            <Target className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums theme-text-primary">
            {stats.averageScorePct}%
          </div>
          <span className="text-[11px] theme-text-muted">
            {stats.totalCorrect} of {stats.totalQuestions} questions correct
          </span>
        </div>

        <div className="p-5 rounded-2xl theme-bg-surface theme-border border theme-shadow">
          <div className="flex items-center justify-between text-xs theme-text-muted mb-2">
            <span>Sessions Completed</span>
            <BookOpen className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums theme-text-primary">
            {stats.totalQuizzes}
          </div>
          <span className="text-[11px] theme-text-muted">
            Quizzes &amp; examinations taken
          </span>
        </div>

        <div className="p-5 rounded-2xl theme-bg-surface theme-border border theme-shadow">
          <div className="flex items-center justify-between text-xs theme-text-muted mb-2">
            <span>Active Study Time</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums theme-text-primary">
            {formatDuration(stats.totalStudySeconds)}
          </div>
          <span className="text-[11px] theme-text-muted">
            Total active review time
          </span>
        </div>

        <div className="p-5 rounded-2xl theme-bg-surface theme-border border theme-shadow">
          <div className="flex items-center justify-between text-xs theme-text-muted mb-2">
            <span>Study Streak</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums theme-text-primary">
            {stats.streakDays} Day{stats.streakDays === 1 ? '' : 's'}
          </div>
          <span className="text-[11px] theme-text-muted">
            Consecutive days active
          </span>
        </div>
      </div>

      {/* Target Reinforcement Banks (Weak Questions & Weak Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Missed Questions Bank */}
        <div className="p-5 rounded-2xl theme-bg-surface theme-border border theme-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold theme-text-primary flex items-center gap-2">
                <Target className="w-4 h-4 text-rose-500" />
                <span>Missed Questions Bank</span>
              </h2>
              <span className="text-xs font-mono font-semibold text-rose-500">
                {allMissedQuestions.length} saved
              </span>
            </div>
            <p className="text-xs theme-text-muted mb-4">
              Questions you have missed in any quiz are saved here for targeted active-recall drilling until mastered.
            </p>
          </div>

          <button
            onClick={() => onReviewMissedQuestions(allMissedQuestions, 'Comprehensive Missed Review')}
            disabled={allMissedQuestions.length === 0}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              allMissedQuestions.length === 0
                ? 'opacity-40 cursor-not-allowed theme-bg-elevated theme-text-muted theme-border border'
                : 'bg-rose-500/10 border border-rose-500/40 text-rose-500 hover:bg-rose-500/20'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Drill All Missed Questions ({allMissedQuestions.length})</span>
          </button>
        </div>

        {/* Saved Weak Flashcards */}
        <div className="p-5 rounded-2xl theme-bg-surface theme-border border theme-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold theme-text-primary flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Weak Flashcards Deck</span>
              </h2>
              <span className="text-xs font-mono font-semibold text-indigo-500">
                {weakCards.length} saved
              </span>
            </div>
            <p className="text-xs theme-text-muted mb-4">
              Cards marked "Still Learning" in any flashcard session are queued here for spaced repetition.
            </p>
          </div>

          <button
            onClick={() => onReviewWeakCards(weakCards)}
            disabled={weakCards.length === 0}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              weakCards.length === 0
                ? 'opacity-40 cursor-not-allowed theme-bg-elevated theme-text-muted theme-border border'
                : 'bg-indigo-500/10 border border-indigo-500/40 text-indigo-500 hover:bg-indigo-500/20'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Practice Weak Flashcards ({weakCards.length})</span>
          </button>
        </div>
      </div>

      {/* Recent Performance Trend Bar Chart */}
      {history.length > 0 && (
        <div className="p-6 rounded-2xl theme-bg-surface theme-border border theme-shadow mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold theme-text-muted uppercase tracking-wider">
              Recent Session Trajectory (Last 10)
            </h2>
            <span className="text-xs theme-text-muted">Score percentage per session</span>
          </div>

          <div className="h-40 flex items-end gap-2 sm:gap-4 pt-6 pb-2 border-b theme-border">
            {history.slice(0, 10).reverse().map((h, idx) => {
              const heightPct = Math.max(8, h.percentage);
              const color = h.percentage >= 80 ? 'bg-emerald-500' : h.percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500';

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-1 rounded theme-bg-elevated theme-border border text-[10px] theme-text-primary whitespace-nowrap z-20 pointer-events-none shadow-md">
                    {h.title} · {h.percentage}% ({h.score}/{h.total})
                  </div>

                  <span className="text-[10px] font-mono theme-text-muted tabular-nums">
                    {h.percentage}%
                  </span>

                  <div 
                    className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 ${color}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History Log Section */}
      <div className="theme-bg-surface theme-border border rounded-2xl p-6 theme-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xs font-semibold theme-text-muted uppercase tracking-wider">
            Session History Log ({filteredHistory.length})
          </h2>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 theme-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search history..."
                className="theme-bg-input theme-border border rounded-xl pl-8 pr-3 py-1.5 text-xs theme-text-primary placeholder:theme-text-muted focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {history.length > 0 && (
              confirmClear ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      onClearHistory();
                      setConfirmClear(false);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-600 text-white"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-1 text-xs theme-text-muted"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="p-1.5 rounded-lg theme-text-muted hover:text-rose-500 hover:theme-bg-hover transition-colors"
                  title="Clear all session history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )
            )}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="py-12 text-center theme-text-muted text-xs">
            {history.length === 0 
              ? 'No study sessions recorded yet. Launch a quiz to build your history.'
              : 'No sessions match your search query.'}
          </div>
        ) : (
          <div className="divide-y theme-border">
            {filteredHistory.map((item) => (
              <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold theme-text-primary text-sm">
                      {item.title}
                    </span>
                    <span aria-hidden="true" className="theme-text-muted">·</span>
                    <span className="theme-text-secondary">{item.difficulty}</span>
                    <span aria-hidden="true" className="theme-text-muted">·</span>
                    <span className="theme-text-muted">{item.date}</span>
                  </div>

                  <div className="flex items-center gap-3 theme-text-secondary">
                    <span className={`font-mono font-semibold tabular-nums ${
                      item.percentage >= 80 ? 'text-emerald-500' : item.percentage >= 60 ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                      {item.score}/{item.total} ({item.percentage}%)
                    </span>
                    <span aria-hidden="true" className="theme-text-muted">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 theme-text-muted" />
                      <span>{formatDuration(item.durationSeconds)}</span>
                    </span>
                    {item.timed && (
                      <>
                        <span aria-hidden="true" className="theme-text-muted">·</span>
                        <span className="text-amber-500">Timed Challenge</span>
                      </>
                    )}
                  </div>
                </div>

                {item.missedQuestions && item.missedQuestions.length > 0 && (
                  <button
                    onClick={() => onReviewMissedQuestions(item.missedQuestions, `${item.title} (Review)`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 hover:bg-rose-500/20 transition-colors self-start sm:self-center font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Review Missed ({item.missedQuestions.length})</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
