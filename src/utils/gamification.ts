import { UserGamificationProfile, Badge, DailyGoal, LeaderboardEntry } from '../types';

export const GAMIFICATION_KEY = 'noetic_gamification_profile_v1';

export const INITIAL_BADGES: Badge[] = [
  {
    id: 'first_quiz',
    title: 'First Spark',
    description: 'Complete your first interactive study session or practice quiz.',
    icon: 'zap',
    category: 'mastery',
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'anki_scholar',
    title: 'Anki Scholar',
    description: 'Review 15 flashcards using the Smart Spaced Review engine.',
    icon: 'brain',
    category: 'mastery',
    progress: 0,
    maxProgress: 15
  },
  {
    id: 'streak_fire',
    title: 'Streak Fire',
    description: 'Maintain a 3-day consecutive study streak.',
    icon: 'flame',
    category: 'streak',
    progress: 0,
    maxProgress: 3
  },
  {
    id: 'free_thinker',
    title: 'Free Thinker',
    description: 'Submit an academic Free Response Question (FRQ) graded 80%+ by AI.',
    icon: 'pen',
    category: 'mastery',
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'voice_pioneer',
    title: 'Voice Pioneer',
    description: 'Answer quiz questions hands-free using real-time Voice Mode.',
    icon: 'mic',
    category: 'voice',
    progress: 0,
    maxProgress: 3
  },
  {
    id: 'podcast_listener',
    title: 'Audio Briefing Scholar',
    description: 'Listen to an AI-generated multi-speaker podcast study briefing.',
    icon: 'headphones',
    category: 'audio',
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'mind_cartographer',
    title: 'Mind Cartographer',
    description: 'Explore and interact with all branches of an academic Mind Map.',
    icon: 'map',
    category: 'explorer',
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'century_club',
    title: 'Century Club',
    description: 'Answer 50 questions across your study sessions.',
    icon: 'hundred',
    category: 'mastery',
    progress: 0,
    maxProgress: 50
  },
  {
    id: 'grandmaster',
    title: 'Grandmaster',
    description: 'Score 90% or higher on a Hard or Adaptive cognitive examination.',
    icon: 'trophy',
    category: 'mastery',
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'speed_demon',
    title: 'Rapid Recall',
    description: 'Answer 5 consecutive questions correctly in under 60 seconds.',
    icon: 'clock',
    category: 'mastery',
    progress: 0,
    maxProgress: 5
  },
  {
    id: 'polymath',
    title: 'Polymath',
    description: 'Study across 3 distinct academic decks or document uploads.',
    icon: 'book',
    category: 'explorer',
    progress: 0,
    maxProgress: 3
  },
  {
    id: 'perfectionist',
    title: 'Flawless Recall',
    description: 'Earn a 100% perfect score on any quiz or exam.',
    icon: 'sparkles',
    category: 'mastery',
    progress: 0,
    maxProgress: 1
  }
];

export const LEVEL_THRESHOLDS = [
  { level: 1, name: 'Novice Scholar', minXp: 0, maxXp: 150 },
  { level: 2, name: 'Active Recaller', minXp: 150, maxXp: 350 },
  { level: 3, name: 'Spaced Repeater', minXp: 350, maxXp: 650 },
  { level: 4, name: 'Cognitive Master', minXp: 650, maxXp: 1100 },
  { level: 5, name: 'Neural Architect', minXp: 1100, maxXp: 1750 },
  { level: 6, name: 'Grand Academician', minXp: 1750, maxXp: 2600 },
  { level: 7, name: 'Polymath Laureate', minXp: 2600, maxXp: 4000 }
];

