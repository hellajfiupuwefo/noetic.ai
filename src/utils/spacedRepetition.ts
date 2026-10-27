import { Flashcard } from '../types';

export const SM2_LOCAL_KEY = 'noetic_spaced_repetition_cards_v1';

export interface SM2RatingOption {
  rating: number; // 1 to 5
  label: string;
  sublabel: string;
  intervalPreview: string;
  colorClass: string;
  description: string;
}

/**
 * SuperMemo SM-2 Algorithm Implementation
 * Calculates new interval, ease factor, and repetitions based on user recall rating (1 to 5).
 */
export function applySM2(card: Flashcard, quality: number): Flashcard {
  const q = Math.max(1, Math.min(5, Math.round(quality)));
  const currentEase = card.easeFactor ?? 2.5;
  const currentReps = card.repetitions ?? 0;
  const currentInterval = card.interval ?? 0;

  let newReps = currentReps;
  let newInterval = currentInterval;

  if (q < 3) {
    // Incorrect / Failed recall: reset repetitions, interval to 1 day
    newReps = 0;
    newInterval = 1;
  } else {
    // Successful recall (3 = Good, 4 = Easy, 5 = Mastered)
    if (newReps === 0) {
      newInterval = q === 5 ? 2 : 1;
    } else if (newReps === 1) {
      newInterval = q === 5 ? 6 : q === 4 ? 4 : 3;
    } else {
      const multiplier = q === 5 ? currentEase * 1.3 : q === 4 ? currentEase * 1.1 : currentEase;
      newInterval = Math.max(1, Math.round(currentInterval * multiplier));
    }
    newReps += 1;
  }

  // Update Ease Factor (EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
  let newEase = currentEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEase < 1.3) newEase = 1.3;
  if (newEase > 3.0) newEase = 3.0;

  const now = Date.now();
  const nextReviewDate = now + newInterval * 24 * 60 * 60 * 1000;

  let mastery: 'learning' | 'review' | 'mastered' = 'learning';
  if (q >= 4 && newReps >= 2) {
    mastery = 'mastered';
  } else if (q >= 3) {
    mastery = 'review';
  }

  const historyEntry = {
    date: now,
    rating: q,
    interval: newInterval
  };

  return {
    ...card,
    rating: q,
    repetitions: newReps,
    interval: newInterval,
    easeFactor: parseFloat(newEase.toFixed(2)),
    lastReviewed: now,
    nextReviewDate,
    mastery,
    history: [...(card.history || []), historyEntry].slice(-20)
  };
}

/**
 * Generate preview interval text for each of the 5 rating choices for a card
 */
export function getSM2RatingOptions(card: Flashcard): SM2RatingOption[] {
  const currentEase = card.easeFactor ?? 2.5;
  const currentReps = card.repetitions ?? 0;
  const currentInterval = card.interval ?? 0;

  const formatDays = (days: number) => {
    if (days <= 0) return '< 1 day';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    const months = Math.round(days / 30);
    return `${months} mo`;
  };

  const previewInterval = (q: number): string => {
    if (q < 3) return '< 1 day';
    if (currentReps === 0) return q === 5 ? '2 days' : '1 day';
    if (currentReps === 1) return q === 5 ? '6 days' : q === 4 ? '4 days' : '3 days';
    const mult = q === 5 ? currentEase * 1.3 : q === 4 ? currentEase * 1.1 : currentEase;
    const days = Math.max(1, Math.round(currentInterval * mult));
    return formatDays(days);
  };

  return [
    {
      rating: 1,
      label: 'Again',
      sublabel: 'Blackout',
      intervalPreview: previewInterval(1),
      colorClass: 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-400',
      description: 'Complete memory lapse. Card is reset for immediate review.'
    },
    {
      rating: 2,
      label: 'Hard',
      sublabel: 'Familiar',
      intervalPreview: previewInterval(2),
      colorClass: 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-400',
      description: 'Recalled with notable struggle or only partially.'
    },
    {
      rating: 3,
      label: 'Good',
      sublabel: 'Retained',
      intervalPreview: previewInterval(3),
      colorClass: 'bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/30 text-blue-400',
      description: 'Standard recall with minor effort. Expands interval cleanly.'
    },
    {
      rating: 4,
      label: 'Easy',
      sublabel: 'Effortless',
      intervalPreview: previewInterval(4),
      colorClass: 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-400',
      description: 'Swift, confident recall. Bonus multiplier applied.'
    },
    {
      rating: 5,
      label: 'Mastered',
      sublabel: 'Instant',
      intervalPreview: previewInterval(5),
      colorClass: 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-500/30 text-indigo-400',
      description: 'Flawless recall. Maximum interval advancement.'
    }
  ];
}

