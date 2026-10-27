import React, { useState } from 'react';
import { StudyGuide } from '../types';
import { getMathVideoSuggestions, isMathContent } from '../utils/mathVideos';
import { exportStudyGuideToPDF } from '../utils/pdfExport';
import { MindMapVisualizer } from './MindMapVisualizer';
import { AudioBriefingPlayer } from './AudioBriefingPlayer';
import { 
  BookOpen, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  Copy, 
  Printer, 
  Play, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  ArrowRight, 
  ExternalLink, 
  Video, 
  Download, 
  FileDown, 
  Check 
} from 'lucide-react';

interface StudyGuideViewProps {
  guide: StudyGuide;
  title: string;
  onStartQuiz: () => void;
  onStartFlashcards: () => void;
  onQuit: () => void;
  onEarnXP?: (amount: number, reason: string, updates?: any) => void;
  notes?: string;
}

export const StudyGuideView: React.FC<StudyGuideViewProps> = ({
  guide,
  title,
  onStartQuiz,
  onStartFlashcards,
  onQuit,
  onEarnXP,
  notes
}) => {
  const [revealedQA, setRevealedQA] = useState<Set<number>>(new Set());
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const effectiveMathVideos = (guide.mathVideos && guide.mathVideos.length > 0)
    ? guide.mathVideos
    : (isMathContent(guide.overview, title || guide.title)
      ? getMathVideoSuggestions(guide.overview, title || guide.title)
      : []);

  const toggleQA = (idx: number) => {
    setRevealedQA(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleDownloadPDF = () => {
    try {
      setIsExportingPDF(true);
      exportStudyGuideToPDF(guide, title || guide.title);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setTimeout(() => setIsExportingPDF(false), 800);
    }
  };

  const handleCopyMarkdown = () => {
    let md = `# ${guide.title || title}\n\n`;
    md += `## Executive Synopsis\n${guide.overview}\n\n`;
    md += `## Core Concepts\n`;
    guide.keyConcepts.forEach(c => {
      md += `### ${c.term}\n${c.explanation}\n*Example/Application:* ${c.example || 'N/A'}\n\n`;
    });
    md += `## Key Takeaways\n`;
    guide.keyTakeaways.forEach(t => {
      md += `- ${t}\n`;
    });
    md += `\n## Rapid-Fire Recall Q&A\n`;
    guide.quickReviewQuestions.forEach(q => {
      md += `**Q: ${q.q}**\nA: ${q.a}\n\n`;
    });

    if (effectiveMathVideos.length > 0) {
      md += `## Recommended YouTube Math Masterclasses\n`;
      effectiveMathVideos.forEach(v => {
        md += `- [${v.title}](${v.url}) by ${v.channel} (${v.durationEstimate || 'Video'}) — ${v.reason}\n`;
      });
      md += '\n';
    }

    navigator.clipboard.writeText(md);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 print:p-0 print:max-w-none">
      {/* Editorial Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Study Guide</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold theme-text-primary">
            {guide.title || title}
          </h1>
        </div>

        {/* Action Buttons: PDF Download, Print, Copy */}
        <div className="flex items-center gap-2 flex-wrap print:hidden">
          <button
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title="Generate and download a clean PDF briefing"
          >
            {isExportingPDF ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isExportingPDF ? 'Generating PDF...' : 'Download as PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg theme-bg-surface theme-border border text-xs font-medium theme-text-primary hover:theme-bg-hover transition-colors cursor-pointer"
            title="Open browser print dialog"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-500" />
            <span>Print Sheet</span>
          </button>

          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg theme-bg-surface theme-border border text-xs font-medium theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
          >
            {copyFeedback ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-indigo-500" />}
            <span>{copyFeedback ? 'Copied MD!' : 'Copy Markdown'}</span>
          </button>
        </div>
      </div>

      {/* Section 1: Executive Overview */}
      <div className="theme-bg-surface theme-border border rounded-2xl p-6 mb-6 theme-shadow transition-colors">
        <h2 className="text-xs font-semibold theme-text-muted uppercase tracking-wider mb-2">
          Summary
        </h2>
        <p className="text-sm theme-text-secondary leading-relaxed">
          {guide.overview}
        </p>
      </div>

      {/* AI Audio Briefing & Conversational Podcast */}
      <div className="print:hidden">
        <AudioBriefingPlayer
          title={guide.title || title}
          overview={guide.overview}
          keyTakeaways={guide.keyTakeaways}
          notes={notes}
          onPodcastCompleted={() => onEarnXP?.(25, 'Completed AI Audio Briefing', { podcastListened: true })}
        />
      </div>

      {/* Interactive Concept Mind Map & Knowledge Graph */}
      <div className="print:hidden">
        <MindMapVisualizer
          conceptMap={guide.conceptMap}
          title={guide.title || title}
          onLaunchTopicQuiz={(_topic) => {
            onEarnXP?.(10, 'Explored Mind Map Branch', { mindMapExplored: true });
            onStartQuiz();
          }}
          onLaunchTopicCards={(_topic) => {
            onEarnXP?.(10, 'Explored Mind Map Branch', { mindMapExplored: true });
            onStartFlashcards();
          }}
        />
      </div>

      {/* Section 2: Key Concepts Matrix */}
      <div className="theme-bg-surface theme-border border rounded-2xl p-6 mb-6 theme-shadow transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold theme-text-muted uppercase tracking-wider">
            Key Concepts ({guide.keyConcepts.length})
          </h2>
          <span className="text-[11px] theme-text-muted">Definitions &amp; Examples</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guide.keyConcepts.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl theme-bg-elevated theme-border border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-indigo-500">
                    {idx + 1}. {item.term}
                  </span>
                </div>
                <p className="text-xs theme-text-primary leading-relaxed mb-3">
                  {item.explanation}
                </p>
              </div>

              {item.example && (
                <div className="pt-2 border-t theme-border text-[11px] theme-text-secondary italic">
                  <span className="font-semibold not-italic text-slate-400">Application: </span>
                  {item.example}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: High-Yield Takeaways */}
      <div className="theme-bg-surface theme-border border rounded-2xl p-6 mb-6 theme-shadow transition-colors">
        <h2 className="text-xs font-semibold theme-text-muted uppercase tracking-wider mb-3">
          Key Takeaways
        </h2>
        <div className="space-y-2.5">
          {guide.keyTakeaways.map((takeaway, idx) => (
            <div key={idx} className="flex items-start gap-3 text-xs theme-text-secondary">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{takeaway}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Rapid-Fire Recall QA */}
      <div className="theme-bg-surface theme-border border rounded-2xl p-6 mb-6 theme-shadow transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-semibold theme-text-muted uppercase tracking-wider">
              Quick Review Questions
            </h2>
            <span className="text-[11px] theme-text-muted">Click any question to see the answer</span>
          </div>
          <HelpCircle className="w-4 h-4 text-indigo-500" />
        </div>

        <div className="space-y-3">
          {guide.quickReviewQuestions.map((item, idx) => {
            const isRevealed = revealedQA.has(idx);
            return (
              <div 
                key={idx}
                onClick={() => toggleQA(idx)}
                className="p-3.5 rounded-xl theme-bg-elevated theme-border border cursor-pointer hover:border-indigo-500/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium theme-text-primary">
                    <span className="font-bold text-indigo-500 mr-2">Q{idx + 1}:</span>
                    {item.q}
                  </span>
                  {isRevealed ? (
                    <ChevronUp className="w-4 h-4 text-indigo-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 theme-text-muted shrink-0" />
                  )}
                </div>

                {isRevealed && (
                  <div className="mt-2.5 pt-2.5 border-t theme-border text-xs text-emerald-600 dark:text-emerald-400 animate-fadeIn">
                    <span className="font-semibold text-slate-400 mr-2">Answer:</span>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 5: Curated YouTube Video Masterclasses (Math & STEM) */}
      {effectiveMathVideos.length > 0 && (
        <div className="theme-bg-surface theme-border border border-rose-500/30 rounded-2xl p-6 mb-6 theme-shadow transition-colors animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  Curated YouTube Masterclasses &amp; Visual Intuition
                </h2>
                <span className="text-[11px] theme-text-muted">
                  High-yield lectures from premier educational creators (3Blue1Brown, StatQuest, Khan Academy)
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
              STEM Grounded
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {effectiveMathVideos.map((video, idx) => (
              <a
                key={idx}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-4 rounded-xl theme-bg-elevated theme-border border hover:border-rose-400/60 transition-all flex flex-col justify-between cursor-pointer card-hover"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-sm font-bold theme-text-primary group-hover:text-rose-400 transition-colors leading-snug">
                      {video.title}
                    </h3>
                    <ExternalLink className="w-4 h-4 text-rose-400 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>

                  <div className="flex items-center gap-2 text-xs theme-text-muted mb-2.5 font-mono">
                    <span className="font-semibold text-rose-300 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                      {video.channel}
                    </span>
                    {video.durationEstimate && (
                      <span className="text-[11px] theme-text-secondary">
                        ⏱ {video.durationEstimate}
                      </span>
                    )}
                  </div>

                  <p className="text-xs theme-text-secondary leading-relaxed">
                    {video.reason}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t theme-border flex items-center justify-between text-xs font-medium text-rose-400 group-hover:text-rose-300">
                  <span>Watch on YouTube</span>
                  <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Next Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 print:hidden">
        <div className="text-xs theme-text-secondary">
          Ready to verify your understanding under examination conditions?
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onStartFlashcards}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold theme-bg-surface theme-border border theme-text-primary hover:theme-bg-hover transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Generate Flashcards</span>
          </button>

          <button
            onClick={onStartQuiz}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Practice Quiz</span>
          </button>
        </div>
      </div>
    </div>
  );
};
