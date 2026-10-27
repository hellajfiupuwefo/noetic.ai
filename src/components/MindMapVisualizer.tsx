import React, { useState, useMemo, useRef } from 'react';
import { ConceptMapNode } from '../types';
import { 
  Network, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Layers, 
  Play, 
  ChevronRight, 
  Search, 
  Sparkles, 
  Info,
  CheckCircle,
  Share2
} from 'lucide-react';

interface MindMapVisualizerProps {
  conceptMap?: {
    root: string;
    children: ConceptMapNode[];
  };
  title: string;
  onLaunchTopicQuiz?: (topicName: string) => void;
  onLaunchTopicCards?: (topicName: string) => void;
}

export const MindMapVisualizer: React.FC<MindMapVisualizerProps> = ({
  conceptMap,
  title,
  onLaunchTopicQuiz,
  onLaunchTopicCards
}) => {
  const [selectedNode, setSelectedNode] = useState<{
    name: string;
    details: string;
    subtopics: string[];
    isRoot?: boolean;
    parent?: string;
  } | null>(null);

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Default expand all top-level categories
    const initial = new Set<string>();
    if (conceptMap?.children) {
      conceptMap.children.forEach(c => initial.add(c.name));
    }
    return initial;
  });

  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'graph' | 'tree'>('graph');

  const rootName = conceptMap?.root || title || 'Core Knowledge Domain';
  const children = useMemo(() => conceptMap?.children || [], [conceptMap]);

  // Fallback tree generation if children are sparse
  const effectiveChildren = useMemo(() => {
    if (children.length > 0) return children;
    return [
      {
        name: 'Foundations & Terminology',
        details: 'Baseline definitions, structural principles, and standard taxonomy.',
        subtopics: ['Core Definitions', 'Historical Context', 'Elementary Rules']
      },
      {
        name: 'Mechanisms & Dynamics',
        details: 'Interactions, energetic pathways, and governing operational equations.',
        subtopics: ['Primary Reactions', 'Feedback Loops', 'Rate Limiting Steps']
      },
      {
        name: 'Applications & Edge Cases',
        details: 'Clinical, engineering, or empirical synthesis and boundary behavior.',
        subtopics: ['Real-world Scenarios', 'Pathological Anomalies', 'Experimental Validation']
      }
    ];
  }, [children]);

  // Layout calculations for the SVG Mind Map
  // Left: Root, Middle: Categories, Right: Subtopics
  const layout = useMemo(() => {
    const rootPos = { x: 120, y: 320 };
    const categorySpacing = Math.max(120, 640 / Math.max(effectiveChildren.length, 1));
    const startY = 320 - ((effectiveChildren.length - 1) * categorySpacing) / 2;

    const nodes: Array<{
      id: string;
      name: string;
      details: string;
      subtopics: string[];
      x: number;
      y: number;
      isRoot?: boolean;
      color: string;
      subtopicNodes: Array<{ name: string; x: number; y: number }>;
    }> = [];

    const palette = [
      '#6366f1', // Indigo
      '#06b6d4', // Cyan
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#ec4899', // Pink
      '#8b5cf6'  // Purple
    ];

    effectiveChildren.forEach((child, idx) => {
      const cy = startY + idx * categorySpacing;
      const cx = 460;
      const color = palette[idx % palette.length];

      const subtopicNodes: Array<{ name: string; x: number; y: number }> = [];
      const isExpanded = expandedNodes.has(child.name);

      if (isExpanded && child.subtopics) {
        const subSpacing = 36;
        const subStartY = cy - ((child.subtopics.length - 1) * subSpacing) / 2;
        child.subtopics.forEach((sub, sIdx) => {
          subtopicNodes.push({
            name: sub,
            x: 780,
            y: subStartY + sIdx * subSpacing
          });
        });
      }

      nodes.push({
        id: `node-${idx}`,
        name: child.name,
        details: child.details,
        subtopics: child.subtopics || [],
        x: cx,
        y: cy,
        color,
        subtopicNodes
      });
    });

    return { rootPos, nodes };
  }, [effectiveChildren, expandedNodes]);

  const toggleExpand = (nodeName: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeName)) next.delete(nodeName);
      else next.add(nodeName);
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return layout.nodes;
    const q = searchQuery.toLowerCase();
    return layout.nodes.filter(
      n => n.name.toLowerCase().includes(q) ||
           n.details.toLowerCase().includes(q) ||
           n.subtopics.some(s => s.toLowerCase().includes(q))
    );
  }, [layout.nodes, searchQuery]);

  return (
    <div className="theme-bg-surface theme-border border rounded-2xl overflow-hidden mb-8 shadow-sm">
      {/* Mind Map Header */}
      <div className="p-4 sm:p-5 border-b theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold theme-text-primary flex items-center gap-2">
              <span>Interactive Concept Mind Map &amp; Knowledge Graph</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Spatial Recall
              </span>
            </h3>
            <p className="text-[11px] theme-text-muted">
              Click any node to inspect details, expand branches, or generate targeted drills.
            </p>
          </div>
        </div>

        {/* View mode & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 theme-text-muted" />
            <input
              type="text"
              placeholder="Filter topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg text-xs theme-bg-elevated theme-border border theme-text-primary placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-36 sm:w-44"
            />
          </div>

          <div className="flex items-center rounded-lg border theme-border overflow-hidden p-0.5 theme-bg-elevated">
            <button
              onClick={() => setViewMode('graph')}
              className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                viewMode === 'graph' ? 'bg-indigo-600 text-white shadow-sm' : 'theme-text-muted hover:theme-text-primary'
              }`}
            >
              Graph Canvas
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                viewMode === 'tree' ? 'bg-indigo-600 text-white shadow-sm' : 'theme-text-muted hover:theme-text-primary'
              }`}
            >
              Outline Tree
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'graph' ? (
        <div className="relative w-full h-[460px] sm:h-[520px] bg-slate-950 overflow-hidden select-none">
          {/* Canvas Floating Controls */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 backdrop-blur border border-slate-800 shadow-md">
            <button
              onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.15))}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetView}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 px-1.5">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Canvas SVG Container */}
          <svg
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Background Dot Grid */}
            <defs>
              <pattern id="mindmap-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#334155" opacity="0.4" />
              </pattern>
              <linearGradient id="root-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>

            <rect width="100%" height="100%" fill="url(#mindmap-grid)" />

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Spline Connecting Lines */}
              {layout.nodes.map(node => {
                const isSelected = selectedNode?.name === node.name;
                const pathD = `M ${layout.rootPos.x + 60} ${layout.rootPos.y} C ${(layout.rootPos.x + node.x) / 2} ${layout.rootPos.y}, ${(layout.rootPos.x + node.x) / 2} ${node.y}, ${node.x - 70} ${node.y}`;

                return (
                  <g key={`branch-${node.id}`}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isSelected ? '#818cf8' : node.color}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeOpacity={0.6}
                      strokeDasharray={isSelected ? 'none' : 'none'}
                    />

                    {/* Subtopic Connecting Lines */}
                    {node.subtopicNodes.map((sub, sIdx) => {
                      const subPathD = `M ${node.x + 70} ${node.y} C ${(node.x + sub.x) / 2} ${node.y}, ${(node.x + sub.x) / 2} ${sub.y}, ${sub.x - 40} ${sub.y}`;
                      return (
                        <path
                          key={`subpath-${node.id}-${sIdx}`}
                          d={subPathD}
                          fill="none"
                          stroke={node.color}
                          strokeWidth={1.5}
                          strokeOpacity={0.4}
                          strokeDasharray="3 3"
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Subtopic Nodes */}
              {layout.nodes.flatMap(node =>
                node.subtopicNodes.map((sub, sIdx) => (
                  <g
                    key={`subnode-${node.id}-${sIdx}`}
                    transform={`translate(${sub.x}, ${sub.y})`}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode({
                        name: sub.name,
                        details: `Subtopic of ${node.name}. Key concept explored under this academic branch.`,
                        subtopics: [],
                        parent: node.name
                      });
                    }}
                  >
                    <rect
                      x="-40"
                      y="-14"
                      width="180"
                      height="28"
                      rx="8"
                      fill="#0f172a"
                      stroke={node.color}
                      strokeWidth="1.2"
                      strokeOpacity="0.7"
                      className="group-hover:stroke-white transition-colors"
                    />
                    <circle cx="-25" cy="0" r="3.5" fill={node.color} />
                    <text
                      x="-14"
                      y="4"
                      fill="#cbd5e1"
                      fontSize="11"
                      fontWeight="500"
                      className="group-hover:fill-white font-sans"
                    >
                      {sub.name.length > 22 ? sub.name.slice(0, 20) + '...' : sub.name}
                    </text>
                  </g>
                ))
              )}

              {/* Category Nodes */}
              {layout.nodes.map(node => {
                const isSelected = selectedNode?.name === node.name;
                const isExpanded = expandedNodes.has(node.name);

                return (
                  <g
                    key={`cat-${node.id}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                  >
                    <rect
                      x="-70"
                      y="-22"
                      width="150"
                      height="44"
                      rx="12"
                      fill={isSelected ? '#1e1b4b' : '#0f172a'}
                      stroke={isSelected ? '#a5b4fc' : node.color}
                      strokeWidth={isSelected ? 2.5 : 1.8}
                      className="group-hover:brightness-125 transition-all shadow-lg"
                    />
                    <circle cx="-52" cy="0" r="6" fill={node.color} />
                    <text
                      x="-38"
                      y="-2"
                      fill="#f8fafc"
                      fontSize="12"
                      fontWeight="bold"
                      className="font-sans"
                    >
                      {node.name.length > 16 ? node.name.slice(0, 15) + '…' : node.name}
                    </text>
                    <text
                      x="-38"
                      y="13"
                      fill="#94a3b8"
                      fontSize="9.5"
                      className="font-sans"
                    >
                      {node.subtopics.length} subtopics
                    </text>

                    {/* Expand/Collapse Handle */}
                    <g
                      transform="translate(72, 0)"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(node.name);
                      }}
                      className="cursor-pointer hover:scale-110 transition-transform"
                    >
                      <circle cx="0" cy="0" r="9" fill="#1e293b" stroke={node.color} strokeWidth="1" />
                      <text x="-3" y="3" fill="#ffffff" fontSize="10" fontWeight="bold">
                        {isExpanded ? '−' : '+'}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Central Root Node */}
              <g
                transform={`translate(${layout.rootPos.x}, ${layout.rootPos.y})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNode({
                    name: rootName,
                    details: 'Primary root subject encompassing all interconnected branches.',
                    subtopics: effectiveChildren.map(c => c.name),
                    isRoot: true
                  });
                }}
              >
                <circle cx="0" cy="0" r="54" fill="url(#root-grad)" className="shadow-2xl" />
                <circle cx="0" cy="0" r="48" fill="none" stroke="#c7d2fe" strokeWidth="1.5" strokeOpacity="0.4" />
                <text
                  x="0"
                  y="-4"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="font-sans"
                >
                  {rootName.length > 20 ? rootName.slice(0, 18) + '...' : rootName}
                </text>
                <text
                  x="0"
                  y="14"
                  fill="#c7d2fe"
                  fontSize="9"
                  textAnchor="middle"
                  className="font-sans font-mono"
                >
                  CORE ROOT
                </text>
              </g>
            </g>
          </svg>

          {/* Node Inspector Drawer */}
          {selectedNode && (
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-96 z-20 p-4 rounded-xl bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 shadow-2xl text-white animate-fadeIn">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  {selectedNode.parent && (
                    <div className="text-[10px] text-indigo-400 font-mono flex items-center gap-1 mb-0.5">
                      <span>{selectedNode.parent}</span>
                      <span>›</span>
                    </div>
                  )}
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{selectedNode.name}</span>
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {selectedNode.details}
              </p>

              {selectedNode.subtopics && selectedNode.subtopics.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                    Connected Concepts:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.subtopics.map((sub, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                {onLaunchTopicQuiz && (
                  <button
                    onClick={() => onLaunchTopicQuiz(selectedNode.name)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Practice Branch Quiz</span>
                  </button>
                )}
                {onLaunchTopicCards && (
                  <button
                    onClick={() => onLaunchTopicCards(selectedNode.name)}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Layers className="w-3 h-3 text-indigo-400" />
                    <span>Cards</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Outline Tree Mode */
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Root Domain: {rootName}
              </span>
            </div>
            <span className="text-[11px] font-mono text-indigo-300">
              {effectiveChildren.length} Main Academic Branches
            </span>
          </div>

          <div className="space-y-3">
            {effectiveChildren.map((branch, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl theme-bg-elevated theme-border border hover:border-indigo-500/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 font-mono text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <h4 className="text-sm font-bold theme-text-primary">
                      {branch.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {onLaunchTopicQuiz && (
                      <button
                        onClick={() => onLaunchTopicQuiz(branch.name)}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-indigo-600/15 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer"
                      >
                        Quiz Branch
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs theme-text-secondary leading-relaxed mb-3">
                  {branch.details}
                </p>

                {branch.subtopics && branch.subtopics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t theme-border">
                    {branch.subtopics.map((sub, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[11px] px-2.5 py-0.5 rounded-md theme-bg-surface theme-border border theme-text-muted"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