/**
 * Filter cards that are due for review (now >= nextReviewDate)
 */
export function isCardDue(card: Flashcard): boolean {
  if (!card.nextReviewDate) return true; // never reviewed = due
  return Date.now() >= card.nextReviewDate;
}

export function filterDueCards(cards: Flashcard[]): Flashcard[] {
  return cards.filter(isCardDue);
}

/**
 * Calculate Spaced Repetition deck metrics
 */
export function calculateSM2Stats(cards: Flashcard[]) {
  const now = Date.now();
  let dueCount = 0;
  let learningCount = 0;
  let reviewCount = 0;
  let masteredCount = 0;
  let totalIntervalDays = 0;
  let totalEase = 0;
  let ratedCount = 0;

  for (const c of cards) {
    if (isCardDue(c)) dueCount++;
    if (c.mastery === 'mastered') masteredCount++;
    else if (c.mastery === 'review') reviewCount++;
    else learningCount++;

    if (c.interval !== undefined) {
      totalIntervalDays += c.interval;
      totalEase += c.easeFactor ?? 2.5;
      ratedCount++;
    }
  }

  const avgInterval = ratedCount > 0 ? (totalIntervalDays / ratedCount).toFixed(1) : '0';
  const avgEase = ratedCount > 0 ? (totalEase / ratedCount).toFixed(2) : '2.50';
  const retentionPct = cards.length > 0 ? Math.round((masteredCount / cards.length) * 100) : 0;

  return {
    total: cards.length,
    dueCount,
    learningCount,
    reviewCount,
    masteredCount,
    avgInterval,
    avgEase,
    retentionPct
  };
}

/**
 * Persistent storage of SM-2 state in localStorage
 */
export function loadPersistedSM2Cards(): Record<string, Partial<Flashcard>> {
  try {
    const raw = localStorage.getItem(SM2_LOCAL_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveCardSM2State(card: Flashcard): void {
  try {
    const existing = loadPersistedSM2Cards();
    const key = card.front.trim().toLowerCase();
    existing[key] = {
      interval: card.interval,
      easeFactor: card.easeFactor,
      repetitions: card.repetitions,
      nextReviewDate: card.nextReviewDate,
      lastReviewed: card.lastReviewed,
      mastery: card.mastery,
      rating: card.rating,
      history: card.history
    };
    localStorage.setItem(SM2_LOCAL_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('Failed to save SM2 card state:', err);
  }
}

export function hydrateCardsWithSM2(cards: Flashcard[]): Flashcard[] {
  const store = loadPersistedSM2Cards();
  return cards.map(c => {
    const key = c.front.trim().toLowerCase();
    const saved = store[key];
    if (saved) {
      return {
        ...c,
        ...saved,
        id: c.id
      };
    }
    // Default new SM-2 values
    return {
      ...c,
      easeFactor: c.easeFactor ?? 2.5,
      interval: c.interval ?? 0,
      repetitions: c.repetitions ?? 0,
      mastery: c.mastery ?? 'learning'
    };
  });
}

export function getDueReviewCards(cards: Flashcard[]): Flashcard[] {
  const hydrated = hydrateCardsWithSM2(cards);
  return filterDueCards(hydrated);
}
