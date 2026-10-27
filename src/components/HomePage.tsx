import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Search,
  Layers, 
  BookOpen, 
  Upload, 
  Clock, 
  Flame, 
  Target, 
  TrendingUp, 
  Zap,
  Network,
  PenTool,
  FileText,
  Headphones,
  CheckCircle2
} from 'lucide-react';
import { DEFAULT_STARTER_DECKS, SampleDeck, UserGamificationProfile, UserAccount, UiMode } from '../types';
import { getDueReviewCards } from '../utils/spacedRepetition';
import { loadHistory, loadSavedWeakCards, getAllMissedQuestions, calculateStats } from '../utils/storage';
import { DeckIcon } from './DeckIcon';

interface HomePageProps {
  onGetStarted: () => void;
  onLoadSampleDeck: (deck: SampleDeck) => void;
  onOpenAccessibility: () => void;
  onOpenProfile: () => void;
  userName?: string;
  userAccount?: UserAccount | null;
  gamificationProfile?: UserGamificationProfile;
  uiMode?: UiMode;
  onUpdateUiMode?: (mode: UiMode) => void;
  onSelectTab?: (tab: 'setup' | 'quiz' | 'flashcards' | 'guide' | 'analytics') => void;
  onOpenCollab?: () => void;
  onOpenAuth?: (tab?: 'login' | 'register' | 'verify') => void;
  onStartTargetedQuiz?: (missedConcepts: string[], missedQuestions?: any[]) => void;
  onLaunchStudyMethod?: (method: 'quiz' | 'frq' | 'brainmap' | 'flashcards' | 'exam', sampleDeck?: SampleDeck) => void;
  activeNotesTitle?: string;
  hasActiveDeck?: boolean;
  onOpenTutorial?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onGetStarted,
  onLoadSampleDeck,
  userName = 'Scholar',
  userAccount,
  gamificationProfile,
  onSelectTab,
  onStartTargetedQuiz,
  onLaunchStudyMethod,
  activeNotesTitle,
  hasActiveDeck = false,
  onOpenTutorial
}) => {
  const [history, setHistory] = useState(() => loadHistory());
  const [weakCards, setWeakCards] = useState(() => loadSavedWeakCards());
  const [missedQuestions, setMissedQuestions] = useState(() => getAllMissedQuestions());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  useEffect(() => {
    try {
      setHistory(loadHistory());
      setWeakCards(loadSavedWeakCards());
      setMissedQuestions(getAllMissedQuestions());
    } catch {}
  }, []);

  const stats = useMemo(() => calculateStats(history), [history]);
  const dueCards = useMemo(() => getDueReviewCards(weakCards), [weakCards]);

  const missedConceptsList = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of missedQuestions) {
      const c = (q.concept || 'Foundational Concept').trim();
      counts[c] = (counts[c] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [missedQuestions]);

  const streakDays = gamificationProfile?.streakDays ?? stats.streakDays ?? 0;
  const averageScore = stats.averageScorePct;
  const displayName = userAccount?.username || userName;

  const categories = ['All', 'Biology', 'Computer Science', 'Neuroscience', 'Economics', 'Psychology'];

  const filteredDecks = useMemo(() => {
    let list = DEFAULT_STARTER_DECKS;
    if (selectedFilter !== 'All') {
      list = list.filter(d => d.category.toLowerCase().includes(selectedFilter.toLowerCase()));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => d.title.toLowerCase().includes(q) || d.notes.toLowerCase().includes(q) || d.category.toLowerCase().includes(q));
    }
    return list;
  }, [selectedFilter, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredDecks.length > 0) {
      onLoadSampleDeck(filteredDecks[0]);
    } else {
      onGetStarted();
    }
  };

  const handleLaunchTargetedQuiz = () => {
    if (!onStartTargetedQuiz) return;
    if (missedConceptsList.length > 0) {
      const topConcepts = missedConceptsList.slice(0, 4).map(([name]) => name);
      onStartTargetedQuiz(topConcepts, missedQuestions.slice(0, 5));
    } else {
      onLoadSampleDeck(DEFAULT_STARTER_DECKS[0]);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-12 animate-fadeIn">
      {/* ================= 1. HERO SEARCH & GREETING ================= */}
      <div className="text-center space-y-6 max-w-3xl mx-auto pt-2">
        {/* Top Tag Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          <span>WELCOME BACK, {displayName.toUpperCase()}</span>
        </div>

        {/* Friendly Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight theme-text-primary leading-[1.15]">
          Ready to study{' '}
          <span className="text-indigo-600 dark:text-indigo-400 inline-flex items-baseline">
            smarter
            <span className="text-indigo-500 ml-1">?</span>
          </span>
        </h1>

        {/* Minimal Subtitle */}
        <p className="text-sm sm:text-base theme-text-secondary leading-relaxed max-w-xl mx-auto">
          {hasActiveDeck ? `Currently studying: "${activeNotesTitle || 'Active Deck'}".` : 'Pick a topic or upload notes to generate active recall practice tests.'}
        </p>

        {/* Prominent Rounded Floating Search Pill */}
        <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto pt-2">
          <div className="p-2 sm:p-2.5 rounded-full theme-bg-surface theme-border border shadow-lg shadow-indigo-950/5 flex items-center gap-2 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all">
            <div className="pl-3 theme-text-muted">
              <Search className="w-5 h-5 text-indigo-500" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What do you want to study? (e.g. Synaptic Transmission, Python)..."
              className="flex-1 bg-transparent border-none outline-none text-sm theme-text-primary placeholder:theme-text-muted px-2"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer shrink-0"
            >
              Let's Study
            </button>
          </div>
        </form>

        {/* Quick Action Chips Under Search */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
          <button
            onClick={onGetStarted}
            className="px-3.5 py-1.5 rounded-full theme-bg-surface theme-border border hover:border-indigo-400/50 theme-text-secondary hover:theme-text-primary transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Upload Notes</span>
          </button>

          {/* Direct Brain Map Chip */}
          <button
            onClick={() => {
              if (onLaunchStudyMethod) onLaunchStudyMethod('brainmap');
              else if (onSelectTab) onSelectTab('guide');
            }}
            className="px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400 font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:bg-indigo-500/20"
            title="Explore Interactive Concept Knowledge Graph & AI Podcast"
          >
            <Network className="w-3.5 h-3.5" />
            <span>Brain Map &amp; Guide</span>
          </button>

          {/* Direct FRQ Chip */}
          <button
            onClick={() => {
              if (onLaunchStudyMethod) onLaunchStudyMethod('frq');
              else if (onSelectTab) onSelectTab('quiz');
            }}
            className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:bg-emerald-500/20"
            title="Practice Typed Free Response Questions with AI Rubric"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>FRQ Drills</span>
          </button>

          {dueCards.length > 0 && onSelectTab && (
            <button
              onClick={() => onSelectTab('flashcards')}
              className="px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-600 dark:text-purple-400 font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{dueCards.length} Cards Due</span>
            </button>
          )}

          <button
            onClick={() => onLoadSampleDeck(DEFAULT_STARTER_DECKS[Math.floor(Math.random() * DEFAULT_STARTER_DECKS.length)])}
            className="px-3.5 py-1.5 rounded-full theme-bg-surface theme-border border hover:border-indigo-400/50 theme-text-secondary hover:theme-text-primary transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Surprise Me</span>
          </button>

          {onOpenTutorial && (
            <button
              onClick={onOpenTutorial}
              className="px-3.5 py-1.5 rounded-full theme-bg-surface theme-border border hover:border-indigo-400/50 theme-text-secondary hover:theme-text-primary transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              <span>Tour</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= 2. STUDY METHODS & ENGINES ================= */}
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold theme-text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Study Methods &amp; Engines</span>
            </h2>
            <p className="text-xs theme-text-muted">
              Choose your practice format: interactive knowledge graphs, written FRQs with rubric grading, active recall quizzes, or spaced repetition.
            </p>
          </div>
          <button
            onClick={onGetStarted}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Custom Builder</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Method 1: Brain Map & Audio Podcast Guide */}
          <div
            onClick={() => {
              if (onLaunchStudyMethod) onLaunchStudyMethod('brainmap');
              else if (onSelectTab) onSelectTab('guide');
            }}
            className="p-5 rounded-3xl theme-bg-surface theme-border border shadow-xs hover:border-indigo-400/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 transition-transform">
                  <Network className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Visual &amp; Podcast
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold theme-text-primary group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Brain Map &amp; Audio Guide
                </h3>
                <p className="text-xs theme-text-secondary mt-1 leading-relaxed">
                  Interactive concept knowledge graph with zoomable hierarchy, visual node connections, and 2-speaker AI audio podcast briefing.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t theme-border flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span>Explore Brain Map</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Method 2: Free Response (FRQ) Practice */}
          <div
            onClick={() => {
              if (onLaunchStudyMethod) onLaunchStudyMethod('frq');
              else if (onSelectTab) onSelectTab('quiz');
            }}
            className="p-5 rounded-3xl theme-bg-surface theme-border border shadow-xs hover:border-emerald-400/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <PenTool className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  AI Rubric Graded
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold theme-text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Free Response (FRQ)
                </h3>
                <p className="text-xs theme-text-secondary mt-1 leading-relaxed">
                  Deep synthesis writing drills. Type answers in your own words; AI grades against multi-point rubrics with conceptual diff feedback.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t theme-border flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Start FRQ Practice</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Method 3: Interactive Quiz (MCQ) */}
          <div
            onClick={() => {
              if (onLaunchStudyMethod) onLaunchStudyMethod('quiz');
              else if (onSelectTab) onSelectTab('quiz');
            }}
            className="p-5 rounded-3xl theme-bg-surface theme-border border shadow-xs hover:border-indigo-400/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Active Recall
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold theme-text-primary group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Interactive Quiz (MCQ)
                </h3>
                <p className="text-xs theme-text-secondary mt-1 leading-relaxed">
                  Active recall drills with immediate explanations, citation back-references, confidence ratings, and audio read-aloud.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t theme-border flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span>Launch Quiz</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Method 4: Spaced Repetition Flashcards */}
          <div
            onClick={() => {
              if (onLaunchStudyMethod) onLaunchStudyMethod('flashcards');
              else if (onSelectTab) onSelectTab('flashcards');
            }}
            className="p-5 rounded-3xl theme-bg-surface theme-border border shadow-xs hover:border-purple-400/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Leitner Queue
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold theme-text-primary group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Spaced Flashcards
                </h3>
                <p className="text-xs theme-text-secondary mt-1 leading-relaxed">
                  Dynamic spaced repetition queue with flip cards, Leitner interval buckets, and targeted weak-card review.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t theme-border flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
              <span>Review Cards</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Method 5: Timed Exam Simulation */}
          <div
            onClick={() => {
              if (onLaunchStudyMethod) onLaunchStudyMethod('exam');
              else if (onSelectTab) onSelectTab('quiz');
            }}
            className="p-5 rounded-3xl theme-bg-surface theme-border border shadow-xs hover:border-amber-400/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4 sm:col-span-2 lg:col-span-2"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Exam Simulation
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold theme-text-primary group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Timed Examination &amp; Proctor Simulation
                </h3>
                <p className="text-xs theme-text-secondary mt-1 leading-relaxed">
                  Real-time countdown timer, flag question for later review, strict test environment, and comprehensive final performance report with mastery scores.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t theme-border flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
              <span>Simulate Timed Exam</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* ================= 2. CLEAN STAT TILES (3 Pill-Soft Cards) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {/* Streak */}
        <div className="p-4 rounded-3xl theme-bg-surface theme-border border flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Flame className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono tabular-nums theme-text-primary">
              {streakDays} {streakDays === 1 ? 'Day' : 'Days'}
            </div>
            <div className="text-xs theme-text-muted">
              {streakDays > 0 ? 'Active study streak' : 'Start streak today'}
            </div>
          </div>
        </div>

        {/* Due Flashcards */}
        <div 
          onClick={() => onSelectTab && onSelectTab('flashcards')}
          className={`p-4 rounded-3xl theme-bg-surface theme-border border flex items-center gap-3.5 shadow-xs transition-all ${
            dueCards.length > 0 ? 'cursor-pointer hover:border-indigo-400/50' : ''
          }`}
        >
          <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 border border-purple-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold font-mono tabular-nums theme-text-primary">
                {dueCards.length}
              </span>
              {dueCards.length > 0 && (
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
                  Review <ArrowRight className="w-3 h-3" />
                </span>
              )}
            </div>
            <div className="text-xs theme-text-muted">
              {dueCards.length > 0 ? 'Cards ready for review' : 'All reviews caught up'}
            </div>
          </div>
        </div>

        {/* Average Score */}
        <div 
          onClick={() => onSelectTab && onSelectTab('analytics')}
          className="p-4 rounded-3xl theme-bg-surface theme-border border flex items-center gap-3.5 shadow-xs cursor-pointer hover:border-indigo-400/50 transition-all"
        >
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold font-mono tabular-nums theme-text-primary">
                {history.length > 0 ? `${averageScore}%` : '—'}
              </span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
                Progress <ArrowRight className="w-3 h-3" />
              </span>
            </div>
            <div className="text-xs theme-text-muted">
              {history.length > 0 ? `Across ${history.length} quiz${history.length === 1 ? '' : 'zes'}` : 'Take your first quiz'}
            </div>
          </div>
        </div>
      </div>

      {/* ================= 3. SUGGESTIONS GRID ================= */}
      <div className="space-y-6">
        <div className="text-center space-y-1.5 max-w-xl mx-auto">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2 border border-indigo-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold theme-text-primary">
            Suggestions
          </h2>
          <p className="text-xs sm:text-sm theme-text-secondary">
            Fresh study sets ready for practice. Pick a topic and test your memory.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedFilter === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'theme-bg-surface theme-border border theme-text-secondary hover:theme-text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 4-Column Card Grid with DeckIcon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredDecks.map((deck: SampleDeck) => (
            <div
              key={deck.id}
              onClick={() => onLoadSampleDeck(deck)}
              className="p-5 rounded-3xl theme-bg-surface theme-border border shadow-xs hover:shadow-md hover:border-indigo-400/50 transition-all flex flex-col justify-between cursor-pointer group space-y-4"
            >
              <div className="space-y-3">
                {/* Top Row: Crisp Lucide DeckIcon + Difficulty Badge */}
                <div className="flex items-center justify-between">
                  <DeckIcon icon={deck.icon} />
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    deck.defaultDifficulty === 'Easy'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : deck.defaultDifficulty === 'Hard'
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}>
                    {deck.defaultDifficulty}
                  </span>
                </div>

                {/* Title & Category */}
                <div>
                  <h3 className="text-sm font-bold theme-text-primary group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                    {deck.title}
                  </h3>
                  <div className="text-[11px] theme-text-muted uppercase tracking-wider mt-1 font-semibold">
                    {deck.category}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Stats & Keyword Tags */}
              <div className="space-y-2 pt-2 border-t theme-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="theme-text-muted text-[11px]">Questions</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 text-[11px]">
                    <Zap className="w-3 h-3 fill-current" />
                    {deck.questionCount || 8} Qs
                  </span>
                </div>

                {deck.tags && deck.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {deck.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full theme-bg-elevated theme-text-muted font-mono"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= 4. REVIEW QUEUE (If user missed concepts) ================= */}
      {missedConceptsList.length > 0 && (
        <div className="p-6 rounded-3xl theme-bg-surface theme-border border shadow-xs max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              <Target className="w-4 h-4" />
              <span>Flagged Concepts to Review</span>
            </div>
            <div className="text-sm theme-text-primary font-semibold">
              {missedConceptsList.slice(0, 3).map(([c]) => c).join(' · ')}
            </div>
          </div>

          <button
            onClick={handleLaunchTargetedQuiz}
            className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer shrink-0"
          >
            Practice Weak Spots
          </button>
        </div>
      )}
    </div>
  );
};
