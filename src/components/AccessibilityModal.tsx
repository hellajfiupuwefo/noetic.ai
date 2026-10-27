import React, { useState } from 'react';
import { 
  Accessibility, 
  X, 
  Type, 
  Eye, 
  Minus, 
  Plus, 
  Sparkles, 
  Check, 
  RotateCcw,
  Zap,
  AlignLeft,
  Contrast,
  Sliders,
  Layout,
  Layers,
  Minimize2,
  Maximize2,
  Cpu,
  Feather,
  BookOpen,
  Briefcase,
  Smile,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { AccessibilitySettings, UiMode } from '../types';

interface AccessibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiMode?: UiMode;
  onUpdateUiMode?: (mode: UiMode) => void;
  settings: AccessibilitySettings;
  onUpdateSettings: (newSettings: AccessibilitySettings) => void;
  dynamicFontSize: number;
  onUpdateFontSize: (size: number) => void;
  onResetAccessibility: () => void;
}

interface UiModeOption {
  id: UiMode;
  name: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  recommendedFor: string;
}

const UI_MODES: UiModeOption[] = [
  {
    id: 'compact',
    name: 'Compact',
    tagline: 'High-Density Information',
    description: 'Tighter spacing, condensed card padding, and smaller margins for rapid scanning and multi-tasking.',
    icon: <Minimize2 className="w-4 h-4 text-cyan-400" />,
    recommendedFor: 'Power users, multi-column setups'
  },
  {
    id: 'easy',
    name: 'Easy',
    tagline: 'Relaxed & Friendly Learning',
    description: 'Generous touch targets, larger typography, friendly explanations, and simplified control buttons.',
    icon: <Smile className="w-4 h-4 text-emerald-400" />,
    recommendedFor: 'Casual study, younger students, low stress'
  },
  {
    id: 'professional',
    name: 'Professional',
    tagline: 'Executive Academic Rigor',
    description: 'Structured layout with hairline borders, tabular numerals, formal typography, and study logs.',
    icon: <Briefcase className="w-4 h-4 text-indigo-400" />,
    recommendedFor: 'Medical boards, law exams, research'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    tagline: 'Zen Distraction-Free Focus',
    description: 'Strips away non-essential badges, decorative glows, and secondary sidebars for pure concentration.',
    icon: <Feather className="w-4 h-4 text-amber-400" />,
    recommendedFor: 'Deep focus, exam cramming, ADHD comfort'
  },
  {
    id: 'advanced',
    name: 'Advanced',
    tagline: 'Full Cognitive Telemetry',
    description: 'Exposes diagnostic Bloom tiers (Recall/Analytical/Synthesis), SuperMemo SM-2 intervals, and raw data.',
    icon: <Cpu className="w-4 h-4 text-purple-400" />,
    recommendedFor: 'Educators, cognitive analysts, data tracking'
  }
];