export function calculateLevel(xp: number): { level: number; name: string; progressPct: number; xpForNext: number } {
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    const t = LEVEL_THRESHOLDS[i];
    if (xp < t.maxXp || i === LEVEL_THRESHOLDS.length - 1) {
      const span = t.maxXp - t.minXp;
      const currentInLevel = Math.max(0, xp - t.minXp);
      const progressPct = Math.min(100, Math.round((currentInLevel / span) * 100));
      return {
        level: t.level,
        name: t.name,
        progressPct,
        xpForNext: Math.max(0, t.maxXp - xp)
      };
    }
  }
  return {
    level: 7,
    name: 'Polymath Laureate',
    progressPct: 100,
    xpForNext: 0
  };
}

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadGamificationProfile(): UserGamificationProfile {
  const todayStr = getTodayDateString();
  try {
    const raw = localStorage.getItem(GAMIFICATION_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Verify daily goal date
      if (data.dailyGoal && data.lastStudyDate !== todayStr) {
        // Reset daily goal count for new day
        data.dailyGoal.currentCount = 0;
        data.dailyGoal.completed = false;
      }
      return data;
    }
  } catch (err) {
    console.warn('Failed to load gamification profile:', err);
  }

  // Initial Profile
  const initialDailyGoal: DailyGoal = {
    id: 'daily-goal-1',
    title: 'Answer 15 Study Questions',
    targetCount: 15,
    currentCount: 0,
    completed: false,
    xpReward: 50,
    type: 'questions'
  };

  return {
    xp: 0,
    level: 1,
    xpToNextLevel: 150,
    streakDays: 0,
    lastStudyDate: '',
    streakFreezeTokens: 0,
    dailyGoal: initialDailyGoal,
    badges: INITIAL_BADGES
  };
}

export function saveGamificationProfile(profile: UserGamificationProfile): void {
  try {
    localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn('Failed to save gamification profile:', err);
  }
}

export interface XPGainResult {
  xpGained: number;
  newTotalXp: number;
  newLevel: number;
  leveledUp: boolean;
  unlockedBadges: Badge[];
  dailyGoalCompleted: boolean;
  toastMessage: string;
}

/**
 * Award XP to user, advance streaks, update daily goals, and check badge unlocks.
 */
export function addXP(
  amount: number,
  reason: string,
  categoryCountUpdates?: {
    questions?: number;
    cards?: number;
    frqScore?: number;
    voiceAnswers?: number;
    podcastListened?: boolean;
    mindMapExplored?: boolean;
    quizPerfect?: boolean;
    examHighScore?: boolean;
  }
): XPGainResult {
  const profile = loadGamificationProfile();
  const oldXp = profile.xp;
  const oldLevelInfo = calculateLevel(oldXp);

  const todayStr = getTodayDateString();
  let streak = profile.streakDays;

  // Streak calculation
  if (profile.lastStudyDate !== todayStr) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    if (profile.lastStudyDate === yesterdayStr) {
      streak += 1;
    } else if (profile.lastStudyDate) {
      streak = 1; // streak reset
    }
    profile.lastStudyDate = todayStr;
    profile.streakDays = streak;
  }

  const newTotalXp = oldXp + amount;
  profile.xp = newTotalXp;

  const newLevelInfo = calculateLevel(newTotalXp);
  const leveledUp = newLevelInfo.level > oldLevelInfo.level;
  profile.level = newLevelInfo.level;
  profile.xpToNextLevel = newLevelInfo.xpForNext;

  // Update Daily Goal
  let dailyGoalCompleted = false;
  if (profile.dailyGoal && !profile.dailyGoal.completed) {
    if (profile.dailyGoal.type === 'questions' && categoryCountUpdates?.questions) {
      profile.dailyGoal.currentCount += categoryCountUpdates.questions;
    } else if (profile.dailyGoal.type === 'cards' && categoryCountUpdates?.cards) {
      profile.dailyGoal.currentCount += categoryCountUpdates.cards;
    } else if (profile.dailyGoal.type === 'xp') {
      profile.dailyGoal.currentCount += amount;
    }

    if (profile.dailyGoal.currentCount >= profile.dailyGoal.targetCount) {
      profile.dailyGoal.completed = true;
      dailyGoalCompleted = true;
      profile.xp += profile.dailyGoal.xpReward; // Goal reward!
    }
  }

  // Check Badge Unlocks
  const unlockedBadges: Badge[] = [];
  const now = Date.now();

  profile.badges = (profile.badges || INITIAL_BADGES).map(badge => {
    if (badge.unlockedAt) return badge; // Already unlocked

    let newProgress = badge.progress || 0;
    let shouldUnlock = false;

    if (badge.id === 'first_quiz' && categoryCountUpdates?.questions) {
      shouldUnlock = true;
    } else if (badge.id === 'anki_scholar' && categoryCountUpdates?.cards) {
      newProgress += categoryCountUpdates.cards;
      if (newProgress >= (badge.maxProgress || 15)) shouldUnlock = true;
    } else if (badge.id === 'streak_fire' && streak >= 3) {
      newProgress = streak;
      shouldUnlock = true;
    } else if (badge.id === 'free_thinker' && categoryCountUpdates?.frqScore && categoryCountUpdates.frqScore >= 80) {
      shouldUnlock = true;
    } else if (badge.id === 'voice_pioneer' && categoryCountUpdates?.voiceAnswers) {
      newProgress += categoryCountUpdates.voiceAnswers;
      if (newProgress >= (badge.maxProgress || 3)) shouldUnlock = true;
    } else if (badge.id === 'podcast_listener' && categoryCountUpdates?.podcastListened) {
      shouldUnlock = true;
    } else if (badge.id === 'mind_cartographer' && categoryCountUpdates?.mindMapExplored) {
      shouldUnlock = true;
    } else if (badge.id === 'century_club' && categoryCountUpdates?.questions) {
      newProgress += categoryCountUpdates.questions;
      if (newProgress >= (badge.maxProgress || 50)) shouldUnlock = true;
    } else if (badge.id === 'grandmaster' && categoryCountUpdates?.examHighScore) {
      shouldUnlock = true;
    } else if (badge.id === 'perfectionist' && categoryCountUpdates?.quizPerfect) {
      shouldUnlock = true;
    }

    if (shouldUnlock) {
      const unlocked = { ...badge, progress: badge.maxProgress, unlockedAt: now };
      unlockedBadges.push(unlocked);
      return unlocked;
    }

    return { ...badge, progress: newProgress };
  });

  saveGamificationProfile(profile);

  let toastMessage = `+${amount} XP (${reason})`;
  if (leveledUp) {
    toastMessage = `Leveled Up to Level ${newLevelInfo.level}: ${newLevelInfo.name}!`;
  } else if (unlockedBadges.length > 0) {
    toastMessage = `Achievement Unlocked: ${unlockedBadges[0].title}!`;
  }

  return {
    xpGained: amount,
    newTotalXp: profile.xp,
    newLevel: profile.level,
    leveledUp,
    unlockedBadges,
    dailyGoalCompleted,
    toastMessage
  };
}

