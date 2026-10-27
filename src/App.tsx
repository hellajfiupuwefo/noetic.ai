/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomePage } from './components/HomePage';
import { DeckSetup } from './components/DeckSetup';
import { QuizView } from './components/QuizView';
import { ExamView } from './components/ExamView';
import { FlashcardView } from './components/FlashcardView';
import { StudyGuideView } from './components/StudyGuideView';
import { ResultsView } from './components/ResultsView';
import { AnalyticsView } from './components/AnalyticsView';
import { Chatbot } from './components/Chatbot';
import { CollaborativeModal } from './components/CollaborativeModal';
import { AccessibilityModal } from './components/AccessibilityModal';
import { UserProfileModal } from './components/UserProfileModal';
import { RbacModal } from './components/RbacModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { AuthModal } from './components/AuthModal';
import { WelcomeLanding } from './components/WelcomeLanding';
import { InteractiveTutorialModal } from './components/InteractiveTutorialModal';

import { DEFAULT_STARTER_DECKS, SampleDeck } from './types';
import { 
  QuizQuestion, 
  Flashcard, 
  StudyGuide, 
  QuizSessionRecord, 
  DeckAttachment, 
  AppTheme, 
  AccessibilitySettings,
  DeckRole,
  UserProfile,
  UserAccount,
  QuizFormat,
  UserGamificationProfile,
  UiMode
} from './types';
import { 
  loadHistory, 
  saveQuizSession, 
  clearHistory, 
  loadSavedWeakCards, 
  saveWeakCards,
  getAllMissedQuestions 
} from './utils/storage';
import { loadGamificationProfile, addXP } from './utils/gamification';
import { saveOfflineStudySession } from './utils/indexedDb';
import { Sparkles, Minimize2, Maximize2 } from 'lucide-react';