export const AccessibilityModal: React.FC<AccessibilityModalProps> = ({
  isOpen,
  onClose,
  uiMode = 'professional',
  onUpdateUiMode,
  settings,
  onUpdateSettings,
  dynamicFontSize,
  onUpdateFontSize,
  onResetAccessibility
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'ui-modes' | 'typography' | 'assistive'>('ui-modes');

  const toggleSetting = (key: keyof AccessibilitySettings) => {
    onUpdateSettings({
      ...settings,
      [key]: !settings[key]
    });
  };

  const fontPresets = [
    { label: 'Compact', size: 14, desc: '14px' },
    { label: 'Standard', size: 16, desc: '16px' },
    { label: 'Comfortable', size: 18, desc: '18px' },
    { label: 'Large', size: 20, desc: '20px' },
    { label: 'Extra Large', size: 24, desc: '24px' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-xl rounded-2xl theme-bg-surface theme-border border shadow-2xl overflow-hidden animate-scaleIn transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b theme-border flex items-center justify-between theme-bg-elevated/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold theme-text-primary">
                UI Modes &amp; Accessibility Settings
              </h2>
              <p className="text-xs theme-text-secondary">
                Select your preferred interface layout, dyslexic typography, and visual ergonomics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg theme-text-muted hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b theme-border theme-bg-elevated/30 px-5 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('ui-modes')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ui-modes'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent theme-text-secondary hover:theme-text-primary'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>UI Settings &amp; Modes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('typography')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'typography'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent theme-text-secondary hover:theme-text-primary'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Dyslexic Font &amp; Text</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assistive')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'assistive'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent theme-text-secondary hover:theme-text-primary'
            }`}
          >
            <Accessibility className="w-3.5 h-3.5" />
            <span>Vision &amp; Assistive</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* ================= TAB 1: UI SETTINGS & MODES ================= */}
          {activeTab === 'ui-modes' && (
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider theme-text-muted mb-1">
                  Choose Your Interface Layout Mode
                </span>
                <p className="text-xs theme-text-secondary">
                  Tailor the density, typography, and detail level to your current study workflow.
                </p>
              </div>

              <div className="space-y-2.5">
                {UI_MODES.map((mode) => {
                  const isSelected = uiMode === mode.id;
                  return (
                    <div
                      key={mode.id}
                      onClick={() => onUpdateUiMode && onUpdateUiMode(mode.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500/40 shadow-sm'
                          : 'theme-bg-elevated theme-border hover:theme-bg-hover'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-900/40 flex items-center justify-center shrink-0 mt-0.5 border theme-border">
                        {mode.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold theme-text-primary">
                              {mode.name}
                            </span>
                            <span className="text-[11px] theme-text-secondary hidden sm:inline">
                              · {mode.tagline}
                            </span>
                          </div>

                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                              <Check className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 hover:text-slate-300">
                              Select
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] theme-text-secondary leading-relaxed">
                          {mode.description}
                        </p>

                        <div className="mt-1.5 text-[10px] text-slate-400 flex items-center gap-1">
                          <span className="font-semibold text-slate-300">Best for:</span>
                          <span>{mode.recommendedFor}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= TAB 2: DYSLEXIC FONT & TYPOGRAPHY ================= */}
          {activeTab === 'typography' && (
            <div className="space-y-5">
              {/* Dyslexia-Friendly Master Toggle */}
              <div 
                onClick={() => toggleSetting('dyslexicFont')}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  settings.dyslexicFont 
                    ? 'bg-indigo-600/15 border-indigo-500 shadow-sm' 
                    : 'theme-bg-elevated theme-border hover:border-indigo-500/50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold theme-text-primary">
                      Dyslexia-Friendly Typography (Lexend)
                    </span>
                    {settings.dyslexicFont && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        Enabled
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] theme-text-secondary leading-relaxed">
                    Applies research-backed Lexend letterforms featuring expanded character widths, heavier bottom weighting, and distinct letter contours to dramatically reduce visual crowding and character flipping.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={settings.dyslexicFont}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 pointer-events-none mt-1"
                />
              </div>

              {/* Dynamic Text Scaling Stepper & Presets */}
              <div className="p-4 rounded-xl theme-bg-elevated theme-border border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold theme-text-primary flex items-center gap-1.5 uppercase tracking-wider">
                    <Type className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Dynamic Text Scaling</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10">
                    {dynamicFontSize}px
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onUpdateFontSize(Math.max(12, dynamicFontSize - 1))}
                    disabled={dynamicFontSize <= 12}
                    className="w-8 h-8 rounded-lg theme-bg-surface theme-border border hover:theme-bg-hover flex items-center justify-center disabled:opacity-40 transition-colors cursor-pointer"
                    title="Decrease font size"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    type="range"
                    min={12}
                    max={26}
                    step={1}
                    value={dynamicFontSize}
                    onChange={(e) => onUpdateFontSize(parseInt(e.target.value, 10))}
                    className="flex-1 accent-indigo-500 cursor-pointer h-2 rounded-lg bg-slate-700"
                  />

                  <button
                    type="button"
                    onClick={() => onUpdateFontSize(Math.min(26, dynamicFontSize + 1))}
                    disabled={dynamicFontSize >= 26}
                    className="w-8 h-8 rounded-lg theme-bg-surface theme-border border hover:theme-bg-hover flex items-center justify-center disabled:opacity-40 transition-colors cursor-pointer"
                    title="Increase font size"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {fontPresets.map(preset => (
                    <button
                      key={preset.size}
                      type="button"
                      onClick={() => onUpdateFontSize(preset.size)}
                      className={`py-1.5 px-1 text-[11px] rounded-lg border font-medium text-center transition-colors cursor-pointer ${
                        dynamicFontSize === preset.size
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                          : 'theme-bg-surface theme-border theme-text-secondary hover:theme-text-primary'
                      }`}
                    >
                      <span className="block truncate">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family Selection */}
              <div className="p-4 rounded-xl theme-bg-elevated theme-border border space-y-2">
                <span className="text-xs font-bold theme-text-primary block">Active Font Family</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'sans', label: 'Plus Jakarta', desc: 'Standard Neo-Grotesque' },
                    { id: 'lexend', label: 'Lexend', desc: 'Dyslexia Friendly' },
                    { id: 'serif', label: 'Editorial Serif', desc: 'Reading Comfort' },
                    { id: 'mono', label: 'JetBrains Mono', desc: 'Code & Formulas' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        const isLexend = f.id === 'lexend';
                        onUpdateSettings({ 
                          ...settings, 
                          fontFamily: f.id as any,
                          dyslexicFont: isLexend ? true : settings.dyslexicFont
                        });
                      }}
                      className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                        (settings.fontFamily || (settings.dyslexicFont ? 'lexend' : 'sans')) === f.id
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-sm'
                          : 'theme-bg-surface theme-border theme-text-secondary hover:theme-text-primary'
                      }`}
                    >
                      <div className="text-xs leading-none">{f.label}</div>
                      <div className="text-[9px] opacity-75 mt-0.5">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Height & Letter Spacing Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl theme-bg-elevated theme-border border space-y-2">
                  <span className="text-xs font-bold theme-text-primary block">Line Spacing (Leading)</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'normal', label: '1.5x' },
                      { id: 'relaxed', label: '1.85x' },
                      { id: 'loose', label: '2.15x' }
                    ].map(lh => (
                      <button
                        key={lh.id}
                        type="button"
                        onClick={() => onUpdateSettings({ ...settings, lineHeight: lh.id as any })}
                        className={`py-1.5 px-2 rounded-lg border text-xs text-center transition-colors cursor-pointer ${
                          (settings.lineHeight || 'normal') === lh.id
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                            : 'theme-bg-surface theme-border theme-text-secondary hover:theme-text-primary'
                        }`}
                      >
                        {lh.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl theme-bg-elevated theme-border border space-y-2">
                  <span className="text-xs font-bold theme-text-primary block">Letter Spacing (Tracking)</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'normal', label: 'Normal' },
                      { id: 'wide', label: 'Wide' },
                      { id: 'wider', label: 'Wider' }
                    ].map(ls => (
                      <button
                        key={ls.id}
                        type="button"
                        onClick={() => onUpdateSettings({ ...settings, letterSpacing: ls.id as any })}
                        className={`py-1.5 px-2 rounded-lg border text-xs text-center transition-colors cursor-pointer ${
                          (settings.letterSpacing || 'normal') === ls.id
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                            : 'theme-bg-surface theme-border theme-text-secondary hover:theme-text-primary'
                        }`}
                      >
                        {ls.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive Live Typography Preview */}
              <div className="p-4 rounded-xl theme-bg-surface theme-border border space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider theme-text-muted flex items-center justify-between">
                  <span>Interactive Reading Preview</span>
                  <span className="font-mono text-indigo-400">
                    {settings.dyslexicFont ? 'Lexend Dyslexic Mode' : 'Standard'} · {dynamicFontSize}px
                  </span>
                </div>
                <p 
                  className="theme-text-primary leading-relaxed"
                  style={{ fontSize: `${dynamicFontSize}px` }}
                >
                  Active recall stimulates synaptic memory consolidation and fortifies neural pathways against decay.
                </p>
              </div>
            </div>
          )}

          {/* ================= TAB 3: VISION & ASSISTIVE ================= */}
          {activeTab === 'assistive' && (
            <div className="space-y-3">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider theme-text-muted mb-1">
                  Visual &amp; Motor Accessibility Features
                </span>
                <p className="text-xs theme-text-secondary">
                  Standards-compliant WCAG accessibility tools for screen readers, keyboard navigation, and cognitive comfort.
                </p>
              </div>

              {/* 1. High Contrast */}
              <div 
                onClick={() => toggleSetting('highContrast')}
                className="p-3.5 rounded-xl theme-bg-elevated theme-border border hover:border-indigo-500/60 transition-colors flex items-center justify-between gap-3 cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold theme-text-primary block mb-0.5">
                    High Contrast Mode (WCAG AAA)
                  </span>
                  <span className="text-[11px] theme-text-secondary leading-snug block">
                    Enforces crisp high-luminance borders and maximum contrast for text, cards, and input fields.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.highContrast}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 pointer-events-none"
                />
              </div>

              {/* 2. Reduced Motion */}
              <div 
                onClick={() => toggleSetting('reducedMotion')}
                className="p-3.5 rounded-xl theme-bg-elevated theme-border border hover:border-indigo-500/60 transition-colors flex items-center justify-between gap-3 cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold theme-text-primary block mb-0.5">
                    Reduce Motion &amp; Animations
                  </span>
                  <span className="text-[11px] theme-text-secondary leading-snug block">
                    Disables 3D card flips, motion transitions, and pulsing effects for vestibular comfort.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 pointer-events-none"
                />
              </div>

              {/* 3. Colorblind-Friendly Dual Coding */}
              <div 
                onClick={() => toggleSetting('colorblindMarkers')}
                className="p-3.5 rounded-xl theme-bg-elevated theme-border border hover:border-indigo-500/60 transition-colors flex items-center justify-between gap-3 cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold theme-text-primary block mb-0.5">
                    Colorblind-Friendly Indicators
                  </span>
                  <span className="text-[11px] theme-text-secondary leading-snug block">
                    Adds explicit text and glyph markers [✓ Correct] and [✗ Missed] so correctness is never conveyed by color alone.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.colorblindMarkers}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 pointer-events-none"
                />
              </div>

              {/* 4. High-Visibility Keyboard Focus Rings */}
              <div 
                onClick={() => toggleSetting('largeFocusRings')}
                className="p-3.5 rounded-xl theme-bg-elevated theme-border border hover:border-indigo-500/60 transition-colors flex items-center justify-between gap-3 cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold theme-text-primary block mb-0.5">
                    High-Visibility Keyboard Focus Rings
                  </span>
                  <span className="text-[11px] theme-text-secondary leading-snug block">
                    Applies prominent 3px indigo focus halos to all buttons, inputs, and links for keyboard navigation.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.largeFocusRings}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 pointer-events-none"
                />
              </div>

              {/* 5. Relaxed Spacing */}
              <div 
                onClick={() => toggleSetting('relaxedSpacing')}
                className="p-3.5 rounded-xl theme-bg-elevated theme-border border hover:border-indigo-500/60 transition-colors flex items-center justify-between gap-3 cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold theme-text-primary block mb-0.5">
                    Relaxed Reading Margins
                  </span>
                  <span className="text-[11px] theme-text-secondary leading-snug block">
                    Expands paragraph and block margins to prevent visual crowding during long reading sessions.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.relaxedSpacing}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 pointer-events-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t theme-border flex items-center justify-between theme-bg-elevated/40">
          <button
            type="button"
            onClick={onResetAccessibility}
            className="text-xs theme-text-muted hover:theme-text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Standard Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Save &amp; Apply
          </button>
        </div>
      </div>
    </div>
  );
};
