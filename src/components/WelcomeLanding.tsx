import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Search,
  FileText, 
  Layers, 
  BookOpen, 
  CheckCircle2, 
  XCircle,
  Clock,
  Quote,
  HelpCircle,
  Zap
} from 'lucide-react';
import { DEFAULT_STARTER_DECKS, SampleDeck } from '../types';
import { DeckIcon } from './DeckIcon';

interface WelcomeLandingProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  onOpenTutorial?: () => void;
}

export const WelcomeLanding: React.FC<WelcomeLandingProps> = ({
  onOpenRegister,
  onOpenLogin,
  onOpenTutorial
}) => {
  const [heroSearch, setHeroSearch] = useState('');
  const [activeDemoTab, setActiveDemoTab] = useState<'quiz' | 'flashcard' | 'guide'>('quiz');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  const sampleQuestion = {
    question: 'Where does glycolysis take place within the cell?',
    options: [
      'Inner mitochondrial matrix',
      'Cytoplasm',
      'Thylakoid membrane',
      'Golgi apparatus'
    ],
    correctIndex: 1,
    explanation: 'Glycolysis is the anaerobic first stage of cellular respiration and occurs in the cytoplasm, yielding 2 pyruvate and 2 ATP.',
    citation: 'Glycolysis occurs in the cytoplasm (anaerobic), breaking glucose into 2 pyruvate molecules and 2 ATP.'
  };

  const handleSelectOption = (idx: number) => {
    setSelectedAnswer(idx);
    setHasAnswered(true);
  };

  const handleResetQuestion = () => {
    setSelectedAnswer(null);
    setHasAnswered(false);
  };

  const categories = ['All', 'Biology', 'Computer Science', 'Neuroscience', 'Economics', 'Psychology'];

  const filteredDecks = selectedFilter === 'All' 
    ? DEFAULT_STARTER_DECKS.slice(0, 8) 
    : DEFAULT_STARTER_DECKS.filter(d => d.category.toLowerCase().includes(selectedFilter.toLowerCase()));

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenRegister();
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:py-14 space-y-16 animate-fadeIn">
      {/* ================= 1. HERO SECTION ================= */}
      <div className="text-center space-y-6 max-w-3xl mx-auto pt-2">
        {/* Top Tag Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          <span>AI STUDY ENGINE &amp; ACTIVE RECALL</span>
        </div>

        {/* Big Bold Friendly Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight theme-text-primary leading-[1.15]">
          Master what matters in{' '}
          <span className="text-indigo-600 dark:text-indigo-400 inline-flex items-baseline">
            half the time
            <span className="text-indigo-500 ml-1">.</span>
          </span>
        </h1>

        {/* Minimal Subtitle */}
        <p className="text-sm sm:text-base theme-text-secondary leading-relaxed max-w-xl mx-auto">
          From lecture outlines to exam mastery with zero guesswork.
          <br className="hidden sm:inline" />
          Let Noetic guide your active recall journey.
        </p>

        {/* Prominent Rounded Floating Search Pill */}
        <form onSubmit={handleHeroSubmit} className="max-w-2xl mx-auto pt-2">
          <div className="p-2 sm:p-2.5 rounded-full theme-bg-surface theme-border border shadow-lg shadow-indigo-950/5 flex items-center gap-2 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all">
            <div className="pl-3 theme-text-muted">
              <Search className="w-5 h-5 text-indigo-500" />
            </div>
            <input
              type="text"
              value={heroSearch}
              onChange={(e) => setHeroSearch(e.target.value)}
              placeholder="What topic do you want to learn? (e.g. Cellular Respiration)..."
              className="flex-1 bg-transparent border-none outline-none text-sm theme-text-primary placeholder:theme-text-muted px-2"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer shrink-0"
            >
              Let's Learn
            </button>
          </div>
        </form>

        {/* Clean Secondary Pill & Quick Chips */}
        <div className="flex flex-col items-center gap-3 pt-1">
          <button
            onClick={onOpenRegister}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full theme-bg-surface theme-border border text-xs font-semibold theme-text-secondary hover:theme-text-primary hover:border-indigo-400/50 transition-all cursor-pointer shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Have lecture notes or slides? Create a Deck</span>
          </button>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            <button
              onClick={() => {
                setHeroSearch('Cellular Respiration');
                setActiveDemoTab('quiz');
              }}
              className="px-3 py-1 rounded-full theme-bg-surface theme-border border hover:border-indigo-400/40 theme-text-secondary transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Clock className="w-3 h-3 text-indigo-500" />
              <span>5-Min Quiz</span>
            </button>

            <button
              onClick={() => {
                setHeroSearch('Synaptic Transmission');
                setActiveDemoTab('flashcard');
              }}
              className="px-3 py-1 rounded-full theme-bg-surface theme-border border hover:border-indigo-400/40 theme-text-secondary transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Layers className="w-3 h-3 text-purple-500" />
              <span>Spaced Flashcards</span>
            </button>

            <button
              onClick={() => {
                setHeroSearch('Machine Learning Basics');
                setActiveDemoTab('guide');
              }}
              className="px-3 py-1 rounded-full theme-bg-surface theme-border border hover:border-indigo-400/40 theme-text-secondary transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span>Executive Summaries</span>
            </button>

            {onOpenTutorial && (
              <button
                onClick={onOpenTutorial}
                className="px-3 py-1 rounded-full theme-bg-surface theme-border border hover:border-indigo-400/40 theme-text-secondary transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Quick Tour</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= 2. LIVE INTERACTIVE DEMO (Hands-On Card) ================= */}
      <div className="max-w-4xl mx-auto rounded-3xl theme-bg-surface theme-border border shadow-lg p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b theme-border">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive Preview</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold theme-text-primary">
              Try a Question Right Now
            </h2>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-full theme-bg-elevated theme-border border self-start sm:self-auto">
            <button
              onClick={() => setActiveDemoTab('quiz')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeDemoTab === 'quiz'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Quiz
            </button>
            <button
              onClick={() => setActiveDemoTab('flashcard')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeDemoTab === 'flashcard'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Flashcard
            </button>
            <button
              onClick={() => setActiveDemoTab('guide')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeDemoTab === 'guide'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Summary
            </button>
          </div>
        </div>

        {/* Demo Tab 1: Quiz */}
        {activeDemoTab === 'quiz' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                <span>Biology 101 — Cellular Respiration</span>
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                EASY
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold theme-text-primary">
              {sampleQuestion.question}
            </h3>

            <div className="space-y-2">
              {sampleQuestion.options.map((opt, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrect = idx === sampleQuestion.correctIndex;
                let btnStyle = 'theme-bg-surface theme-border hover:border-indigo-400/60 theme-text-primary';

                if (hasAnswered) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-500/15 border-emerald-500/80 text-emerald-700 dark:text-emerald-300 font-semibold';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-500/15 border-rose-500/80 text-rose-600 dark:text-rose-300';
                  } else {
                    btnStyle = 'opacity-40 theme-bg-surface theme-border theme-text-muted';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => !hasAnswered && handleSelectOption(idx)}
                    disabled={hasAnswered}
                    className={`w-full text-left p-3.5 rounded-2xl border text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full theme-bg-elevated border theme-border font-bold text-xs flex items-center justify-center shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{opt}</span>
                    </div>

                    {hasAnswered && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    {hasAnswered && isSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {hasAnswered && (
              <div className="p-4 rounded-2xl theme-bg-elevated border theme-border space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${
                    selectedAnswer === sampleQuestion.correctIndex ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {selectedAnswer === sampleQuestion.correctIndex ? 'Correct! Nicely done.' : 'Incorrect. The answer is Cytoplasm.'}
                  </span>
                  <button
                    onClick={handleResetQuestion}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
                <p className="text-xs theme-text-secondary leading-relaxed">
                  {sampleQuestion.explanation}
                </p>
                <div className="pt-2 border-t theme-border flex items-start gap-2 text-[11px] theme-text-muted">
                  <Quote className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-500" />
                  <span><strong>Source Quote:</strong> "{sampleQuestion.citation}"</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Demo Tab 2: Flashcard */}
        {activeDemoTab === 'flashcard' && (
          <div className="space-y-4">
            <div
              onClick={() => setIsCardFlipped(!isCardFlipped)}
              className="min-h-[190px] p-6 rounded-2xl theme-bg-elevated theme-border border flex flex-col justify-between cursor-pointer hover:border-indigo-400/50 transition-all shadow-xs select-none"
            >
              <div className="flex items-center justify-between text-xs theme-text-muted">
                <span className="font-bold text-[10px] tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                  {isCardFlipped ? 'Answer' : 'Prompt / Concept'}
                </span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
                  {isCardFlipped ? 'Flip back' : 'Click to flip →'}
                </span>
              </div>

              <div className="my-auto py-4 text-center space-y-1.5">
                {!isCardFlipped ? (
                  <>
                    <div className="text-xs text-indigo-500 font-semibold uppercase tracking-wider">
                      Key Term
                    </div>
                    <div className="text-xl font-bold theme-text-primary">
                      ATP Synthase
                    </div>
                    <p className="text-xs theme-text-secondary">
                      What is its specific function in cellular respiration?
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm sm:text-base font-semibold theme-text-primary leading-relaxed">
                      A protein complex that synthesizes ATP from ADP using the proton gradient across the inner membrane.
                    </p>
                    <p className="text-xs theme-text-muted font-mono">
                      Yields up to 30–32 ATP per glucose molecule.
                    </p>
                  </>
                )}
              </div>

              <div className="text-[11px] text-center theme-text-muted">
                Active recall with spaced repetition scheduling
              </div>
            </div>
          </div>
        )}

        {/* Demo Tab 3: Summary Guide */}
        {activeDemoTab === 'guide' && (
          <div className="p-5 rounded-2xl theme-bg-elevated theme-border border space-y-3">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Core Takeaways
            </span>
            <ul className="text-xs theme-text-secondary space-y-2 list-disc list-inside">
              <li><strong>Glycolysis:</strong> Cytoplasm, anaerobic, breaks glucose into 2 pyruvate + 2 ATP.</li>
              <li><strong>Krebs Cycle:</strong> Mitochondria matrix, generates electron carriers NADH &amp; FADH2.</li>
              <li><strong>ATP Synthase:</strong> Drives oxidative phosphorylation, generating the primary energy yield.</li>
            </ul>
          </div>
        )}
      </div>

      {/* ================= 3. SUGGESTIONS GRID ================= */}
      <div className="space-y-6">
        <div className="text-center space-y-1.5 max-w-xl mx-auto">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2 border border-indigo-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold theme-text-primary">
            Explore Topics
          </h2>
          <p className="text-xs sm:text-sm theme-text-secondary">
            Fresh study sets ready for practice. Pick a topic and test your memory.
          </p>
        </div>

        {/* Category Filter Pills (Button tabs) */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {filteredDecks.map((deck: SampleDeck) => (
            <div
              key={deck.id}
              onClick={onOpenRegister}
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

                {/* Title */}
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

      {/* ================= 4. BOTTOM ACTION STRIP ================= */}
      <div className="p-8 rounded-3xl theme-bg-surface theme-border border shadow-md text-center space-y-4 max-w-2xl mx-auto">
        <h3 className="text-xl font-bold theme-text-primary">
          Ready to turn your own notes into quizzes?
        </h3>
        <p className="text-xs sm:text-sm theme-text-secondary max-w-md mx-auto">
          Create a free account to upload lecture notes, slides, and PDFs, and save your streak.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={onOpenRegister}
            className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
          >
            Create Free Account
          </button>
          <button
            onClick={onOpenLogin}
            className="px-5 py-2.5 rounded-full theme-bg-elevated theme-border border theme-text-primary font-semibold text-xs sm:text-sm transition-all cursor-pointer hover:theme-bg-hover"
          >
            Sign In
          </button>
        </div>
      </div>

      {/* Friendly Bottom Tagline */}
      <div className="text-center text-[11px] theme-text-muted pb-4">
        Noetic.ai · Made for curious learners.
      </div>
    </div>
  );
};
