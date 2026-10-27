import React, { useState, useEffect } from 'react';
import { SampleDeck, AppTheme, UserProfile, DeckRole, UserGamificationProfile, UserAccount, UiMode } from '../types';
import { NoeticLogo } from './NoeticLogo';
import { 
  Plus, 
  BookOpen, 
  Layers, 
  Minus, 
  Sliders, 
  Lock,
  Menu,
  X,
  HelpCircle,
  Moon,
  Sun,
  LogOut,
  KeyRound,
  FileText,
  TrendingUp,
  Search,
  User,
  Network
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'home' | 'setup' | 'quiz' | 'exam' | 'flashcards' | 'guide' | 'results' | 'analytics';
  onSelectTab: (tab: 'home' | 'setup' | 'quiz' | 'exam' | 'flashcards' | 'guide' | 'results' | 'analytics') => void;
  onLoadDeck: (deck: SampleDeck) => void;
  onNewDeck: () => void;
  hasActiveQuiz: boolean;
  hasActiveCards: boolean;
  hasActiveGuide: boolean;
  theme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
  dynamicFontSize: number;
  onUpdateFontSize: (size: number) => void;
  uiMode?: UiMode;
  onUpdateUiMode?: (mode: UiMode) => void;
  isDyslexic?: boolean;
  onToggleDyslexic?: () => void;
  userProfile?: UserProfile;
  onOpenProfile?: () => void;
  currentRole?: DeckRole;
  onOpenRbac?: () => void;
  onOpenCollab?: () => void;
  onOpenAccessibility?: () => void;
  gamificationProfile?: UserGamificationProfile;
  onOpenLeaderboard?: () => void;
  userAccount?: UserAccount | null;
  onOpenAuth?: (tab?: 'login' | 'register' | 'verify') => void;
  onLogout?: () => void;
  onOpenTutorial?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  hasActiveQuiz,
  hasActiveCards,
  hasActiveGuide,
  theme,
  onSelectTheme,
  dynamicFontSize,
  onUpdateFontSize,
  userProfile,
  onOpenProfile,
  userAccount,
  onOpenAuth,
  onLogout,
  onOpenTutorial
}) => {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.nav-menu-container')) {
        setShowSettingsMenu(false);
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleTheme = () => {
    if (theme === 'cream') {
      onSelectTheme('dark');
    } else {
      onSelectTheme('cream');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b theme-header backdrop-blur-md transition-colors print:hidden">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Left: Brand Mark (Geometric Noetic Glyph + Clean Noetic.ai Label) */}
        <div className="flex items-center gap-6 shrink-0">
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2.5 focus:outline-none cursor-pointer group"
            title="Noetic.ai Home"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-600/30 group-hover:scale-105 transition-transform shrink-0">
              <NoeticLogo className="w-4 h-4 text-white" />
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight theme-text-primary whitespace-nowrap">
              Noetic<span className="text-indigo-600">.ai</span>
            </span>
          </button>

          {/* Center: Sleek Compact Navigation Tabs that fit effortlessly */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-medium theme-text-secondary">
            {/* 1. Search / Home */}
            <button
              onClick={() => onSelectTab('home')}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'home'
                  ? 'bg-indigo-600/10 text-indigo-600 border border-indigo-500/30 font-semibold shadow-xs'
                  : 'hover:theme-text-primary hover:bg-slate-500/5'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>

            {/* 2. Study Builder */}
            <button
              onClick={() => {
                if (!userAccount) {
                  onOpenAuth?.('login');
                } else {
                  onSelectTab('setup');
                }
              }}
              title={!userAccount ? 'Sign in to create custom study decks' : 'Study Builder'}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                !userAccount
                  ? 'opacity-70 hover:opacity-100 hover:theme-text-primary'
                  : currentTab === 'setup'
                  ? 'bg-indigo-600/10 text-indigo-600 border border-indigo-500/30 font-semibold shadow-xs'
                  : 'hover:theme-text-primary hover:bg-slate-500/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Builder</span>
              {!userAccount && <Lock className="w-3 h-3 text-slate-400" />}
            </button>

            {/* 3. Quiz */}
            <button
              onClick={() => {
                if (!userAccount) {
                  onOpenAuth?.('login');
                } else {
                  onSelectTab('quiz');
                }
              }}
              title={!userAccount ? 'Sign in to access quizzes' : 'Interactive Quiz / Practice'}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                !userAccount
                  ? 'opacity-70 hover:opacity-100 hover:theme-text-primary'
                  : currentTab === 'quiz'
                  ? 'bg-indigo-600/10 text-indigo-600 border border-indigo-500/30 font-semibold shadow-xs'
                  : 'hover:theme-text-primary hover:bg-slate-500/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Quiz</span>
              {!userAccount && <Lock className="w-3 h-3 text-slate-400" />}
            </button>

            {/* 4. Flashcards */}
            <button
              onClick={() => {
                if (!userAccount) {
                  onOpenAuth?.('login');
                } else {
                  onSelectTab('flashcards');
                }
              }}
              title={!userAccount ? 'Sign in to access flashcards' : 'Spaced Repetition Flashcards'}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                !userAccount
                  ? 'opacity-70 hover:opacity-100 hover:theme-text-primary'
                  : currentTab === 'flashcards'
                  ? 'bg-indigo-600/10 text-indigo-600 border border-indigo-500/30 font-semibold shadow-xs'
                  : 'hover:theme-text-primary hover:bg-slate-500/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cards</span>
              {!userAccount && <Lock className="w-3 h-3 text-slate-400" />}
            </button>

            {/* 5. Brain Map */}
            <button
              onClick={() => {
                if (!userAccount) {
                  onOpenAuth?.('login');
                } else {
                  onSelectTab('guide');
                }
              }}
              title={!userAccount ? 'Sign in to access Brain Map' : 'Brain Map & AI Guide'}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                !userAccount
                  ? 'opacity-70 hover:opacity-100 hover:theme-text-primary'
                  : currentTab === 'guide'
                  ? 'bg-indigo-600/10 text-indigo-600 border border-indigo-500/30 font-semibold shadow-xs'
                  : 'hover:theme-text-primary hover:bg-slate-500/5'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Brain Map</span>
              {!userAccount && <Lock className="w-3 h-3 text-slate-400" />}
            </button>

            {/* 6. Progress */}
            <button
              onClick={() => {
                if (!userAccount) {
                  onOpenAuth?.('login');
                } else {
                  onSelectTab('analytics');
                }
              }}
              title={!userAccount ? 'Sign in to track progress' : 'Progress'}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                !userAccount
                  ? 'opacity-70 hover:opacity-100 hover:theme-text-primary'
                  : currentTab === 'analytics'
                  ? 'bg-indigo-600/10 text-indigo-600 border border-indigo-500/30 font-semibold shadow-xs'
                  : 'hover:theme-text-primary hover:bg-slate-500/5'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Progress</span>
              {!userAccount && <Lock className="w-3 h-3 text-slate-400" />}
            </button>
          </nav>
        </div>

        {/* Right: Round Utility Buttons & User Profile */}
        <div className="flex items-center gap-2 nav-menu-container shrink-0">
          {/* Quick Tour Circular Button */}
          {onOpenTutorial && (
            <button
              onClick={onOpenTutorial}
              className="w-8 h-8 rounded-full theme-bg-surface theme-border border hover:border-indigo-400/60 theme-text-secondary hover:theme-text-primary flex items-center justify-center transition-all cursor-pointer shadow-xs"
              title="Quick Tour"
            >
              <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={handleToggleTheme}
            className="w-8 h-8 rounded-full theme-bg-surface theme-border border hover:border-indigo-400/60 theme-text-secondary hover:theme-text-primary flex items-center justify-center transition-all cursor-pointer shadow-xs"
            title={`Switch to ${theme === 'cream' ? 'Dark' : 'Cream'} Mode`}
          >
            {theme === 'cream' ? (
              <Moon className="w-4 h-4 text-slate-600" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* Settings Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowSettingsMenu(!showSettingsMenu);
                setShowUserMenu(false);
              }}
              className="w-8 h-8 rounded-full theme-bg-surface theme-border border hover:border-indigo-400/60 theme-text-secondary hover:theme-text-primary flex items-center justify-center transition-all cursor-pointer shadow-xs"
              title="Display & Font Settings"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </button>

            {/* Settings Dropdown */}
            {showSettingsMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl theme-bg-surface theme-border border shadow-2xl p-4 z-50 space-y-4 animate-scaleIn">
                <div className="flex items-center justify-between pb-2 border-b theme-border text-xs font-bold theme-text-primary">
                  <span>Display &amp; Appearance</span>
                  <button onClick={() => setShowSettingsMenu(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Font Scaling */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="theme-text-secondary font-medium">Text Size</span>
                    <span className="font-mono text-xs font-bold text-indigo-600">{dynamicFontSize}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateFontSize(Math.max(12, dynamicFontSize - 1))}
                      className="w-7 h-7 rounded-full theme-bg-elevated theme-border border flex items-center justify-center text-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="range"
                      min={12}
                      max={24}
                      value={dynamicFontSize}
                      onChange={(e) => onUpdateFontSize(parseInt(e.target.value, 10))}
                      className="flex-1 accent-indigo-600 h-1.5 rounded-lg bg-slate-300 dark:bg-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateFontSize(Math.min(24, dynamicFontSize + 1))}
                      className="w-7 h-7 rounded-full theme-bg-elevated theme-border border flex items-center justify-center text-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Color Theme */}
                <div className="space-y-2 pt-2 border-t theme-border">
                  <span className="text-xs theme-text-secondary font-medium block">Color Themes</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'cream' as const, label: 'Clean', swatch: '#f8fafc' },
                      { id: 'dark' as const, label: 'Slate', swatch: '#1e2025' },
                      { id: 'blue' as const, label: 'Navy', swatch: '#0b0f17' },
                      { id: 'sage' as const, label: 'Sage', swatch: '#14221c' }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => onSelectTheme(t.id)}
                        className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                          theme === t.id ? 'border-indigo-600 ring-2 ring-indigo-500/20' : 'theme-border'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full border shadow-xs" style={{ backgroundColor: t.swatch }} />
                        <span className="text-[10px] font-medium">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Account / Sign In */}
          <div className="relative">
            {userAccount ? (
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowSettingsMenu(false);
                }}
                className="w-8 h-8 rounded-full theme-bg-elevated theme-border border hover:border-indigo-400/60 flex items-center justify-center text-xs shadow-xs transition-all cursor-pointer font-bold text-indigo-600 dark:text-indigo-400"
                title={`${userAccount.username} Profile`}
              >
                <span>{userAccount.username.slice(0, 2).toUpperCase()}</span>
              </button>
            ) : (
              <button
                onClick={() => onOpenAuth?.('login')}
                className="px-3.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <KeyRound className="w-3 h-3" />
                <span>Sign In</span>
              </button>
            )}

            {/* User Popover */}
            {showUserMenu && userAccount && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl theme-bg-surface theme-border border shadow-2xl p-4 z-50 space-y-3.5 animate-scaleIn">
                <div className="flex items-center gap-3 pb-3 border-b theme-border">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 font-bold flex items-center justify-center text-sm shrink-0">
                    {userAccount.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <span className="font-bold text-sm theme-text-primary block truncate">
                      {userAccount.username}
                    </span>
                    <span className="text-[11px] theme-text-muted block truncate">
                      {userAccount.email}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  {onOpenProfile && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenProfile();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold theme-text-primary hover:theme-bg-elevated transition-colors flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Profile &amp; Preferences</span>
                    </button>
                  )}

                  {onLogout && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Nav Toggle */}
          <button
            onClick={() => setShowMobileNav(!showMobileNav)}
            className="md:hidden p-1.5 rounded-full theme-bg-surface theme-border border text-slate-600 dark:text-slate-300"
          >
            {showMobileNav ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {showMobileNav && (
        <div className="md:hidden p-3 border-t theme-border theme-bg-surface space-y-1 animate-fadeIn">
          <button
            onClick={() => { onSelectTab('home'); setShowMobileNav(false); }}
            className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold theme-text-primary hover:bg-indigo-500/10 flex items-center gap-2"
          >
            <Search className="w-4 h-4 text-indigo-600" />
            <span>Search</span>
          </button>
          <button
            onClick={() => {
              setShowMobileNav(false);
              if (!userAccount) onOpenAuth?.('login');
              else onSelectTab('setup');
            }}
            className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold theme-text-primary hover:bg-indigo-500/10 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Study Builder</span>
            </div>
            {!userAccount && <Lock className="w-3 h-3 text-slate-400" />}
          </button>
          <button
            onClick={() => {
              setShowMobileNav(false);
              if (!userAccount) onOpenAuth?.('login');
              else onSelectTab('quiz');
            }}
            className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold theme-text-primary hover:bg-indigo-500/10 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Quiz &amp; FRQ</span>
            </div>
            {!userAccount && <Lock className="w-3 h-3 text-slate-400" />}
          </button>
          <button
            onClick={() => {
              setShowMobileNav(false);
              if (!userAccount) onOpenAuth?.('login');
              else onSelectTab('flashcards');
            }}
            className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold theme-text-primary hover:bg-indigo-500/10 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Flashcards</span>
            </div>
            {!userAccount && <Lock className="w-3 h-3 text-slate-400" />}
          </button>
          <button
            onClick={() => {
              setShowMobileNav(false);
              if (!userAccount) onOpenAuth?.('login');
              else onSelectTab('guide');
            }}
            className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold theme-text-primary hover:bg-indigo-500/10 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-indigo-600" />
              <span>Brain Map &amp; Guide</span>
            </div>
            {!userAccount && <Lock className="w-3 h-3 text-slate-400" />}
          </button>
          <button
            onClick={() => {
              setShowMobileNav(false);
              if (!userAccount) onOpenAuth?.('login');
              else onSelectTab('analytics');
            }}
            className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold theme-text-primary hover:bg-indigo-500/10 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Progress</span>
            </div>
            {!userAccount && <Lock className="w-3 h-3 text-slate-400" />}
          </button>
        </div>
      )}
    </header>
  );
};
