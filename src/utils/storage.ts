import { QuizSessionRecord, QuizQuestion, Flashcard } from '../types';

const STORAGE_KEY = 'study_buddy_session_history_v2';
const WEAK_CARDS_KEY = 'study_buddy_weak_cards_v2';
const FAVORITES_KEY = 'study_buddy_favorites_v2';

export function loadHistory(): QuizSessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Failed to load history:', err);
    return [];
  }
}

export function saveQuizSession(session: Omit<QuizSessionRecord, 'id' | 'date' | 'timestamp'>): QuizSessionRecord {
  const history = loadHistory();
  const newRecord: QuizSessionRecord = {
    ...session,
    id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    date: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    timestamp: Date.now()
  };

  const updated = [newRecord, ...history].slice(0, 100);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save session record:', err);
  }
  return newRecord;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear history:', err);
  }
}

export function loadSavedWeakCards(): Flashcard[] {
  try {
    const raw = localStorage.getItem(WEAK_CARDS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveWeakCards(cards: Flashcard[]): void {
  try {
    // Deduplicate by front text
    const existing = loadSavedWeakCards();
    const map = new Map<string, Flashcard>();
    existing.forEach(c => map.set(c.front.toLowerCase().trim(), c));
    cards.forEach(c => map.set(c.front.toLowerCase().trim(), c));
    const combined = Array.from(map.values()).slice(0, 150);
    localStorage.setItem(WEAK_CARDS_KEY, JSON.stringify(combined));
  } catch (err) {
    console.error('Failed to save weak cards:', err);
  }
}

export function removeWeakCard(front: string): void {
  try {
    const cards = loadSavedWeakCards().filter(
      c => c.front.toLowerCase().trim() !== front.toLowerCase().trim()
    );
    localStorage.setItem(WEAK_CARDS_KEY, JSON.stringify(cards));
  } catch (err) {
    console.error('Failed to remove weak card:', err);
  }
}

export function getAllMissedQuestions(): QuizQuestion[] {
  const history = loadHistory();
  const seen = new Set<string>();
  const result: QuizQuestion[] = [];

  for (const session of history) {
    if (Array.isArray(session.missedQuestions)) {
      for (const q of session.missedQuestions) {
        const key = q.question.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          result.push(q);
        }
      }
    }
  }
  return result;
}

export function calculateStats(history: QuizSessionRecord[]) {
  if (!history.length) {
    return {
      totalQuizzes: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      averageScorePct: 0,
      bestScorePct: 0,
      totalStudySeconds: 0,
      streakDays: 0
    };
  }

  const totalQuizzes = history.length;
  const totalQuestions = history.reduce((sum, h) => sum + (h.total || 0), 0);
  const totalCorrect = history.reduce((sum, h) => sum + (h.score || 0), 0);
  const averageScorePct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const bestScorePct = Math.max(...history.map(h => h.percentage || 0));
  const totalStudySeconds = history.reduce((sum, h) => sum + (h.durationSeconds || 0), 0);

  // Calculate study streak (days with sessions)
  const sessionDates = new Set(
    history.map(h => new Date(h.timestamp).toDateString())
  );
  
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    if (sessionDates.has(d.toDateString())) {
      streak++;
    } else if (i === 0) {
      // It's today and no session yet; don't break streak if yesterday had session
      continue;
    } else {
      break;
    }
  }

  return {
    totalQuizzes,
    totalQuestions,
    totalCorrect,
    averageScorePct,
    bestScorePct,
    totalStudySeconds,
    streakDays: streak
  };
}
