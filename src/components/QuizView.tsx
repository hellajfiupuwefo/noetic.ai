import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QuizQuestion, FrqGradeResult } from '../types';
import { triggerConfetti } from '../utils/confetti';
import { speakText, stopSpeaking } from '../utils/tts';
import { getMathVideoSuggestions, isMathContent } from '../utils/mathVideos';
import { soundFx, createSpeechRecognizer, isSpeechRecognitionSupported, matchSpokenOption, SpeechRecognitionController } from '../utils/voiceQuiz';
import { 
  Clock, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  X, 
  HelpCircle, 
  Bookmark, 
  Sparkles, 
  Flame, 
  ExternalLink, 
  Video, 
  Zap, 
  Lightbulb, 
  Mic, 
  MicOff, 
  Radio, 
  Send, 
  Check, 
  Award, 
  FileText,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Bot,
  MessageSquare,
  Columns,
  SendHorizontal,
  Flag,
  AlertTriangle,
  Target
} from 'lucide-react';

interface QuizViewProps {
  quiz: QuizQuestion[];
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Adaptive';
  isTimed: boolean;
  timePerQuestion: number;
  onFinishQuiz: (results: {
    score: number;
    total: number;
    durationSeconds: number;
    missedQuestions: QuizQuestion[];
    adaptiveStats?: {
      startTier: string;
      peakTier: string;
      maxStreak: number;
      tierBreakdown: { recall: number; analytical: number; synthesis: number };
    };
  }) => void;
  onQuit: () => void;
  onEarnXP?: (amount: number, reason: string, updates?: any) => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  quiz,
  title,
  difficulty,
  isTimed,
  timePerQuestion,
  onFinishQuiz,
  onQuit,
  onEarnXP,
  isFocusMode = false,
  onToggleFocusMode
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timePerQuestion);
  const [score, setScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [missedQuestions, setMissedQuestions] = useState<QuizQuestion[]>([]);
  const [answersLog, setAnswersLog] = useState<Array<boolean | null>>(new Array(quiz.length).fill(null));
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [flaggedIndices, setFlaggedIndices] = useState<Set<number>>(new Set());
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState<string>('Factually incorrect explanation');
  const [flagNotes, setFlagNotes] = useState<string>('');
  const [flagToast, setFlagToast] = useState<string | null>(null);

  // Hands-Free Voice Quiz Mode State
  const [isVoiceMode, setIsVoiceMode] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [spokenTranscript, setSpokenTranscript] = useState<string>('');
  const [voiceStatusText, setVoiceStatusText] = useState<string>('');
  const speechRecognizerRef = useRef<SpeechRecognitionController | null>(null);

  // FRQ State
  const [frqAnswer, setFrqAnswer] = useState<string>('');
  const [isGradingFrq, setIsGradingFrq] = useState<boolean>(false);
  const [frqResult, setFrqResult] = useState<FrqGradeResult | null>(null);
  const [showExemplar, setShowExemplar] = useState<boolean>(false);
  const [frqReportTab, setFrqReportTab] = useState<'diff' | 'rubric'>('diff');

  // Conversational Socratic AI Drawer State
  const [isSocraticDrawerOpen, setIsSocraticDrawerOpen] = useState<boolean>(false);
  const [socraticMessages, setSocraticMessages] = useState<Array<{ role: 'tutor' | 'student'; text: string; hintLevel?: number }>>([]);
  const [isSocraticLoading, setIsSocraticLoading] = useState<boolean>(false);
  const [socraticInput, setSocraticInput] = useState<string>('');
  const [socraticHintLevel, setSocraticHintLevel] = useState<number>(1);
  const socraticMessagesEndRef = useRef<HTMLDivElement>(null);

  // Adaptive Difficulty State
  const isAdaptive = difficulty === 'Adaptive';
  const [adaptiveTier, setAdaptiveTier] = useState<'recall' | 'analytical' | 'synthesis'>('recall');
  const [peakTier, setPeakTier] = useState<'recall' | 'analytical' | 'synthesis'>('recall');
  const [adaptiveNotification, setAdaptiveNotification] = useState<string | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [tierCounts, setTierCounts] = useState<{ recall: number; analytical: number; synthesis: number }>({
    recall: 0,
    analytical: 0,
    synthesis: 0
  });

  const startTimeRef = useRef<number>(Date.now());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<any>(null);
  const autoAdvanceTimeoutRef = useRef<any>(null);

  const currentQ = quiz[currentIndex];
  const isFrq = currentQ?.type === 'frq' || (!Array.isArray(currentQ?.options) || currentQ?.options.length < 2);
  const isCurrentQMath = currentQ ? isMathContent(`${currentQ.question} ${currentQ.concept || ''} ${currentQ.explanation}`, title) : false;
  const mathVideoForQ = isCurrentQMath && currentQ ? getMathVideoSuggestions(currentQ.explanation, title, currentQ.question)[0] : null;

  const optionLetters = ['A', 'B', 'C', 'D'];

  // Clean up on question change
  useEffect(() => {
    stopSpeaking();
    setIsSpeaking(false);
    setShowHint(false);
    setSpokenTranscript('');
    setFrqAnswer('');
    setFrqResult(null);
    setShowExemplar(false);
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
  }, [currentIndex]);

  // Auto-scroll Socratic messages
  useEffect(() => {
    socraticMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [socraticMessages, isSocraticDrawerOpen]);

  // Reset Socratic tutor on question change
  useEffect(() => {
    if (currentQ) {
      setSocraticHintLevel(1);
      setSocraticMessages([
        {
          role: 'tutor',
          text: `Hello! I'm your Socratic academic guide for "${currentQ.concept || 'this topic'}". I will ask guiding questions so you discover the answer naturally. What aspect are you thinking through?`,
          hintLevel: 1
        }
      ]);
    }
  }, [currentIndex, currentQ?.concept]);

  const handleSendSocraticMessage = async (customQuery?: string) => {
    const query = customQuery || socraticInput;
    if (!query.trim() || isSocraticLoading) return;

    const userMsg = { role: 'student' as const, text: query };
    setSocraticMessages(prev => [...prev, userMsg]);
    setSocraticInput('');
    setIsSocraticLoading(true);

    try {
      const res = await fetch('/api/socratic-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ,
          studentAnswer: isFrq ? frqAnswer : selectedOption !== null ? currentQ.options[selectedOption] : undefined,
          currentHintLevel: socraticHintLevel,
          userQuery: query,
          conversationHistory: socraticMessages
        })
      });
      const data = await res.json();
      if (data.reply) {
        setSocraticMessages(prev => [...prev, { role: 'tutor', text: data.reply, hintLevel: socraticHintLevel }]);
        if (data.nextHintLevel) setSocraticHintLevel(data.nextHintLevel);
      }
    } catch {
      setSocraticMessages(prev => [
        ...prev, 
        { role: 'tutor', text: `Consider this: what is the foundational rule governing "${currentQ?.concept || 'this concept'}"?` }
      ]);
    } finally {
      setIsSocraticLoading(false);
    }
  };

  // Clean up recognizer on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      speechRecognizerRef.current?.abort();
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    };
  }, []);

  // Timer loop
  useEffect(() => {
    if (!isTimed || isAnswered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setTimeLeft(timePerQuestion);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isTimed, isAnswered, timePerQuestion]);

  const handleTimeUp = useCallback(() => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(-1);
    setAnswersLog(prev => {
      const copy = [...prev];
      copy[currentIndex] = false;
      return copy;
    });
    setMissedQuestions(prev => [...prev, currentQ]);
    setCurrentStreak(0);
    soundFx.playIncorrectChime();

    if (isAdaptive) {
      handleAdaptiveMiss();
    }
  }, [isAnswered, currentIndex, currentQ, isAdaptive]);

  const handleAdaptiveMiss = () => {
    if (adaptiveTier === 'synthesis') {
      setAdaptiveTier('analytical');
      showAdaptiveToast('Adjusting difficulty to Level 2 (Medium)');
    } else if (adaptiveTier === 'analytical') {
      setAdaptiveTier('recall');
      showAdaptiveToast('Adjusting difficulty to Level 1 (Fundamentals)');
    }
  };

  const showAdaptiveToast = (msg: string) => {
    setAdaptiveNotification(msg);
    setTimeout(() => {
      setAdaptiveNotification(null);
    }, 3200);
  };

  // Multiple Choice Selection Handler
  const handleSelectOption = useCallback((optionIdx: number) => {
    if (isAnswered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    speechRecognizerRef.current?.stop();
    setIsListening(false);

    setSelectedOption(optionIdx);
    setIsAnswered(true);

    const isCorrect = optionIdx === currentQ.answer;

    if (isCorrect) {
      soundFx.playCorrectChime();
      setScore(s => s + 1);

      // Award XP for correct answer
      const xpAmount = isAdaptive && adaptiveTier === 'synthesis' ? 25 : difficulty === 'Hard' ? 20 : 15;
      onEarnXP?.(xpAmount, 'Correct Active Recall Answer', { questions: 1 });

      setCurrentStreak(strk => {
        const next = strk + 1;
        setMaxStreak(m => Math.max(m, next));

        if (isAdaptive) {
          if (next >= 2 && adaptiveTier === 'recall') {
            setAdaptiveTier('analytical');
            setPeakTier(p => p === 'synthesis' ? 'synthesis' : 'analytical');
            showAdaptiveToast('Streak bonus: Moving up to Level 2');
          } else if (next >= 4 && adaptiveTier === 'analytical') {
            setAdaptiveTier('synthesis');
            setPeakTier('synthesis');
            showAdaptiveToast('Great job! Moving up to Level 3');
          }
        }

        return next;
      });

      setAnswersLog(prev => {
        const copy = [...prev];
        copy[currentIndex] = true;
        return copy;
      });

      if (isAdaptive) {
        setTierCounts(prev => ({
          ...prev,
          [adaptiveTier]: prev[adaptiveTier] + 1
        }));
      }

      if (canvasRef.current) {
        triggerConfetti(canvasRef.current, 60);
      }

      // Voice mode tutor confirmation & auto-advance
      if (isVoiceMode) {
        speakText(`Correct! ${currentQ.explanation.slice(0, 140)}`, () => {
          autoAdvanceTimeoutRef.current = setTimeout(() => {
            handleNext();
          }, 2000);
        });
      }
    } else {
      soundFx.playIncorrectChime();
      setCurrentStreak(0);
      setAnswersLog(prev => {
        const copy = [...prev];
        copy[currentIndex] = false;
        return copy;
      });
      setMissedQuestions(prev => [...prev, currentQ]);

      if (isAdaptive) {
        handleAdaptiveMiss();
      }

      // Voice mode feedback
      if (isVoiceMode) {
        const correctLetter = optionLetters[currentQ.answer] || 'the correct option';
        speakText(`Incorrect. The answer was option ${correctLetter}. ${currentQ.explanation.slice(0, 140)}`, () => {
          autoAdvanceTimeoutRef.current = setTimeout(() => {
            handleNext();
          }, 2500);
        });
      }
    }
  }, [isAnswered, currentQ, currentIndex, isAdaptive, adaptiveTier, difficulty, isVoiceMode, onEarnXP]);

  // Submit FRQ for AI Grading
  const handleSubmitFrq = async () => {
    if (!frqAnswer.trim() || isGradingFrq) return;
    setIsGradingFrq(true);
    stopSpeaking();
    speechRecognizerRef.current?.stop();
    setIsListening(false);

    try {
      const res = await fetch('/api/grade-frq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          studentAnswer: frqAnswer,
          rubricCriteria: currentQ.rubricCriteria || [],
          sampleSolution: currentQ.sampleSolution || currentQ.explanation,
          keywords: currentQ.keywords || [],
          maxScore: currentQ.maxScore || 5
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to grade FRQ response.');
      }

      const result: FrqGradeResult = data.result;
      setFrqResult(result);
      setIsAnswered(true);

      const isPass = result.percentage >= 60;
      if (isPass) {
        soundFx.playCorrectChime();
        setScore(s => s + 1);
        if (canvasRef.current && result.percentage >= 80) {
          triggerConfetti(canvasRef.current, 75);
        }
      } else {
        soundFx.playIncorrectChime();
        setMissedQuestions(prev => [...prev, currentQ]);
      }

      setAnswersLog(prev => {
        const copy = [...prev];
        copy[currentIndex] = isPass;
        return copy;
      });

      // Award XP based on FRQ score
      const xpEarned = Math.round(15 + (result.score / result.maxScore) * 15);
      onEarnXP?.(xpEarned, `FRQ Graded (${result.score}/${result.maxScore} pts)`, {
        questions: 1,
        frqScore: result.percentage
      });

      // Voice mode tutor response
      if (isVoiceMode) {
        speakText(`You scored ${result.score} out of ${result.maxScore}. ${result.feedback.slice(0, 140)}`, () => {
          autoAdvanceTimeoutRef.current = setTimeout(() => {
            handleNext();
          }, 3500);
        });
      }
    } catch (err: any) {
      console.error('FRQ grading failed:', err);
    } finally {
      setIsGradingFrq(false);
    }
  };

  const handleNext = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    speechRecognizerRef.current?.stop();
    setIsListening(false);

    if (currentIndex + 1 < quiz.length) {
      setCurrentIndex(i => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      const totalDuration = Math.round((Date.now() - startTimeRef.current) / 1000);
      onFinishQuiz({
        score,
        total: quiz.length,
        durationSeconds: totalDuration,
        missedQuestions,
        adaptiveStats: isAdaptive ? {
          startTier: 'recall',
          peakTier,
          maxStreak,
          tierBreakdown: tierCounts
        } : undefined
      });
    }
  }, [currentIndex, quiz.length, score, missedQuestions, onFinishQuiz, isAdaptive, peakTier, maxStreak, tierCounts]);

  // Voice Mode Auto-Prompting & Speech Recognition Loop
  useEffect(() => {
    if (!isVoiceMode || isAnswered || !currentQ) return;

    // 1. Speak the question prompt
    setVoiceStatusText('Tutor reading prompt...');
    let textToSpeak = `Question ${currentIndex + 1}: ${currentQ.question}`;
    if (!isFrq && currentQ.options && currentQ.options.length === 4) {
      textToSpeak += `. Option A: ${currentQ.options[0]}. Option B: ${currentQ.options[1]}. Option C: ${currentQ.options[2]}. Option D: ${currentQ.options[3]}`;
    } else if (isFrq) {
      textToSpeak += '. Speak your response aloud when prompted.';
    }

    speakText(textToSpeak, () => {
      // 2. Finished speaking: start speech recognition listener
      if (!isAnswered) {
        soundFx.playMicListeningBeep();
        setVoiceStatusText('Listening for your spoken response...');
        setIsListening(true);

        const recognizer = createSpeechRecognizer({
          onTranscript: (transcript: string, isFinal: boolean) => {
            setSpokenTranscript(transcript);

            if (isFrq) {
              setFrqAnswer(transcript);
            } else {
              // Try matching option
              const matched = matchSpokenOption(transcript, currentQ.options);
              if (matched !== null) {
                setVoiceStatusText(`Recognized: Option ${optionLetters[matched]}`);
                recognizer?.stop();
                setIsListening(false);
                handleSelectOption(matched);
              }
            }
          },
          onError: (err: string) => {
            setVoiceStatusText(`Mic notice: ${err}`);
          },
          onEnd: () => {
            setIsListening(false);
          }
        });

        speechRecognizerRef.current = recognizer;
        recognizer?.start();
      }
    });

    return () => {
      speechRecognizerRef.current?.stop();
    };
  }, [isVoiceMode, currentIndex, isAnswered, currentQ, isFrq, handleSelectOption]);

  const toggleVoiceMode = () => {
    if (isVoiceMode) {
      setIsVoiceMode(false);
      speechRecognizerRef.current?.stop();
      stopSpeaking();
      setIsListening(false);
      setVoiceStatusText('');
    } else {
      if (!isSpeechRecognitionSupported()) {
        alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
        return;
      }
      setIsVoiceMode(true);
      onEarnXP?.(10, 'Activated Hands-Free Voice Mode', { voiceAnswers: 1 });
    }
  };

  const handleOpenFlagModal = () => {
    setIsFlagModalOpen(true);
  };

  const handleFlagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQ) return;
    const finalReason = flagNotes.trim() ? `${flagReason}: ${flagNotes.trim()}` : flagReason;
    currentQ.userFlagged = true;
    currentQ.flagReason = finalReason;
    setFlaggedIndices(prev => new Set(prev).add(currentIndex));
    setIsFlagModalOpen(false);
    setFlagToast(`Question flagged for review: ${flagReason}`);
    setTimeout(() => setFlagToast(null), 3500);

    try {
      const savedFlags = JSON.parse(localStorage.getItem('noetic_flagged_questions') || '[]');
      savedFlags.push({
        questionId: (currentQ as any).id || `q-${currentIndex}`,
        question: currentQ.question,
        reason: finalReason,
        concept: currentQ.concept,
        flaggedAt: Date.now()
      });
      localStorage.setItem('noetic_flagged_questions', JSON.stringify(savedFlags.slice(-50)));
    } catch {}
  };

  const toggleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentQ) return;

    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      const text = `${currentQ.question}. ${isAnswered ? currentQ.explanation : ''}`;
      speakText(text, () => setIsSpeaking(false));
    }
  };

  const getTierLabel = () => {
    if (adaptiveTier === 'synthesis') {
      return { label: 'Level 3 (Advanced)', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
    }
    if (adaptiveTier === 'analytical') {
      return { label: 'Level 2 (Medium)', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' };
    }
    return { label: 'Level 1 (Core)', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto px-4 py-8">
      {/* Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-50 w-full h-full"
      />

      {/* Adaptive Toast Notification */}
      {adaptiveNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white px-4 py-2.5 rounded-full border border-indigo-500/40 shadow-xl flex items-center gap-2 text-xs font-semibold animate-scaleIn">
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
          <span>{adaptiveNotification}</span>
        </div>
      )}

      {/* Voice Mode Banner Strip */}
      {isVoiceMode && (
        <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-slate-900 border border-indigo-500/40 shadow-lg flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-indigo-500/20 text-indigo-400'
            }`}>
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Voice Mode</span>
                {isListening && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Listening
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 font-mono">
                {spokenTranscript ? `"${spokenTranscript}"` : voiceStatusText || 'Listen to the prompt and speak your answer'}
              </p>
            </div>
          </div>

          <button
            onClick={toggleVoiceMode}
            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs border border-slate-700 transition-colors cursor-pointer"
          >
            Turn Off Voice
          </button>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold theme-text-muted uppercase tracking-wider block">
              {title}
            </span>
            {isAdaptive ? (
              <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getTierLabel().color}`}>
                <Zap className="w-3 h-3 fill-current" />
                <span>{getTierLabel().label}</span>
              </span>
            ) : (
              <span className="text-xs font-mono font-medium theme-text-muted">· {difficulty}</span>
            )}
            {isFrq && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                FRQ Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs theme-text-secondary">
            <span>Question {currentIndex + 1} of {quiz.length}</span>
            <span aria-hidden="true">·</span>
            <span>{currentQ?.concept || 'General Review'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Socratic AI Tutor Side Drawer Button */}
          <button
            onClick={() => setIsSocraticDrawerOpen(!isSocraticDrawerOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer shadow-sm ${
              isSocraticDrawerOpen
                ? 'bg-purple-600 text-white border-purple-600'
                : 'theme-bg-surface theme-border text-purple-400 hover:border-purple-500'
            }`}
            title="Get hints & explanations"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hints &amp; Tutor</span>
          </button>

          {/* Zen Focus Mode Toggle Button */}
          {onToggleFocusMode && (
            <button
              onClick={onToggleFocusMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer shadow-sm ${
                isFocusMode
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'theme-bg-surface theme-border theme-text-secondary hover:theme-text-primary'
              }`}
              title={isFocusMode ? "Exit Focus Mode (Esc)" : "Enter Focus Mode"}
            >
              {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFocusMode ? 'Exit Focus' : 'Focus Mode'}</span>
            </button>
          )}

          {/* Voice Mode Toggle Button */}
          <button
            onClick={toggleVoiceMode}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm ${
              isVoiceMode
                ? 'bg-rose-500 text-white border-rose-500 ring-2 ring-rose-500/30'
                : 'theme-bg-surface theme-border theme-text-primary hover:border-indigo-500'
            }`}
            title="Toggle Hands-Free Voice Mode (Active Recall)"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isVoiceMode ? 'Voice Active' : 'Voice'}</span>
          </button>

          {/* Streak indicator */}
          {currentStreak > 1 && (
            <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{currentStreak} Streak</span>
            </div>
          )}

          {/* Timer Display */}
          {isTimed && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono font-semibold tabular-nums transition-colors ${
              timeLeft <= 5 
                ? 'bg-rose-500/20 border-rose-500 text-rose-500 animate-pulse'
                : timeLeft <= 10 
                ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                : 'theme-bg-elevated theme-border theme-text-primary'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{timeLeft}s</span>
            </div>
          )}

          {/* Current Score */}
          <div className="text-xs font-medium theme-text-primary theme-bg-elevated px-3 py-1 rounded-lg theme-border border">
            Score: <span className="font-bold text-emerald-500 tabular-nums">{score}</span> / {currentIndex + (isAnswered ? 1 : 0)}
          </div>

          <button
            onClick={onQuit}
            className="p-1.5 rounded-lg theme-text-muted hover:text-rose-500 hover:theme-bg-hover transition-colors cursor-pointer"
            title="Quit Quiz"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question Progress Dots Bar */}
      <div className="mb-6 flex items-center gap-1.5 overflow-x-auto pb-1">
        {quiz.map((_, idx) => {
          const status = answersLog[idx];
          const isCurrent = idx === currentIndex;
          const isFlagged = flaggedIndices.has(idx);

          return (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all flex-1 min-w-[12px] relative ${
                status === true
                  ? 'bg-emerald-500'
                  : status === false
                  ? 'bg-rose-500'
                  : isCurrent
                  ? 'bg-indigo-500 ring-2 ring-indigo-500/40'
                  : 'theme-bg-elevated'
              }`}
            >
              {isFlagged && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </div>
          );
        })}
      </div>

      {/* Main Question Card */}
      <div className="theme-bg-surface theme-border border rounded-2xl p-6 sm:p-8 theme-shadow mb-6 transition-colors">
        {/* Card Top: Concept & Audio Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-500 font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{currentQ.concept || 'Concept Analysis'}</span>
            {currentQ.targetedFollowUp && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold flex items-center gap-1">
                <Target className="w-3 h-3 text-blue-400" />
                <span>Targeted Follow-up</span>
              </span>
            )}
            {currentQ.tier && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {currentQ.tier}
              </span>
            )}
            {isFrq && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                5 Pts Max
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isAnswered && !isFrq && (
              <button
                onClick={() => setShowHint(!showHint)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  showHint ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'theme-bg-elevated theme-border theme-text-secondary hover:theme-text-primary'
                }`}
                title="Toggle concept scaffolding hint"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Hint</span>
              </button>
            )}

            <button
              onClick={toggleSpeak}
              className="p-1.5 rounded-lg theme-bg-elevated theme-border border theme-text-muted hover:theme-text-primary transition-colors cursor-pointer"
              title={isSpeaking ? 'Stop reading' : 'Read aloud'}
            >
              {isSpeaking ? (
                <VolumeX className="w-4 h-4 text-indigo-500 animate-pulse" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={handleOpenFlagModal}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-colors cursor-pointer ${
                flaggedIndices.has(currentIndex) || currentQ.userFlagged
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-semibold'
                  : 'theme-bg-elevated theme-border theme-text-muted hover:theme-text-primary'
              }`}
              title="Flag question or report inaccuracy"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">
                {currentQ.userFlagged ? 'Flagged' : 'Flag'}
              </span>
            </button>
          </div>
        </div>

        {flagToast && (
          <div className="mb-4 p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs text-center font-medium animate-fadeIn">
            {flagToast}
          </div>
        )}

        {currentQ.userFlagged && (
          <div className="mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Flagged: <strong>{currentQ.flagReason}</strong></span>
            </span>
            <span className="text-[10px] text-amber-400/80 font-mono">Flagged</span>
          </div>
        )}

        {/* Question Text */}
        <h2 className="text-xl sm:text-2xl font-bold theme-text-primary tracking-tight leading-snug mb-4">
          {currentQ.question}
        </h2>

        {/* Scaffold Hint Box */}
        {showHint && !isAnswered && (
          <div className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 animate-fadeIn flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Scaffold Hint:</span>
              <span>Focus on the defining characteristics of {currentQ.concept || 'the core subject'}. Eliminate choices that describe secondary mechanisms or inverted causal directions.</span>
            </div>
          </div>
        )}

        {/* ---------------- FRQ MODE INPUT ---------------- */}
        {isFrq ? (
          <div className="space-y-4 mb-6">
            {/* Rubric Criteria Preview */}
            {currentQ.rubricCriteria && currentQ.rubricCriteria.length > 0 && (
              <div className="p-3.5 rounded-xl theme-bg-elevated theme-border border text-xs">
                <div className="font-bold text-indigo-400 uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1.5">
                  <Award className="w-3 h-3" />
                  <span>Grading Rubric Criteria</span>
                </div>
                <div className="space-y-1">
                  {currentQ.rubricCriteria.map((c, cIdx) => (
                    <div key={cIdx} className="text-xs theme-text-secondary flex items-start gap-2">
                      <span className="text-indigo-500 font-mono font-bold">•</span>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Answer Textarea */}
            <div>
              <div className="flex items-center justify-between text-xs theme-text-muted mb-1.5">
                <span>Write your response (full academic sentences):</span>
                <span className="font-mono">
                  {frqAnswer.trim().split(/\s+/).filter(Boolean).length} words · {frqAnswer.length} chars
                </span>
              </div>
              <div className="relative">
                <textarea
                  rows={5}
                  disabled={isAnswered || isGradingFrq}
                  value={frqAnswer}
                  onChange={(e) => setFrqAnswer(e.target.value)}
                  placeholder="Explain the mechanism, causal relationships, and key principles here, or click the mic button to speak your answer..."
                  className="w-full p-4 rounded-xl text-sm theme-bg-elevated theme-border border theme-text-primary placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-y"
                />

                {/* Voice Dictation Button in Textarea */}
                {!isAnswered && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) {
                        speechRecognizerRef.current?.stop();
                        setIsListening(false);
                      } else {
                        if (!isSpeechRecognitionSupported()) return;
                        setIsListening(true);
                        const rec = createSpeechRecognizer({
                          onTranscript: (txt) => setFrqAnswer(txt),
                          onEnd: () => setIsListening(false)
                        });
                        speechRecognizerRef.current = rec;
                        rec?.start();
                      }
                    }}
                    className={`absolute bottom-3 right-3 p-2 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                      isListening
                        ? 'bg-rose-500 text-white border-rose-500 animate-pulse'
                        : 'theme-bg-surface theme-border theme-text-muted hover:theme-text-primary'
                    }`}
                    title="Dictate response with speech-to-text"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{isListening ? 'Listening...' : 'Dictate'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Submit FRQ Button */}
            {!isAnswered && (
              <button
                type="button"
                disabled={!frqAnswer.trim() || isGradingFrq}
                onClick={handleSubmitFrq}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isGradingFrq ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>AI Professor Grading Response Against Rubric...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Answer for Instant AI Grading</span>
                  </>
                )}
              </button>
            )}

            {/* AI Grading Report Card */}
            {frqResult && (
              <div className="p-5 rounded-2xl theme-bg-elevated theme-border border space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b theme-border">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                      frqResult.percentage >= 80
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : frqResult.percentage >= 60
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {frqResult.score}/{frqResult.maxScore}
                    </div>
                    <div>
                      <div className="text-xs font-bold theme-text-primary">
                        AI Rubric Grade: {frqResult.percentage}%
                      </div>
                      <span className="text-[10px] theme-text-muted">
                        Evaluated by Noetic AI Academic Tutor
                      </span>
                    </div>
                  </div>

                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    frqResult.percentage >= 80 ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-200'
                  }`}>
                    {frqResult.percentage >= 80 ? 'High Mastery' : frqResult.percentage >= 60 ? 'Competent' : 'Developing'}
                  </span>
                </div>

                <p className="text-xs theme-text-secondary leading-relaxed">
                  {frqResult.feedback}
                </p>

                {/* View Mode Segmented Controls */}
                <div className="flex items-center gap-1 p-1 rounded-xl theme-bg-surface border theme-border">
                  <button
                    type="button"
                    onClick={() => setFrqReportTab('diff')}
                    className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      frqReportTab === 'diff'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'theme-text-secondary hover:theme-text-primary'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Concept Diff View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrqReportTab('rubric')}
                    className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      frqReportTab === 'rubric'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'theme-text-secondary hover:theme-text-primary'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Rubric Breakdown</span>
                  </button>
                </div>

                {/* TAB 1: CONCEPT DIFF VIEW */}
                {frqReportTab === 'diff' && (
                  <div className="space-y-3 pt-1">
                    {/* Student Submission with Key Concepts Highlighted */}
                    <div className="p-3.5 rounded-xl theme-bg-surface theme-border border text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] theme-text-muted font-bold uppercase tracking-wider">
                        <span>Your Articulated Response:</span>
                        <span className="text-emerald-400 font-mono">
                          {frqResult.diffHighlights?.matchedSegments?.length ?? 0} Concepts Detected
                        </span>
                      </div>
                      <div className="p-3 rounded-lg theme-bg-elevated theme-border border text-xs leading-relaxed theme-text-primary">
                        {frqAnswer}
                      </div>

                      {frqResult.diffHighlights?.matchedSegments && frqResult.diffHighlights.matchedSegments.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] theme-text-muted">Matched Key Terms:</span>
                          {frqResult.diffHighlights.matchedSegments.map((term, tIdx) => (
                            <span 
                              key={tIdx} 
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            >
                              ✓ {term}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Concept Comparison Matrix */}
                    {frqResult.diffHighlights?.conceptComparisons && frqResult.diffHighlights.conceptComparisons.length > 0 && (
                      <div className="p-3.5 rounded-xl theme-bg-surface theme-border border space-y-2.5">
                        <div className="text-[11px] theme-text-muted font-bold uppercase tracking-wider">
                          Key Concept Comparison Matrix
                        </div>
                        <div className="space-y-2">
                          {frqResult.diffHighlights.conceptComparisons.map((c, cIdx) => (
                            <div key={cIdx} className="p-2.5 rounded-lg theme-bg-elevated theme-border border text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold theme-text-primary">{c.concept}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  c.status === 'covered'
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : c.status === 'partial'
                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                }`}>
                                  {c.status === 'covered' ? '✓ Covered' : c.status === 'partial' ? '⚠️ Partial' : '✗ Missed'}
                                </span>
                              </div>
                              <p className="text-[11px] theme-text-secondary">{c.studentCoverage}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Socratic Reflection Prompt */}
                    {(frqResult.diffHighlights?.socraticHint || frqResult.socraticPrompt) && (
                      <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-start gap-2.5">
                          <Bot className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-purple-300 block">Socratic Reflection:</span>
                            <span className="theme-text-secondary text-[11px]">
                              {frqResult.diffHighlights?.socraticHint || frqResult.socraticPrompt}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSocraticDrawerOpen(true);
                            if (frqResult.diffHighlights?.socraticHint) {
                              handleSendSocraticMessage(`Help me understand: ${frqResult.diffHighlights.socraticHint}`);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px] shrink-0 transition-colors cursor-pointer"
                        >
                          Ask Socratic Tutor &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: RUBRIC BREAKDOWN */}
                {frqReportTab === 'rubric' && frqResult.rubricScores && frqResult.rubricScores.length > 0 && (
                  <div className="space-y-2 pt-2 border-t theme-border">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                      Rubric Breakdown:
                    </div>
                    {frqResult.rubricScores.map((r, rIdx) => (
                      <div key={rIdx} className="p-2.5 rounded-lg theme-bg-surface theme-border border text-xs flex items-start gap-2.5">
                        {r.awarded ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <span className={`font-semibold ${r.awarded ? 'text-emerald-400' : 'theme-text-primary'}`}>
                            {r.criterion}
                          </span>
                          <p className="text-[11px] theme-text-muted mt-0.5">{r.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Model Exemplar Solution Toggle */}
                <div className="pt-2 border-t theme-border">
                  <button
                    type="button"
                    onClick={() => setShowExemplar(p => !p)}
                    className="w-full flex items-center justify-between text-xs font-semibold theme-text-primary hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    <span>View Model Exemplar Solution</span>
                    {showExemplar ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showExemplar && (
                    <div className="mt-2.5 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs theme-text-secondary leading-relaxed animate-fadeIn">
                      <div className="font-bold text-indigo-400 text-[10px] uppercase mb-1">
                        Full-Credit Exemplar:
                      </div>
                      <p>{currentQ.sampleSolution || currentQ.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ---------------- MCQ MODE OPTIONS ---------------- */
          <div className="space-y-3 mb-6">
            {currentQ.options.map((optionText, optIdx) => {
              const isSelected = selectedOption === optIdx;
              const isCorrect = optIdx === currentQ.answer;

              let optionStyle = 'theme-bg-elevated theme-border hover:border-indigo-500/60 theme-text-primary cursor-pointer';

              if (isAnswered) {
                if (isCorrect) {
                  optionStyle = 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-semibold';
                } else if (isSelected) {
                  optionStyle = 'bg-rose-500/15 border-rose-500 text-rose-400';
                } else {
                  optionStyle = 'opacity-40 theme-border';
                }
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`w-full p-4 rounded-xl border text-left text-sm transition-all flex items-start gap-3.5 relative group ${optionStyle}`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs font-mono transition-colors ${
                    isAnswered && isCorrect
                      ? 'bg-emerald-500 text-white'
                      : isAnswered && isSelected
                      ? 'bg-rose-500 text-white'
                      : 'theme-bg-surface theme-border border theme-text-secondary group-hover:border-indigo-500'
                  }`}>
                    {optionLetters[optIdx]}
                  </div>

                  <span className="flex-1 pt-0.5 leading-relaxed font-medium">
                    {optionText}
                  </span>

                  {isAnswered && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  )}

                  {isAnswered && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Explanation Card for MCQ */}
        {!isFrq && isAnswered && (
          <div className="p-5 rounded-xl theme-bg-elevated theme-border border animate-fadeIn space-y-4">
            <div className="flex items-start gap-3">
              {selectedOption === currentQ.answer ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${
                  selectedOption === currentQ.answer ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  {selectedOption === currentQ.answer ? 'Correct Retention' : 'Concept Missed'}
                </span>
                <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
                  {currentQ.explanation}
                </p>
              </div>
            </div>

            {/* Grounded Source Note Excerpt */}
            {currentQ.sourceExcerpt && (
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1">
                <div className="font-bold text-indigo-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Source Note Citation:</span>
                </div>
                <p className="italic text-slate-300 leading-relaxed">
                  &ldquo;{currentQ.sourceExcerpt}&rdquo;
                </p>
              </div>
            )}

            {/* Unsupported / Inferred Notice */}
            {currentQ.sourceSupported === false && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-2 text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Inferred domain concept: Not explicitly stated in uploaded notes.</span>
              </div>
            )}

            {/* YouTube STEM Recommendation if Math Content Detected */}
            {mathVideoForQ && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-rose-400 block">
                      Video Walkthrough: {mathVideoForQ.title}
                    </span>
                    <span className="text-[11px] theme-text-muted">
                      {mathVideoForQ.channel} · Visual intuition &amp; problem derivation
                    </span>
                  </div>
                </div>

                <a
                  href={mathVideoForQ.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shrink-0 transition-colors"
                >
                  <span>Watch Walkthrough</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between text-xs theme-text-secondary">
        <span className="hidden sm:inline">
          {isVoiceMode ? 'Voice Mode Active: Speak responses hands-free' : 'Keys A, B, C, D or 1-4 to select · Enter to advance'}
        </span>

        {isAnswered && (
          <button
            onClick={handleNext}
            className="ml-auto inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md"
          >
            <span>{currentIndex + 1 === quiz.length ? 'Complete Quiz & View Analysis' : 'Next Question'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Collapsible Socratic AI Tutor Side Drawer */}
      {isSocraticDrawerOpen && (
        <>
          {/* Backdrop on mobile */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 sm:hidden"
            onClick={() => setIsSocraticDrawerOpen(false)}
          />

          <aside className="fixed top-0 right-0 h-full w-full sm:w-96 z-50 theme-bg-surface border-l theme-border shadow-2xl flex flex-col animate-slideLeft">
            {/* Drawer Header */}
            <div className="p-4 border-b theme-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
                    <span>Socratic Tutor</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                      Guided Recall
                    </span>
                  </div>
                  <span className="text-[10px] theme-text-muted">
                    Question #{currentIndex + 1} · {currentQ?.concept || 'Topic'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsSocraticDrawerOpen(false)}
                className="p-1.5 rounded-lg theme-text-muted hover:theme-text-primary hover:theme-bg-elevated cursor-pointer"
                title="Close Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hint Level Indicator */}
            <div className="px-4 py-2 border-b theme-border theme-bg-elevated flex items-center justify-between text-[11px]">
              <span className="theme-text-muted">Hint Depth:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map(lvl => (
                  <span
                    key={lvl}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      socraticHintLevel >= lvl
                        ? 'bg-purple-600 text-white'
                        : 'theme-bg-surface theme-border border theme-text-muted'
                    }`}
                  >
                    L{lvl} {lvl === 1 ? 'Nudge' : lvl === 2 ? 'Analogy' : 'Breakdown'}
                  </span>
                ))}
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {socraticMessages.map((msg, mIdx) => (
                <div
                  key={mIdx}
                  className={`flex flex-col ${msg.role === 'student' ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] theme-text-muted mb-1 px-1">
                    {msg.role === 'student' ? 'You' : 'Socratic Tutor'}
                  </span>
                  <div
                    className={`p-3 rounded-2xl text-xs max-w-[90%] leading-relaxed ${
                      msg.role === 'student'
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'theme-bg-elevated theme-border border theme-text-primary rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isSocraticLoading && (
                <div className="flex items-center gap-2 p-3 rounded-2xl theme-bg-elevated theme-border border text-xs text-purple-400">
                  <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span>Socratic tutor formulating guiding question...</span>
                </div>
              )}
              <div ref={socraticMessagesEndRef} />
            </div>

            {/* Quick Socratic Suggestions */}
            <div className="p-2 border-t theme-border theme-bg-elevated flex items-center gap-1.5 overflow-x-auto text-[10px]">
              <button
                type="button"
                onClick={() => handleSendSocraticMessage("What is the primary mechanism I should think about?")}
                className="px-2 py-1 rounded-lg theme-bg-surface theme-border border theme-text-secondary hover:theme-text-primary whitespace-nowrap cursor-pointer"
              >
                Primary mechanism?
              </button>
              <button
                type="button"
                onClick={() => handleSendSocraticMessage("Can you give me an intuitive analogy for this?")}
                className="px-2 py-1 rounded-lg theme-bg-surface theme-border border theme-text-secondary hover:theme-text-primary whitespace-nowrap cursor-pointer"
              >
                Give analogy
              </button>
              <button
                type="button"
                onClick={() => handleSendSocraticMessage("Why would a student commonly confuse the alternatives?")}
                className="px-2 py-1 rounded-lg theme-bg-surface theme-border border theme-text-secondary hover:theme-text-primary whitespace-nowrap cursor-pointer"
              >
                Common pitfalls?
              </button>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendSocraticMessage();
              }}
              className="p-3 border-t theme-border flex items-center gap-2"
            >
              <input
                type="text"
                value={socraticInput}
                onChange={(e) => setSocraticInput(e.target.value)}
                placeholder="Ask your tutor for a guiding question..."
                className="flex-1 theme-bg-elevated theme-border border rounded-xl px-3 py-2 text-xs theme-text-primary focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={!socraticInput.trim() || isSocraticLoading}
                className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 transition-colors cursor-pointer"
                title="Send"
              >
                <SendHorizontal className="w-4 h-4" />
              </button>
            </form>
          </aside>
        </>
      )}

      {/* Question Flagging / Feedback Modal (Priority 4 Educational Reliability) */}
      {isFlagModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="theme-bg-surface theme-border border rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Flag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold theme-text-primary">Flag Question / Report Error</h3>
                  <p className="text-[11px] theme-text-muted">Educational reliability and source alignment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFlagModalOpen(false)}
                className="p-1 rounded-lg hover:theme-bg-elevated theme-text-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFlagSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold theme-text-primary block mb-1.5">
                  Reason for Flagging:
                </label>
                <div className="space-y-2">
                  {[
                    'Factually incorrect explanation or key',
                    'Unsupported by uploaded lecture notes',
                    'Ambiguous or confusing question phrasing',
                    'Multiple answers could be correct',
                    'Typo or formatting issue'
                  ].map((r) => (
                    <label
                      key={r}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        flagReason === r
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-medium'
                          : 'theme-bg-elevated theme-border theme-text-secondary hover:border-slate-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="flagReason"
                        value={r}
                        checked={flagReason === r}
                        onChange={() => setFlagReason(r)}
                        className="text-amber-500 focus:ring-amber-400"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold theme-text-primary block mb-1">
                  Optional details or correction:
                </label>
                <textarea
                  value={flagNotes}
                  onChange={(e) => setFlagNotes(e.target.value)}
                  placeholder="Explain why this answer or explanation should be corrected..."
                  rows={2}
                  className="w-full theme-bg-elevated theme-border border rounded-xl p-2.5 text-xs theme-text-primary focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setIsFlagModalOpen(false)}
                  className="px-4 py-2 rounded-xl theme-bg-elevated theme-text-secondary hover:theme-text-primary text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Submit Flag</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
