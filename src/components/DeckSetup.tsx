import React, { useState, useRef } from 'react';
import { DEFAULT_STARTER_DECKS, DeckAttachment, DeckRole, QuizFormat } from '../types';
import { AttachmentPreview } from './AttachmentPreview';
import { 
  Sparkles, 
  Upload, 
  BookOpen, 
  ArrowRight,
  X, 
  Lock, 
  Zap, 
  FileCheck,
  Sprout,
  Scale,
  Brain,
  RotateCcw,
  Network,
  Layers,
  FileText,
  Clock,
  PenTool,
  CheckCircle2,
  ListFilter,
  Timer
} from 'lucide-react';

interface DeckSetupProps {
  notes: string;
  setNotes: (val: string) => void;
  title: string;
  setTitle: (val: string) => void;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Adaptive';
  setDifficulty: (val: 'Easy' | 'Medium' | 'Hard' | 'Adaptive') => void;
  questionCount: number;
  setQuestionCount: (val: number) => void;
  quizFormat?: QuizFormat;
  setQuizFormat?: (val: QuizFormat) => void;
  isTimed: boolean;
  setIsTimed: (val: boolean) => void;
  timePerQuestion: number;
  setTimePerQuestion: (val: number) => void;
  attachments: DeckAttachment[];
  setAttachments: (atts: DeckAttachment[]) => void;
  currentRole: DeckRole;
  onOpenRbac?: () => void;
  onGenerateQuiz: (mode: 'interactive' | 'exam', overrides?: { notes?: string; title?: string; difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Adaptive'; format?: QuizFormat; attachments?: DeckAttachment[]; count?: number }) => Promise<void>;
  onGenerateFlashcards: (overrides?: { notes?: string; title?: string; attachments?: DeckAttachment[]; count?: number }) => Promise<void>;
  onGenerateStudyGuide: (overrides?: { notes?: string; title?: string; attachments?: DeckAttachment[] }) => Promise<void>;
  onOpenCollab?: () => void;
  onOpenAccessibility?: () => void;
  isGenerating: boolean;
  generationStep: string;
  onOpenTutorial?: () => void;
}

export const DeckSetup: React.FC<DeckSetupProps> = ({
  notes,
  setNotes,
  title,
  setTitle,
  difficulty,
  setDifficulty,
  questionCount,
  setQuestionCount,
  quizFormat = 'mcq',
  setQuizFormat,
  isTimed,
  setIsTimed,
  timePerQuestion,
  setTimePerQuestion,
  attachments,
  setAttachments,
  currentRole,
  onGenerateQuiz,
  onGenerateFlashcards,
  onGenerateStudyGuide,
  isGenerating,
  generationStep
}) => {
  // Study Method: quiz | frq | flashcards | brainmap | exam
  const [selectedMethod, setSelectedMethod] = useState<'quiz' | 'frq' | 'flashcards' | 'brainmap' | 'exam'>('quiz');
  const [selectedVibe, setSelectedVibe] = useState<'foundations' | 'balanced' | 'sprint' | 'deep' | 'surprise'>('balanced');
  const [previewAttachmentId, setPreviewAttachmentId] = useState<string | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isViewer = currentRole === 'Viewer';
  const hasContent = notes.trim().length >= 2 || attachments.length > 0;

  const handleFilesUpload = (files: FileList | File[]) => {
    if (isViewer) return;
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    let processedCount = 0;
    const newAttachments: DeckAttachment[] = [];

    fileArray.forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

          let mimeType = file.type;
          if (!mimeType) {
            if (ext === 'pdf') mimeType = 'application/pdf';
            else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
            else mimeType = 'text/plain';
          }

          let previewType: 'pdf' | 'image' | 'doc' | 'text' = 'text';
          if (ext === 'pdf' || mimeType === 'application/pdf') previewType = 'pdf';
          else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) || mimeType.startsWith('image/')) previewType = 'image';
          else if (ext === 'docx' || mimeType.includes('word')) previewType = 'doc';

          newAttachments.push({
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            size: file.size,
            mimeType,
            base64,
            dataUrl,
            previewType
          });
        } catch (err) {
          console.warn('File read error:', err);
        } finally {
          processedCount++;
          if (processedCount === fileArray.length) {
            setAttachments([...attachments, ...newAttachments]);
            setUploadFeedback(`Attached ${newAttachments.length} file(s)`);
            if (!title && newAttachments[0]) {
              setTitle(newAttachments[0].name.replace(/\.[^/.]+$/, ''));
            }
          }
        }
      };

      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
    if (previewAttachmentId === id) setPreviewAttachmentId(null);
  };

  const handleAutoFill = () => {
    const sample = DEFAULT_STARTER_DECKS[Math.floor(Math.random() * DEFAULT_STARTER_DECKS.length)];
    setNotes(sample.notes);
    setTitle(sample.title);
    setDifficulty(sample.defaultDifficulty);
    setUploadFeedback(`Auto-filled "${sample.title}"`);
  };

  const handleStartStudy = () => {
    const defaultDeck = DEFAULT_STARTER_DECKS[0];
    const targetNotes = hasContent ? notes : defaultDeck.notes;
    const targetTitle = title || (hasContent ? 'Study Session' : defaultDeck.title);
    const targetAttachments = hasContent ? attachments : [];

    if (!hasContent) {
      setNotes(defaultDeck.notes);
      setTitle(defaultDeck.title);
    }

    // Determine target format
    let effectiveFormat: QuizFormat = quizFormat;
    if (selectedMethod === 'frq') {
      effectiveFormat = 'frq';
      if (setQuizFormat) setQuizFormat('frq');
    }

    const overrides = {
      notes: targetNotes,
      title: targetTitle,
      difficulty,
      format: effectiveFormat,
      attachments: targetAttachments,
      count: questionCount
    };

    if (selectedMethod === 'brainmap') {
      onGenerateStudyGuide({
        notes: targetNotes,
        title: targetTitle,
        attachments: targetAttachments
      });
    } else if (selectedMethod === 'flashcards') {
      onGenerateFlashcards(overrides);
    } else if (selectedMethod === 'exam') {
      onGenerateQuiz('exam', overrides);
    } else {
      onGenerateQuiz('interactive', overrides);
    }
  };

  const questionOptions = [3, 5, 10, 15, 20];

  const vibeOptions = [
    { 
      id: 'foundations', 
      title: 'Foundations', 
      subtitle: 'Gentle recall', 
      icon: Sprout, 
      iconColor: 'text-emerald-500', 
      diff: 'Easy' as const 
    },
    { 
      id: 'balanced', 
      title: 'Balanced Review', 
      subtitle: 'Standard drills', 
      icon: Scale, 
      iconColor: 'text-indigo-500', 
      diff: 'Medium' as const 
    },
    { 
      id: 'sprint', 
      title: 'Exam Sprint', 
      subtitle: 'Timed challenge', 
      icon: Zap, 
      iconColor: 'text-amber-500', 
      diff: 'Hard' as const 
    },
    { 
      id: 'deep', 
      title: 'Deep Mastery', 
      subtitle: 'Synthesis & logic', 
      icon: Brain, 
      iconColor: 'text-purple-500', 
      diff: 'Hard' as const 
    },
    { 
      id: 'surprise', 
      title: 'Surprise Mix', 
      subtitle: 'Adaptive blend', 
      icon: Sparkles, 
      iconColor: 'text-pink-500', 
      diff: 'Adaptive' as const 
    }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-10 animate-fadeIn">
      {/* ================= HEADER ================= */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs border border-indigo-500/20">
          <BookOpen className="w-6 h-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold theme-text-primary tracking-tight">
          Study Builder
        </h1>
        <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
          Select your study method: interactive quizzes, AI-graded Free Response Questions (FRQ), Brain Maps, or spaced flashcards.
        </p>
      </div>

      {/* Viewer Banner if Read-Only */}
      {isViewer && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-500">
          <Lock className="w-4 h-4 shrink-0" />
          <span>Viewer Mode: You can practice cards and quizzes, but notes are managed by the deck Owner.</span>
        </div>
      )}

      {/* ================= 1. PRIMARY STUDY METHOD SELECTOR ================= */}
      <div className="p-6 rounded-3xl theme-bg-surface theme-border border shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold theme-text-muted uppercase tracking-wider flex items-center gap-2">
            <span className="text-indigo-600 dark:text-indigo-400">●</span>
            <span>Choose Study Method</span>
          </div>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
            {selectedMethod === 'brainmap' && 'Interactive Concept Graph + Audio Podcast'}
            {selectedMethod === 'frq' && 'AI Rubric Grading + Written Analysis'}
            {selectedMethod === 'quiz' && 'Instant Retrieval + Verbatim Quotes'}
            {selectedMethod === 'flashcards' && 'SuperMemo SM-2 Spaced Repetition'}
            {selectedMethod === 'exam' && 'Full Timed Simulation'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Method 1: Interactive Quiz */}
          <button
            type="button"
            onClick={() => {
              setSelectedMethod('quiz');
              if (setQuizFormat && quizFormat === 'frq') setQuizFormat('mcq');
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedMethod === 'quiz'
                ? 'bg-indigo-600/10 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                : 'theme-bg-elevated theme-border hover:border-indigo-400/40'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold theme-text-primary">Interactive Quiz</div>
              <div className="text-[10px] theme-text-muted mt-0.5">MCQ drills &amp; citations</div>
            </div>
          </button>

          {/* Method 2: Free Response (FRQ) */}
          <button
            type="button"
            onClick={() => {
              setSelectedMethod('frq');
              if (setQuizFormat) setQuizFormat('frq');
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedMethod === 'frq'
                ? 'bg-indigo-600/10 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                : 'theme-bg-elevated theme-border hover:border-indigo-400/40'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-2">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold theme-text-primary">Free Response (FRQ)</div>
              <div className="text-[10px] theme-text-muted mt-0.5">AI rubric &amp; diff scoring</div>
            </div>
          </button>

          {/* Method 3: Brain Map & Guide */}
          <button
            type="button"
            onClick={() => setSelectedMethod('brainmap')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedMethod === 'brainmap'
                ? 'bg-indigo-600/10 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                : 'theme-bg-elevated theme-border hover:border-indigo-400/40'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold theme-text-primary">Brain Map &amp; Guide</div>
              <div className="text-[10px] theme-text-muted mt-0.5">Knowledge graph + podcast</div>
            </div>
          </button>

          {/* Method 4: Flashcards */}
          <button
            type="button"
            onClick={() => setSelectedMethod('flashcards')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedMethod === 'flashcards'
                ? 'bg-indigo-600/10 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                : 'theme-bg-elevated theme-border hover:border-indigo-400/40'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold theme-text-primary">Flashcards</div>
              <div className="text-[10px] theme-text-muted mt-0.5">Spaced repetition queue</div>
            </div>
          </button>

          {/* Method 5: Timed Exam */}
          <button
            type="button"
            onClick={() => setSelectedMethod('exam')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedMethod === 'exam'
                ? 'bg-indigo-600/10 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                : 'theme-bg-elevated theme-border hover:border-indigo-400/40'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-2">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold theme-text-primary">Timed Exam</div>
              <div className="text-[10px] theme-text-muted mt-0.5">Rigorous simulation</div>
            </div>
          </button>
        </div>
      </div>

      {/* ================= 2-COLUMN MODULAR BUILDER ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: CONFIGURATION CONTROLS (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* FRQ / Quiz Format Selector (When Quiz or Exam is selected) */}
          {(selectedMethod === 'quiz' || selectedMethod === 'exam') && setQuizFormat && (
            <div className="p-6 rounded-3xl theme-bg-surface theme-border border shadow-xs space-y-3">
              <div className="text-xs font-bold theme-text-muted uppercase tracking-wider flex items-center gap-2">
                <span className="text-indigo-600 dark:text-indigo-400">●</span>
                <span>Question Format</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'mcq' as const, label: 'Multiple Choice (MCQ)', desc: '4-choice with feedback' },
                  { id: 'frq' as const, label: 'Free Response (FRQ)', desc: 'AI rubric evaluation' },
                  { id: 'mixed' as const, label: 'Mixed Blend', desc: 'MCQ + FRQ combined' }
                ].map(fmt => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setQuizFormat(fmt.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      quizFormat === fmt.id
                        ? 'bg-indigo-600/10 border-indigo-600 ring-1 ring-indigo-500/30'
                        : 'theme-bg-elevated theme-border hover:border-indigo-400/40'
                    }`}
                  >
                    <div className={`text-xs font-bold ${quizFormat === fmt.id ? 'text-indigo-600 dark:text-indigo-400' : 'theme-text-primary'}`}>
                      {fmt.label}
                    </div>
                    <div className="text-[10px] theme-text-muted mt-0.5">{fmt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question / Card Count (When Quiz, FRQ, Flashcards, or Exam is selected) */}
          {selectedMethod !== 'brainmap' && (
            <div className="p-6 rounded-3xl theme-bg-surface theme-border border shadow-xs space-y-4">
              <div className="text-xs font-bold theme-text-muted uppercase tracking-wider flex items-center gap-2">
                <span className="text-indigo-600 dark:text-indigo-400">●</span>
                <span>
                  {selectedMethod === 'flashcards' ? 'How Many Flashcards?' : 'How Many Questions?'}
                </span>
              </div>

              {/* Circular Number Selector Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                {questionOptions.map((num) => {
                  const isSelected = questionCount === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      className={`w-12 h-12 rounded-full font-bold text-sm transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/20 scale-105'
                          : 'theme-bg-elevated theme-text-secondary hover:theme-text-primary hover:scale-102 border theme-border'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Brain Map Feature Overview (When Brain Map is selected) */}
          {selectedMethod === 'brainmap' && (
            <div className="p-6 rounded-3xl theme-bg-surface theme-border border shadow-xs space-y-4">
              <div className="text-xs font-bold theme-text-muted uppercase tracking-wider flex items-center gap-2">
                <span className="text-indigo-600 dark:text-indigo-400">●</span>
                <span>Brain Map &amp; Guide Inclusions</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl theme-bg-elevated border theme-border flex items-start gap-3">
                  <Network className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold theme-text-primary">Interactive Concept Mind Map</div>
                    <div className="theme-text-muted text-[11px] mt-0.5">Zoomable, pannable semantic graph mapping foundational topics to subtopics.</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl theme-bg-elevated border theme-border flex items-start gap-3">
                  <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold theme-text-primary">AI Audio Podcast Briefing</div>
                    <div className="theme-text-muted text-[11px] mt-0.5">2-speaker dialogue between Alex &amp; Sam breaking down key takeaways aloud.</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl theme-bg-elevated border theme-border flex items-start gap-3">
                  <FileText className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold theme-text-primary">Executive Summary &amp; PDF Export</div>
                    <div className="theme-text-muted text-[11px] mt-0.5">Concise study brief with examples, rapid-fire Q&amp;A, and one-click PDF printing.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Difficulty Vibe Cards (When Quiz, FRQ, or Exam is selected) */}
          {selectedMethod !== 'brainmap' && (
            <div className="p-6 rounded-3xl theme-bg-surface theme-border border shadow-xs space-y-4">
              <div className="text-xs font-bold theme-text-muted uppercase tracking-wider flex items-center gap-2">
                <span className="text-indigo-600 dark:text-indigo-400">●</span>
                <span>Cognitive Rigor &amp; Difficulty</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {vibeOptions.map((vibe) => {
                  const isSelected = selectedVibe === vibe.id;
                  const IconComponent = vibe.icon;
                  return (
                    <button
                      key={vibe.id}
                      type="button"
                      onClick={() => {
                        setSelectedVibe(vibe.id as any);
                        setDifficulty(vibe.diff);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[90px] ${
                        isSelected
                          ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/20'
                          : 'theme-bg-elevated theme-border hover:border-indigo-400/40'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border theme-border flex items-center justify-center shadow-2xs mb-1.5">
                        <IconComponent className={`w-3.5 h-3.5 ${vibe.iconColor}`} />
                      </div>
                      <div>
                        <div className={`text-xs font-bold leading-tight ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'theme-text-primary'}`}>
                          {vibe.title}
                        </div>
                        <div className="text-[10px] theme-text-muted mt-0.5">
                          {vibe.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Timer Toggle for Quizzes & Exams */}
              {(selectedMethod === 'quiz' || selectedMethod === 'exam') && (
                <div className="pt-3 border-t theme-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-indigo-500" />
                    <span className="font-semibold theme-text-primary">Timed Assessment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsTimed(!isTimed)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        isTimed
                          ? 'bg-indigo-600 text-white'
                          : 'theme-bg-elevated theme-border border theme-text-muted'
                      }`}
                    >
                      {isTimed ? `${timePerQuestion}s / question` : 'Untimed'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: MATERIAL INPUT & START ACTION (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 sm:p-8 rounded-3xl theme-bg-surface theme-border border shadow-xs space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold theme-text-primary">
                Input Materials
              </h2>
              <p className="text-xs theme-text-secondary max-w-sm mx-auto">
                Paste lecture notes or attach PDF/DOCX slides. Noetic generates grounded learning content with zero hallucinations.
              </p>
            </div>

            {/* Title Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold theme-text-muted uppercase tracking-wider block">
                Session Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                disabled={isViewer}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cognitive Psychology: Synaptic Plasticity"
                className="w-full theme-bg-elevated theme-border border rounded-2xl px-4 py-2.5 text-xs sm:text-sm theme-text-primary placeholder:theme-text-muted outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Notes Textarea */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold theme-text-muted uppercase tracking-wider block">
                Lecture Notes or Syllabus Outline
              </label>
              <textarea
                value={notes}
                readOnly={isViewer}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Paste lecture notes, study guide text, or summarize what you want to learn..."
                className="w-full theme-bg-elevated theme-border border rounded-2xl p-4 text-xs sm:text-sm theme-text-primary placeholder:theme-text-muted outline-none focus:border-indigo-500 font-mono text-[13px] leading-relaxed resize-y transition-colors"
              />
            </div>

            {/* Attachment Upload Button */}
            {!isViewer && (
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full theme-bg-elevated theme-border border text-xs font-semibold theme-text-secondary hover:theme-text-primary hover:border-indigo-400/50 transition-all cursor-pointer shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Attach PDF / Slides / Word</span>
                </button>

                {uploadFeedback && (
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium animate-fadeIn">
                    {uploadFeedback}
                  </span>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesUpload(e.target.files);
                    }
                    e.target.value = '';
                  }}
                />
              </div>
            )}

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div className="space-y-2 pt-2 border-t theme-border">
                <div className="text-[11px] font-bold theme-text-muted uppercase tracking-wider">
                  Attached Files ({attachments.length})
                </div>
                {attachments.map((att) => (
                  <div key={att.id} className="p-3 rounded-2xl theme-bg-elevated border theme-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-semibold theme-text-primary truncate">{att.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewAttachmentId(previewAttachmentId === att.id ? null : att.id)}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                      >
                        {previewAttachmentId === att.id ? 'Hide' : 'Preview'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="p-1 text-rose-400 hover:text-rose-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Attached preview if open */}
            {previewAttachmentId && attachments.find(a => a.id === previewAttachmentId) && (
              <AttachmentPreview attachment={attachments.find(a => a.id === previewAttachmentId)!} />
            )}

            {/* Primary Action Button */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleStartStudy}
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{generationStep || 'Synthesizing session...'}</span>
                  </>
                ) : (
                  <>
                    <span>
                      {selectedMethod === 'brainmap' && 'Generate Brain Map & Guide'}
                      {selectedMethod === 'frq' && 'Start Free Response (FRQ) Drill'}
                      {selectedMethod === 'flashcards' && 'Generate Spaced Flashcards'}
                      {selectedMethod === 'exam' && 'Begin Timed Exam Simulation'}
                      {selectedMethod === 'quiz' && (quizFormat === 'frq' ? 'Start Free Response (FRQ) Drill' : 'Start Active Recall Quiz')}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center text-[10px] theme-text-muted uppercase tracking-wider font-semibold">
                Or Quick Fill With Sample
              </div>

              {/* Auto-Fill Button */}
              <button
                type="button"
                onClick={handleAutoFill}
                className="w-full py-3 rounded-2xl theme-bg-elevated theme-border border hover:border-indigo-400/50 theme-text-secondary hover:theme-text-primary font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Auto-Fill Sample Academic Notes</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
