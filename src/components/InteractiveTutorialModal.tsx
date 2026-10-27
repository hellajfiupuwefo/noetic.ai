import React, { useState } from 'react';
import { NoeticLogo } from './NoeticLogo';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  FileText, 
  Brain, 
  Target, 
  RotateCcw, 
  Clock, 
  Users, 
  Flame, 
  Award, 
  Layers, 
  HelpCircle, 
  ExternalLink,
  BookOpen,
  Keyboard,
  ShieldCheck,
  Zap,
  Play
} from 'lucide-react';
import { DEFAULT_STARTER_DECKS, SampleDeck } from '../types';

interface InteractiveTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDeck?: (deck: SampleDeck) => void;
  onNavigateTab?: (tab: 'home' | 'setup' | 'quiz' | 'flashcards' | 'guide' | 'analytics') => void;
  onOpenCollab?: () => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
}

export const InteractiveTutorialModal: React.FC<InteractiveTutorialModalProps> = ({
  isOpen,
  onClose,
  onLoadDeck,
  onNavigateTab,
  onOpenCollab,
  onOpenAuth
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);

  // Interactive Mini-Quiz state for Step 2 demonstration
  const [demoAnswer, setDemoAnswer] = useState<number | null>(null);
  const [demoShowExplanation, setDemoShowExplanation] = useState<boolean>(false);

  // Flashcard demonstration for Step 4
  const [demoCardFlipped, setDemoCardFlipped] = useState<boolean>(false);
  const [demoRating, setDemoRating] = useState<string | null>(null);

  if (!isOpen) return null;

  const TUTORIAL_STEPS = [
    {
      id: 'overview',
      number: '01',
      title: 'Welcome to Noetic: The Connected Learning Loop',
      badge: 'Architecture Overview',
      badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      icon: Sparkles,
      iconColor: 'text-indigo-400',
      summary: 'Most study tools give you disconnected flashcards or static notes. Noetic connects your entire study workflow into an adaptive 5-step learning loop.',
      details: [
        'Upload raw lecture notes, slides, Word documents, or PDFs.',
        'AI extracts core concepts and generates grounded, active-recall assessments.',
        'Missed concepts are automatically isolated into your personal knowledge gap tracker.',
        'A smart review schedule automatically spaces out flashcards right before you forget them.',
        'Targeted follow-up quizzes specifically test your blind spots until you achieve 100% mastery.'
      ]
    },
    {
      id: 'input',
      number: '02',
      title: 'Step 1: Input Materials & Smart Ingestion',
      badge: 'Multimodal Ingestion',
      badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      icon: FileText,
      iconColor: 'text-blue-400',
      summary: 'Paste lecture outlines or drag & drop multiple PDFs, DOCX files, and diagrams directly into your Study Workspace.',
      details: [
        'Multimodal Ingestion: Upload lecture PDFs, textbook chapters, or handwritten note photos.',
        'Curated Sample Decks: Start instantly with Stanford Cognitive Neuroscience, Cellular Bioenergetics, or Linear Algebra.',
        'Flexible Generation: Generate interactive active-recall quizzes, full timed exam simulations, spaced flashcard decks, or structured synthesis guides.'
      ]
    },
    {
      id: 'quiz-demo',
      number: '03',
      title: 'Step 2: Active Recall & Verbatim Grounding',
      badge: 'Interactive Mini-Demo',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      icon: Brain,
      iconColor: 'text-emerald-400',
      summary: 'Active recall forces your brain to retrieve knowledge. Try the live interactive question below to experience instant grounded feedback:',
      details: [
        'Instant Feedback: Learn immediately why each distractor is wrong and why the correct answer is true.',
        'Grounded Source Excerpts: Every single explanation is paired with verbatim quotes from your notes.',
        'Anti-Hallucination Guardrails: Questions clearly flag whether they are directly stated or logically inferred.'
      ]
    },
    {
      id: 'gaps',
      number: '04',
      title: 'Step 3: Automated Knowledge Gap Detection',
      badge: 'Precision Analytics',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      icon: Target,
      iconColor: 'text-amber-400',
      summary: 'Instead of guessing what you don\'t know, Noetic automatically tags and catalogs every concept you miss during quizzes.',
      details: [
        'Concept Isolation: Every question is tagged with its core topic (e.g., "Long-Term Potentiation", "Complex IV Inhibition").',
        'Misconception Mapping: View weak spots sorted by failure frequency on your dashboard.',
        'One-Click Focus: Retest only the questions you got wrong without wasting time on mastered material.'
      ]
    },
    {
      id: 'spaced-repetition',
      number: '05',
      title: 'Step 4: Smart Spaced Review',
      badge: 'Memory Retention',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      icon: Clock,
      iconColor: 'text-purple-400',
      summary: 'Scientifically spaces out your reviews so facts stay fresh in your long-term memory without cramming.',
      details: [
        'Simple Mastery Ratings: Rate each card (Again, Hard, Good, Easy) to schedule its next optimal review.',
        'Daily Due Queue: The dashboard surfaces only the cards due today—preventing study fatigue.',
        'Printable Flashcards: Export study decks to double-sided foldable cut-out PDFs or CSVs for Anki.'
      ]
    },
    {
      id: 'targeted-loop',
      number: '06',
      title: 'Step 5: The Targeted Follow-Up Loop',
      badge: 'Mastery Completion',
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      icon: RotateCcw,
      iconColor: 'text-rose-400',
      summary: 'This is the crown jewel: clicking "Generate Targeted Follow-up Quiz" builds an adaptive mini-quiz focused exclusively on your missed concepts.',
      details: [
        'Closed-Loop Learning: The quiz synthesizes new questions tackling the exact misconceptions you struggled with.',
        'Resolution Rate Tracker: Track the percentage of previously missed concepts you have successfully mastered.',
        'Adaptive Difficulty: Questions dynamically adjust from Foundational to Rigorous as your accuracy improves.'
      ]
    },
    {
      id: 'collaborative',
      number: '07',
      title: 'Bonus: Collaborative Study Rooms & Gamification',
      badge: 'Real-Time Sync',
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      icon: Users,
      iconColor: 'text-cyan-400',
      summary: 'Study with classmates in real-time rooms with live peer cursors, shared decks, study streaks, and XP leaderboards.',
      details: [
        'Live Study Rooms: Join room codes like "BIO-402" to see who is online and co-review flashcards.',
        'Deck Merging: Synchronize cards created by your study group into your personal deck.',
        'Streak Protection & Badges: Maintain daily active streaks and earn academic mastery badges.'
      ]
    }
  ];

  const current = TUTORIAL_STEPS[activeStep];
  const isFirst = activeStep === 0;
  const isLast = activeStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (!isLast) setActiveStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (!isFirst) setActiveStep(prev => prev - 1);
  };

  const handleQuickLoadSample = (deck: SampleDeck) => {
    if (onLoadDeck) onLoadDeck(deck);
    if (onNavigateTab) onNavigateTab('setup');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Noetic Interactive Tutorial"
    >
      <div className="relative w-full max-w-3xl theme-bg-surface theme-border border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-6 border-b theme-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <NoeticLogo className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold theme-text-primary">
                  Interactive Platform Walkthrough
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${current.badgeColor}`}>
                  {current.badge}
                </span>
              </div>
              <p className="text-xs theme-text-secondary">
                Step {activeStep + 1} of {TUTORIAL_STEPS.length} &middot; Master the Connected Learning Loop
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl theme-bg-elevated hover:theme-bg-hover theme-text-secondary hover:theme-text-primary border theme-border transition-colors cursor-pointer"
            title="Close Tutorial (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Pills Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-900/40 border-b theme-border flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {TUTORIAL_STEPS.map((step, idx) => {
            const isCompleted = idx < activeStep;
            const isCurrent = idx === activeStep;
            const Icon = step.icon;

            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : isCompleted
                    ? 'theme-bg-elevated text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60'
                    : 'theme-bg-elevated theme-text-muted hover:theme-text-primary border theme-border'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                <span>{step.number}</span>
                <span className="hidden md:inline">{step.id === 'quiz-demo' ? 'Recall Demo' : step.id}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Step Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Main Title & Summary */}
          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-extrabold theme-text-primary flex items-center gap-2">
              <current.icon className={`w-5 h-5 ${current.iconColor}`} />
              <span>{current.title}</span>
            </h3>
            <p className="text-sm theme-text-secondary leading-relaxed">
              {current.summary}
            </p>
          </div>

          {/* INTERACTIVE DEMO 1: Step 2 Mini Active-Recall Quiz Widget */}
          {current.id === 'quiz-demo' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/30 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  Try Answering This Live Sample Question:
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  Concept: Chemiosmosis
                </span>
              </div>

              <div className="text-sm font-semibold theme-text-primary">
                Which mechanism directly couples the proton motive force to ATP synthesis in mitochondria?
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { text: 'A) Direct oxidation of NADH at Complex I', correct: false },
                  { text: 'B) Rotary catalysis driven by H+ flux through ATP Synthase (F0/F1)', correct: true },
                  { text: 'C) Substrate-level phosphorylation in the outer membrane', correct: false },
                  { text: 'D) Electron tunneling across Cytochrome c', correct: false }
                ].map((opt, i) => {
                  const isSelected = demoAnswer === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setDemoAnswer(i);
                        setDemoShowExplanation(true);
                      }}
                      className={`p-3 rounded-xl text-left text-xs font-medium border transition-all cursor-pointer ${
                        demoShowExplanation
                          ? opt.correct
                            ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-bold'
                            : isSelected
                            ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                            : 'theme-bg-surface theme-border opacity-50'
                          : isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                          : 'theme-bg-surface theme-border hover:theme-bg-hover theme-text-primary'
                      }`}
                    >
                      {opt.text}
                    </button>
                  );
                })}
              </div>

              {demoShowExplanation && (
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/60 space-y-2 text-xs animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      {demoAnswer === 1 ? 'Correct! +15 XP' : 'Insight Captured (Added to Knowledge Gaps)'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                      Grounded Citation &bull; Page 4
                    </span>
                  </div>
                  <p className="theme-text-secondary leading-relaxed">
                    <strong>Explanation:</strong> Protons flow down their electrochemical gradient through the F0 subunit, driving rotation of the central stalk and catalyzing ATP synthesis in the F1 catalytic head.
                  </p>
                  <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-[11px] theme-text-muted italic">
                    &ldquo;ATP synthase utilizes the proton motive force across the inner mitochondrial membrane via rotary motor mechanism (F0/F1)&rdquo; &mdash; Verbatim Lecture Notes
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INTERACTIVE DEMO 2: Step 4 Spaced Repetition Flip Card Widget */}
          {current.id === 'spaced-repetition' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-purple-500/5 border border-purple-500/30 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Try Flipping This Review Card:
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  Click to Flip
                </span>
              </div>

              <div 
                onClick={() => setDemoCardFlipped(!demoCardFlipped)}
                className="p-6 rounded-2xl theme-bg-elevated theme-border border-2 text-center cursor-pointer hover:border-purple-500/50 transition-all select-none min-h-[110px] flex flex-col justify-center"
              >
                {!demoCardFlipped ? (
                  <div>
                    <div className="text-[10px] uppercase font-bold text-purple-400 mb-1">Question (Front)</div>
                    <div className="text-sm font-bold theme-text-primary">
                      What is the metabolic effect of 2,4-Dinitrophenol (DNP) on cellular respiration?
                    </div>
                    <div className="text-[11px] theme-text-muted mt-2">Click to reveal answer</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1">Answer (Back)</div>
                    <div className="text-sm font-medium theme-text-primary">
                      Chemical uncoupler: dissipates the proton gradient without passing through ATP synthase, causing rapid heat generation without ATP synthesis.
                    </div>
                  </div>
                )}
              </div>

              {demoCardFlipped && (
                <div className="space-y-2 animate-fadeIn">
                  <div className="text-[11px] text-center theme-text-muted">
                    Rate how easily you remembered this to schedule your next review:
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Again', time: '< 10m', color: 'border-rose-500/40 text-rose-400' },
                      { label: 'Hard', time: '1 day', color: 'border-amber-500/40 text-amber-400' },
                      { label: 'Good', time: '3 days', color: 'border-blue-500/40 text-blue-400' },
                      { label: 'Easy', time: '7 days', color: 'border-emerald-500/40 text-emerald-400' }
                    ].map(rating => (
                      <button
                        key={rating.label}
                        type="button"
                        onClick={() => setDemoRating(rating.label)}
                        className={`p-2 rounded-xl text-center border text-xs font-semibold cursor-pointer transition-all ${
                          demoRating === rating.label
                            ? 'bg-purple-600 text-white border-purple-500'
                            : `theme-bg-surface hover:theme-bg-hover ${rating.color}`
                        }`}
                      >
                        <div>{rating.label}</div>
                        <div className="text-[10px] opacity-75 font-mono">{rating.time}</div>
                      </button>
                    ))}
                  </div>
                  {demoRating && (
                    <div className="text-center text-xs text-emerald-400 font-semibold pt-1">
                      Scheduled for next review based on {demoRating} response!
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Curated Sample Decks for Step 1 */}
          {current.id === 'input' && (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                1-Click Loadable Curriculum Decks:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {DEFAULT_STARTER_DECKS.map((deck: SampleDeck) => (
                  <button
                    key={deck.id}
                    type="button"
                    onClick={() => handleQuickLoadSample(deck)}
                    className="p-3 rounded-xl theme-bg-elevated theme-border border text-left hover:border-indigo-500/50 hover:scale-[1.01] transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-bold theme-text-primary group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {deck.title}
                    </div>
                    <div className="text-[11px] theme-text-muted mt-1">
                      {deck.defaultDifficulty} &bull; {deck.category}
                    </div>
                    <div className="mt-2 text-[10px] font-semibold text-indigo-400 flex items-center gap-1">
                      <span>Load into Deck</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bulleted Feature Details List */}
          <div className="p-4 rounded-2xl theme-bg-elevated theme-border border space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider theme-text-muted">
              Key Mechanism &amp; Best Practices:
            </div>
            <ul className="space-y-2">
              {current.details.map((detail, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs theme-text-primary leading-relaxed">
                  <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    &bull;
                  </div>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Navigation & Action Controls */}
        <div className="p-4 sm:p-6 border-t theme-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/30">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl theme-bg-elevated theme-border border hover:theme-bg-hover disabled:opacity-40 disabled:cursor-not-allowed theme-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              disabled={isLast}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {current.id === 'collaborative' && onOpenCollab && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCollab();
                }}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Open Study Groups</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (DEFAULT_STARTER_DECKS.length > 0 && onLoadDeck) {
                  onLoadDeck(DEFAULT_STARTER_DECKS[0]);
                }
                if (onNavigateTab) onNavigateTab('setup');
                onClose();
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Practicing with Sample Deck</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