export default function App() {
  // Default start page is 'home' as requested
  const [currentTab, setCurrentTab] = useState<'home' | 'setup' | 'quiz' | 'exam' | 'flashcards' | 'guide' | 'results' | 'analytics'>('home');
  
  // Theme state: 8 rich themes
  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('noetic_theme') as AppTheme;
      if (['cream', 'dark', 'blue', 'sage', 'rose', 'sepia', 'cyberpunk', 'amoled'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'cream';
  });

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('noetic_theme', theme);
    } catch {}
  }, [theme]);

  // Dynamic Font Size state (numeric in px, default 16px)
  const [dynamicFontSize, setDynamicFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('noetic_dynamic_font_size');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 12 && parsed <= 28) {
          return parsed;
        }
      }
    } catch {}
    return 16;
  });

  // Apply dynamic font size to document root (Tailwind rem units smoothly scale)
  useEffect(() => {
    document.documentElement.style.fontSize = `${dynamicFontSize}px`;
    try {
      localStorage.setItem('noetic_dynamic_font_size', String(dynamicFontSize));
    } catch {}
  }, [dynamicFontSize]);

  // Accessibility Settings state
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem('noetic_accessibility');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      dyslexicFont: false,
      highContrast: false,
      reducedMotion: false,
      relaxedSpacing: false,
      colorblindMarkers: false,
      largeFocusRings: false
    };
  });

  // UI Layout Mode (compact, easy, professional, minimal, advanced)
  const [uiMode, setUiMode] = useState<UiMode>(() => {
    try {
      const saved = localStorage.getItem('noetic_ui_mode') as UiMode;
      if (['compact', 'easy', 'professional', 'minimal', 'advanced'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'professional';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-ui-mode', uiMode);
    try {
      localStorage.setItem('noetic_ui_mode', uiMode);
    } catch {}
  }, [uiMode]);

  const handleToggleDyslexic = () => {
    setAccessibilitySettings(prev => ({
      ...prev,
      dyslexicFont: !prev.dyslexicFont,
      fontFamily: !prev.dyslexicFont ? 'lexend' : 'sans'
    }));
  };

  // User Profile state & avatars
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('noetic_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      id: 'guest',
      name: 'Scholar',
      email: '',
      avatar: 'scholar',
      institution: '',
      major: '',
      role: 'student',
      studyGoal: 'Master key concepts with active recall',
      streakDays: 0
    };
  });

  const handleSaveProfile = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    try {
      localStorage.setItem('noetic_profile', JSON.stringify(newProfile));
    } catch {}
  };

  // Role-Based Access Control (RBAC) active role
  const [currentRole, setCurrentRole] = useState<DeckRole>(() => {
    try {
      const saved = localStorage.getItem('noetic_deck_role') as DeckRole;
      if (saved === 'Owner' || saved === 'Collaborator' || saved === 'Viewer') {
        return saved;
      }
    } catch {}
    return 'Owner';
  });

  const handleRoleChange = (newRole: DeckRole) => {
    setCurrentRole(newRole);
    try {
      localStorage.setItem('noetic_deck_role', newRole);
    } catch {}
  };

  // Modal open states
  const [isCollabModalOpen, setIsCollabModalOpen] = useState<boolean>(false);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isRbacOpen, setIsRbacOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'verify' | 'forgot'>('login');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string>('');
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);

  // Zen Focus Mode (Distraction-Free Study)
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  // Global Escape Listener for Zen Focus Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  // User Account (Authentication & Verification) - Unauthenticated by default
  const [userAccount, setUserAccount] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('noetic_user_account');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('noetic_guest_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Verify active session with backend on mount
  useEffect(() => {
    const token = localStorage.getItem('noetic_auth_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setUserAccount(data.user);
            try {
              localStorage.setItem('noetic_user_account', JSON.stringify(data.user));
            } catch {}
            setUserProfile((prev) => ({
              ...prev,
              name: data.user.username,
              email: data.user.email,
              avatar: data.user.avatar,
              institution: data.user.institution,
              major: data.user.major,
              role: data.user.role,
              isVerified: data.user.isVerified
            }));
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleAuthSuccess = (user: UserAccount, token: string) => {
    setUserAccount(user);
    try {
      localStorage.setItem('noetic_user_account', JSON.stringify(user));
      localStorage.setItem('noetic_auth_token', token);
    } catch {}
    setUserProfile((prev) => ({
      ...prev,
      name: user.username,
      email: user.email,
      avatar: user.avatar,
      institution: user.institution,
      major: user.major,
      role: user.role,
      isVerified: user.isVerified
    }));
    setXpToast({
      message: `Welcome, ${user.username}! ${user.isVerified ? '✓ 2FA Verified Scholar' : '⚠️ Verification Code Dispatched'}`,
      id: Date.now()
    });
    setTimeout(() => setXpToast(null), 4000);
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('noetic_auth_token');
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch {}
    localStorage.removeItem('noetic_auth_token');
    localStorage.removeItem('noetic_user_account');
    localStorage.removeItem('noetic_guest_mode');
    setUserAccount(null);
    setIsGuestMode(false);
    setUserProfile({
      id: 'guest',
      name: 'Scholar',
      email: '',
      avatar: 'scholar',
      institution: '',
      major: '',
      role: 'student',
      studyGoal: 'Master key concepts with active recall',
      streakDays: 0
    });
    setXpToast({ message: 'Signed out securely.', id: Date.now() });
    setTimeout(() => setXpToast(null), 3000);
  };

  const handleOpenAuth = (tab: 'login' | 'register' | 'verify' = 'login', email = '') => {
    setAuthModalTab(tab);
    if (email) setPendingVerificationEmail(email);
    setIsAuthModalOpen(true);
  };

  // Gamification, Streaks, Daily Goals & XP System
  const [gamificationProfile, setGamificationProfile] = useState<UserGamificationProfile>(() => loadGamificationProfile());
  const [xpToast, setXpToast] = useState<{ message: string; id: number } | null>(null);

  const handleEarnXP = (
    amount: number,
    reason: string,
    categoryUpdates?: {
      questions?: number;
      cards?: number;
      frqScore?: number;
      voiceAnswers?: number;
      podcastListened?: boolean;
      mindMapExplored?: boolean;
      quizPerfect?: boolean;
      examHighScore?: boolean;
    }
  ) => {
    const result = addXP(amount, reason, categoryUpdates);
    setGamificationProfile(loadGamificationProfile());
    setXpToast({ message: result.toastMessage, id: Date.now() });
    setTimeout(() => setXpToast(null), 3500);
  };

  // Active Deck Configuration
  const [notes, setNotes] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Adaptive'>('Medium');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [quizFormat, setQuizFormat] = useState<QuizFormat>('mcq');
  const [isTimed, setIsTimed] = useState<boolean>(false);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(30);
  
  // Directly attached multiple files (PDF, Word doc, image, text)
  const [attachments, setAttachments] = useState<DeckAttachment[]>([]);

  // Active Session State
  const [activeQuiz, setActiveQuiz] = useState<QuizQuestion[]>([]);
  const [activeCards, setActiveCards] = useState<Flashcard[]>([]);
  const [activeGuide, setActiveGuide] = useState<StudyGuide | null>(null);
  const [lastResults, setLastResults] = useState<{
    score: number;
    total: number;
    durationSeconds: number;
    missedQuestions: QuizQuestion[];
    adaptiveStats?: any;
  } | null>(null);

  // Generation loading state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Persistent storage state
  const [history, setHistory] = useState<QuizSessionRecord[]>([]);
  const [weakCards, setWeakCards] = useState<Flashcard[]>([]);
  const [allMissedQuestions, setAllMissedQuestions] = useState<QuizQuestion[]>([]);

  // Load initial history & saved weak items on mount
  useEffect(() => {
    refreshStoredData();
  }, []);

  const refreshStoredData = () => {
    const hist = loadHistory();
    setHistory(hist);
    setWeakCards(loadSavedWeakCards());
    setAllMissedQuestions(getAllMissedQuestions());
  };

  // Generate Quiz (Interactive or Exam mode) with support for direct overrides and instant fallback
  const handleGenerateQuiz = async (
    mode: 'interactive' | 'exam',
    overrides?: {
      notes?: string;
      title?: string;
      difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Adaptive';
      format?: QuizFormat;
      attachments?: DeckAttachment[];
      count?: number;
    }
  ) => {
    const effectiveNotes = overrides?.notes !== undefined ? overrides.notes : notes;
    const effectiveAttachments = overrides?.attachments !== undefined ? overrides.attachments : attachments;
    const effectiveDifficulty = overrides?.difficulty || difficulty;
    const effectiveFormat = overrides?.format || quizFormat;
    const effectiveCount = overrides?.count || questionCount;

    let finalNotes = effectiveNotes;
    let finalAttachments = effectiveAttachments;
    let finalTitle = overrides?.title || title || (effectiveAttachments[0]?.name ? effectiveAttachments[0].name.replace(/\.[^/.]+$/, '') : 'Study Session');

    if (!finalNotes.trim() && finalAttachments.length === 0) {
      const defaultDeck = DEFAULT_STARTER_DECKS[0];
      finalNotes = defaultDeck.notes;
      finalTitle = defaultDeck.title;
      setNotes(defaultDeck.notes);
      setTitle(defaultDeck.title);
      setDifficulty(defaultDeck.defaultDifficulty);
    }

    setIsGenerating(true);
    setGenerationStep(
      finalAttachments.length > 0
        ? `Reading ${finalAttachments.length} file(s) and generating questions...`
        : 'Creating quiz questions...'
    );
    setGlobalError(null);

    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: finalNotes,
          title: finalTitle,
          difficulty: effectiveDifficulty,
          count: effectiveCount,
          format: effectiveFormat,
          attachments: finalAttachments.map(a => ({
            name: a.name,
            mimeType: a.mimeType,
            base64: a.base64,
            size: a.size
          }))
        })
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('Server returned an invalid response format. Please try again.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate quiz.');
      }

      if (!data.quiz || !Array.isArray(data.quiz) || data.quiz.length === 0) {
        throw new Error('No questions could be generated from the given material.');
      }

      setActiveQuiz(data.quiz);
      setCurrentTab(mode === 'exam' ? 'exam' : 'quiz');
    } catch (err: any) {
      console.error('Quiz generation error:', err);
      setGlobalError(err.message || 'Quiz generation failed.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Generate Flashcards with support for overrides and instant fallback
  const handleGenerateFlashcards = async (
    overrides?: {
      notes?: string;
      title?: string;
      attachments?: DeckAttachment[];
      count?: number;
    }
  ) => {
    const effectiveNotes = overrides?.notes !== undefined ? overrides.notes : notes;
    const effectiveAttachments = overrides?.attachments !== undefined ? overrides.attachments : attachments;
    const effectiveCount = overrides?.count || Math.max(8, questionCount * 2);

    let finalNotes = effectiveNotes;
    let finalAttachments = effectiveAttachments;
    let finalTitle = overrides?.title || title || (effectiveAttachments[0]?.name ? effectiveAttachments[0].name.replace(/\.[^/.]+$/, '') : 'Flashcards Deck');

    if (!finalNotes.trim() && finalAttachments.length === 0) {
      const defaultDeck = DEFAULT_STARTER_DECKS[0];
      finalNotes = defaultDeck.notes;
      finalTitle = defaultDeck.title;
      setNotes(defaultDeck.notes);
      setTitle(defaultDeck.title);
      setDifficulty(defaultDeck.defaultDifficulty);
    }

    setIsGenerating(true);
    setGenerationStep(
      finalAttachments.length > 0
        ? `Generating flashcards from ${finalAttachments.length} file(s)...`
        : 'Generating flashcards...'
    );
    setGlobalError(null);

    try {
      const res = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: finalNotes,
          title: finalTitle,
          count: effectiveCount,
          attachments: finalAttachments.map(a => ({
            name: a.name,
            mimeType: a.mimeType,
            base64: a.base64,
            size: a.size
          }))
        })
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('Server returned an invalid response format. Please try again.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate flashcards.');
      }

      if (!data.cards || !Array.isArray(data.cards) || data.cards.length === 0) {
        throw new Error('No flashcards could be generated from the material.');
      }

      setActiveCards(data.cards);
      setCurrentTab('flashcards');
    } catch (err: any) {
      console.error('Flashcard generation error:', err);
      setGlobalError(err.message || 'Flashcard generation failed.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Step 4 of Connected Learning Loop: Generate targeted follow-up quiz for diagnosed weak concepts
  const handleStartTargetedQuiz = async (missedConcepts: string[], missedQuestionsList?: QuizQuestion[]) => {
    setIsGenerating(true);
    setGenerationStep('Creating follow-up quiz for missed topics...');
    try {
      const res = await fetch('/api/generate-targeted-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missedConcepts,
          missedQuestions: missedQuestionsList || [],
          notes,
          title: `Targeted Review: ${missedConcepts.slice(0, 2).join(', ')}`,
          difficulty,
          count: Math.min(Math.max(missedConcepts.length * 2, 4), 8)
        })
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('Server returned an invalid format for targeted questions.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate targeted follow-up quiz.');
      }

      if (!data.quiz || !Array.isArray(data.quiz) || data.quiz.length === 0) {
        throw new Error('No targeted follow-up questions could be generated.');
      }

      setActiveQuiz(data.quiz);
      setTitle(`Targeted Review: ${missedConcepts.slice(0, 2).join(', ')}`);
      setCurrentTab('quiz');
      setXpToast({ message: 'Targeted follow-up quiz loaded: Testing weak concepts!', id: Date.now() });
      setTimeout(() => setXpToast(null), 3500);
    } catch (err: any) {
      console.error('Targeted quiz error:', err);
      setGlobalError(err.message || 'Targeted follow-up quiz generation failed.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Generate Executive Study Guide with support for overrides and instant fallback
  const handleGenerateStudyGuide = async (
    overrides?: {
      notes?: string;
      title?: string;
      attachments?: DeckAttachment[];
    }
  ) => {
    const effectiveNotes = overrides?.notes !== undefined ? overrides.notes : notes;
    const effectiveAttachments = overrides?.attachments !== undefined ? overrides.attachments : attachments;

    let finalNotes = effectiveNotes;
    let finalAttachments = effectiveAttachments;
    let finalTitle = overrides?.title || title || (effectiveAttachments[0]?.name ? effectiveAttachments[0].name.replace(/\.[^/.]+$/, '') : 'Study Guide');

    if (!finalNotes.trim() && finalAttachments.length === 0) {
      const defaultDeck = DEFAULT_STARTER_DECKS[0];
      finalNotes = defaultDeck.notes;
      finalTitle = defaultDeck.title;
      setNotes(defaultDeck.notes);
      setTitle(defaultDeck.title);
      setDifficulty(defaultDeck.defaultDifficulty);
    }

    setIsGenerating(true);
    setGenerationStep(
      finalAttachments.length > 0
        ? `Generating study guide from ${finalAttachments.length} file(s)...`
        : 'Building study summary and key concepts...'
    );
    setGlobalError(null);

    try {
      const res = await fetch('/api/generate-studyguide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: finalNotes,
          title: finalTitle,
          attachments: finalAttachments.map(a => ({
            name: a.name,
            mimeType: a.mimeType,
            base64: a.base64,
            size: a.size
          }))
        })
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('Server returned an invalid response format. Please try again.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate study guide.');
      }

      if (!data.guide) {
        throw new Error('No guide was returned from the server.');
      }

      setActiveGuide(data.guide);
      setCurrentTab('guide');
    } catch (err: any) {
      console.error('Study guide generation error:', err);
      setGlobalError(err.message || 'Study guide generation failed.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Quiz completion handler with XP rewards
  const handleFinishQuiz = (results: {
    score: number;
    total: number;
    durationSeconds: number;
    missedQuestions: QuizQuestion[];
    adaptiveStats?: any;
  }) => {
    setLastResults(results);

    const pct = results.total > 0 ? Math.round((results.score / results.total) * 100) : 0;
    const sessionRecord = {
      title: title || 'Study Session',
      score: results.score,
      total: results.total,
      percentage: pct,
      durationSeconds: results.durationSeconds,
      difficulty,
      mode: (currentTab === 'exam' ? 'exam' : 'interactive') as 'exam' | 'interactive',
      timed: isTimed,
      missedQuestions: results.missedQuestions,
      adaptiveStats: results.adaptiveStats
    };
    saveQuizSession(sessionRecord);
    saveOfflineStudySession(sessionRecord);

    // Award Gamification XP for completing session
    const earnedXp = Math.round(25 + (pct / 100) * 35);
    handleEarnXP(
      earnedXp,
      `${currentTab === 'exam' ? 'Exam' : 'Quiz'} Complete (${pct}%)`,
      {
        questions: results.total,
        quizPerfect: pct === 100,
        examHighScore: currentTab === 'exam' && pct >= 90
      }
    );

    refreshStoredData();
    setCurrentTab('results');
  };

  // Retry same quiz
  const handleRetryQuiz = () => {
    if (activeQuiz.length > 0) {
      const shuffled = activeQuiz.map(q => {
        const optionsWithCorrect = q.options.map((opt, idx) => ({
          opt,
          isCorrect: idx === q.answer
        }));

        for (let i = optionsWithCorrect.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [optionsWithCorrect[i], optionsWithCorrect[j]] = [optionsWithCorrect[j], optionsWithCorrect[i]];
        }

        return {
          ...q,
          options: optionsWithCorrect.map(o => o.opt),
          answer: optionsWithCorrect.findIndex(o => o.isCorrect)
        };
      });

      setActiveQuiz(shuffled);
      setCurrentTab('quiz');
    }
  };

  // Review Missed Questions
  const handleReviewMissed = () => {
    if (lastResults && lastResults.missedQuestions.length > 0) {
      setActiveQuiz(lastResults.missedQuestions);
      setCurrentTab('quiz');
    }
  };

  // Review Missed from History or Bank
  const handleReviewMissedFromHistory = (questions: QuizQuestion[], sessionTitle: string) => {
    setTitle(sessionTitle);
    setActiveQuiz(questions);
    setCurrentTab('quiz');
  };

  // Review Weak Flashcards
  const handleReviewWeakCards = (cards: Flashcard[]) => {
    setActiveCards(cards);
    setCurrentTab('flashcards');
  };

  const handleSaveWeakCard = (card: Flashcard) => {
    const updated = [...weakCards, card];
    saveWeakCards(updated);
    setWeakCards(updated);
  };

  const handleSelectTab = (tab: 'home' | 'setup' | 'quiz' | 'exam' | 'flashcards' | 'guide' | 'results' | 'analytics') => {
    if (!userAccount && tab !== 'home') {
      handleOpenAuth('login');
      const tabNames: Record<string, string> = {
        setup: 'New Deck',
        analytics: 'Progress',
        quiz: 'Quiz Mode',
        exam: 'Exam Mode',
        flashcards: 'Flashcards',
        guide: 'Study Guides',
        results: 'Results'
      };
      setXpToast({
        message: `Please sign in or create an account to access ${tabNames[tab] || 'this feature'}.`,
        id: Date.now()
      });
      setTimeout(() => setXpToast(null), 3500);
      return;
    }

    if (tab === 'guide' && !activeGuide) {
      handleGenerateStudyGuide();
      return;
    }
    if (tab === 'quiz' && activeQuiz.length === 0) {
      handleGenerateQuiz('interactive');
      return;
    }
    if (tab === 'flashcards' && activeCards.length === 0) {
      handleGenerateFlashcards();
      return;
    }

    setCurrentTab(tab);
  };

  const handleLaunchStudyMethod = async (method: 'quiz' | 'frq' | 'brainmap' | 'flashcards' | 'exam', sampleDeck?: SampleDeck) => {
    if (!userAccount) {
      handleOpenAuth('login');
      return;
    }
    const targetDeck = sampleDeck || DEFAULT_STARTER_DECKS[0];
    const targetNotes = notes.trim() ? notes : targetDeck.notes;
    const targetTitle = title.trim() ? title : targetDeck.title;
    const targetDiff = difficulty || targetDeck.defaultDifficulty;

    if (!notes.trim()) {
      setNotes(targetNotes);
      setTitle(targetTitle);
      setDifficulty(targetDiff);
    }

    if (method === 'brainmap') {
      await handleGenerateStudyGuide({ notes: targetNotes, title: targetTitle });
    } else if (method === 'frq') {
      setQuizFormat('frq');
      await handleGenerateQuiz('interactive', { notes: targetNotes, title: targetTitle, format: 'frq' });
    } else if (method === 'flashcards') {
      await handleGenerateFlashcards({ notes: targetNotes, title: targetTitle });
    } else if (method === 'exam') {
      await handleGenerateQuiz('exam', { notes: targetNotes, title: targetTitle });
    } else {
      await handleGenerateQuiz('interactive', { notes: targetNotes, title: targetTitle, format: 'mcq' });
    }
  };

  const handleLoadDeck = (deck: SampleDeck) => {
    if (!userAccount) {
      handleOpenAuth('login');
      setXpToast({ message: 'Sign in to load and customize decks.', id: Date.now() });
      setTimeout(() => setXpToast(null), 3500);
      return;
    }
    setNotes(deck.notes);
    setTitle(deck.title);
    setDifficulty(deck.defaultDifficulty);
    setAttachments([]);
    setCurrentTab('setup');
  };

  const handleNewDeck = () => {
    if (!userAccount) {
      handleOpenAuth('login');
      setXpToast({ message: 'Sign in to create a new study deck.', id: Date.now() });
      setTimeout(() => setXpToast(null), 3500);
      return;
    }
    setNotes('');
    setTitle('');
    setAttachments([]);
    setActiveQuiz([]);
    setActiveCards([]);
    setActiveGuide(null);
    setLastResults(null);
    setCurrentTab('setup');
  };

  const handleClearAllHistory = () => {
    clearHistory();
    refreshStoredData();
  };

  // Async Merging Callback from Collaborative Modal
  const handleApplyMergedDeck = (mergedNotes: string, mergedCards: Flashcard[], newTitle: string) => {
    if (mergedNotes) setNotes(mergedNotes);
    if (mergedCards && mergedCards.length > 0) setActiveCards(mergedCards);
    if (newTitle) setTitle(newTitle);
  };

  return (
    <div className="min-h-screen theme-bg-canvas theme-text-primary flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Top Bar Navigation (Hidden in Zen Focus Mode) */}
      {!isFocusMode && (
        <Navbar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          onLoadDeck={handleLoadDeck}
          onNewDeck={handleNewDeck}
          hasActiveQuiz={activeQuiz.length > 0}
          hasActiveCards={activeCards.length > 0}
          hasActiveGuide={activeGuide !== null}
          theme={theme}
          onSelectTheme={setTheme}
          dynamicFontSize={dynamicFontSize}
          onUpdateFontSize={setDynamicFontSize}
          uiMode={uiMode}
          onUpdateUiMode={setUiMode}
          isDyslexic={accessibilitySettings.dyslexicFont}
          onToggleDyslexic={handleToggleDyslexic}
          userProfile={userProfile}
          onOpenProfile={() => setIsProfileOpen(true)}
          currentRole={currentRole}
          onOpenRbac={() => setIsRbacOpen(true)}
          onOpenCollab={() => setIsCollabModalOpen(true)}
          onOpenAccessibility={() => setIsAccessibilityOpen(true)}
          gamificationProfile={gamificationProfile}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          userAccount={userAccount}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
          onOpenTutorial={() => setIsTutorialOpen(true)}
        />
      )}

      {/* Floating Zen Focus Mode Pill (When in Zen Mode) */}
      {isFocusMode && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-slate-900/95 border border-slate-700/60 text-slate-200 shadow-2xl backdrop-blur-md text-xs font-semibold animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Zen Focus Mode</span>
          <button
            onClick={() => setIsFocusMode(false)}
            className="ml-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
            title="Exit Zen Focus Mode (Esc)"
          >
            Exit (Esc)
          </button>
        </div>
      )}

      {/* Global Error Banner if any */}
      {globalError && (
        <div className="bg-rose-500/20 border-b border-rose-500/40 text-rose-500 text-xs px-4 py-2.5 text-center flex items-center justify-center gap-2">
          <span>{globalError}</span>
          <button 
            onClick={() => setGlobalError(null)}
            className="underline font-semibold ml-2 hover:opacity-80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {/* Logged Out View: Show feature list and live interactive example */}
        {!userAccount ? (
          <WelcomeLanding
            onOpenRegister={() => handleOpenAuth('register')}
            onOpenLogin={() => handleOpenAuth('login')}
            onOpenTutorial={() => setIsTutorialOpen(true)}
          />
        ) : (
          <>
            {/* Logged In Dashboard */}
            {currentTab === 'home' && (
              <HomePage
                onGetStarted={() => setCurrentTab('setup')}
                onLoadSampleDeck={(deck) => {
                  handleLoadDeck(deck);
                  setCurrentTab('setup');
                }}
                onOpenAccessibility={() => setIsAccessibilityOpen(true)}
                onOpenProfile={() => setIsProfileOpen(true)}
                userName={userProfile.name}
                userAccount={userAccount}
                gamificationProfile={gamificationProfile}
                uiMode={uiMode}
                onUpdateUiMode={setUiMode}
                onSelectTab={(tab) => handleSelectTab(tab)}
                onOpenCollab={() => setIsCollabModalOpen(true)}
                onOpenAuth={handleOpenAuth}
                onStartTargetedQuiz={handleStartTargetedQuiz}
                onLaunchStudyMethod={handleLaunchStudyMethod}
                activeNotesTitle={title}
                hasActiveDeck={Boolean(notes.trim() || activeQuiz.length > 0 || activeCards.length > 0)}
                onOpenTutorial={() => setIsTutorialOpen(true)}
              />
            )}

        {/* Study Deck Setup & Multi-File Workspace */}
        {currentTab === 'setup' && (
          <DeckSetup
            notes={notes}
            setNotes={setNotes}
            title={title}
            setTitle={setTitle}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            questionCount={questionCount}
            setQuestionCount={setQuestionCount}
            quizFormat={quizFormat}
            setQuizFormat={setQuizFormat}
            isTimed={isTimed}
            setIsTimed={setIsTimed}
            timePerQuestion={timePerQuestion}
            setTimePerQuestion={setTimePerQuestion}
            attachments={attachments}
            setAttachments={setAttachments}
            currentRole={currentRole}
            onOpenRbac={() => setIsRbacOpen(true)}
            onGenerateQuiz={handleGenerateQuiz}
            onGenerateFlashcards={handleGenerateFlashcards}
            onGenerateStudyGuide={handleGenerateStudyGuide}
            onOpenCollab={() => setIsCollabModalOpen(true)}
            onOpenAccessibility={() => setIsAccessibilityOpen(true)}
            isGenerating={isGenerating}
            generationStep={generationStep}
            onOpenTutorial={() => setIsTutorialOpen(true)}
          />
        )}

        {currentTab === 'quiz' && activeQuiz.length > 0 && (
          <QuizView
            quiz={activeQuiz}
            title={title || 'Study Session'}
            difficulty={difficulty}
            isTimed={isTimed}
            timePerQuestion={timePerQuestion}
            onFinishQuiz={handleFinishQuiz}
            onQuit={() => setCurrentTab('setup')}
            onEarnXP={handleEarnXP}
            isFocusMode={isFocusMode}
            onToggleFocusMode={() => setIsFocusMode(p => !p)}
          />
        )}

        {currentTab === 'exam' && activeQuiz.length > 0 && (
          <ExamView
            quiz={activeQuiz}
            title={title || 'Practice Examination'}
            difficulty={difficulty === 'Adaptive' ? 'Hard' : difficulty}
            onSubmitExam={handleFinishQuiz}
            onQuit={() => setCurrentTab('setup')}
            isFocusMode={isFocusMode}
            onToggleFocusMode={() => setIsFocusMode(p => !p)}
          />
        )}

        {currentTab === 'flashcards' && activeCards.length > 0 && (
          <FlashcardView
            cards={activeCards}
            title={title || 'Flashcards Deck'}
            onStartQuizFromDeck={() => handleGenerateQuiz('interactive')}
            onSaveWeakCard={handleSaveWeakCard}
            onQuit={() => setCurrentTab('setup')}
            onEarnXP={handleEarnXP}
            isFocusMode={isFocusMode}
            onToggleFocusMode={() => setIsFocusMode(p => !p)}
          />
        )}

        {currentTab === 'guide' && activeGuide && (
          <StudyGuideView
            guide={activeGuide}
            title={title || 'Study Guide'}
            notes={notes}
            onStartQuiz={() => handleGenerateQuiz('interactive')}
            onStartFlashcards={handleGenerateFlashcards}
            onQuit={() => setCurrentTab('setup')}
            onEarnXP={handleEarnXP}
          />
        )}

        {currentTab === 'results' && lastResults && (
          <ResultsView
            score={lastResults.score}
            total={lastResults.total}
            durationSeconds={lastResults.durationSeconds}
            missedQuestions={lastResults.missedQuestions}
            title={title || 'Study Session'}
            difficulty={difficulty}
            adaptiveStats={lastResults.adaptiveStats}
            onRetryQuiz={handleRetryQuiz}
            onReviewMissed={handleReviewMissed}
            onSwitchToFlashcards={() => {
              if (activeCards.length > 0) {
                setCurrentTab('flashcards');
              } else {
                handleGenerateFlashcards();
              }
            }}
            onNewDeck={handleNewDeck}
            onStartTargetedQuiz={(missed) => {
              const concepts = Array.from(new Set(missed.map(m => m.concept).filter(Boolean) as string[]));
              handleStartTargetedQuiz(concepts.length > 0 ? concepts : ['Diagnostic Review'], missed);
            }}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsView
            history={history}
            weakCards={weakCards}
            allMissedQuestions={allMissedQuestions}
            onReviewMissedQuestions={handleReviewMissedFromHistory}
            onReviewWeakCards={handleReviewWeakCards}
            onClearHistory={handleClearAllHistory}
            onBackToSetup={() => setCurrentTab('setup')}
            gamificationProfile={gamificationProfile}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          />
        )}
          </>
        )}
      </main>

      {/* Grounded Floating Chatbot in bottom right with citations */}
      <Chatbot
        notes={notes}
        deckTitle={title}
        theme={theme}
      />

      {/* Collaborative Study Groups Modal */}
      <CollaborativeModal
        isOpen={isCollabModalOpen}
        onClose={() => setIsCollabModalOpen(false)}
        localNotes={notes}
        localTitle={title}
        localCards={activeCards}
        onApplyMergedDeck={handleApplyMergedDeck}
      />

      {/* Accessibility & Typography Settings Modal */}
      <AccessibilityModal
        isOpen={isAccessibilityOpen}
        onClose={() => setIsAccessibilityOpen(false)}
        uiMode={uiMode}
        onUpdateUiMode={setUiMode}
        settings={accessibilitySettings}
        onUpdateSettings={setAccessibilitySettings}
        dynamicFontSize={dynamicFontSize}
        onUpdateFontSize={setDynamicFontSize}
        onResetAccessibility={() => {
          setAccessibilitySettings({
            dyslexicFont: false,
            highContrast: false,
            reducedMotion: false,
            relaxedSpacing: false,
            colorblindMarkers: false,
            largeFocusRings: false,
            fontFamily: 'sans',
            lineHeight: 'normal',
            letterSpacing: 'normal'
          });
          setUiMode('professional');
          setDynamicFontSize(16);
        }}
      />

      {/* User Profile & Avatars Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={userProfile}
        onSaveProfile={handleSaveProfile}
        gamificationProfile={gamificationProfile}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        userAccount={userAccount}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Two-Factor Authentication & Verification Code Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authModalTab}
        initialEmail={pendingVerificationEmail || userAccount?.email || ''}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Role-Based Access Control (RBAC) Modal */}
      <RbacModal
        isOpen={isRbacOpen}
        onClose={() => setIsRbacOpen(false)}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        deckTitle={title || 'Active Study Deck'}
      />

      {/* Gamified Leaderboard, Daily Goals & Badges Trophy Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        profile={gamificationProfile}
        userName={userProfile.name}
        userAvatar={userProfile.avatar}
      />

      {/* Interactive Platform Guide & Tour Modal */}
      <InteractiveTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onLoadDeck={handleLoadDeck}
        onNavigateTab={(tab) => setCurrentTab(tab)}
        onOpenCollab={() => setIsCollabModalOpen(true)}
        onOpenAuth={handleOpenAuth}
      />

      {/* Floating Gamification XP / Achievement Banner Toast */}
      {xpToast && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-indigo-950/90 border border-indigo-500/40 text-indigo-200 shadow-2xl backdrop-blur-md animate-slideUp text-xs font-semibold print:hidden">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
          <span>{xpToast.message}</span>
        </div>
      )}

      {/* Editorial Footer (Hidden in Zen Focus Mode) */}
      {!isFocusMode && (
        <footer className="border-t theme-border theme-bg-elevated py-6 text-center text-xs theme-text-muted transition-colors print:hidden">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold theme-text-primary">Noetic AI</span>
              <span aria-hidden="true">·</span>
              <span>Simple study tools: quizzes, flashcards &amp; summaries</span>
            </div>

            <div className="flex items-center gap-4 theme-text-secondary">
              <span>Role: {currentRole}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{theme} Theme</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