/**
 * Generate simulated peer leaderboard dynamically placing the current user
 */
export function getSimulatedLeaderboard(currentUserXp: number, currentUserName: string = 'You'): LeaderboardEntry[] {
  const peers: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[] = [
    { name: 'Dr. Clara Thorne', avatar: 'CT', institution: 'Oxford / Neuroscience', xp: 2450, level: 6, badgeCount: 9 },
    { name: 'Mateo Alvarez', avatar: 'MA', institution: 'MIT / EECS', xp: 1820, level: 5, badgeCount: 8 },
    { name: 'Aaliyah Chen', avatar: 'AC', institution: 'Stanford / Bioengineering', xp: 1290, level: 5, badgeCount: 7 },
    { name: 'Liam O’Connor', avatar: 'LO', institution: 'Harvard / Applied Math', xp: 940, level: 4, badgeCount: 6 },
    { name: 'Sophia Kim', avatar: 'SK', institution: 'Berkeley / Data Science', xp: 620, level: 3, badgeCount: 5 },
    { name: 'Noah Patel', avatar: 'NP', institution: 'Cambridge / Medicine', xp: 410, level: 3, badgeCount: 4 },
    { name: 'Emma Watson', avatar: 'EW', institution: 'Yale / Cognitive Science', xp: 220, level: 2, badgeCount: 3 },
    { name: 'Lucas Scott', avatar: 'LS', institution: 'ETH Zürich / Physics', xp: 110, level: 1, badgeCount: 2 }
  ];

  const currentUserLevel = calculateLevel(currentUserXp).level;
  const currentEntry: Omit<LeaderboardEntry, 'rank'> = {
    name: currentUserName,
    avatar: 'YOU',
    institution: 'Active Scholar',
    xp: currentUserXp,
    level: currentUserLevel,
    badgeCount: loadGamificationProfile().badges.filter(b => b.unlockedAt).length,
    isCurrentUser: true
  };

  const combined = [...peers, currentEntry].sort((a, b) => b.xp - a.xp);

  return combined.map((entry, idx) => ({
    ...entry,
    rank: idx + 1
  }));
}
