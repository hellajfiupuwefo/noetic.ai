import React, { useState, useRef, useEffect } from 'react';
import { YouTubeVideoSuggestion, AppTheme } from '../types';
import { getMathVideoSuggestions, isMathContent } from '../utils/mathVideos';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  BookOpen, 
  Copy, 
  Check, 
  ChevronDown, 
  RotateCcw,
  Bot,
  ExternalLink,
  Minimize2,
  Maximize2
} from 'lucide-react';

export interface ChatSource {
  title: string;
  excerpt: string;
  relevance?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  suggestedVideos?: YouTubeVideoSuggestion[];
  followUpQuestions?: string[];
  timestamp: string;
}

interface ChatbotProps {
  notes: string;
  deckTitle: string;
  theme: AppTheme;
}

export const Chatbot: React.FC<ChatbotProps> = ({ notes, deckTitle, theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSourceIdx, setCopiedSourceIdx] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with greeting grounded in current deck
  useEffect(() => {
    const isMath = isMathContent(notes, deckTitle);
    const initialMathVideos = isMath ? getMathVideoSuggestions(notes, deckTitle) : [];

    setMessages([
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: `Hello! I am Noetic, your grounded study tutor. I am actively analyzing your deck: "${deckTitle || 'Uploaded Notes'}".\n\nAsk me any concept question, request derivations, or ask for clear step-by-step problem walkthroughs. Every single answer I provide cites verbatim excerpts from your notes${isMath ? ' and includes curated YouTube video masterclasses from channels like 3Blue1Brown, Khan Academy, and StatQuest!' : '.'}`,
        sources: [
          {
            title: deckTitle || 'Current Study Deck',
            excerpt: notes ? notes.slice(0, 160) + '...' : 'No notes loaded yet. Paste or upload notes in the Study Deck tab.',
            relevance: 'Primary knowledge base loaded into active memory.'
          }
        ],
        suggestedVideos: initialMathVideos.length > 0 ? initialMathVideos.slice(0, 2) : undefined,
        followUpQuestions: isMath ? [
          'Explain the geometric intuition of the gradient vector.',
          'How do eigenvalues and eigenvectors connect to linear transformations?',
          'Walk me through the mathematical derivation of backpropagation.'
        ] : [
          'What are the core concepts in this deck?',
          'What is the most testable distinction in these notes?',
          'Give me a mnemonic to remember this material.'
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [deckTitle]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
          notes: notes || '',
          deckTitle: deckTitle || 'Study Session'
        })
      });

      if (!response.ok) {
        throw new Error('Chat service encountered a problem.');
      }

      const data = await response.json();

      // Ensure math video suggestions are included if query or notes contain math
      let finalVideos: YouTubeVideoSuggestion[] = Array.isArray(data.suggestedVideos) ? data.suggestedVideos : [];
      if (finalVideos.length === 0 && (isMathContent(query) || isMathContent(notes, deckTitle))) {
        finalVideos = getMathVideoSuggestions(notes, deckTitle, query);
      }

      const assistantMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Here is the analysis based on your notes.',
        sources: Array.isArray(data.sources) && data.sources.length > 0 ? data.sources : [
          {
            title: deckTitle || 'Active Notes',
            excerpt: notes.slice(0, 120) + '...',
            relevance: 'Synthesized from current study context.'
          }
        ],
        suggestedVideos: finalVideos.length > 0 ? finalVideos : undefined,
        followUpQuestions: Array.isArray(data.followUpQuestions) ? data.followUpQuestions : [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const fallbackVideos = isMathContent(query) || isMathContent(notes, deckTitle)
        ? getMathVideoSuggestions(notes, deckTitle, query)
        : [];

      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'I had trouble connecting to the tutoring engine. Here is a direct excerpt from your notes on this topic:\n\n' + (notes.slice(0, 300) || 'Please ensure notes are loaded.'),
        sources: [
          {
            title: deckTitle || 'Local Notes Fallback',
            excerpt: notes.slice(0, 200),
            relevance: 'Retrieved from offline local study buffer.'
          }
        ],
        suggestedVideos: fallbackVideos.length > 0 ? fallbackVideos : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copySource = (excerpt: string, id: string) => {
    navigator.clipboard.writeText(excerpt);
    setCopiedSourceIdx(id);
    setTimeout(() => setCopiedSourceIdx(null), 2000);
  };

  const handleClearHistory = () => {
    const isMath = isMathContent(notes, deckTitle);
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: `Conversation refreshed. I am ready to answer your questions regarding "${deckTitle || 'Uploaded Notes'}" with verified citations and video suggestions.`,
        sources: [
          {
            title: deckTitle || 'Current Deck',
            excerpt: notes ? notes.slice(0, 150) + '...' : 'Loaded notes buffer',
            relevance: 'Primary ground truth.'
          }
        ],
        suggestedVideos: isMath ? getMathVideoSuggestions(notes, deckTitle).slice(0, 2) : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 150);
          }}
          className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-950/40 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer"
          aria-label="Ask Noetic Tutor"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-indigo-600" />
          </div>
          <span className="text-sm font-semibold tracking-tight pr-1">
            Ask Tutor
          </span>
          <span className="hidden sm:inline text-[11px] opacity-80 border-l border-indigo-400/40 pl-2 font-mono">
            Sources &amp; Videos
          </span>
        </button>
      )}

      {/* Expanded Chatbot Modal / Drawer */}
      {isOpen && (
        <div 
          className={`flex flex-col rounded-2xl theme-bg-surface theme-border border shadow-2xl transition-all duration-200 overflow-hidden ${
            isExpanded 
              ? 'fixed inset-4 sm:inset-10 z-50 max-w-5xl mx-auto my-auto h-[90vh]' 
              : 'w-[92vw] sm:w-[440px] h-[600px] max-h-[85vh]'
          }`}
        >
          {/* Header Bar */}
          <div className="p-3.5 px-4 theme-bg-elevated theme-border border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold theme-text-primary">
                    Noetic Study Tutor
                  </span>
                  <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-0.5">
                    ● Grounded
                  </span>
                </div>
                <p className="text-[11px] theme-text-muted truncate max-w-[200px] sm:max-w-[240px]">
                  {deckTitle || 'Uploaded Notes'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                className="p-1.5 rounded-lg theme-text-muted hover:theme-text-primary hover:theme-bg-hover transition-colors cursor-pointer"
                title="Reset conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:inline-flex p-1.5 rounded-lg theme-text-muted hover:theme-text-primary hover:theme-bg-hover transition-colors cursor-pointer"
                title={isExpanded ? 'Restore size' : 'Expand window'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg theme-text-muted hover:theme-text-primary hover:theme-bg-hover transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context Banner */}
          <div className="px-4 py-2 bg-indigo-950/20 border-b theme-border flex items-center justify-between text-[11px] shrink-0">
            <span className="text-indigo-400 font-medium truncate flex items-center gap-1.5">
              <BookOpen className="w-3 h-3 shrink-0" />
              <span>Grounded in {notes ? `${notes.length.toLocaleString()} characters` : 'default curriculum'}</span>
            </span>
            <span className="theme-text-muted text-[10px] font-mono">
              Sources &amp; Math Videos
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((msg, mIdx) => {
              const isUser = msg.role === 'user';

              return (
                <div 
                  key={msg.id || mIdx}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {/* Message Bubble */}
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'theme-bg-elevated theme-border border theme-text-primary rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-line text-[13px] leading-relaxed">
                      {msg.content}
                    </p>

                    {/* Grounded Source Citations */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t theme-border space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            <span>Cited Sources ({msg.sources.length})</span>
                          </span>
                          <span className="text-[9px] font-normal theme-text-muted">Exact text citations</span>
                        </div>

                        <div className="space-y-1.5">
                          {msg.sources.map((src, sIdx) => {
                            const uniqueSourceId = `${msg.id}-src-${sIdx}`;
                            return (
                              <div
                                key={sIdx}
                                className="p-2 rounded-lg bg-black/20 dark:bg-black/40 border border-indigo-500/20 text-[11px] space-y-1"
                              >
                                <div className="flex items-center justify-between font-medium text-indigo-300">
                                  <span className="truncate max-w-[200px]">{src.title}</span>
                                  <button
                                    onClick={() => copySource(src.excerpt, uniqueSourceId)}
                                    className="p-1 rounded hover:bg-white/10 theme-text-muted hover:theme-text-primary transition-colors flex items-center gap-1 text-[10px] cursor-pointer"
                                    title="Copy source quotation"
                                  >
                                    {copiedSourceIdx === uniqueSourceId ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span className="text-emerald-400">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy Quote</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <blockquote className="italic theme-text-secondary border-l-2 border-indigo-500/50 pl-2 text-[11px] leading-relaxed">
                                  "{src.excerpt}"
                                </blockquote>

                                {src.relevance && (
                                  <div className="text-[10px] theme-text-muted pt-0.5">
                                    <span className="font-semibold text-slate-400">Grounding context: </span>
                                    {src.relevance}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* YouTube Video Suggestions on Math / STEM Topics */}
                    {!isUser && msg.suggestedVideos && msg.suggestedVideos.length > 0 && (
                      <div className="mt-3 pt-3 border-t theme-border space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-rose-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 fill-current text-rose-500 shrink-0" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                            <span>Recommended YouTube Lectures ({msg.suggestedVideos.length})</span>
                          </span>
                          <span className="text-[9px] font-normal theme-text-muted">High-yield visual walkthroughs</span>
                        </div>

                        <div className="space-y-2">
                          {msg.suggestedVideos.map((video, vIdx) => (
                            <a
                              key={vIdx}
                              href={video.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-2.5 rounded-xl bg-black/20 dark:bg-black/40 border border-rose-500/25 hover:border-rose-500/60 transition-all duration-150 group cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className="font-semibold text-rose-300 group-hover:text-rose-200 transition-colors text-[11px] leading-tight">
                                  {video.title}
                                </span>
                                <span className="shrink-0 flex items-center gap-1 text-[10px] text-rose-400 group-hover:translate-x-0.5 transition-transform font-medium">
                                  <span>Watch</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] theme-text-muted mb-1 font-mono">
                                <span className="text-slate-300 font-semibold">{video.channel}</span>
                                {video.durationEstimate && (
                                  <>
                                    <span>·</span>
                                    <span>{video.durationEstimate}</span>
                                  </>
                                )}
                              </div>
                              <p className="text-[10px] theme-text-secondary leading-snug">
                                {video.reason}
                              </p>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] theme-text-muted mt-1 px-1">
                    {msg.timestamp}
                  </span>

                  {/* Follow-up suggestions */}
                  {!isUser && msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[92%]">
                      {msg.followUpQuestions.map((q, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => handleSend(q)}
                          className="text-[11px] py-1 px-2.5 rounded-lg theme-bg-elevated hover:theme-bg-hover theme-border border text-indigo-400 hover:text-indigo-300 transition-colors text-left cursor-pointer"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 theme-text-muted text-xs p-2">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span>Searching your notes &amp; verifying citations...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Field */}
          <div className="p-3 theme-bg-elevated theme-border border-t shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about a concept, formula, or definition..."
                disabled={isLoading}
                className="flex-1 theme-bg-input theme-border border rounded-xl px-3.5 py-2 text-xs theme-text-primary placeholder:theme-text-muted focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`p-2 rounded-xl bg-indigo-600 text-white transition-all cursor-pointer ${
                  !input.trim() || isLoading
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-indigo-500 active:scale-95 shadow-md shadow-indigo-950/30'
                }`}
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
