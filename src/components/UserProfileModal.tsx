import React, { useState } from 'react';
import { UserProfile, UserGamificationProfile, UserAccount } from '../types';
import { 
  X, 
  Check, 
  User,
  GraduationCap,
  Brain,
  BookOpen,
  Microscope,
  Dna,
  Rocket,
  Code2,
  Lightbulb,
  Palette,
  PenTool,
  Zap,
  Activity
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  gamificationProfile?: UserGamificationProfile;
  onOpenLeaderboard?: () => void;
  userAccount?: UserAccount | null;
  onOpenAuth?: (tab?: 'login' | 'register' | 'verify') => void;
  onLogout?: () => void;
}

const ARCHETYPE_AVATARS = [
  { id: 'scholar', label: 'Scholar', icon: GraduationCap, color: 'text-indigo-500' },
  { id: 'thinker', label: 'Thinker', icon: Brain, color: 'text-purple-500' },
  { id: 'reader', label: 'Reader', icon: BookOpen, color: 'text-blue-500' },
  { id: 'scientist', label: 'Scientist', icon: Microscope, color: 'text-teal-500' },
  { id: 'genetics', label: 'Bio', icon: Dna, color: 'text-emerald-500' },
  { id: 'explorer', label: 'Explorer', icon: Rocket, color: 'text-amber-500' },
  { id: 'coder', label: 'Coder', icon: Code2, color: 'text-cyan-500' },
  { id: 'innovator', label: 'Innovator', icon: Lightbulb, color: 'text-yellow-500' },
  { id: 'creative', label: 'Creative', icon: Palette, color: 'text-pink-500' },
  { id: 'writer', label: 'Writer', icon: PenTool, color: 'text-rose-500' },
  { id: 'speed', label: 'Sprint', icon: Zap, color: 'text-amber-500' },
  { id: 'clinician', label: 'Medical', icon: Activity, color: 'text-red-500' }
];

const STUDY_PREFERENCES = [
  { id: 'recall', title: 'Active Recall', desc: 'Focus on question retrieval drills' },
  { id: 'spaced', title: 'Spaced Repetition', desc: 'Auto-schedule reviews by difficulty' },
  { id: 'feedback', title: 'Instant Feedback', desc: 'Detailed explanation on each response' },
  { id: 'exam', title: 'Exam Mode', desc: 'Realistic timed exam simulations' },
  { id: 'citations', title: 'Direct Citations', desc: 'Quote exact notes supporting answers' },
  { id: 'audio', title: 'Audio Briefings', desc: 'Podcast style lesson overviews' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  userAccount,
  onLogout
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [avatar, setAvatar] = useState(profile.avatar || 'scholar');
  const [institution, setInstitution] = useState(profile.institution);
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>(['recall', 'spaced', 'feedback', 'citations']);
  const [isSavedToast, setIsSavedToast] = useState(false);

  const togglePref = (id: string) => {
    if (selectedPrefs.includes(id)) {
      setSelectedPrefs(selectedPrefs.filter(p => p !== id));
    } else {
      setSelectedPrefs([...selectedPrefs, id]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...profile,
      name: name.trim() || 'Scholar',
      email: email.trim(),
      avatar,
      institution: institution.trim(),
      studyGoal: selectedPrefs.join(', ')
    };

    const token = localStorage.getItem('noetic_auth_token');
    if (token) {
      try {
        await fetch('/api/auth/update-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            institution: institution.trim(),
            avatar
          })
        });
      } catch (err) {
        console.warn('Could not sync profile:', err);
      }
    }

    onSaveProfile(updated);
    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      onClose();
    }, 500);
  };

  // Find active archetype
  const activeArchetype = ARCHETYPE_AVATARS.find(a => a.id === avatar) || ARCHETYPE_AVATARS[0];
  const ActiveIcon = activeArchetype.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-3xl rounded-3xl theme-bg-surface theme-border border shadow-2xl overflow-hidden animate-scaleIn transition-colors max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b theme-border flex items-center justify-between text-center relative">
          <div className="w-full space-y-1">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-1 border border-indigo-500/20">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold theme-text-primary">
              Learner Profile
            </h2>
            <p className="text-xs theme-text-secondary">
              Customize your study identity and active learning preferences.
            </p>
          </div>

          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full theme-text-muted hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {/* Top 2 Columns: Avatar (Left) + Study Preferences (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* LEFT: Your Avatar Badge (5 cols) */}
            <div className="md:col-span-5 p-6 rounded-3xl theme-bg-elevated theme-border border space-y-4 text-center">
              <div className="text-xs font-bold theme-text-muted uppercase tracking-wider">
                Learner Badge
              </div>

              {/* Circular Avatar Ring with Lucide Icon */}
              <div className="w-20 h-20 rounded-2xl border-2 border-indigo-500/30 bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm mx-auto">
                <ActiveIcon className={`w-9 h-9 ${activeArchetype.color}`} />
              </div>

              <div className="text-xs font-semibold theme-text-primary">
                {activeArchetype.label} Archetype
              </div>

              {/* Vector Icon Archetype Grid */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {ARCHETYPE_AVATARS.map(opt => {
                  const Icon = opt.icon;
                  const isSelected = avatar === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAvatar(opt.id)}
                      title={opt.label}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm scale-105'
                          : 'theme-bg-surface theme-border border hover:border-indigo-400/50 hover:scale-105 text-slate-500'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : opt.color}`} />
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setAvatar('scholar')}
                className="text-[11px] theme-text-muted hover:theme-text-primary underline cursor-pointer pt-2 block mx-auto"
              >
                Reset to default
              </button>
            </div>

            {/* RIGHT: Study Preferences (7 cols) */}
            <div className="md:col-span-7 space-y-3">
              <div className="text-xs font-bold theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-indigo-600 dark:text-indigo-400">●</span>
                <span>Study Preferences</span>
              </div>

              {/* 2-Column Rounded Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STUDY_PREFERENCES.map(pref => {
                  const isChecked = selectedPrefs.includes(pref.id);
                  return (
                    <div
                      key={pref.id}
                      onClick={() => togglePref(pref.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-xs ring-1 ring-indigo-500/20'
                          : 'theme-bg-elevated theme-border hover:border-indigo-400/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isChecked ? 'text-indigo-600 dark:text-indigo-400' : 'theme-text-primary'}`}>
                          {pref.title}
                        </span>
                        {isChecked && (
                          <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <p className="text-[11px] theme-text-muted mt-1 leading-snug">
                        {pref.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Card: Account & University Details */}
          <div className="p-6 rounded-3xl theme-bg-elevated theme-border border space-y-4">
            <div className="text-xs font-bold theme-text-muted uppercase tracking-wider">
              Account Details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold theme-text-muted uppercase block mb-1">
                  Name / Alias
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full theme-bg-surface theme-border border rounded-2xl px-3.5 py-2 text-xs sm:text-sm theme-text-primary outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold theme-text-muted uppercase block mb-1">
                  School / Institution
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Stanford University"
                  className="w-full theme-bg-surface theme-border border rounded-2xl px-3.5 py-2 text-xs sm:text-sm theme-text-primary outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {userAccount && (
              <div className="flex items-center justify-between pt-2 border-t theme-border text-xs">
                <span className="theme-text-muted">
                  Signed in as <strong>{userAccount.email}</strong>
                </span>
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                    className="text-rose-500 hover:underline font-semibold cursor-pointer"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t theme-border theme-bg-elevated/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full theme-bg-surface theme-border border text-xs font-semibold theme-text-secondary hover:theme-text-primary cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
          >
            {isSavedToast ? 'Saved!' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};
