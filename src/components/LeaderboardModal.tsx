import React, { useState } from 'react';
import { UserGamificationProfile, LeaderboardEntry, Badge } from '../types';
import { 
  Trophy, 
  Flame, 
  Zap, 
  Target, 
  Award, 
  X, 
  Crown, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck,
  TrendingUp,
  Star,
  Brain,
  PenTool,
  Mic,
  Headphones,
  Network,
  Clock,
  BookOpen,
  User
} from 'lucide-react';
import { calculateLevel, getSimulatedLeaderboard } from '../utils/gamification';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserGamificationProfile;
  userName?: string;
  userAvatar?: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  profile,
  userName = 'You',
  userAvatar = 'scholar'
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'goals' | 'badges'>('leaderboard');

  if (!isOpen) return null;

  const levelInfo = calculateLevel(profile.xp);
  const leaderboard = getSimulatedLeaderboard(profile.xp, userName);
  const unlockedBadgesCount = profile.badges.filter(b => b.unlockedAt).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-2xl theme-bg-surface theme-border border rounded-2xl theme-shadow overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b theme-border bg-gradient-to-r from-indigo-900/30 via-purple-900/20 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold theme-text-primary flex items-center gap-2">
                <span>Academic Honors &amp; Leaderboard</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Global Cohort
                </span>
              </h3>
              <p className="text-xs theme-text-muted">
                Track your XP climb, study streaks, and unlockable achievement trophies.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg theme-text-muted hover:theme-text-primary hover:theme-bg-hover transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Stats Summary Strip */}
        <div className="p-4 theme-bg-elevated/70 border-b theme-border grid grid-cols-3 gap-3 text-center">
          <div className="p-2 rounded-xl theme-bg-surface border theme-border">
            <div className="flex items-center justify-center gap-1.5 text-xs text-amber-500 font-bold mb-0.5">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{profile.xp} XP</span>
            </div>
            <div className="text-[10px] font-mono theme-text-muted">
              Lvl {levelInfo.level} ({levelInfo.name})
            </div>
          </div>

          <div className="p-2 rounded-xl theme-bg-surface border theme-border">
            <div className="flex items-center justify-center gap-1.5 text-xs text-amber-500 font-bold mb-0.5">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{profile.streakDays} Day Streak</span>
            </div>
            <div className="text-[10px] font-mono theme-text-muted">
              {profile.streakFreezeTokens} Freeze Token(s)
            </div>
          </div>

          <div className="p-2 rounded-xl theme-bg-surface border theme-border">
            <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-400 font-bold mb-0.5">
              <Award className="w-3.5 h-3.5" />
              <span>{unlockedBadgesCount} / {profile.badges.length} Badges</span>
            </div>
            <div className="text-[10px] font-mono theme-text-muted">
              Trophies Earned
            </div>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="px-6 py-2.5 bg-indigo-950/20 border-b theme-border flex items-center justify-between text-xs">
          <span className="font-semibold text-indigo-400">
            Level {levelInfo.level}: {levelInfo.name}
          </span>
          <span className="font-mono text-[11px] theme-text-muted">
            {levelInfo.xpForNext > 0 ? `${levelInfo.xpForNext} XP to next level` : 'Max Level Reached'}
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5">
          <div 
            className="bg-indigo-500 h-1.5 transition-all duration-500 rounded-r"
            style={{ width: `${levelInfo.progressPct}%` }}
          />
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b theme-border p-1 theme-bg-elevated/40">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'leaderboard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'theme-text-muted hover:theme-text-primary'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Campus Leaderboard</span>
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'goals'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'theme-text-muted hover:theme-text-primary'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Daily Study Goals</span>
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'badges'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'theme-text-muted hover:theme-text-primary'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Badges ({unlockedBadgesCount})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'leaderboard' && (
            <div className="space-y-2.5">
              <div className="text-[11px] theme-text-muted mb-2 flex items-center justify-between">
                <span>Ranked by cumulative Active Recall XP</span>
                <span className="font-mono">Weekly Cohort</span>
              </div>
              {leaderboard.map((user) => {
                const isUser = user.isCurrentUser;
                return (
                  <div
                    key={user.rank}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      isUser
                        ? 'bg-indigo-600/15 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                        : 'theme-bg-surface theme-border hover:theme-bg-hover'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                        user.rank === 1
                          ? 'bg-amber-500 text-black shadow'
                          : user.rank === 2
                          ? 'bg-slate-300 text-black shadow'
                          : user.rank === 3
                          ? 'bg-amber-700 text-white shadow'
                          : 'theme-bg-elevated theme-text-muted'
                      }`}>
                        {user.rank === 1 ? <Crown className="w-3.5 h-3.5" /> : user.rank}
                      </div>

                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 font-bold text-xs flex items-center justify-center shrink-0">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isUser ? 'text-indigo-400' : 'theme-text-primary'}`}>
                            {user.name} {isUser && '(You)'}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            Lvl {user.level}
                          </span>
                        </div>
                        <div className="text-[10px] theme-text-muted">
                          {user.institution}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-amber-500 font-mono">
                        {user.xp} XP
                      </div>
                      <div className="text-[10px] theme-text-muted">
                        {user.badgeCount} Badges
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-sm font-bold theme-text-primary">
                      {profile.dailyGoal.title}
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    +{profile.dailyGoal.xpReward} XP Reward
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs theme-text-muted mb-1.5 font-mono">
                  <span>Progress: {profile.dailyGoal.currentCount} / {profile.dailyGoal.targetCount}</span>
                  <span>{Math.min(100, Math.round((profile.dailyGoal.currentCount / profile.dailyGoal.targetCount) * 100))}%</span>
                </div>

                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (profile.dailyGoal.currentCount / profile.dailyGoal.targetCount) * 100)}%`
                    }}
                  />
                </div>

                {profile.dailyGoal.completed ? (
                  <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Daily Goal Completed! Bonus +{profile.dailyGoal.xpReward} XP claimed.</span>
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] theme-text-secondary leading-snug">
                    Complete study drills, flashcard reviews, or exams today to claim your daily goal reward and protect your streak.
                  </p>
                )}
              </div>

              {/* Study Habit Tips */}
              <div className="p-4 rounded-xl theme-bg-elevated theme-border border text-xs theme-text-muted space-y-2">
                <div className="font-bold theme-text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>How to Earn XP in Noetic:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>• Correct Quiz Question: <strong>+15 XP</strong></div>
                  <div>• FRQ Answer Scored: <strong>+25 XP</strong></div>
                  <div>• Flashcard Review: <strong>+10 XP</strong></div>
                  <div>• Daily Streak Login: <strong>+50 XP</strong></div>
                  <div>• Audio Briefing Listened: <strong>+25 XP</strong></div>
                  <div>• Perfect Quiz Exam: <strong>+50 XP</strong></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'badges' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.badges.map((badge) => {
                const isUnlocked = Boolean(badge.unlockedAt);
                return (
                  <div
                    key={badge.id}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                      isUnlocked
                        ? 'theme-bg-elevated border-indigo-500/40 shadow-sm'
                        : 'theme-bg-surface theme-border opacity-50'
                    }`}
                  >
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center">
                      {badge.id === 'first_quiz' && <Zap className="w-5 h-5 text-amber-400" />}
                      {badge.id === 'anki_scholar' && <Brain className="w-5 h-5 text-indigo-400" />}
                      {badge.id === 'streak_fire' && <Flame className="w-5 h-5 text-amber-500" />}
                      {badge.id === 'free_thinker' && <PenTool className="w-5 h-5 text-emerald-400" />}
                      {badge.id === 'voice_pioneer' && <Mic className="w-5 h-5 text-purple-400" />}
                      {badge.id === 'podcast_listener' && <Headphones className="w-5 h-5 text-blue-400" />}
                      {badge.id === 'mind_cartographer' && <Network className="w-5 h-5 text-cyan-400" />}
                      {badge.id === 'century_club' && <Award className="w-5 h-5 text-indigo-400" />}
                      {badge.id === 'grandmaster' && <Crown className="w-5 h-5 text-amber-400" />}
                      {badge.id === 'speed_demon' && <Clock className="w-5 h-5 text-emerald-400" />}
                      {badge.id === 'polymath' && <BookOpen className="w-5 h-5 text-purple-400" />}
                      {!['first_quiz','anki_scholar','streak_fire','free_thinker','voice_pioneer','podcast_listener','mind_cartographer','century_club','grandmaster','speed_demon','polymath'].includes(badge.id) && (
                        <Award className="w-5 h-5 text-indigo-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold theme-text-primary">
                          {badge.title}
                        </h5>
                        {isUnlocked && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                            Unlocked
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] theme-text-secondary leading-snug mt-0.5">
                        {badge.description}
                      </p>

                      {!isUnlocked && badge.maxProgress && (
                        <div className="mt-2">
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full"
                              style={{
                                width: `${Math.min(100, ((badge.progress || 0) / badge.maxProgress) * 100)}%`
                              }}
                            />
                          </div>
                          <div className="text-[9px] font-mono theme-text-muted mt-0.5">
                            {badge.progress || 0} / {badge.maxProgress}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
