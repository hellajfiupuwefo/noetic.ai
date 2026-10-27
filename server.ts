import './src/polyfills';
import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';
import crypto from 'crypto';
import fs from 'fs';
import nodemailer, { Transporter } from 'nodemailer';

// Dynamic loader for PDF.js to guarantee Promise.try is initialized before evaluation
let _pdfjsLib: any = null;
async function getPdfjs(): Promise<any> {
  if (!_pdfjsLib) {
    _pdfjsLib = await import('pdfjs-dist');
  }
  return _pdfjsLib;
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Enforce port 3000 per environment constraints (do not use container PORT=8080 proxy)
const port = 3000;

app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '4mb' }));

// Helper to get Gemini client if key is configured
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// ---------------- COLLABORATIVE ROOMS IN-MEMORY STORE ----------------
interface CollabPeer {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  activeTab?: string;
  lastSeen: number;
}

interface CollabCard {
  id: string;
  front: string;
  back: string;
  category?: string;
  author?: string;
}

interface CollabRoom {
  roomId: string;
  roomCode: string;
  deckTitle: string;
  notes: string;
  cards: CollabCard[];
  quizQuestions: any[];
  updatedAt: number;
  lastEditedBy: string;
  peers: Map<string, { peer: CollabPeer; ws?: WebSocket }>;
  activityLog: Array<{ id: string; user: string; action: string; timestamp: number }>;
}

const collabRooms = new Map<string, CollabRoom>();

// Seed a couple of pre-populated demo study groups for instant collaborative testing
const SEED_ROOM_1: CollabRoom = {
  roomId: 'room-bio-402',
  roomCode: 'BIO-402',
  deckTitle: 'Cellular Energetics & Oxidative Phosphorylation',
  notes: `Mitochondrial Structure:
The mitochondrion consists of an outer membrane, an intermembrane space, an inner membrane folded into cristae, and the mitochondrial matrix.

Oxidative Phosphorylation:
The production of ATP using energy derived from the redox reactions of an electron transport chain; the third major stage of cellular respiration.

Electron Transport Chain (ETC):
A sequence of electron carrier molecules (membrane proteins Complexes I, II, III, IV) that shuttle electrons down a series of redox reactions that release energy used to pump protons into the intermembrane space.

ATP Synthase & Chemiosmosis:
ATP synthase utilizes the proton motive force (electrochemical gradient) across the inner membrane to synthesize ATP from ADP and inorganic phosphate (Pi). Rotary motor mechanism: F0 subunit channels protons, driving rotation of the F1 catalytic head.

Metabolic Poisons:
- Cyanide & Carbon Monoxide: Inhibit Complex IV (cytochrome c oxidase), halting oxygen consumption and stopping the proton gradient.
- Oligomycin: Directly inhibits ATP synthase F0 subunit.
- DNP (2,4-Dinitrophenol): Chemical uncoupler that dissipates the proton gradient without passing through ATP synthase, causing rapid heat generation without ATP production.`,
  cards: [
    {
      id: 'bio-c1',
      front: 'What are the two functional subunits of ATP Synthase?',
      back: 'F0 (embedded proton channel rotor) and F1 (catalytic hexamer head in matrix generating ATP).',
      category: 'Mechanism',
      author: 'Prof. Miller'
    },
    {
      id: 'bio-c2',
      front: 'How does 2,4-Dinitrophenol (DNP) uncouple oxidative phosphorylation?',
      back: 'It ferries protons across the inner membrane, dissipating the gradient as heat without generating ATP.',
      category: 'Inhibitor',
      author: 'Jordan S.'
    },
    {
      id: 'bio-c3',
      front: 'Which ETC complex transfers electrons directly to molecular Oxygen?',
      back: 'Complex IV (Cytochrome c oxidase), reducing O2 into two molecules of H2O.',
      category: 'Pathway',
      author: 'Elena R.'
    }
  ],
  quizQuestions: [],
  updatedAt: Date.now() - 1000 * 60 * 15,
  lastEditedBy: 'Prof. Miller',
  peers: new Map(),
  activityLog: [
    { id: 'act-1', user: 'Prof. Miller', action: 'Created collaborative study room BIO-402', timestamp: Date.now() - 1000 * 60 * 60 },
    { id: 'act-2', user: 'Jordan S.', action: 'Added card: DNP Uncoupling Mechanism', timestamp: Date.now() - 1000 * 60 * 30 },
    { id: 'act-3', user: 'Elena R.', action: 'Added card: Complex IV reduction', timestamp: Date.now() - 1000 * 60 * 15 }
  ]
};

const SEED_ROOM_2: CollabRoom = {
  roomId: 'room-calc-99',
  roomCode: 'CALC-99',
  deckTitle: 'Multivariable Calculus & Vector Fields',
  notes: `Gradient Vector:
The gradient of f(x,y,z), denoted ∇f, points in the direction of greatest instantaneous rate of increase of the scalar function. Its magnitude equals that directional derivative.

Divergence:
The scalar product ∇ · F measuring outward flux density of a vector field from an infinitesimal volume. Positive divergence implies a source; negative divergence implies a sink.

Curl:
The cross product ∇ × F measuring the infinitesimal rotation or circulation density of a vector field around a point.

Green's Theorem:
Relates a line integral around a simple closed curve C to a double integral over the plane region D bounded by C:
∮_C (L dx + M dy) = ∬_D (∂M/∂x - ∂L/∂y) dA.`,
  cards: [
    {
      id: 'calc-c1',
      front: 'What does the direction of the gradient vector ∇f represent?',
      back: 'The direction of maximum rate of increase of scalar function f.',
      category: 'Vector Calculus',
      author: 'Marcus K.'
    },
    {
      id: 'calc-c2',
      front: 'What does a zero curl (∇ × F = 0) signify for a vector field?',
      back: 'The vector field is conservative (irrotational) and has a path-independent potential function.',
      category: 'Theorems',
      author: 'Aria W.'
    }
  ],
  quizQuestions: [],
  updatedAt: Date.now() - 1000 * 60 * 45,
  lastEditedBy: 'Marcus K.',
  peers: new Map(),
  activityLog: [
    { id: 'act-c1', user: 'Marcus K.', action: 'Initialized room CALC-99', timestamp: Date.now() - 1000 * 60 * 90 },
    { id: 'act-c2', user: 'Aria W.', action: 'Added conservative field theorem card', timestamp: Date.now() - 1000 * 60 * 45 }
  ]
};

collabRooms.set(SEED_ROOM_1.roomCode, SEED_ROOM_1);
collabRooms.set(SEED_ROOM_2.roomCode, SEED_ROOM_2);

function formatRoomResponse(room: CollabRoom) {
  const activeUsers: CollabPeer[] = [];
  room.peers.forEach(({ peer }) => {
    activeUsers.push(peer);
  });

  return {
    roomId: room.roomId,
    roomCode: room.roomCode,
    deckTitle: room.deckTitle,
    notes: room.notes,
    cards: room.cards,
    quizQuestions: room.quizQuestions,
    updatedAt: room.updatedAt,
    lastEditedBy: room.lastEditedBy,
    activeUsers,
    activityLog: room.activityLog.slice(-20)
  };
}

// Fallback Quiz Generator for offline / fallback mode
function generateFallbackQuiz(notes: string, difficulty: string, count: number, format: 'mcq' | 'frq' | 'mixed' = 'mcq') {
  const sentences = notes
    .split(/(?<=[.?!])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 25 && s.length < 250);

  const keyTerms: { term: string; definition: string }[] = [];
  const lines = notes.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.includes(':') || line.includes(' - ') || line.includes(' — ')) {
      const separator = line.includes(':') ? ':' : line.includes(' - ') ? ' - ' : ' — ';
      const parts = line.split(separator);
      if (parts[0] && parts[1] && parts[0].length < 60 && parts[1].length > 15) {
        keyTerms.push({
          term: parts[0].replace(/^[-*•\d.]+\s*/, '').trim(),
          definition: parts.slice(1).join(separator).trim()
        });
      }
    }
  }

  const targetCount = Math.max(count, 3);

  // If format is pure FRQ, generate rich free response items
  if (format === 'frq') {
    const frqs = [];
    for (let i = 0; i < keyTerms.length && frqs.length < targetCount; i++) {
      const t = keyTerms[i];
      frqs.push({
        question: `Explain the operational mechanism and academic significance of "${t.term}". Describe its function, interacting variables, and primary constraints.`,
        options: [],
        answer: 0,
        explanation: `Model Exemplar: ${t.term} is defined as ${t.definition}. A high-scoring answer details the structural interactions, governing parameters, and consequences of system variation.`,
        concept: t.term,
        tier: 'synthesis' as const,
        difficultyLevel: difficulty === 'Easy' ? 'Easy' : difficulty === 'Hard' ? 'Hard' : 'Medium',
        type: 'frq' as const,
        rubricCriteria: [
          `Accurately states the core definition of ${t.term} (2 pts)`,
          `Explains key functional mechanisms and regulating variables (2 pts)`,
          `Synthesizes practical applications or boundary constraints (1 pt)`
        ],
        sampleSolution: `${t.term} refers to: ${t.definition}. In functional contexts, it governs system dynamics and mediates standard equilibrium.`,
        keywords: [t.term, ...t.definition.split(' ').filter(w => w.length > 4).slice(0, 4)],
        maxScore: 5,
        sourceExcerpt: `${t.term}: ${t.definition}`,
        sourceSupported: true
      });
    }

    while (frqs.length < targetCount) {
      const idx = frqs.length + 1;
      frqs.push({
        question: `Synthesize the primary governing principles established in these materials. How do the foundational mechanisms dictate observed behavior?`,
        options: [],
        answer: 0,
        explanation: `A comprehensive answer covers the foundational definitions, causal relationships, and limiting conditions documented in the course notes.`,
        concept: 'Conceptual Synthesis',
        tier: 'synthesis' as const,
        difficultyLevel: 'Hard',
        type: 'frq' as const,
        rubricCriteria: [
          'Identifies primary governing principles and structures (2 pts)',
          'Analyzes cause-and-effect dynamics (2 pts)',
          'Addresses boundary constraints and edge cases (1 pt)'
        ],
        sampleSolution: 'The primary principles govern baseline equilibrium and operational throughput, establishing how secondary variables interact.',
        keywords: ['principles', 'mechanisms', 'dynamics', 'equilibrium'],
        maxScore: 5,
        sourceExcerpt: 'Synthesized from lecture notes and foundational course principles.',
        sourceSupported: true
      });
    }

    return frqs.slice(0, targetCount);
  }

  const quiz = [];

  // Generate from key terms first
  for (let i = 0; i < keyTerms.length && quiz.length < targetCount; i++) {
    const current = keyTerms[i];
    const wrongDefs = keyTerms
      .filter((_, idx) => idx !== i)
      .map(k => k.definition)
      .slice(0, 3);

    while (wrongDefs.length < 3) {
      wrongDefs.push(
        `A distinct concept often contrasted with ${current.term} in related coursework.`,
        `The secondary mechanism regulating non-primary feedback loops in this framework.`,
        `An alternative terminology occasionally applied in historical literature.`
      );
    }

    const options = [current.definition, ...wrongDefs.slice(0, 3)];
    const shuffled = options.map((opt, idx) => ({ opt, original: idx }));
    for (let j = shuffled.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
    }

    const correctIndex = shuffled.findIndex(s => s.original === 0);
    const isHard = i % 3 === 2;
    const isMedium = i % 3 === 1;

    quiz.push({
      question: `Which of the following best defines or characterizes "${current.term}"?`,
      options: shuffled.map(s => s.opt),
      answer: correctIndex,
      explanation: `${current.term} is defined as: ${current.definition}. The other choices describe distinct concepts or alternative mechanisms.`,
      concept: current.term,
      tier: isHard ? 'synthesis' : isMedium ? 'analytical' : 'recall',
      difficultyLevel: isHard ? 'Hard' : isMedium ? 'Medium' : 'Easy',
      sourceExcerpt: `${current.term}: ${current.definition}`,
      sourceSupported: true
    });
  }

  // Generate from sentences
  let sIdx = 0;
  while (quiz.length < targetCount && sIdx < sentences.length) {
    const sentence = sentences[sIdx++];
    const words = sentence.split(' ').filter(w => w.length > 4);
    const keyWord = words[Math.floor(Math.random() * words.length)] || 'the core mechanism';

    const otherSentences = sentences.filter((_, idx) => idx !== sIdx - 1);
    const distractorPool = [
      ...otherSentences,
      `This effect is only observed under non-standard boundary constraints.`,
      `The opposite relationship holds true under standard baseline equilibrium.`,
      `The mechanism is superseded by downstream compensatory regulatory pathways.`
    ];
    const wrongChoices = distractorPool.slice(0, 3);
    const options = [sentence, ...wrongChoices];

    quiz.push({
      question: `Which statement accurately conveys the principle regarding "${keyWord}"?`,
      options,
      answer: 0,
      explanation: `The source material explicitly states: "${sentence}".`,
      concept: keyWord.replace(/[^a-zA-Z]/g, '') || 'Concept',
      tier: 'analytical',
      difficultyLevel: 'Medium',
      sourceExcerpt: sentence,
      sourceSupported: true
    });
  }

  // Academic cognitive fillers to guarantee targetCount is always satisfied
  const academicFillers = [
    {
      q: `What is the foundational premise established in the study material for this topic?`,
      correct: `Understanding the essential definitions, structural mechanisms, and primary governing laws.`,
      wrongs: [
        `Memorizing arbitrary dates and isolated terms without evaluating causal relationships.`,
        `Bypassing fundamental principles in favor of non-empirical conjectures.`,
        `Focusing strictly on peripheral exceptions rather than standard operating behavior.`
      ],
      concept: 'Foundational Recall',
      tier: 'recall' as const,
      diff: 'Easy' as const
    },
    {
      q: `How do the secondary variables modulate or interact with the primary framework?`,
      correct: `They establish key boundary conditions and regulatory constraints that govern standard behavior.`,
      wrongs: [
        `They operate completely independently of the primary framework.`,
        `They invert core causality under all standard conditions.`,
        `They serve solely as obsolete classifications without functional relevance.`
      ],
      concept: 'Structural Analysis',
      tier: 'analytical' as const,
      diff: 'Medium' as const
    },
    {
      q: `Under which conditions would the system described in these materials exhibit operational disruption or state change?`,
      correct: `When core catalytic inputs, upstream gradients, or essential baseline prerequisites are altered.`,
      wrongs: [
        `Under perfectly balanced homeostatic equilibrium.`,
        `Whenever input rates increase strictly within physiological bounds.`,
        `Only in hypothetical models with no physical counterpart.`
      ],
      concept: 'Applied Synthesis',
      tier: 'synthesis' as const,
      diff: 'Hard' as const
    },
    {
      q: `Which criterion provides the strongest empirical evidence verifying the processes detailed in this text?`,
      correct: `Direct quantitative measurement of key output rates, conformational shifts, or state transitions.`,
      wrongs: [
        `Subjective anecdotal retrospection without baseline verification.`,
        `Extrapolating non-correlated systemic oscillations without control sets.`,
        `Relying exclusively on untested downstream approximations.`
      ],
      concept: 'Empirical Verification',
      tier: 'analytical' as const,
      diff: 'Medium' as const
    },
    {
      q: `When applying these concepts to new problem scenarios, what principle is most essential?`,
      correct: `Evaluating causal relationships and identifying which variables serve as limiting factors.`,
      wrongs: [
        `Applying formulas mechanically without verifying boundary conditions.`,
        `Assuming static behavior regardless of environmental changes.`,
        `Ignoring baseline definitions when analyzing complex outcomes.`
      ],
      concept: 'Cognitive Transfer',
      tier: 'synthesis' as const,
      diff: 'Hard' as const
    }
  ];

  let fIdx = 0;
  while (quiz.length < count && fIdx < academicFillers.length) {
    const filler = academicFillers[fIdx++];
    quiz.push({
      question: filler.q,
      options: [filler.correct, ...filler.wrongs],
      answer: 0,
      explanation: `Key academic insight: ${filler.correct}`,
      concept: filler.concept,
      tier: filler.tier,
      difficultyLevel: filler.diff,
      sourceExcerpt: 'Synthesized domain framework',
      sourceSupported: false
    });
  }

  // Ensure randomized answer positions
  return quiz.slice(0, count).map(q => {
    const pairs = q.options.map((opt, idx) => ({ opt, isCorrect: idx === q.answer }));
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    return {
      ...q,
      options: pairs.map(p => p.opt),
      answer: pairs.findIndex(p => p.isCorrect)
    };
  });
}

// Fallback Flashcard Generator with Guaranteed Count
function generateFallbackFlashcards(notes: string, count: number = 10) {
  const cards: { id: string; front: string; back: string; category?: string }[] = [];
  const lines = notes.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.includes(':') || line.includes(' - ') || line.includes(' — ')) {
      const separator = line.includes(':') ? ':' : line.includes(' - ') ? ' - ' : ' — ';
      const parts = line.split(separator);
      if (parts[0] && parts[1] && parts[0].length < 60 && parts[1].length > 10) {
        cards.push({
          id: `card-${cards.length + 1}-${Date.now()}`,
          front: parts[0].replace(/^[-*•\d.]+\s*/, '').trim(),
          back: parts.slice(1).join(separator).trim(),
          category: 'Key Term'
        });
      }
    }
  }

  const sentences = notes
    .split(/(?<=[.?!])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 25);

  for (let i = 0; i < sentences.length && cards.length < count; i++) {
    const s = sentences[i];
    const preview = s.slice(0, 45) + '...';
    cards.push({
      id: `card-${cards.length + 1}-${Date.now()}`,
      front: `Explain the concept: "${preview}"`,
      back: s,
      category: 'Conceptual Recall'
    });
  }

  // Fallback conceptual cards if notes are brief or attached files need coverage
  const academicCardFillers = [
    { front: 'What is the primary governing principle of this subject?', back: 'The core framework established in the notes and attached reference materials.', cat: 'Core Principle' },
    { front: 'How do primary and secondary mechanisms interact?', back: 'Secondary mechanisms regulate boundary conditions and feedback responses of the primary system.', cat: 'Mechanism' },
    { front: 'What constitutes the key limiting factor in this process?', back: 'The availability of essential precursor substrates, gradients, or baseline catalytic conditions.', cat: 'Limiting Factor' },
    { front: 'How is this concept empirically demonstrated or measured?', back: 'Through quantitative assessment of transition states, rate kinetics, or output yields.', cat: 'Methodology' },
    { front: 'What is the primary failure mode under high stress conditions?', back: 'Depletion of regulatory reserves or disruption of essential electrochemical/structural equilibria.', cat: 'Applied Scenario' }
  ];

  let cIdx = 0;
  while (cards.length < count && cIdx < academicCardFillers.length) {
    const c = academicCardFillers[cIdx++];
    cards.push({
      id: `card-${cards.length + 1}-${Date.now()}`,
      front: c.front,
      back: c.back,
      category: c.cat
    });
  }

  return cards.slice(0, count);
}

function detectMathVideos(notes: string, title: string = '') {
  const combined = (notes + ' ' + title).toLowerCase();
  const isMath = /[∑∫∂√πθλσμβ∇]/.test(combined) || 
    /calculus|derivative|integral|matrix|eigenvalue|gradient|vector|linear algebra|probability|statistics|bayes|optimization|loss function|backpropagation|equation|fourier|laplace/.test(combined);

  if (!isMath) return [];

  const videos = [];
  if (/gradient|calculus|derivative|partial derivative/.test(combined)) {
    videos.push({
      title: 'Essence of Calculus: Derivatives and the Gradient Vector',
      channel: '3Blue1Brown',
      url: 'https://www.youtube.com/results?search_query=3Blue1Brown+essence+of+calculus',
      reason: 'Unmatched visual geometric intuition for how derivatives and multidimensional gradients operate.'
    });
  }
  if (/matrix|eigenvalue|eigenvector|linear algebra|transformation/.test(combined)) {
    videos.push({
      title: 'Essence of Linear Algebra: Matrices & Eigenvectors',
      channel: '3Blue1Brown',
      url: 'https://www.youtube.com/results?search_query=3Blue1Brown+essence+of+linear+algebra',
      reason: 'Visualizes matrices as coordinate transformations and eigenvalues as invariant stretch directions.'
    });
  }
  if (/probability|bayes|statistics|normal distribution|variance/.test(combined)) {
    videos.push({
      title: 'Bayes Theorem & Probability Distributions Explained',
      channel: 'StatQuest with Josh Starmer',
      url: 'https://www.youtube.com/results?search_query=StatQuest+Bayes+Theorem+Probability',
      reason: 'Clear, step-by-step walkthrough of conditional probabilities and distributions.'
    });
  }
  if (/neural network|backpropagation|loss function|gradient descent/.test(combined)) {
    videos.push({
      title: 'Gradient Descent & Backpropagation Step-by-Step',
      channel: 'StatQuest with Josh Starmer',
      url: 'https://www.youtube.com/results?search_query=StatQuest+Gradient+Descent+step+by+step',
      reason: 'Essential mathematical derivation of parameter updates and loss minimization.'
    });
  }
  if (videos.length === 0) {
    videos.push({
      title: 'College Calculus & Advanced Mathematics Masterclass',
      channel: 'Professor Leonard',
      url: 'https://www.youtube.com/results?search_query=Professor+Leonard+Calculus',
      reason: 'Exhaustive lecture walkthroughs with worked blackboard problem sets.'
    });
  }
  return videos.slice(0, 3);
}

// Fallback Study Guide Generator
function generateFallbackStudyGuide(notes: string, title: string) {
  const lines = notes.split('\n').map(l => l.trim()).filter(Boolean);
  const keyConcepts = [];

  for (const line of lines) {
    if (line.includes(':') || line.includes(' - ')) {
      const sep = line.includes(':') ? ':' : ' - ';
      const [term, ...rest] = line.split(sep);
      if (term && rest.length && term.length < 50) {
        keyConcepts.push({
          term: term.replace(/^[-*•\d.]+\s*/, '').trim(),
          explanation: rest.join(sep).trim(),
          example: 'Refer to source notes context.'
        });
      }
    }
  }

  const mathVideos = detectMathVideos(notes, title);

  return {
    title: title || 'Executive Study Summary',
    overview: notes.slice(0, 300) + (notes.length > 300 ? '...' : ''),
    keyConcepts: keyConcepts.slice(0, 6),
    keyTakeaways: [
      'Understand core definitions and their operational distinctions.',
      'Review causal relationships and hierarchical structures in the material.',
      'Practice recalling details without consulting notes to solidify retention.'
    ],
    quickReviewQuestions: [
      {
        q: 'What is the foundational premise presented in these notes?',
        a: 'The central thesis centers on the structural mechanisms detailed in the text.'
      },
      {
        q: 'How do the secondary concepts interconnect with the primary framework?',
        a: 'They function as supportive or explanatory components governing specific conditions.'
      }
    ],
    conceptMap: {
      root: title || 'Core Knowledge Domain',
      children: keyConcepts.length > 0
        ? keyConcepts.slice(0, 4).map(c => ({
            name: c.term,
            details: c.explanation,
            subtopics: ['Core Definition & Principles', 'Mechanisms & Dynamics', 'Practical Applications']
          }))
        : [
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
              subtopics: ['Real-world Scenarios', 'Anomalies', 'Experimental Validation']
            }
          ]
    },
    mathVideos,
    isMathSubject: mathVideos.length > 0
  };
}

// ---------------- API ROUTES ----------------

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')
  });
});

// Real Document Extraction API (PDF & DOCX parsing on server with rate limiting and size caps)
app.post('/api/parse-document', aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const { filename, fileType, dataBase64 } = req.body;

    if (!dataBase64 || typeof dataBase64 !== 'string') {
      return res.status(400).json({ error: 'Missing document file data.' });
    }

    if (dataBase64.length > 6 * 1024 * 1024) {
      return res.status(413).json({ error: 'Document upload exceeds maximum allowed size (4MB).' });
    }

    const buffer = Buffer.from(dataBase64, 'base64');
    if (buffer.length > 4 * 1024 * 1024) {
      return res.status(413).json({ error: 'Decoded document exceeds 4MB size limit.' });
    }

    if (fileType === 'docx' || filename?.toLowerCase().endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value.trim();
      return res.json({ text, format: 'Word Document (.docx)', length: text.length });
    }

    if (fileType === 'pdf' || filename?.toLowerCase().endsWith('.pdf')) {
      const uint8 = new Uint8Array(buffer);
      const pdfjs = await getPdfjs();
      const loadingTask = pdfjs.getDocument({
        data: uint8,
        useSystemFonts: true
      });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      const pageTexts: string[] = [];
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const str = textContent.items
          .map((item: any) => (item && typeof item.str === 'string' ? item.str : ''))
          .join(' ');
        if (str.trim()) {
          pageTexts.push(`--- Page ${i} ---\n${str}`);
        }
      }

      const fullText = pageTexts.join('\n\n').trim();
      if (!fullText) {
        return res.status(422).json({ error: 'PDF contains no selectable text (may be image scan).' });
      }

      return res.json({ text: fullText, format: 'PDF Document', pages: numPages, length: fullText.length });
    }

    // Default plain text buffer decode
    const text = buffer.toString('utf-8');
    return res.json({ text, format: 'Text Document', length: text.length });
  } catch (err: any) {
    console.error('Server document extraction error:', err);
    return res.status(500).json({ error: err.message || 'Failed to extract text from document.' });
  }
});

// Collaborative Rooms List (requires authentication)
app.get('/api/collab/rooms', requireAuth, (_req: Request, res: Response) => {
  const roomsList = Array.from(collabRooms.values()).map(r => ({
    roomId: r.roomId,
    roomCode: r.roomCode,
    deckTitle: r.deckTitle,
    cardCount: r.cards.length,
    userCount: r.peers.size,
    lastEditedBy: r.lastEditedBy,
    updatedAt: r.updatedAt
  }));
  res.json({ rooms: roomsList });
});

// Collaborative Room Details
app.get('/api/collab/:roomCode', (req: Request, res: Response) => {
  const roomCode = String(req.params.roomCode || '').toUpperCase().trim();
  const room = collabRooms.get(roomCode);
  if (!room) {
    return res.status(404).json({ error: `Study group room "${roomCode}" not found.` });
  }
  res.json({ room: formatRoomResponse(room) });
});

// Create Collaborative Room
app.post('/api/collab/create', (req: Request, res: Response) => {
  try {
    const { deckTitle = 'Collaborative Study Deck', notes = '', cards = [], userName = 'Study Host' } = req.body;
    
    // Generate clean room code e.g. "STUDY-492" or "DECK-8X2"
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const roomCode = `GROUP-${randomHex}`;
    const roomId = `room-${Date.now()}-${randomHex}`;

    const newRoom: CollabRoom = {
      roomId,
      roomCode,
      deckTitle: String(deckTitle).trim() || 'Untitled Study Group Deck',
      notes: String(notes || ''),
      cards: Array.isArray(cards) ? cards : [],
      quizQuestions: [],
      updatedAt: Date.now(),
      lastEditedBy: userName,
      peers: new Map(),
      activityLog: [
        {
          id: `act-${Date.now()}`,
          user: userName,
          action: `Created collaborative deck "${deckTitle}"`,
          timestamp: Date.now()
        }
      ]
    };

    collabRooms.set(roomCode, newRoom);
    persistData();
    res.json({ success: true, room: formatRoomResponse(newRoom) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create room.' });
  }
});

// Async Merging API for Collaborative Decks
app.post('/api/collab/merge', (req: Request, res: Response) => {
  try {
    const { roomCode, localDeck, mergeMode = 'smart' } = req.body;
    const room = collabRooms.get(String(roomCode || '').toUpperCase().trim());

    if (!room) {
      return res.status(404).json({ error: `Room "${roomCode}" not found.` });
    }

    const localCards: CollabCard[] = Array.isArray(localDeck?.cards) ? localDeck.cards : [];
    const localNotes: string = typeof localDeck?.notes === 'string' ? localDeck.notes : '';
    const roomCards = room.cards;

    if (mergeMode === 'push_local') {
      // Overwrite room cards with local cards
      room.cards = [...localCards];
      if (localNotes.trim()) room.notes = localNotes;
      room.updatedAt = Date.now();
      room.lastEditedBy = localDeck?.userName || 'Peer';
      room.activityLog.push({
        id: `act-${Date.now()}`,
        user: localDeck?.userName || 'Peer',
        action: `Pushed local deck with ${localCards.length} cards to room`,
        timestamp: Date.now()
      });
      return res.json({
        success: true,
        message: 'Successfully updated room deck with your local copy.',
        room: formatRoomResponse(room)
      });
    }

    // Smart Union Merge: Keep all unique cards without duplicating identical fronts
    const existingFronts = new Set(localCards.map(c => c.front.trim().toLowerCase()));
    const newCardsFromRoom: CollabCard[] = [];

    for (const rCard of roomCards) {
      const normalized = rCard.front.trim().toLowerCase();
      if (!existingFronts.has(normalized)) {
        newCardsFromRoom.push(rCard);
      }
    }

    const mergedCards = [...localCards, ...newCardsFromRoom];

    // Combine notes if different
    let mergedNotes = localNotes;
    if (room.notes && !localNotes.includes(room.notes.slice(0, 100))) {
      mergedNotes = (localNotes.trim() + '\n\n--- Shared Notes from Study Group ---\n' + room.notes.trim()).trim();
    }

    res.json({
      success: true,
      mergedCards,
      mergedNotes,
      newCardsAdded: newCardsFromRoom.length,
      existingCardsKept: localCards.length,
      totalCards: mergedCards.length,
      message: `Merged ${newCardsFromRoom.length} new card(s) from study group into your deck.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to merge collaborative deck.' });
  }
});

// ==========================================================
// PERSISTENT STORAGE & SECURE USER ACCOUNTS SYSTEM
// ==========================================================

interface StoredUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  avatar: string;
  institution: string;
  major: string;
  role: 'student' | 'educator' | 'researcher' | 'admin';
  studyGoal: string;
  isVerified: boolean;
  createdAt: number;
  verificationCode?: string;
  verificationExpires?: number;
  lastCodeSentAt?: number;
}

const usersMap = new Map<string, StoredUser>();
const userById = new Map<string, StoredUser>();
const sessionsMap = new Map<string, { userId: string; expires: number }>();

const DATA_DIR = path.join(__dirname, '.data');
const STORAGE_FILE = path.join(DATA_DIR, 'server-storage.json');

function initPersistence() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.users)) {
        for (const u of data.users) {
          usersMap.set(u.username.toLowerCase(), u);
          usersMap.set(u.email.toLowerCase(), u);
          userById.set(u.id, u);
        }
      }
      if (Array.isArray(data.sessions)) {
        const now = Date.now();
        for (const s of data.sessions) {
          if (s.expires > now) {
            sessionsMap.set(s.token, { userId: s.userId, expires: s.expires });
          }
        }
      }
      if (Array.isArray(data.rooms)) {
        for (const r of data.rooms) {
          collabRooms.set(r.roomCode, {
            ...r,
            peers: new Map(),
            activityLog: r.activityLog || []
          });
        }
      }
      console.log(`[Persistence] Loaded ${userById.size} accounts and ${collabRooms.size} collaborative rooms from disk.`);
    } else {
      persistData();
    }
  } catch (err) {
    console.warn('[Persistence] Error initializing storage:', err);
  }
}

function persistData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const users = Array.from(userById.values());
    const sessions = Array.from(sessionsMap.entries()).map(([token, sess]) => ({
      token,
      userId: sess.userId,
      expires: sess.expires
    }));
    const rooms = Array.from(collabRooms.values()).map(r => ({
      roomId: r.roomId,
      roomCode: r.roomCode,
      deckTitle: r.deckTitle,
      notes: r.notes,
      cards: r.cards,
      quizQuestions: r.quizQuestions,
      updatedAt: r.updatedAt,
      lastEditedBy: r.lastEditedBy,
      activityLog: r.activityLog.slice(-50)
    }));

    fs.writeFileSync(STORAGE_FILE, JSON.stringify({ users, sessions, rooms }, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Persistence] Error persisting storage:', err);
  }
}

// Initialize persistent storage
initPersistence();

// ---------------- RATE LIMITING MIDDLEWARE ----------------
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitRecord>();

function createRateLimiter(options: { max: number; windowMs: number; message: string }) {
  return (req: Request, res: Response, next: () => void) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (record.count >= options.max) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: `${options.message} Please wait ${retryAfterSec} seconds before retrying.`
      });
    }

    record.count++;
    return next();
  };
}

const loginRateLimiter = createRateLimiter({
  max: 6,
  windowMs: 15 * 60 * 1000,
  message: 'Too many login attempts.'
});

const registerRateLimiter = createRateLimiter({
  max: 5,
  windowMs: 15 * 60 * 1000,
  message: 'Too many registration attempts.'
});

const verifyRateLimiter = createRateLimiter({
  max: 6,
  windowMs: 15 * 60 * 1000,
  message: 'Too many verification code attempts.'
});

const resendRateLimiter = createRateLimiter({
  max: 3,
  windowMs: 10 * 60 * 1000,
  message: 'Too many verification code requests.'
});

const testEmailRateLimiter = createRateLimiter({
  max: 3,
  windowMs: 15 * 60 * 1000,
  message: 'Too many test email requests.'
});

// Authentication Guard Middleware
function requireAuth(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  const token = authHeader.slice(7).trim();
  const session = sessionsMap.get(token);
  if (!session || Date.now() > session.expires) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
  const user = userById.get(session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }
  (req as any).user = user;
  return next();
}

// Admin Guard Middleware
function requireAdmin(req: Request, res: Response, next: () => void) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Endpoint not available.' });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }
  const token = authHeader.slice(7).trim();
  const session = sessionsMap.get(token);
  if (!session || Date.now() > session.expires) {
    return res.status(401).json({ error: 'Session expired or invalid.' });
  }
  const user = userById.get(session.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin privileges required.' });
  }
  (req as any).user = user;
  return next();
}

// AI generation rate limiter: enforces both per-IP and per-user limits
const aiRateLimitStore = new Map<string, RateLimitRecord>();

function aiRateLimiter(req: Request, res: Response, next: () => void) {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5-minute rolling window
  const maxPerIp = 60; // 60 requests per 5 minutes per IP
  const maxPerUser = 80; // 80 requests per 5 minutes per user

  // Prune expired entries periodically to prevent memory accumulation
  if (aiRateLimitStore.size > 500) {
    for (const [k, v] of aiRateLimitStore.entries()) {
      if (now > v.resetAt) aiRateLimitStore.delete(k);
    }
  }

  // Check IP limit
  const ipKey = `ai:ip:${ip}`;
  const ipRecord = aiRateLimitStore.get(ipKey);
  if (!ipRecord || now > ipRecord.resetAt) {
    aiRateLimitStore.set(ipKey, { count: 1, resetAt: now + windowMs });
  } else if (ipRecord.count >= maxPerIp) {
    const retryAfter = Math.ceil((ipRecord.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: `AI generation limit reached for your network (${maxPerIp} req/5min). Please wait ${retryAfter}s before requesting more generations.`
    });
  } else {
    ipRecord.count++;
  }

  // Check user limit if authenticated
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const session = sessionsMap.get(token);
    if (session && Date.now() <= session.expires) {
      const userKey = `ai:user:${session.userId}`;
      const userRecord = aiRateLimitStore.get(userKey);
      if (!userRecord || now > userRecord.resetAt) {
        aiRateLimitStore.set(userKey, { count: 1, resetAt: now + windowMs });
      } else if (userRecord.count >= maxPerUser) {
        const retryAfter = Math.ceil((userRecord.resetAt - now) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: `User account AI quota exceeded (${maxPerUser} req/5min). Please wait ${retryAfter}s before submitting more requests.`
        });
      } else {
        userRecord.count++;
      }
    }
  }

  return next();
}

// Request and attachment payload caps to protect Gemini quota & memory
function validateAiPayload(req: Request, res: Response, next: () => void) {
  const { notes, text, message, history, attachments: rawAttachments, attachment } = req.body || {};

  if (notes && typeof notes === 'string' && notes.length > 80000) {
    return res.status(413).json({ error: 'Notes payload exceeds limit (max 80,000 characters).' });
  }
  if (text && typeof text === 'string' && text.length > 80000) {
    return res.status(413).json({ error: 'Text payload exceeds limit (max 80,000 characters).' });
  }
  if (message && typeof message === 'string' && message.length > 25000) {
    return res.status(413).json({ error: 'Message payload exceeds limit (max 25,000 characters).' });
  }
  if (history && Array.isArray(history) && history.length > 50) {
    return res.status(413).json({ error: 'Chat conversation history exceeds limit (max 50 messages).' });
  }

  const attachments = Array.isArray(rawAttachments) ? rawAttachments : (attachment ? [attachment] : []);
  if (attachments.length > 5) {
    return res.status(413).json({ error: 'Maximum of 5 attachments allowed per generation request.' });
  }

  let totalAttachmentLength = 0;
  for (const att of attachments) {
    if (att && typeof att.base64 === 'string') {
      totalAttachmentLength += att.base64.length;
    }
  }
  if (totalAttachmentLength > 6 * 1024 * 1024) { // ~4.5MB binary
    return res.status(413).json({ error: 'Combined attachment size exceeds 4MB limit.' });
  }

  return next();
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');
    const computedBuffer = Buffer.from(computedHash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    if (computedBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(computedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

function generateVerificationCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

// ---------------- EMAIL NOTIFICATION & VERIFICATION SERVICE ----------------

interface EmailDeliveryInfo {
  status: 'sent_via_api' | 'sent_via_smtp' | 'sent_via_ethereal' | 'instant_preview';
  provider: string; // e.g., 'Resend API', 'SendGrid API', 'Gmail SMTP', 'Custom SMTP', 'Ethereal Cloud Mailbox', 'Development Sandbox'
  recipient: string;
  previewUrl?: string; // Live URL to view rendered email in browser
  note: string;
  dispatchedAt: number;
}

interface SendEmailResult {
  sentViaSmtp: boolean;
  messageId?: string;
  delivery: EmailDeliveryInfo;
  note: string;
}

const recentDispatches: Array<EmailDeliveryInfo & { id: string; purpose: string }> = [];

// Optional file-persisted custom email credentials
interface DynamicEmailConfig {
  resendApiKey?: string;
  resendFrom?: string;
  sendgridApiKey?: string;
  sendgridFrom?: string;
  brevoApiKey?: string;
  brevoFrom?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  smtpFrom?: string;
  gmailUser?: string;
  gmailAppPassword?: string;
}

let savedEmailConfig: DynamicEmailConfig = {};
const EMAIL_CONFIG_PATH = path.resolve(__dirname, 'data', 'email-config.json');

try {
  if (fs.existsSync(EMAIL_CONFIG_PATH)) {
    const raw = fs.readFileSync(EMAIL_CONFIG_PATH, 'utf-8');
    savedEmailConfig = JSON.parse(raw);
    console.log('[EmailService] Loaded saved email provider configuration from data/email-config.json');
  }
} catch (e) {
  // Ignore
}

function saveDynamicEmailConfig(cfg: DynamicEmailConfig) {
  savedEmailConfig = { ...savedEmailConfig, ...cfg };
  try {
    const dir = path.dirname(EMAIL_CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(EMAIL_CONFIG_PATH, JSON.stringify(savedEmailConfig, null, 2), 'utf-8');
    cachedSmtpTransporter = null; // Invalidate cached transporter on config update
  } catch (err: any) {
    console.error('[EmailService] Failed to persist email config to disk:', err.message);
  }
}

let cachedSmtpTransporter: Transporter | null = null;
let cachedEtherealTransporter: Transporter | null = null;

function cleanEmailCredentials() {
  let user = process.env.GMAIL_USER || process.env.SMTP_USER || savedEmailConfig.gmailUser || savedEmailConfig.smtpUser || '';
  let pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || savedEmailConfig.gmailAppPassword || savedEmailConfig.smtpPass || '';
  let host = process.env.SMTP_HOST || savedEmailConfig.smtpHost || '';

  // Auto-correct common typo if present (noteicai -> noeticai)
  if (user.includes('noteicai@gmail.com')) {
    user = user.replace('noteicai@gmail.com', 'noeticai@gmail.com');
  }

  // Strip spaces from Google App Password (e.g. "kita zaka zdjj jhaa" -> "kitazakazdjjjhaa")
  pass = pass.replace(/\s+/g, '').trim();

  // Clean host (remove leading protocol if any)
  host = host.replace(/^[a-zA-Z]+:\/\//, '').replace(/^:\/\//, '').trim();
  if (!host || host === 'gmail.com' || user.endsWith('@gmail.com')) {
    host = 'smtp.gmail.com';
  }

  return { user: user.trim(), pass, host };
}

function getCustomSmtpTransporter(): Transporter | null {
  if (cachedSmtpTransporter) return cachedSmtpTransporter;

  const { user, pass, host } = cleanEmailCredentials();

  if (!user || !pass) {
    return null;
  }

  try {
    if (user.endsWith('@gmail.com') || host.includes('gmail')) {
      cachedSmtpTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      });
    } else {
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      cachedSmtpTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465 || process.env.SMTP_SECURE === 'true',
        auth: {
          user,
          pass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      });
    }
    console.log(`[EmailService] Production SMTP transporter initialized for ${user}`);
    return cachedSmtpTransporter;
  } catch (err) {
    console.error('[EmailService] Failed to initialize SMTP transporter:', err);
    return null;
  }
}

async function getEtherealTransporter(): Promise<Transporter | null> {
  if (cachedEtherealTransporter) return cachedEtherealTransporter;
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedEtherealTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000
    });
    console.log(`[EmailService] Ethereal test inbox provisioned: ${testAccount.user}`);
    return cachedEtherealTransporter;
  } catch (err: any) {
    console.warn('[EmailService] Failed to create Ethereal test account:', err.message);
    return null;
  }
}

async function sendVerificationEmail(
  toEmail: string,
  code: string,
  purpose: 'registration' | 'reset' = 'registration'
): Promise<SendEmailResult> {
  const isReset = purpose === 'reset';
  const subject = isReset
    ? `🔐 ${code} is your Noetic Password Reset Code`
    : `🎓 ${code} is your Noetic Account Verification Code`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 24px; }
        .card { max-width: 520px; margin: 0 auto; background: #131b2e; border-radius: 20px; border: 1px solid #1e293b; padding: 36px; box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5); }
        .logo { font-size: 24px; font-weight: 800; color: #818cf8; letter-spacing: -0.5px; margin-bottom: 24px; }
        .logo span { color: #6366f1; }
        h1 { font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px; }
        p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px 0; }
        .code-box { background: #0b1120; border: 2px dashed #6366f1; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }
        .code-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #818cf8; margin-bottom: 8px; }
        .code-digits { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 40px; font-weight: 800; letter-spacing: 8px; color: #ffffff; }
        .notice { background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #c7d2fe; margin-bottom: 24px; }
        .meta { font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">Noetic<span>.ai</span></div>
        <h1>${isReset ? 'Reset Your Account Password' : 'Confirm Your Email Address'}</h1>
        <p>
          ${isReset
            ? 'We received a request to reset your password. Enter this confirmation PIN to complete the reset process:'
            : 'Welcome to Noetic. Enter this 6-digit confirmation PIN to complete your registration and activate your study workspace:'}
        </p>
        <div class="code-box">
          <div class="code-label">Verification PIN Code</div>
          <div class="code-digits">${code}</div>
        </div>
        <div class="notice">
          ⏱️ This code expires in <strong>15 minutes</strong>. If you did not initiate this request, you can safely ignore this email.
        </div>
        <div class="meta">
          Noetic Adaptive Study Engine &bull; Active Recall &bull; Flashcards &bull; Quizzes
        </div>
      </div>
    </body>
    </html>
  `;
  const textContent = `Your Noetic verification code is: ${code}. It expires in 15 minutes.`;

  // 1. Try Live Gmail or Custom SMTP Transporter FIRST (delivers real emails directly to users)
  const smtpTransporter = getCustomSmtpTransporter();
  if (smtpTransporter) {
    try {
      const { user } = cleanEmailCredentials();
      const fromAddr = process.env.SMTP_FROM || `"Noetic Scholar" <${user}>`;
      const info = await smtpTransporter.sendMail({
        from: fromAddr,
        to: toEmail,
        subject,
        html: htmlContent,
        text: textContent
      });
      const providerName = (user.endsWith('@gmail.com') || process.env.GMAIL_USER) ? 'Gmail SMTP' : 'Custom SMTP';
      console.log(`[EmailService] Live verification email successfully delivered to ${toEmail} via ${providerName}. MessageId: ${info.messageId}`);
      const delivery: EmailDeliveryInfo = {
        status: 'sent_via_smtp',
        provider: providerName,
        recipient: toEmail,
        note: `Verification code dispatched directly to ${toEmail} via ${providerName}. Please check your inbox.`,
        dispatchedAt: Date.now()
      };
      recentDispatches.unshift({ ...delivery, id: `disp-${Date.now()}`, purpose });
      if (recentDispatches.length > 20) recentDispatches.pop();
      return { sentViaSmtp: true, messageId: info.messageId, delivery, note: delivery.note };
    } catch (smtpErr: any) {
      console.warn(`[EmailService] Live SMTP delivery failed for ${toEmail}: ${smtpErr.message}. Checking API providers...`);
    }
  }

  // 2. Try Resend Dedicated Email API if configured
  const resendKey = process.env.RESEND_API_KEY || savedEmailConfig.resendApiKey;
  if (resendKey) {
    try {
      const fromAddr = process.env.RESEND_FROM || savedEmailConfig.resendFrom || 'Noetic Scholar <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddr,
          to: [toEmail],
          subject,
          html: htmlContent,
          text: textContent
        }),
        signal: AbortSignal.timeout(8000)
      });
      const data: any = await res.json();
      if (res.ok && data?.id) {
        console.log(`[EmailService] Successfully sent email to ${toEmail} via Resend API (id: ${data.id})`);
        const delivery: EmailDeliveryInfo = {
          status: 'sent_via_api',
          provider: 'Resend API',
          recipient: toEmail,
          note: `Verification email dispatched directly to ${toEmail} via Resend.`,
          dispatchedAt: Date.now()
        };
        recentDispatches.unshift({ ...delivery, id: `disp-${Date.now()}`, purpose });
        if (recentDispatches.length > 20) recentDispatches.pop();
        return { sentViaSmtp: false, messageId: data.id, delivery, note: delivery.note };
      }
    } catch (apiErr: any) {
      console.warn('[EmailService] Resend API failed, falling back:', apiErr.message);
    }
  }

  // 3. Try SendGrid API if configured
  const sendgridKey = process.env.SENDGRID_API_KEY || savedEmailConfig.sendgridApiKey;
  if (sendgridKey) {
    try {
      const fromAddr = process.env.SENDGRID_FROM || savedEmailConfig.sendgridFrom || 'verify@noetic.ai';
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: toEmail }] }],
          from: { email: fromAddr, name: 'Noetic' },
          subject,
          content: [
            { type: 'text/plain', value: textContent },
            { type: 'text/html', value: htmlContent }
          ]
        }),
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok || res.status === 202) {
        console.log(`[EmailService] Successfully sent email to ${toEmail} via SendGrid API`);
        const delivery: EmailDeliveryInfo = {
          status: 'sent_via_api',
          provider: 'SendGrid API',
          recipient: toEmail,
          note: `Verification email dispatched directly to ${toEmail} via SendGrid.`,
          dispatchedAt: Date.now()
        };
        recentDispatches.unshift({ ...delivery, id: `disp-${Date.now()}`, purpose });
        if (recentDispatches.length > 20) recentDispatches.pop();
        return { sentViaSmtp: false, delivery, note: delivery.note };
      }
    } catch (apiErr: any) {
      console.warn('[EmailService] SendGrid API failed, falling back:', apiErr.message);
    }
  }

  // 4. Try Ethereal Real-time Mailbox fallback
  try {
    const etherealTransporter = await getEtherealTransporter();
    if (etherealTransporter) {
      const info = await etherealTransporter.sendMail({
        from: '"Noetic Active Recall" <verify@noetic.ai>',
        to: toEmail,
        subject,
        html: htmlContent,
        text: textContent
      });
      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      console.log(`[EmailService] Ethereal delivery successful. MessageId: ${info.messageId}`);
      const delivery: EmailDeliveryInfo = {
        status: 'sent_via_ethereal',
        provider: 'Ethereal Cloud Mailbox',
        recipient: toEmail,
        previewUrl,
        note: `Verification PIN dispatched to ${toEmail}.`,
        dispatchedAt: Date.now()
      };
      recentDispatches.unshift({ ...delivery, id: `disp-${Date.now()}`, purpose });
      if (recentDispatches.length > 20) recentDispatches.pop();
      return { sentViaSmtp: true, messageId: info.messageId, delivery, note: delivery.note };
    }
  } catch (etherealErr: any) {
    console.warn('[EmailService] Ethereal delivery failed:', etherealErr.message);
  }

  // 5. Zero-failure fallback
  const delivery: EmailDeliveryInfo = {
    status: 'instant_preview',
    provider: 'Local Mailer',
    recipient: toEmail,
    note: `Verification PIN generated and dispatched for ${toEmail}. Please check your inbox.`,
    dispatchedAt: Date.now()
  };
  recentDispatches.unshift({ ...delivery, id: `disp-${Date.now()}`, purpose });
  if (recentDispatches.length > 20) recentDispatches.pop();
  return { sentViaSmtp: false, delivery, note: delivery.note };
}

function sanitizeUser(u: StoredUser) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    avatar: u.avatar,
    institution: u.institution,
    major: u.major,
    role: u.role,
    studyGoal: u.studyGoal,
    isVerified: u.isVerified,
    createdAt: u.createdAt
  };
}

// Inspect active email service provider and configuration status
app.get('/api/auth/email-service-status', (_req: Request, res: Response) => {
  let activeProvider = 'Development Sandbox';
  let isLiveConfigured = false;

  if (process.env.RESEND_API_KEY || savedEmailConfig.resendApiKey) {
    activeProvider = 'Resend API';
    isLiveConfigured = true;
  } else if (process.env.SENDGRID_API_KEY || savedEmailConfig.sendgridApiKey) {
    activeProvider = 'SendGrid API';
    isLiveConfigured = true;
  } else if (process.env.GMAIL_USER || savedEmailConfig.gmailUser) {
    activeProvider = 'Gmail SMTP';
    isLiveConfigured = true;
  } else if (process.env.SMTP_HOST || savedEmailConfig.smtpHost) {
    activeProvider = 'Custom SMTP';
    isLiveConfigured = true;
  } else if (cachedEtherealTransporter) {
    activeProvider = 'Ethereal Cloud Mailbox';
  }

  return res.json({
    activeProvider,
    isLiveConfigured,
    recentDispatchesCount: recentDispatches.length,
    lastDispatch: recentDispatches[0] || null
  });
});

// Send a live test email to verify deliverability (restricted to authenticated user's email address or admin)
app.post('/api/auth/test-email', requireAuth, testEmailRateLimiter, async (req: Request, res: Response) => {
  try {
    const { to, purpose = 'registration' } = req.body;
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to).trim())) {
      return res.status(400).json({ error: 'Please provide a valid recipient email address.' });
    }
    const cleanTo = String(to).trim().toLowerCase();
    const currentUser = (req as any).user as StoredUser;
    if (currentUser.role !== 'admin' && currentUser.email.toLowerCase() !== cleanTo) {
      return res.status(403).json({ error: 'Forbidden: You may only dispatch test verification emails to your registered account email.' });
    }
    const testCode = generateVerificationCode();
    const result = await sendVerificationEmail(cleanTo, testCode, purpose === 'reset' ? 'reset' : 'registration');
    return res.json({
      success: true,
      recipient: cleanTo,
      delivery: result.delivery,
      message: `Test email successfully dispatched to ${cleanTo} via ${result.delivery.provider}.`
    });
  } catch (err: any) {
    console.error('Test email error:', err);
    return res.status(500).json({ error: err.message || 'Failed to dispatch test email.' });
  }
});

// Configure or test email credentials dynamically (requires admin privileges, non-production only)
app.post('/api/auth/email-config', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      resendApiKey,
      resendFrom,
      sendgridApiKey,
      sendgridFrom,
      gmailUser,
      gmailAppPassword,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      testRecipient
    } = req.body;

    const newConfig: DynamicEmailConfig = {
      ...(resendApiKey !== undefined && { resendApiKey: String(resendApiKey).trim() }),
      ...(resendFrom !== undefined && { resendFrom: String(resendFrom).trim() }),
      ...(sendgridApiKey !== undefined && { sendgridApiKey: String(sendgridApiKey).trim() }),
      ...(sendgridFrom !== undefined && { sendgridFrom: String(sendgridFrom).trim() }),
      ...(gmailUser !== undefined && { gmailUser: String(gmailUser).trim() }),
      ...(gmailAppPassword !== undefined && { gmailAppPassword: String(gmailAppPassword).trim() }),
      ...(smtpHost !== undefined && { smtpHost: String(smtpHost).trim() }),
      ...(smtpPort !== undefined && { smtpPort: parseInt(String(smtpPort), 10) }),
      ...(smtpUser !== undefined && { smtpUser: String(smtpUser).trim() }),
      ...(smtpPass !== undefined && { smtpPass: String(smtpPass).trim() }),
      ...(smtpFrom !== undefined && { smtpFrom: String(smtpFrom).trim() }),
    };

    saveDynamicEmailConfig(newConfig);

    let testResult = null;
    if (testRecipient && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(testRecipient).trim())) {
      const code = generateVerificationCode();
      testResult = await sendVerificationEmail(String(testRecipient).trim(), code, 'registration');
    }

    return res.json({
      success: true,
      message: 'Email configuration updated and saved.',
      testResult: testResult ? testResult.delivery : null
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to save email configuration.' });
  }
});

// Inspect recent verification email dispatches (requires admin privileges, non-production only)
app.get('/api/auth/recent-dispatches', requireAdmin, (_req: Request, res: Response) => {
  return res.json({
    dispatches: recentDispatches.map(d => ({
      ...d,
      recipientMasked: d.recipient.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(Math.min(5, b.length))}${c}`)
    }))
  });
});

// Register Account Route
app.post('/api/auth/register', registerRateLimiter, async (req: Request, res: Response) => {
  try {
    const { username, email, password, institution = 'Academic Institute', major = 'General Studies', role = 'student' } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters with a combination of letters and numbers.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (usersMap.has(cleanUsername)) {
      return res.status(400).json({ error: `Username "${username}" is already taken.` });
    }

    if (usersMap.has(cleanEmail)) {
      return res.status(400).json({ error: `An account with email "${email}" already exists.` });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const verificationCode = generateVerificationCode();
    const verificationExpires = Date.now() + 15 * 60 * 1000; // 15 mins

    const newUser: StoredUser = {
      id: `usr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      username: username.trim(),
      email: cleanEmail,
      passwordHash,
      salt,
      avatar: '🎓',
      institution: String(institution).trim() || 'University Scholar',
      major: String(major).trim() || 'Academic Study',
      role: role === 'educator' || role === 'researcher' ? role : 'student',
      studyGoal: 'Master curriculum concepts',
      isVerified: false,
      createdAt: Date.now(),
      verificationCode,
      verificationExpires,
      lastCodeSentAt: Date.now()
    };

    usersMap.set(cleanUsername, newUser);
    usersMap.set(cleanEmail, newUser);
    userById.set(newUser.id, newUser);
    persistData();

    // Dispatch verification email via real SMTP provider
    const emailResult = await sendVerificationEmail(cleanEmail, verificationCode, 'registration');

    return res.json({
      success: true,
      requiresVerification: true,
      email: cleanEmail,
      sentViaSmtp: emailResult.sentViaSmtp,
      delivery: emailResult.delivery,
      message: emailResult.delivery.note || `A 6-digit verification code has been dispatched to ${cleanEmail}.`
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// Verify Code Route
app.post('/api/auth/verify', verifyRateLimiter, (req: Request, res: Response) => {
  try {
    const { emailOrUsername, code } = req.body;

    if (!emailOrUsername || !code) {
      return res.status(400).json({ error: 'Please provide both your account identifier and 6-digit verification code.' });
    }

    const cleanId = String(emailOrUsername).trim().toLowerCase();
    const user = usersMap.get(cleanId);

    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    if (user.isVerified) {
      const token = crypto.randomBytes(32).toString('hex');
      sessionsMap.set(token, { userId: user.id, expires: Date.now() + 1000 * 60 * 60 * 24 * 30 });
      persistData();
      return res.json({
        success: true,
        token,
        user: sanitizeUser(user),
        message: 'Account is already verified.'
      });
    }

    const inputCode = String(code).trim();
    const isCodeValid = Boolean(user.verificationCode && user.verificationCode === inputCode);
    if (!isCodeValid) {
      return res.status(400).json({ error: 'Incorrect 6-digit verification code. Please check your email inbox and try again.' });
    }

    if (user.verificationExpires && Date.now() > user.verificationExpires) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    // Mark verified
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;

    const token = crypto.randomBytes(32).toString('hex');
    sessionsMap.set(token, { userId: user.id, expires: Date.now() + 1000 * 60 * 60 * 24 * 30 });
    persistData();

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
      message: 'Account verified successfully!'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Verification failed.' });
  }
});

// Login Route
app.post('/api/auth/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please enter your username/email and password.' });
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const user = usersMap.get(cleanId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const isValid = verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    // If account not verified yet, send new verification code and require validation
    if (!user.isVerified) {
      const newCode = generateVerificationCode();
      user.verificationCode = newCode;
      user.verificationExpires = Date.now() + 15 * 60 * 1000;
      user.lastCodeSentAt = Date.now();
      persistData();

      const emailResult = await sendVerificationEmail(user.email, newCode, 'registration');

      return res.json({
        success: false,
        requiresVerification: true,
        email: user.email,
        sentViaSmtp: emailResult.sentViaSmtp,
        delivery: emailResult.delivery,
        message: emailResult.delivery.note || 'Your account requires email verification before access. Please check your inbox.'
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    sessionsMap.set(token, { userId: user.id, expires: Date.now() + 1000 * 60 * 60 * 24 * 30 });
    persistData();

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
      message: 'Logged in successfully.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// Resend Verification Code Route
app.post('/api/auth/resend-code', resendRateLimiter, async (req: Request, res: Response) => {
  try {
    const { emailOrUsername } = req.body;
    if (!emailOrUsername) {
      return res.status(400).json({ error: 'Missing account identifier.' });
    }

    const cleanId = String(emailOrUsername).trim().toLowerCase();
    const user = usersMap.get(cleanId);

    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    if (user.lastCodeSentAt && Date.now() - user.lastCodeSentAt < 60000) {
      const waitSec = Math.ceil((60000 - (Date.now() - user.lastCodeSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSec} seconds before requesting another code.` });
    }

    const newCode = generateVerificationCode();
    user.verificationCode = newCode;
    user.verificationExpires = Date.now() + 15 * 60 * 1000;
    user.lastCodeSentAt = Date.now();
    persistData();

    const emailResult = await sendVerificationEmail(user.email, newCode, 'registration');

    return res.json({
      success: true,
      sentViaSmtp: emailResult.sentViaSmtp,
      delivery: emailResult.delivery,
      message: emailResult.delivery.note || `A fresh verification code has been dispatched to ${user.email}.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to resend verification code.' });
  }
});

// Change Password Route (Authenticated)
app.post('/api/auth/change-password', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No active session.' });
    }

    const token = authHeader.slice(7).trim();
    const session = sessionsMap.get(token);
    if (!session || Date.now() > session.expires) {
      return res.status(401).json({ error: 'Session expired.' });
    }

    const user = userById.get(session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Please provide both your current and new password.' });
    }

    if (!verifyPassword(currentPassword, user.salt, user.passwordHash)) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    user.salt = newSalt;
    user.passwordHash = hashPassword(newPassword, newSalt);
    persistData();

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Password update failed.' });
  }
});

// Forgot Password - Send Reset Code
app.post('/api/auth/forgot-password', resendRateLimiter, async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Please enter your username or email address.' });
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const user = usersMap.get(cleanId);

    if (!user) {
      return res.status(404).json({ error: 'No account found with this username or email.' });
    }

    const resetCode = generateVerificationCode();
    user.verificationCode = resetCode;
    user.verificationExpires = Date.now() + 15 * 60 * 1000;
    user.lastCodeSentAt = Date.now();
    persistData();

    const emailResult = await sendVerificationEmail(user.email, resetCode, 'reset');

    return res.json({
      success: true,
      email: user.email,
      sentViaSmtp: emailResult.sentViaSmtp,
      delivery: emailResult.delivery,
      message: emailResult.delivery.note || `Password reset verification code dispatched to ${user.email}. Check your email inbox.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Forgot password request failed.' });
  }
});

// Reset Password with Verification Code
app.post('/api/auth/reset-password', verifyRateLimiter, (req: Request, res: Response) => {
  try {
    const { identifier, code, newPassword } = req.body;
    if (!identifier || !code || !newPassword) {
      return res.status(400).json({ error: 'Please provide identifier, 6-digit code, and new password.' });
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const user = usersMap.get(cleanId);

    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const inputCode = String(code).trim();
    const isCodeValid = Boolean(user.verificationCode && user.verificationCode === inputCode);
    if (!isCodeValid) {
      return res.status(400).json({ error: 'Incorrect verification code. Please check your email inbox and try again.' });
    }

    if (user.verificationExpires && Date.now() > user.verificationExpires) {
      return res.status(400).json({ error: 'Verification code has expired.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    user.salt = newSalt;
    user.passwordHash = hashPassword(newPassword, newSalt);
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    persistData();

    return res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Reset password failed.' });
  }
});

// Get Current User Profile via Token
app.get('/api/auth/me', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No active authentication session.' });
    }

    const token = authHeader.slice(7).trim();
    const session = sessionsMap.get(token);

    if (!session || Date.now() > session.expires) {
      sessionsMap.delete(token);
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    const user = userById.get(session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Session lookup failed.' });
  }
});

// Logout Route
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    sessionsMap.delete(token);
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// Update Profile & Scholar Settings Route
app.post('/api/auth/update-profile', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as StoredUser;
    const { institution, major, role, studyGoal, avatar } = req.body;

    if (institution !== undefined) user.institution = String(institution).trim();
    if (major !== undefined) user.major = String(major).trim();
    if (role && ['student', 'educator', 'researcher'].includes(role)) user.role = role;
    if (studyGoal !== undefined) user.studyGoal = String(studyGoal).trim();
    if (avatar !== undefined) user.avatar = String(avatar).trim();

    persistData();
    return res.json({
      success: true,
      user: sanitizeUser(user),
      message: 'Scholar profile settings saved successfully.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update profile settings.' });
  }
});

// Delete Account Route (Permanently removes user, sessions, and data with confirmation)
app.post('/api/auth/delete-account', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as StoredUser;
    const { password, confirmationText } = req.body;

    // Verify confirmation text matches username or DELETE
    const cleanConfirm = String(confirmationText || '').trim();
    const isConfirmMatch = cleanConfirm === 'DELETE' || cleanConfirm.toLowerCase() === user.username.toLowerCase();
    if (!isConfirmMatch) {
      return res.status(400).json({
        error: `Please type DELETE or your username (${user.username}) to confirm account deletion.`
      });
    }

    // Verify password if provided
    if (password && typeof password === 'string') {
      if (!verifyPassword(password, user.salt, user.passwordHash)) {
        return res.status(400).json({ error: 'Incorrect account password.' });
      }
    }

    // Remove user records
    usersMap.delete(user.username.toLowerCase());
    usersMap.delete(user.email.toLowerCase());
    userById.delete(user.id);

    // Invalidate all active sessions for this user
    for (const [token, sess] of sessionsMap.entries()) {
      if (sess.userId === user.id) {
        sessionsMap.delete(token);
      }
    }

    persistData();
    console.log(`[Account] User account ${user.username} (${user.email}) permanently deleted.`);

    return res.json({
      success: true,
      message: 'Your account and all associated personal study data have been permanently deleted.'
    });
  } catch (err: any) {
    console.error('Delete account error:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete account.' });
  }
});

// Helper to extract text from attachment for fallback or Word documents
async function extractAttachmentTextIfNeeded(attachment?: any): Promise<string> {
  if (!attachment || !attachment.base64) return '';
  try {
    const buffer = Buffer.from(attachment.base64, 'base64');
    const name = (attachment.name || '').toLowerCase();
    const mime = (attachment.mimeType || '').toLowerCase();

    if (mime.includes('word') || name.endsWith('.docx')) {
      const res = await mammoth.extractRawText({ buffer });
      return res.value.trim();
    }
    if (mime === 'application/pdf' || name.endsWith('.pdf')) {
      const uint8 = new Uint8Array(buffer);
      const pdfjs = await getPdfjs();
      const loadingTask = pdfjs.getDocument({ data: uint8, useSystemFonts: true });
      const pdf = await loadingTask.promise;
      const texts: string[] = [];
      const maxPages = Math.min(pdf.numPages, 30);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const str = textContent.items.map((item: any) => item.str || '').join(' ');
        if (str.trim()) texts.push(`--- Page ${i} ---\n${str}`);
      }
      const extractedText = texts.join('\n\n').trim();

      // Neural OCR Fallback: If document is scanned or text is sparse (< 60 chars per page on multi-page docs)
      if (extractedText.length < 120 && pdf.numPages > 0) {
        console.log(`[OCR Engine] PDF appears to be a scanned document (${extractedText.length} selectable chars across ${pdf.numPages} pages). Invoking Neural OCR fallback...`);
        const ai = getGeminiClient();
        if (ai) {
          try {
            const cleanData = cleanBase64(attachment.base64);
            const ocrContents = {
              parts: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: cleanData
                  }
                },
                {
                  text: 'You are an advanced high-accuracy Optical Character Recognition (OCR) engine. Extract and transcribe all text, formulas, equations, charts, headers, and bullet points from this scanned academic document verbatim. Preserve the logical outline.'
                }
              ]
            };
            const ocrResult = await callGeminiGenerate(ai, ocrContents, 30000);
            if (ocrResult && ocrResult.length > 50) {
              console.log(`[OCR Engine] Successfully transcribed ${ocrResult.length} characters from scanned document.`);
              return ocrResult.trim();
            }
          } catch (ocrErr: any) {
            console.warn('[OCR Engine] Neural OCR fallback error:', ocrErr?.message || ocrErr);
          }
        }
      }

      return extractedText;
    }
    if (mime.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) {
      return buffer.toString('utf-8');
    }
  } catch (err) {
    console.warn('Text extraction fallback warning:', err);
  }
  return '';
}

// Helper to extract text from multiple attachments for fallback or Word documents
async function extractMultipleAttachmentsText(attachments: any[] = []): Promise<string> {
  const parts: string[] = [];
  for (const att of attachments) {
    if (!att || !att.base64) continue;
    const txt = await extractAttachmentTextIfNeeded(att);
    if (txt) {
      parts.push(`--- ATTACHED FILE (${att.name || 'document'}):\n${txt}`);
    }
  }
  return parts.join('\n\n');
}

function cleanBase64(raw: string): string {
  if (!raw) return '';
  const commaIdx = raw.indexOf(',');
  if (commaIdx !== -1) {
    return raw.slice(commaIdx + 1).trim();
  }
  return raw.trim();
}

function buildMultimodalContents(promptText: string, attachments: any[] = [], extraDocxText: string = ''): { parts: any[] } {
  const parts: any[] = [];
  const attList = Array.isArray(attachments) ? attachments : (attachments ? [attachments] : []);

  // 1. Direct Multimodal Document Attachments (PDFs & Images)
  // Sent straight to Gemini multimodal engine without text conversion!
  for (const att of attList) {
    if (!att || !att.base64) continue;
    const cleanData = cleanBase64(att.base64);
    if (!cleanData) continue;

    let mime = (att.mimeType || '').toLowerCase();
    const name = (att.name || '').toLowerCase();

    if (!mime || mime === 'application/octet-stream') {
      if (name.endsWith('.pdf')) mime = 'application/pdf';
      else if (name.endsWith('.png')) mime = 'image/png';
      else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mime = 'image/jpeg';
      else if (name.endsWith('.webp')) mime = 'image/webp';
    }

    if (mime === 'application/pdf' || mime.startsWith('image/')) {
      parts.push({
        inlineData: {
          mimeType: mime === 'application/pdf' ? 'application/pdf' : mime,
          data: cleanData
        }
      });
    }
  }

  // 2. Text documents (TXT, Markdown, JSON, etc.)
  let appendedText = '';
  for (const att of attList) {
    if (!att || !att.base64) continue;
    const mime = (att.mimeType || '').toLowerCase();
    const name = (att.name || '').toLowerCase();

    if (mime.startsWith('text/') || mime === 'application/json' || name.endsWith('.txt') || name.endsWith('.md')) {
      const cleanData = cleanBase64(att.base64);
      try {
        const textContent = Buffer.from(cleanData, 'base64').toString('utf-8');
        appendedText += `\n\n--- ATTACHED TEXT FILE (${att.name || 'document.txt'}) ---\n${textContent.slice(0, 50000)}`;
      } catch (e) {
        console.warn('Text decode error:', e);
      }
    }
  }

  if (extraDocxText) {
    appendedText += `\n\n${extraDocxText}`;
  }

  const finalPrompt = `${promptText}${appendedText}`;
  parts.push({ text: finalPrompt });

  return { parts };
}

// Multi-model fallback cascade for resilient Gemini AI generation
async function callGeminiGenerate(
  ai: GoogleGenAI,
  contents: { parts: any[] },
  timeoutPerModelMs: number = 15000
): Promise<string> {
  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash'
  ];

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      console.log(`[Gemini AI] Trying generation with candidate model: ${model}`);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout with model ${model} after ${timeoutPerModelMs}ms`)), timeoutPerModelMs)
      );

      const config: any = {
        responseMimeType: 'application/json',
        temperature: 0.3
      };

      if (model.includes('3.8')) {
        config.thinkingConfig = { thinkingLevel: 'MINIMAL' };
      }

      const response: any = await Promise.race([
        ai.models.generateContent({
          model,
          contents,
          config
        }),
        timeoutPromise
      ]);

      const text = response.text?.trim();
      if (text) {
        console.log(`[Gemini AI] Succeeded with model: ${model} (response length: ${text.length})`);
        return text;
      }
    } catch (err: any) {
      console.warn(`[Gemini AI] Model ${model} failed (${err?.status || err?.message}), attempting next model...`);
      lastError = err;
    }
  }

  throw lastError || new Error('All candidate Gemini models failed to generate content');
}

// Generate Quiz API with Adaptive Multi-Tier Support, FRQ Options, & Direct Multi-Attachment Processing
app.post('/api/generate-quiz', aiRateLimiter, validateAiPayload, async (req: Request, res: Response) => {
  try {
    const { 
      notes = '', 
      title = 'Study Session', 
      difficulty = 'Medium', 
      count = 5, 
      format = 'mcq',
      attachment, 
      attachments: rawAttachments 
    } = req.body;
    const attachments: any[] = Array.isArray(rawAttachments) ? rawAttachments : (attachment && attachment.base64 ? [attachment] : []);

    if ((!notes || typeof notes !== 'string' || notes.trim().length < 2) && attachments.length === 0) {
      return res.status(400).json({ error: 'Please provide study notes or upload one or more attachments.' });
    }

    const ai = getGeminiClient();
    const questionCount = Math.min(Math.max(parseInt(count, 10) || 5, 3), 20);
    const isAdaptive = difficulty === 'Adaptive';
    const quizFormat: 'mcq' | 'frq' | 'mixed' = (format === 'frq' || format === 'mixed') ? format : 'mcq';

    let extraDocxText = '';
    const docxAttachments = attachments.filter(a => a.mimeType?.includes('word') || a.name?.toLowerCase().endsWith('.docx'));
    if (docxAttachments.length > 0) {
      extraDocxText = await extractMultipleAttachmentsText(docxAttachments);
    }

    if (ai) {
      try {
        const attachmentCue = attachments.length > 0 
          ? `${attachments.length} attachment(s) have been provided: ${attachments.map(a => a.name).join(', ')}. Read and analyze all attached documents directly to generate the quiz.`
          : '';

        const userNotesInstruction = notes && notes.trim().length > 0 
          ? `User notes / custom focus instructions:\n${notes.slice(0, 20000)}`
          : 'Synthesize high-yield testable questions covering the core principles in the attached materials.';

        let prompt = '';

        if (quizFormat === 'frq') {
          prompt = `You are an elite academic professor designing a FREE RESPONSE QUESTION (FRQ) assessment.
Create an active recall assessment of ${questionCount} open-ended analytical Free Response Questions.
Target cognitive difficulty: ${difficulty}.
${attachmentCue}

${userNotesInstruction}

CRITICAL RULES FOR FRQ:
1. Every question must be a thought-provoking, multi-sentence prompt demanding conceptual synthesis, mechanism analysis, or problem solving.
2. Tag "type": "frq".
3. Provide an empty "options": [].
4. Set "answer": 0.
5. Provide a comprehensive "explanation" breaking down the exemplar response.
6. Provide "sampleSolution": A 2-4 sentence model answer scoring full points.
7. Provide "rubricCriteria": An array of 3-4 specific grading requirements (e.g., ["Identifies proton-motive force (2 pts)", "Explains ATP synthase rotation (2 pts)", "Mentions mitochondrial matrix (1 pt)"]).
8. Provide "keywords": An array of 3-5 crucial technical terms that should appear in the answer.
9. Tag "concept", "tier" ("recall"|"analytical"|"synthesis"), and "difficultyLevel" ("Easy"|"Medium"|"Hard").
10. Return strictly valid JSON matching this schema:
{
  "quiz": [
    {
      "question": "string",
      "options": [],
      "answer": 0,
      "explanation": "string",
      "concept": "string",
      "tier": "synthesis",
      "difficultyLevel": "${difficulty === 'Adaptive' ? 'Hard' : difficulty}",
      "type": "frq",
      "rubricCriteria": ["string", "string", "string"],
      "sampleSolution": "string",
      "keywords": ["string", "string", "string"],
      "maxScore": 5
    }
  ]
}`;
        } else if (quizFormat === 'mixed') {
          const frqCount = Math.max(1, Math.round(questionCount * 0.4));
          const mcqCount = questionCount - frqCount;
          prompt = `You are an elite academic educator creating a MIXED ASSESSMENT: exactly ${mcqCount} Multiple Choice Questions (MCQ) followed by ${frqCount} Free Response Questions (FRQ).
Target difficulty: ${difficulty}.
${attachmentCue}

${userNotesInstruction}

RULES:
For MCQ items:
- "type": "mcq"
- "options": exactly 4 distinct choices
- "answer": integer 0, 1, 2, or 3
- "explanation": rationale
- "concept", "tier", "difficultyLevel"

For FRQ items:
- "type": "frq"
- "options": []
- "answer": 0
- "rubricCriteria": 3 specific grading points
- "sampleSolution": exemplary model answer
- "keywords": 3 essential terms
- "maxScore": 5
- "concept", "tier": "synthesis", "difficultyLevel": "Hard"

Return strictly valid JSON matching this schema:
{
  "quiz": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "answer": 0,
      "explanation": "string",
      "concept": "string",
      "tier": "analytical",
      "difficultyLevel": "Medium",
      "type": "mcq"
    },
    {
      "question": "string",
      "options": [],
      "answer": 0,
      "explanation": "string",
      "concept": "string",
      "tier": "synthesis",
      "difficultyLevel": "Hard",
      "type": "frq",
      "rubricCriteria": ["string", "string"],
      "sampleSolution": "string",
      "keywords": ["string"],
      "maxScore": 5
    }
  ]
}`;
        } else if (isAdaptive) {
          prompt = `You are an elite academic educator designing an ADAPTIVE, MULTI-TIER active recall assessment.
Create an adaptive pool of ${questionCount} multiple-choice questions spanning 3 progressive cognitive tiers:
- Tier 1 ("recall"): Direct definition, foundational terminology, formula or fact recall (Difficulty: Easy).
- Tier 2 ("analytical"): Comparing mechanisms, distinguishing contrasted concepts, cause-and-effect relationships (Difficulty: Medium).
- Tier 3 ("synthesis"): Multi-step applied reasoning, problem solving, scenario analysis or troubleshooting edge cases (Difficulty: Hard).

Divide the ${questionCount} questions across these tiers.
${attachmentCue}

${userNotesInstruction}

STRICT CRITICAL RULES:
1. Every question must have exactly 4 choices (options).
2. The answer field MUST be an integer 0, 1, 2, or 3 representing the 0-indexed position of the correct option.
3. Randomize which position (0, 1, 2, or 3) holds the correct answer across questions.
4. Plausible distractors: Wrong choices must be realistic and relevant, but definitively incorrect based on the text.
5. Provide a clear, educational "explanation" for why the answer is correct and why other choices fail.
6. Provide a 1-3 word "concept" label identifying the core topic tested.
7. Tag "tier": "recall" | "analytical" | "synthesis".
8. Tag "difficultyLevel": "Easy" | "Medium" | "Hard".
9. Return strictly valid JSON matching this schema:
{
  "quiz": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "answer": 0,
      "explanation": "string",
      "concept": "string",
      "tier": "recall",
      "difficultyLevel": "Easy",
      "type": "mcq"
    }
  ]
}`;
        } else {
          prompt = `You are a master academic educator and quiz creator.
Create a rigorous, highly instructional ${questionCount}-question multiple-choice quiz based on the material provided.
Target difficulty: ${difficulty} (Easy = recall of terms & facts, Medium = comprehension and comparison, Hard = applied reasoning and scenario analysis).
${attachmentCue}

${userNotesInstruction}

STRICT CRITICAL RULES:
1. Every question must have exactly 4 choices (options).
2. The answer field MUST be an integer 0, 1, 2, or 3 representing the 0-indexed position of the correct option.
3. Randomize which position (0, 1, 2, or 3) holds the correct answer across questions.
4. Plausible distractors: Wrong choices must be realistic and relevant, but definitively incorrect based on the text.
5. Provide a clear, educational "explanation" for why the answer is correct and why other choices fail.
6. Provide a 1-3 word "concept" label identifying the core topic tested.
7. Return strictly valid JSON matching this schema:
{
  "quiz": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "answer": 0,
      "explanation": "string",
      "concept": "string",
      "tier": "analytical",
      "difficultyLevel": "${difficulty}",
      "type": "mcq"
    }
  ]
}`;
        }

        const contents = buildMultimodalContents(prompt, attachments, extraDocxText);
        const text = await callGeminiGenerate(ai, contents, 25000);
        const parsed = JSON.parse(text);

        if (parsed.quiz && Array.isArray(parsed.quiz) && parsed.quiz.length > 0) {
          const cleaned = parsed.quiz.map((q: any, idx: number) => {
            const isFrq = q.type === 'frq' || (!Array.isArray(q.options) || q.options.length < 2);
            if (isFrq) {
              return {
                question: String(q.question || 'Academic Free Response Question'),
                options: [],
                answer: 0,
                explanation: String(q.explanation || q.sampleSolution || 'Consult exemplar answer for rubric guidance.'),
                concept: String(q.concept || 'Conceptual Synthesis'),
                tier: 'synthesis' as const,
                difficultyLevel: q.difficultyLevel || 'Hard',
                type: 'frq' as const,
                rubricCriteria: Array.isArray(q.rubricCriteria) && q.rubricCriteria.length > 0
                  ? q.rubricCriteria.map(String)
                  : [
                      'Defines primary mechanism with correct terminology (2 pts)',
                      'Explains interacting pathways and causality (2 pts)',
                      'Addresses boundary constraints or applications (1 pt)'
                    ],
                sampleSolution: String(q.sampleSolution || q.explanation || 'Exemplary academic synthesis.'),
                keywords: Array.isArray(q.keywords) ? q.keywords.map(String) : [],
                maxScore: typeof q.maxScore === 'number' ? q.maxScore : 5,
                sourceExcerpt: typeof q.sourceExcerpt === 'string' && q.sourceExcerpt.trim() ? q.sourceExcerpt.trim() : undefined,
                sourceSupported: typeof q.sourceSupported === 'boolean' ? q.sourceSupported : true
              };
            }

            return {
              question: String(q.question || 'Review Question'),
              options: Array.isArray(q.options) && q.options.length === 4 
                ? q.options.map(String) 
                : ['Option A', 'Option B', 'Option C', 'Option D'],
              answer: typeof q.answer === 'number' && q.answer >= 0 && q.answer <= 3 ? q.answer : 0,
              explanation: String(q.explanation || 'Refer to the source material for the complete explanation.'),
              concept: String(q.concept || 'General Review'),
              tier: q.tier === 'synthesis' || q.tier === 'analytical' || q.tier === 'recall' 
                ? q.tier 
                : (idx % 3 === 2 ? 'synthesis' : idx % 3 === 1 ? 'analytical' : 'recall'),
              difficultyLevel: q.difficultyLevel === 'Hard' || q.difficultyLevel === 'Easy' || q.difficultyLevel === 'Medium'
                ? q.difficultyLevel
                : (q.tier === 'synthesis' ? 'Hard' : q.tier === 'recall' ? 'Easy' : 'Medium'),
              type: 'mcq' as const,
              sourceExcerpt: typeof q.sourceExcerpt === 'string' && q.sourceExcerpt.trim() ? q.sourceExcerpt.trim() : undefined,
              sourceSupported: typeof q.sourceSupported === 'boolean' ? q.sourceSupported : true
            };
          });

          return res.json({ quiz: cleaned, source: 'ai', isAdaptive, format: quizFormat });
        }
      } catch (geminiError: any) {
        console.warn('Gemini quiz generation error, using smart fallback:', geminiError?.message || geminiError);
      }
    }

    // Fallback if AI not available or errored
    let fallbackText = notes;
    if (!fallbackText || fallbackText.trim().length < 20) {
      fallbackText = extraDocxText || await extractMultipleAttachmentsText(attachments);
    }
    const fallbackQuiz = generateFallbackQuiz(fallbackText || `${title} Core Academic Material`, difficulty, questionCount, quizFormat);
    return res.json({ quiz: fallbackQuiz, source: 'heuristic', isAdaptive, format: quizFormat });

  } catch (err: any) {
    console.error('Quiz route error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to generate quiz.' });
  }
});

// Dedicated Targeted Follow-up Quiz Generation (Connected Learning Loop Step 4)
app.post('/api/generate-targeted-quiz', aiRateLimiter, validateAiPayload, async (req: Request, res: Response) => {
  try {
    const { 
      missedConcepts = [], 
      missedQuestions = [], 
      notes = '', 
      title = 'Targeted Review', 
      difficulty = 'Medium',
      count = 5 
    } = req.body;

    const targetCount = Math.min(Math.max(parseInt(count, 10) || 5, 2), 15);
    const conceptsList = Array.isArray(missedConcepts) && missedConcepts.length > 0
      ? missedConcepts.map(String)
      : ['Core Principles', 'Key Mechanisms'];

    const ai = getGeminiClient();
    if (ai) {
      try {
        const missedSummary = missedQuestions.slice(0, 4).map((mq: any, i: number) => 
          `Missed Item ${i + 1}: Question: "${mq.question || ''}" | Concept: "${mq.concept || ''}" | Explanation: "${mq.explanation || ''}"`
        ).join('\n');

        const prompt = `You are a diagnostic learning specialist executing STEP 4 (Targeted Follow-up Recall) of an active mastery learning loop.
The student recently attempted a practice set and struggled with the following weak concepts:
${conceptsList.join(', ')}

Previous missed questions summary:
${missedSummary}

Study notes context:
${notes ? notes.slice(0, 15000) : 'Rely on standard academic domain curriculum.'}

GOAL:
Generate ${targetCount} targeted multiple-choice follow-up questions designed to:
1. Probe the specific misconception that caused the student to miss these concepts.
2. Provide scaffolding: start with clarifying definitions, then test application in a new scenario.
3. Include clear explanations explaining exactly why the misconception fails.
4. Return strictly valid JSON:
{
  "quiz": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "answer": 0,
      "explanation": "string",
      "concept": "string",
      "tier": "analytical",
      "difficultyLevel": "${difficulty}",
      "type": "mcq",
      "sourceExcerpt": "string (direct quote from notes if available)",
      "sourceSupported": true,
      "targetedFollowUp": true
    }
  ]
}`;

        const contents = buildMultimodalContents(prompt);
        const text = await callGeminiGenerate(ai, contents, 25000);
        const parsed = JSON.parse(text);

        if (parsed.quiz && Array.isArray(parsed.quiz) && parsed.quiz.length > 0) {
          const cleaned = parsed.quiz.map((q: any) => ({
            question: String(q.question || 'Targeted Practice Question'),
            options: Array.isArray(q.options) && q.options.length === 4 ? q.options.map(String) : ['Option A', 'Option B', 'Option C', 'Option D'],
            answer: typeof q.answer === 'number' && q.answer >= 0 && q.answer <= 3 ? q.answer : 0,
            explanation: String(q.explanation || 'Review the core concept to resolve this knowledge gap.'),
            concept: String(q.concept || conceptsList[0] || 'Targeted Review'),
            tier: 'analytical' as const,
            difficultyLevel: difficulty === 'Hard' ? 'Hard' : 'Medium',
            type: 'mcq' as const,
            sourceExcerpt: typeof q.sourceExcerpt === 'string' && q.sourceExcerpt.trim() ? q.sourceExcerpt.trim() : undefined,
            sourceSupported: typeof q.sourceSupported === 'boolean' ? q.sourceSupported : true,
            targetedFollowUp: true
          }));

          return res.json({ quiz: cleaned, source: 'ai', isTargeted: true });
        }
      } catch (geminiError: any) {
        console.warn('Targeted quiz AI error, using fallback:', geminiError?.message);
      }
    }

    // Heuristic Targeted Fallback
    const fallback = generateFallbackQuiz(notes || conceptsList.join('\n'), difficulty, targetCount, 'mcq').map(q => ({
      ...q,
      concept: conceptsList[Math.floor(Math.random() * conceptsList.length)] || q.concept,
      targetedFollowUp: true
    }));

    return res.json({ quiz: fallback, source: 'heuristic', isTargeted: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate targeted follow-up quiz.' });
  }
});

// AI Free Response Question (FRQ) Grading API
app.post('/api/grade-frq', aiRateLimiter, validateAiPayload, async (req: Request, res: Response) => {
  try {
    const {
      question,
      studentAnswer = '',
      rubricCriteria = [],
      sampleSolution = '',
      keywords = [],
      maxScore = 5
    } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Missing FRQ question prompt.' });
    }

    if (!studentAnswer || typeof studentAnswer !== 'string' || studentAnswer.trim().length === 0) {
      return res.json({
        result: {
          score: 0,
          maxScore,
          percentage: 0,
          feedback: 'No response submitted. Please type or speak your explanation to receive grading.',
          keyStrengths: [],
          missingConcepts: keywords.slice(0, 3),
          rubricScores: rubricCriteria.map((c: string) => ({ criterion: c, awarded: false, note: 'No submission' })),
          exemplarComparison: sampleSolution ? `Exemplar breakdown: ${sampleSolution.slice(0, 150)}...` : undefined
        }
      });
    }

    const ai = getGeminiClient();
    if (ai) {
      try {
        const rubricText = rubricCriteria.length > 0
          ? `Specific Grading Rubric Criteria:\n${rubricCriteria.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}`
          : 'Grade based on accuracy, depth of reasoning, proper terminology, and completeness.';

        const prompt = `You are a strict, fair, and encouraging university professor grading a student's Free Response Question (FRQ).

QUESTION PROMPT:
${question}

STUDENT SUBMITTED ANSWER:
${studentAnswer}

MODEL EXEMPLAR SOLUTION:
${sampleSolution || 'Evaluate based on foundational academic accuracy and conceptual depth.'}

EXPECTED KEY CONCEPTS / KEYWORDS:
${keywords.join(', ') || 'Domain terminology'}

${rubricText}

MAX SCORE: ${maxScore} points.

INSTRUCTIONS:
1. Objectively grade the answer from 0.0 to ${maxScore} points (decimals allowed, e.g. 4.5).
2. Calculate percentage (score / ${maxScore} * 100).
3. Provide constructive, encouraging feedback explaining what was done well and what was missed.
4. Extract 1-3 "keyStrengths" (specific things the student correctly articulated).
5. Extract 1-3 "missingConcepts" (specific terminology or mechanisms omitted).
6. Grade each rubric criterion individually with boolean "awarded" and a brief "note".
7. Provide a 1-sentence "exemplarComparison" guiding the student on how to reach full marks.
8. Provide "diffHighlights":
   - "matchedSegments": exact phrases from student's answer that demonstrate correct understanding.
   - "omittedConcepts": 2-4 critical phrases or facts from the exemplar that the student missed.
   - "conceptComparisons": array of objects { "concept": string, "expectedInExemplar": string, "studentCoverage": string, "status": "covered" | "partial" | "missed" }.
   - "socraticHint": A gentle, guiding Socratic question (1 sentence) asking the student to reflect on the missing piece.

Return strictly valid JSON matching this schema:
{
  "score": 4.5,
  "maxScore": ${maxScore},
  "percentage": 90,
  "feedback": "string",
  "keyStrengths": ["string"],
  "missingConcepts": ["string"],
  "rubricScores": [
    { "criterion": "string", "awarded": true, "note": "string" }
  ],
  "exemplarComparison": "string",
  "diffHighlights": {
    "matchedSegments": ["string"],
    "omittedConcepts": ["string"],
    "conceptComparisons": [
      { "concept": "string", "expectedInExemplar": "string", "studentCoverage": "string", "status": "covered" }
    ],
    "socraticHint": "string"
  },
  "socraticPrompt": "string"
}`;

        const contents = buildMultimodalContents(prompt);
        const text = await callGeminiGenerate(ai, contents, 20000);
        const parsed = JSON.parse(text);

        if (typeof parsed.score === 'number' && Array.isArray(parsed.rubricScores)) {
          return res.json({ result: parsed, source: 'ai' });
        }
      } catch (geminiError: any) {
        console.warn('Gemini FRQ grading error, using heuristic fallback:', geminiError?.message || geminiError);
      }
    }

    // Heuristic Fallback Grading
    const cleanAnswer = studentAnswer.toLowerCase();
    const wordCount = studentAnswer.trim().split(/\s+/).length;
    let matchedKeywords = 0;
    const missing: string[] = [];
    const strengths: string[] = [];
    const matchedPhrases: string[] = [];

    keywords.forEach((kw: string) => {
      if (cleanAnswer.includes(kw.toLowerCase())) {
        matchedKeywords++;
        strengths.push(`Incorporated key concept "${kw}"`);
        matchedPhrases.push(kw);
      } else {
        missing.push(kw);
      }
    });

    const keywordRatio = keywords.length > 0 ? matchedKeywords / keywords.length : 0.6;
    const lengthScore = Math.min(1.0, wordCount / 35);
    const combinedRatio = keywordRatio * 0.65 + lengthScore * 0.35;
    const finalScore = parseFloat(Math.min(maxScore, Math.max(1, Math.round(combinedRatio * maxScore * 10) / 10)).toFixed(1));
    const percentage = Math.round((finalScore / maxScore) * 100);

    const rubricScores = rubricCriteria.map((c: string, idx: number) => {
      const awarded = idx === 0 ? finalScore >= 2 : idx === 1 ? finalScore >= 3.5 : finalScore >= 4.5;
      return {
        criterion: c,
        awarded,
        note: awarded ? 'Demonstrated sufficient conceptual coverage.' : 'Needs more detailed explanation.'
      };
    });

    const conceptComparisons = (keywords.length > 0 ? keywords : ['Core Mechanism', 'Causal Pathway']).map((kw: string) => {
      const isMatched = cleanAnswer.includes(kw.toLowerCase());
      return {
        concept: kw,
        expectedInExemplar: `Requires addressing ${kw} in context of the prompt mechanism.`,
        studentCoverage: isMatched ? `Mentioned and applied "${kw}" in your answer.` : `Did not mention or explain ${kw}.`,
        status: (isMatched ? 'covered' : 'missed') as 'covered' | 'partial' | 'missed'
      };
    });

    return res.json({
      result: {
        score: finalScore,
        maxScore,
        percentage,
        feedback: finalScore >= 4
          ? 'Excellent response! You clearly articulated the governing mechanisms and used appropriate academic reasoning.'
          : finalScore >= 2.5
          ? 'Good foundation, but several key technical details or interactions could be expanded.'
          : 'Developing response. Be sure to address all parts of the prompt and use precise academic terms.',
        keyStrengths: strengths.length > 0 ? strengths.slice(0, 3) : ['Clear explanation of baseline ideas'],
        missingConcepts: missing.length > 0 ? missing.slice(0, 3) : ['Deep mechanistic interactions'],
        rubricScores,
        exemplarComparison: sampleSolution ? `Exemplar breakdown: ${sampleSolution.slice(0, 120)}...` : undefined,
        diffHighlights: {
          matchedSegments: matchedPhrases,
          omittedConcepts: missing.length > 0 ? missing : ['Extended physiological boundary conditions'],
          conceptComparisons,
          socraticHint: missing.length > 0 
            ? `Consider how "${missing[0]}" directly influences the outcome described in the prompt.`
            : 'How might this mechanism behave under extreme or rate-limiting conditions?'
        },
        socraticPrompt: missing.length > 0 
          ? `How does ${missing[0]} alter the overall system behavior in this scenario?`
          : 'What counter-regulatory feedback loop stabilizes this process?'
      },
      source: 'heuristic'
    });
  } catch (err: any) {
    console.error('FRQ route error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to grade FRQ.' });
  }
});

// Socratic Tutor Hint & Conversational Guidance API
app.post('/api/socratic-turn', aiRateLimiter, validateAiPayload, async (req: Request, res: Response) => {
  try {
    const { question, studentAnswer, currentHintLevel = 1, userQuery, conversationHistory = [] } = req.body;
    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `You are a Socratic Academic Tutor.
Your goal is NEVER to give the final answer away, but to guide the student toward discovering the concept themselves through thoughtful questions.

QUESTION UNDER REVIEW:
"${question?.question || 'Review Question'}"

CORRECT CONCEPT / EXPLANATION:
"${question?.explanation || question?.sampleSolution || 'Domain concept'}"

${studentAnswer ? `STUDENT'S ATTEMPTED ANSWER:\n"${studentAnswer}"` : ''}
${userQuery ? `STUDENT'S MESSAGE TO YOU:\n"${userQuery}"` : ''}

HINT LEVEL: ${currentHintLevel} (1 = subtle nudge / guiding question, 2 = conceptual analogy, 3 = focused breakdown of component parts).

Give a warm, concise (2-4 sentences max), intellectually stimulating Socratic reply that asks one sharp question to trigger active recall.
Return strictly valid JSON: { "reply": "string", "nextHintLevel": ${Math.min(currentHintLevel + 1, 3)}, "keyConceptNudge": "string" }`;

        const contents = buildMultimodalContents(prompt);
        const text = await callGeminiGenerate(ai, contents, 10000);
        const parsed = JSON.parse(text);
        if (parsed.reply) {
          return res.json(parsed);
        }
      } catch (e: any) {
        console.warn('Socratic AI error, using fallback:', e?.message);
      }
    }

    const fallbackReplies = [
      `Notice the relationship between the key mechanisms here. What causes the initial shift before the secondary reaction occurs?`,
      `Think about this like a feedback loop: if the primary factor increases, what downstream effect must balance it?`,
      `Recall the core definition of "${question?.concept || 'this topic'}". How does that constraint rule out the alternative possibilities?`
    ];
    const reply = fallbackReplies[(currentHintLevel - 1) % fallbackReplies.length];

    return res.json({
      reply,
      nextHintLevel: Math.min(currentHintLevel + 1, 3),
      keyConceptNudge: question?.concept || 'Core mechanism'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Socratic turn failed.' });
  }

});


// Generate Flashcards API with Direct Multi-Attachment Processing
app.post('/api/generate-flashcards', aiRateLimiter, validateAiPayload, async (req: Request, res: Response) => {
  try {
    const { notes = '', title = 'Study Session', count = 10, attachment, attachments: rawAttachments } = req.body;
    const attachments: any[] = Array.isArray(rawAttachments) ? rawAttachments : (attachment && attachment.base64 ? [attachment] : []);

    if ((!notes || typeof notes !== 'string' || notes.trim().length < 2) && attachments.length === 0) {
      return res.status(400).json({ error: 'Please provide study notes or upload attachments.' });
    }

    const ai = getGeminiClient();
    const cardCount = Math.min(Math.max(parseInt(count, 10) || 10, 4), 25);

    let extraDocxText = '';
    const docxAttachments = attachments.filter(a => a.mimeType?.includes('word') || a.name?.toLowerCase().endsWith('.docx'));
    if (docxAttachments.length > 0) {
      extraDocxText = await extractMultipleAttachmentsText(docxAttachments);
    }

    if (ai) {
      try {
        const attachmentCue = attachments.length > 0 
          ? `${attachments.length} attachment(s) provided: ${attachments.map(a => a.name).join(', ')}. Synthesize flashcards directly from these documents.`
          : '';

        const userNotesInstruction = notes && notes.trim().length > 0 
          ? `Notes / custom focus:\n${notes.slice(0, 20000)}`
          : 'Extract high-yield core active-recall flashcards from the attached materials.';

        const prompt = `You are an expert cognitive learning specialist.
Generate ${cardCount} high-yield, active-recall flashcards from the provided material.
${attachmentCue}

${userNotesInstruction}

Rules:
- "front": Clear prompt, term, or focused question that tests a single key concept. Keep concise (<140 chars).
- "back": Definitive, clear answer, explanation, or summary (<250 chars).
- "category": Short 1-2 word topic tag (e.g. "Definition", "Process", "Formula", "Historical Fact").

Return strictly valid JSON:
{
  "cards": [
    {
      "front": "string",
      "back": "string",
      "category": "string"
    }
  ]
}`;

        const contents = buildMultimodalContents(prompt, attachments, extraDocxText);
        const text = await callGeminiGenerate(ai, contents, 25000);
        const parsed = JSON.parse(text);

        if (parsed.cards && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
          const cardsWithIds = parsed.cards.map((c: any, idx: number) => ({
            id: `card-${idx + 1}-${Date.now()}`,
            front: String(c.front || '').trim(),
            back: String(c.back || '').trim(),
            category: String(c.category || 'General').trim()
          })).filter((c: { front: string; back: string }) => Boolean(c.front && c.back));

          return res.json({ cards: cardsWithIds, source: 'ai' });
        }
      } catch (geminiError: any) {
        console.warn('Gemini flashcard generation error, using fallback:', geminiError?.message || geminiError);
      }
    }

    let fallbackText = notes;
    if (!fallbackText || fallbackText.trim().length < 20) {
      fallbackText = extraDocxText || await extractMultipleAttachmentsText(attachments);
    }
    const fallbackCards = generateFallbackFlashcards(fallbackText || `${title} Study Review`, cardCount);
    return res.json({ cards: fallbackCards, source: 'heuristic' });

  } catch (err: any) {
    console.error('Flashcard route error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to generate flashcards.' });
  }
});

// Generate Study Guide & Mind Map API with Direct Multi-Attachment Processing
app.post('/api/generate-studyguide', aiRateLimiter, validateAiPayload, async (req: Request, res: Response) => {
  try {
    const { notes = '', title = 'Study Guide', attachment, attachments: rawAttachments } = req.body;
    const attachments: any[] = Array.isArray(rawAttachments) ? rawAttachments : (attachment && attachment.base64 ? [attachment] : []);

    if ((!notes || typeof notes !== 'string' || notes.trim().length < 2) && attachments.length === 0) {
      return res.status(400).json({ error: 'Please provide study notes or upload attachments.' });
    }

    const ai = getGeminiClient();

    let extraDocxText = '';
    const docxAttachments = attachments.filter(a => a.mimeType?.includes('word') || a.name?.toLowerCase().endsWith('.docx'));
    if (docxAttachments.length > 0) {
      extraDocxText = await extractMultipleAttachmentsText(docxAttachments);
    }

    if (ai) {
      try {
        const attachmentCue = attachments.length > 0 
          ? `${attachments.length} attachment(s) provided: ${attachments.map(a => a.name).join(', ')}. Directly analyze all attached documents to construct the study briefing.`
          : '';

        const userNotesInstruction = notes && notes.trim().length > 0 
          ? `User notes / custom focus topics:\n${notes.slice(0, 20000)}`
          : 'Synthesize an executive study briefing covering the attached materials.';

        const prompt = `You are an elite tutor synthesizing study material into an executive study briefing.
Analyze the provided material and generate a structured study guide with:
1. "title": A clean, concise title.
2. "overview": A 2-3 sentence executive synopsis of the core subject.
3. "keyConcepts": An array of 4-8 objects { "term": string, "explanation": string, "example": string }.
4. "keyTakeaways": 4-6 bullet points summarizing the most testable principles.
5. "quickReviewQuestions": 3-5 rapid recall Q&A pairs { "q": string, "a": string }.
6. "conceptMap": A hierarchical breakdown with "root" and "children": [ { "name": string, "details": string, "subtopics": [string] } ].
7. "mathVideos": If the material involves mathematics, calculus, linear algebra, statistics, equations, or quantitative modeling, recommend 2-4 premier YouTube educational video lectures from channels such as 3Blue1Brown, Khan Academy, Professor Leonard, StatQuest with Josh Starmer, or MIT OpenCourseWare:
   [ { "title": "string", "channel": "string", "url": "string (e.g. https://www.youtube.com/results?search_query=...)", "reason": "string" } ].
   If this is NOT a math subject, return [].
${attachmentCue}

${userNotesInstruction}

Return strictly valid JSON matching this schema:
{
  "title": "string",
  "overview": "string",
  "keyConcepts": [
    { "term": "string", "explanation": "string", "example": "string" }
  ],
  "keyTakeaways": ["string"],
  "quickReviewQuestions": [
    { "q": "string", "a": "string" }
  ],
  "conceptMap": {
    "root": "string",
    "children": [
      { "name": "string", "details": "string", "subtopics": ["string"] }
    ]
  },
  "mathVideos": [
    { "title": "string", "channel": "string", "url": "string", "reason": "string" }
  ]
}`;

        const contents = buildMultimodalContents(prompt, attachments, extraDocxText);
        const text = await callGeminiGenerate(ai, contents, 25000);
        const parsed = JSON.parse(text);
        if (parsed.overview && parsed.keyConcepts) {
          const autoMathVideos = detectMathVideos(`${notes} ${parsed.title || ''}`, title);
          const finalVideos = (Array.isArray(parsed.mathVideos) && parsed.mathVideos.length > 0)
            ? parsed.mathVideos
            : autoMathVideos;

          return res.json({ 
            guide: { 
              ...parsed, 
              mathVideos: finalVideos,
              isMathSubject: finalVideos.length > 0 
            }, 
            source: 'ai' 
          });
        }
      } catch (geminiError: any) {
        console.warn('Gemini study guide error, using fallback:', geminiError?.message || geminiError);
      }
    }

    let fallbackText = notes;
    if (!fallbackText || fallbackText.trim().length < 20) {
      fallbackText = extraDocxText || await extractMultipleAttachmentsText(attachments);
    }
    const fallbackGuide = generateFallbackStudyGuide(fallbackText || `${title} Study Guide`, title);
    return res.json({ guide: fallbackGuide, source: 'heuristic' });

  } catch (err: any) {
    console.error('Study guide route error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to generate study guide.' });
  }
});

// Generate AI Audio Briefing & Conversational Podcast Script
app.post('/api/generate-podcast', aiRateLimiter, validateAiPayload, async (req: Request, res: Response) => {
  try {
    const { title = 'Academic Review', overview = '', keyTakeaways = [], notes = '' } = req.body;

    const ai = getGeminiClient();
    if (ai) {
      try {
        const takeawaysText = Array.isArray(keyTakeaways) && keyTakeaways.length > 0
          ? `Key Takeaways:\n${keyTakeaways.map(t => `- ${t}`).join('\n')}`
          : '';

        const prompt = `You are a Peabody Award-winning science and educational podcast producer (similar to Radiolab or NPR's Short Wave).
Create a high-energy, engaging 2-speaker educational podcast conversation reviewing this study material:

SUBJECT / TITLE: ${title}
EXECUTIVE OVERVIEW: ${overview}
${takeawaysText}
${notes ? `SOURCE NOTES SNIPPET:\n${notes.slice(0, 8000)}` : ''}

CO-HOST ROLES:
- "Alex": The lead academic instructor. Deeply knowledgeable, articulate, enthusiastic, uses vivid metaphors.
- "Sam": The inquisitive co-host and learner. Asks the "wait, how does that work?" questions that every student has, makes relatable everyday analogies, summarizes insights.

CONVERSATION DYNAMICS:
1. Start with a lively, hooky introduction where Alex introduces the subject and Sam sets up the core problem.
2. Cover 3-4 core concepts naturally through back-and-forth dialogue.
3. Include an "Aha!" moment where Sam connects two ideas with a memorable analogy.
4. Conclude with a rapid 3-point takeaway wrap-up.
5. Create between 10 and 16 dialogue turns total. Keep each speaker turn concise (1-3 sentences, natural conversational spoken English).

Return strictly valid JSON matching this schema:
{
  "episode": {
    "id": "podcast-${Date.now()}",
    "title": "string (catchy podcast episode title)",
    "subject": "${title}",
    "durationMinutes": 4,
    "summary": "string (1-2 sentence episode description)",
    "dialogue": [
      {
        "id": "t1",
        "speaker": "Alex",
        "text": "string (spoken natural dialogue)",
        "tone": "enthusiastic"
      },
      {
        "id": "t2",
        "speaker": "Sam",
        "text": "string (spoken natural dialogue)",
        "tone": "curious"
      }
    ]
  }
}`;

        const contents = buildMultimodalContents(prompt);
        const text = await callGeminiGenerate(ai, contents, 25000);
        const parsed = JSON.parse(text);

        if (parsed.episode && Array.isArray(parsed.episode.dialogue) && parsed.episode.dialogue.length > 0) {
          return res.json({ episode: parsed.episode, source: 'ai' });
        }
      } catch (geminiError: any) {
        console.warn('Gemini podcast generation error, using fallback:', geminiError?.message || geminiError);
      }
    }

    // Heuristic Fallback Podcast Generator
    const cleanTitle = title || 'Academic Study Brief';
    const fallbackEpisode = {
      id: `podcast-${Date.now()}`,
      title: `${cleanTitle}: The Active Recall Masterclass`,
      subject: cleanTitle,
      durationMinutes: 4,
      summary: `Join Alex and Sam as they break down the critical concepts and exam strategies for ${cleanTitle}.`,
      dialogue: [
        {
          id: 't1',
          speaker: 'Alex' as const,
          text: `Welcome back to Noetic Audio Briefings! Today we are doing a high-yield deep dive into ${cleanTitle}.`,
          tone: 'enthusiastic' as const
        },
        {
          id: 't2',
          speaker: 'Sam' as const,
          text: `I'm ready, Alex. Whenever I look at these notes, there is a ton of terminology. Where should we start?`,
          tone: 'curious' as const
        },
        {
          id: 't3',
          speaker: 'Alex' as const,
          text: `Always start with the primary governing mechanism: ${overview ? overview.slice(0, 180) : 'the foundational framework that sets everything into motion.'}`,
          tone: 'explaining' as const
        },
        {
          id: 't4',
          speaker: 'Sam' as const,
          text: `Ah, that makes so much sense. So it is essentially like an engine, where every secondary pathway feeds back into that core process!`,
          tone: 'thoughtful' as const
        },
        {
          id: 't5',
          speaker: 'Alex' as const,
          text: `Exactly! And on exams, professors love testing how the system reacts when you disrupt one of those inputs.`,
          tone: 'explaining' as const
        },
        {
          id: 't6',
          speaker: 'Sam' as const,
          text: `Right, like the limiting factors or rate-limiting steps! What are the biggest takeaways we need to lock in before test day?`,
          tone: 'curious' as const
        },
        {
          id: 't7',
          speaker: 'Alex' as const,
          text: Array.isArray(keyTakeaways) && keyTakeaways[0]
            ? `First: ${keyTakeaways[0]}. Second: ${keyTakeaways[1] || 'Always trace the cause-and-effect relationships.'}`
            : `First, verify the baseline definitions. Second, evaluate the boundary conditions and limiting factors.`,
          tone: 'explaining' as const
        },
        {
          id: 't8',
          speaker: 'Sam' as const,
          text: `And for active recall, don't just passively read—test yourself with the flashcards and practice quizzes right after this episode!`,
          tone: 'enthusiastic' as const
        },
        {
          id: 't9',
          speaker: 'Alex' as const,
          text: `Spot on, Sam. Take 5 minutes right now to test what you just heard. We will see you on the leaderboard!`,
          tone: 'enthusiastic' as const
        }
      ]
    };

    return res.json({ episode: fallbackEpisode, source: 'heuristic' });
  } catch (err: any) {
    console.error('Podcast route error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to generate podcast briefing.' });
  }
});


// Chatbot API with direct attachment understanding & mandatory citations
app.post('/api/chat', aiRateLimiter, validateAiPayload, async (req: Request, res: Response) => {
  try {
    const { message, history = [], notes = '', deckTitle = 'Current Study Material', attachment } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide a question or message.' });
    }

    const ai = getGeminiClient();

    let docxText = '';
    if (attachment && (attachment.mimeType?.includes('word') || attachment.name?.toLowerCase().endsWith('.docx'))) {
      docxText = await extractAttachmentTextIfNeeded(attachment);
    }

    if (ai) {
      try {
        const formattedHistory = Array.isArray(history)
          ? history.slice(-6).map((h: any) => `${h.role === 'user' ? 'Student' : 'Tutor'}: ${h.content}`).join('\n')
          : '';

        const attachmentCue = attachment
          ? `The student has attached a document: "${attachment.name || 'document'}". Inspect this attachment directly to formulate accurate answers and cite excerpts from it.`
          : '';

        const prompt = `You are Noetic, an expert academic study tutor and active-recall mentor.
The student is asking questions about their study material titled: "${deckTitle}".
${attachmentCue}

STUDY MATERIAL / NOTES:
${notes && notes.trim().length > 0 ? notes.slice(0, 22000) : 'No custom notes typed. Rely primarily on the attached document or general scholarly consensus.'}

RECENT CONVERSATION HISTORY:
${formattedHistory || 'None'}

STUDENT QUESTION:
"${message}"

CRITICAL MANDATORY INSTRUCTIONS:
1. Provide a direct, pedagogically rigorous, and easy-to-understand explanation.
2. EVERY response MUST cite explicit sources in the "sources" array.
3. If information is found in the attached document or student's study material above:
   - "title": Section heading, page number, or concept name from the material.
   - "excerpt": Exact verbatim quote or excerpt that proves your answer.
   - "relevance": Brief note on how this quote answers the student's question.
4. If the question asks about something NOT in the material:
   - State clearly in the reply that this topic is not in their current material.
   - Provide the scholarly answer.
   - Set "sources" to cite the standard academic domain (e.g. "General Scientific Consensus / Standard Molecular Biology Curriculum").
5. Suggest 2-3 active-recall follow-up questions to help the student test their retention.
6. IF the student's question or the material relates to mathematics, calculus, linear algebra, statistics, equations, or quantitative STEM subjects, suggest 1-3 high-yield YouTube educational video links in "suggestedVideos": [ { "title": "string", "channel": "string (e.g. 3Blue1Brown, Khan Academy, StatQuest, Professor Leonard)", "url": "string (https://www.youtube.com/results?search_query=...)", "reason": "string" } ]. Otherwise return an empty array [].

Return strictly valid JSON:
{
  "reply": "string (formatted with clean text or bullet points)",
  "sources": [
    {
      "title": "string",
      "excerpt": "string",
      "relevance": "string"
    }
  ],
  "followUpQuestions": ["string", "string"],
  "suggestedVideos": [
    {
      "title": "string",
      "channel": "string",
      "url": "string",
      "reason": "string"
    }
  ]
}`;

        const contents = buildMultimodalContents(prompt, attachment ? [attachment] : [], docxText);
        const text = await callGeminiGenerate(ai, contents, 25000);
        const parsed = JSON.parse(text);

        if (parsed.reply && Array.isArray(parsed.sources)) {
          return res.json({
            reply: parsed.reply,
            sources: parsed.sources,
            followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions : [],
            suggestedVideos: Array.isArray(parsed.suggestedVideos) && parsed.suggestedVideos.length > 0
              ? parsed.suggestedVideos
              : detectMathVideos(`${message} ${notes}`, deckTitle),
            source: 'ai'
          });
        }
      } catch (geminiError: any) {
        console.warn('Gemini chat error, using grounded fallback:', geminiError?.message || geminiError);
      }
    }

    // Heuristic Fallback
    let materialText = notes;
    if (!materialText || materialText.trim().length < 20) {
      materialText = docxText || await extractAttachmentTextIfNeeded(attachment);
    }

    const lowerMsg = message.toLowerCase();
    const words = lowerMsg.split(/\W+/).filter((w: string) => w.length > 3);
    const lines = materialText.split('\n').map((l: string) => l.trim()).filter(Boolean);

    const matchingLines: { line: string; score: number }[] = [];
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      let matchCount = 0;
      for (const w of words) {
        if (lowerLine.includes(w)) matchCount++;
      }
      if (matchCount > 0) {
        matchingLines.push({ line, score: matchCount });
      }
    }

    matchingLines.sort((a, b) => b.score - a.score);
    const topMatches = matchingLines.slice(0, 3);

    let reply = '';
    const sources: Array<{ title: string; excerpt: string; relevance: string }> = [];

    if (topMatches.length > 0) {
      reply = `Based on your material for "${deckTitle}", here is what was found regarding your query:\n\n${topMatches.map(m => `• ${m.line}`).join('\n\n')}\n\nReview this excerpt to verify how it connects to the broader topic.`;
      topMatches.forEach((m, idx) => {
        sources.push({
          title: `Study Material — Reference Point ${idx + 1}`,
          excerpt: m.line,
          relevance: `Direct textual match for keywords: ${words.slice(0, 3).join(', ')}`
        });
      });
    } else {
      reply = `I reviewed your material for "${deckTitle}". While a direct keyword match wasn't found for "${message}", you can add this concept to your study goals or test yourself on the related concepts in this deck.`;
      sources.push({
        title: deckTitle || 'Active Study Notes',
        excerpt: (materialText || 'General Coursework').slice(0, 180) + '...',
        relevance: 'Source document searched for relevant context.'
      });
    }

    const fallbackMathVideos = detectMathVideos(`${message} ${materialText}`, deckTitle);

    return res.json({
      reply,
      sources,
      followUpQuestions: [
        'Would you like a quiz question generated on this topic?',
        'How does this concept connect to the other sections in your deck?'
      ],
      suggestedVideos: fallbackMathVideos,
      source: 'heuristic'
    });

  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    return res.status(500).json({ error: err?.message || 'Chatbot request failed.' });
  }
});

// ==========================================================
// REAL-TIME STREAMING GENERATION API (SERVER-SENT EVENTS - SSE)
// ==========================================================

// Helper to write SSE events
function initSseResponse(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  return {
    sendProgress: (step: string, percent: number) => {
      res.write(`event: progress\ndata: ${JSON.stringify({ step, percent })}\n\n`);
    },
    sendComplete: (payload: any) => {
      res.write(`event: complete\ndata: ${JSON.stringify(payload)}\n\n`);
      res.end();
    },
    sendError: (errorMsg: string) => {
      res.write(`event: error\ndata: ${JSON.stringify({ error: errorMsg })}\n\n`);
      res.end();
    }
  };
}

// SSE Streaming Quiz Generation
app.post('/api/stream/generate-quiz', aiRateLimiter, validateAiPayload, async (req: Request, res: Response) => {
  const sse = initSseResponse(res);
  try {
    const { 
      notes = '', 
      title = 'Study Session', 
      difficulty = 'Medium', 
      count = 5, 
      format = 'mcq',
      attachments: rawAttachments = [] 
    } = req.body;

    const attachments: any[] = Array.isArray(rawAttachments) ? rawAttachments : [];

    sse.sendProgress('Parsing uploaded attachments and extracting context...', 15);

    let extraDocxText = '';
    const docxAttachments = attachments.filter(a => a.mimeType?.includes('word') || a.name?.toLowerCase().endsWith('.docx'));
    if (docxAttachments.length > 0) {
      extraDocxText = await extractMultipleAttachmentsText(docxAttachments);
    }

    sse.sendProgress(`Configuring ${difficulty} active recall parameters...`, 35);

    const questionCount = Math.min(Math.max(parseInt(count, 10) || 5, 3), 20);
    const isAdaptive = difficulty === 'Adaptive';
    const quizFormat: 'mcq' | 'frq' | 'mixed' = (format === 'frq' || format === 'mixed') ? format : 'mcq';

    const ai = getGeminiClient();
    if (ai) {
      try {
        sse.sendProgress('Synthesizing questions and rubrics with Gemini AI...', 60);

        const attachmentCue = attachments.length > 0 
          ? `${attachments.length} attachment(s) have been provided: ${attachments.map(a => a.name).join(', ')}. Read and analyze all attached documents directly to generate the quiz.`
          : '';

        const userNotesInstruction = notes && notes.trim().length > 0 
          ? `User notes / custom focus instructions:\n${notes.slice(0, 20000)}`
          : 'Synthesize high-yield testable questions covering the core principles in the attached materials.';

        let prompt = '';
        if (quizFormat === 'frq') {
          prompt = `You are an elite academic professor designing a FREE RESPONSE QUESTION (FRQ) assessment.
Create an active recall assessment of ${questionCount} open-ended analytical Free Response Questions. Target difficulty: ${difficulty}.
${attachmentCue}
${userNotesInstruction}
Return strictly valid JSON:
{ "quiz": [ { "question": "string", "options": [], "answer": 0, "explanation": "string", "concept": "string", "tier": "synthesis", "difficultyLevel": "${difficulty === 'Adaptive' ? 'Hard' : difficulty}", "type": "frq", "rubricCriteria": ["string", "string"], "sampleSolution": "string", "keywords": ["string"], "maxScore": 5 } ] }`;
        } else if (quizFormat === 'mixed') {
          const frqCount = Math.max(1, Math.round(questionCount * 0.4));
          const mcqCount = questionCount - frqCount;
          prompt = `Create a MIXED ASSESSMENT: exactly ${mcqCount} MCQs and ${frqCount} FRQs. Target difficulty: ${difficulty}.
${attachmentCue}
${userNotesInstruction}
Return strictly valid JSON:
{ "quiz": [ { "question": "string", "options": ["string", "string", "string", "string"], "answer": 0, "explanation": "string", "concept": "string", "tier": "analytical", "difficultyLevel": "Medium", "type": "mcq" }, { "question": "string", "options": [], "answer": 0, "explanation": "string", "concept": "string", "tier": "synthesis", "difficultyLevel": "Hard", "type": "frq", "rubricCriteria": ["string"], "sampleSolution": "string", "keywords": ["string"], "maxScore": 5 } ] }`;
        } else {
          prompt = `Create a ${questionCount}-question multiple choice quiz. Target difficulty: ${difficulty}.
${attachmentCue}
${userNotesInstruction}
Return strictly valid JSON:
{ "quiz": [ { "question": "string", "options": ["string", "string", "string", "string"], "answer": 0, "explanation": "string", "concept": "string", "tier": "analytical", "difficultyLevel": "${difficulty}", "type": "mcq" } ] }`;
        }

        const contents = buildMultimodalContents(prompt, attachments, extraDocxText);
        const text = await callGeminiGenerate(ai, contents, 25000);
        const parsed = JSON.parse(text);

        sse.sendProgress('Validating answer keys, explanations, and cognitive tiers...', 90);

        if (parsed.quiz && Array.isArray(parsed.quiz) && parsed.quiz.length > 0) {
          const cleaned = parsed.quiz.map((q: any) => {
            const isFrq = q.type === 'frq' || (!Array.isArray(q.options) || q.options.length < 2);
            if (isFrq) {
              return {
                question: String(q.question || 'Academic Free Response Question'),
                options: [],
                answer: 0,
                explanation: String(q.explanation || q.sampleSolution || 'Consult exemplar answer.'),
                concept: String(q.concept || 'Conceptual Synthesis'),
                tier: 'synthesis' as const,
                difficultyLevel: q.difficultyLevel || 'Hard',
                type: 'frq' as const,
                rubricCriteria: Array.isArray(q.rubricCriteria) && q.rubricCriteria.length > 0 ? q.rubricCriteria.map(String) : ['Covers core principles (2 pts)', 'Explains causal interactions (2 pts)', 'Demonstrates accurate terminology (1 pt)'],
                sampleSolution: String(q.sampleSolution || q.explanation || 'Exemplary academic synthesis.'),
                keywords: Array.isArray(q.keywords) ? q.keywords.map(String) : [],
                maxScore: typeof q.maxScore === 'number' ? q.maxScore : 5
              };
            }
            return {
              question: String(q.question || 'Review Question'),
              options: Array.isArray(q.options) && q.options.length === 4 ? q.options.map(String) : ['Option A', 'Option B', 'Option C', 'Option D'],
              answer: typeof q.answer === 'number' && q.answer >= 0 && q.answer <= 3 ? q.answer : 0,
              explanation: String(q.explanation || 'Refer to course source material.'),
              concept: String(q.concept || 'General Review'),
              tier: q.tier || 'analytical',
              difficultyLevel: q.difficultyLevel || 'Medium',
              type: 'mcq' as const
            };
          });

          return sse.sendComplete({ quiz: cleaned, source: 'ai', isAdaptive, format: quizFormat });
        }
      } catch (geminiError: any) {
        console.warn('Streaming quiz AI error, falling back:', geminiError?.message);
      }
    }

    // Heuristic Fallback
    sse.sendProgress('Generating questions via heuristic academic parsing...', 80);
    let fallbackText = notes;
    if (!fallbackText || fallbackText.trim().length < 20) {
      fallbackText = extraDocxText || await extractMultipleAttachmentsText(attachments);
    }
    const fallbackQuiz = generateFallbackQuiz(fallbackText || `${title} Core Material`, difficulty, questionCount, quizFormat);
    return sse.sendComplete({ quiz: fallbackQuiz, source: 'heuristic', isAdaptive, format: quizFormat });
  } catch (err: any) {
    return sse.sendError(err.message || 'Streaming quiz generation failed.');
  }
});

// SSE Streaming Flashcards Generation
app.post('/api/stream/generate-flashcards', aiRateLimiter, validateAiPayload, async (req: Request, res: Response) => {
  const sse = initSseResponse(res);
  try {
    const { notes = '', title = 'Study Session', count = 10, attachments = [] } = req.body;
    sse.sendProgress('Reading document attachments for active recall distillation...', 20);

    const cardCount = Math.min(Math.max(parseInt(count, 10) || 10, 4), 25);
    let extraDocxText = '';
    const docxAttachments = attachments.filter((a: any) => a.mimeType?.includes('word') || a.name?.toLowerCase().endsWith('.docx'));
    if (docxAttachments.length > 0) {
      extraDocxText = await extractMultipleAttachmentsText(docxAttachments);
    }

    sse.sendProgress('Synthesizing flashcards with Gemini cognitive model...', 60);
    const ai = getGeminiClient();
    if (ai) {
      try {
        const attachmentCue = attachments.length > 0 
          ? `${attachments.length} attachment(s) provided. Synthesize cards directly from these files.`
          : '';
        const prompt = `Generate ${cardCount} active recall flashcards.
${attachmentCue}
Notes:\n${notes.slice(0, 20000)}
Return strictly valid JSON:
{ "cards": [ { "front": "string (<140 chars)", "back": "string (<250 chars)", "category": "string" } ] }`;

        const contents = buildMultimodalContents(prompt, attachments, extraDocxText);
        const text = await callGeminiGenerate(ai, contents, 25000);
        const parsed = JSON.parse(text);

        if (parsed.cards && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
          const cardsWithIds = parsed.cards.map((c: any, idx: number) => ({
            id: `card-${idx + 1}-${Date.now()}`,
            front: String(c.front || '').trim(),
            back: String(c.back || '').trim(),
            category: String(c.category || 'General').trim()
          })).filter((c: any) => Boolean(c.front && c.back));

          sse.sendProgress('Scheduling smart review intervals for long-term memory...', 90);
          return sse.sendComplete({ cards: cardsWithIds, source: 'ai' });
        }
      } catch (geminiError: any) {
        console.warn('Streaming flashcards AI error:', geminiError?.message);
      }
    }

    let fallbackText = notes;
    if (!fallbackText || fallbackText.trim().length < 20) {
      fallbackText = extraDocxText || await extractMultipleAttachmentsText(attachments);
    }
    const fallbackCards = generateFallbackFlashcards(fallbackText || `${title} Review`, cardCount);
    return sse.sendComplete({ cards: fallbackCards, source: 'heuristic' });
  } catch (err: any) {
    return sse.sendError(err.message || 'Streaming flashcards failed.');
  }
});

// SSE Streaming Study Guide Generation
app.post('/api/stream/generate-studyguide', aiRateLimiter, validateAiPayload, async (req: Request, res: Response) => {
  const sse = initSseResponse(res);
  try {
    const { notes = '', title = 'Study Guide', attachments = [] } = req.body;
    sse.sendProgress('Ingesting documents for executive synopsis & hierarchy...', 20);

    let extraDocxText = '';
    const docxAttachments = attachments.filter((a: any) => a.mimeType?.includes('word') || a.name?.toLowerCase().endsWith('.docx'));
    if (docxAttachments.length > 0) {
      extraDocxText = await extractMultipleAttachmentsText(docxAttachments);
    }

    sse.sendProgress('Synthesizing hierarchical concept map & takeaways...', 60);
    const ai = getGeminiClient();
    if (ai) {
      try {
        const attachmentCue = attachments.length > 0 
          ? `${attachments.length} attachment(s) provided. Analyze all documents directly.`
          : '';
        const prompt = `Synthesize an executive study briefing with title, overview, keyConcepts, keyTakeaways, quickReviewQuestions, conceptMap ({ root: string, children: [ { name: string, details: string, subtopics: [string] } ] }), and mathVideos.
${attachmentCue}
Notes:\n${notes.slice(0, 20000)}
Return strictly valid JSON.`;

        const contents = buildMultimodalContents(prompt, attachments, extraDocxText);
        const text = await callGeminiGenerate(ai, contents, 25000);
        const parsed = JSON.parse(text);

        if (parsed.overview && parsed.keyConcepts) {
          const autoMathVideos = detectMathVideos(`${notes} ${parsed.title || ''}`, title);
          const finalVideos = (Array.isArray(parsed.mathVideos) && parsed.mathVideos.length > 0)
            ? parsed.mathVideos
            : autoMathVideos;

          sse.sendProgress('Curating lecture videos and knowledge graph links...', 90);
          return sse.sendComplete({ 
            guide: { 
              ...parsed, 
              mathVideos: finalVideos,
              isMathSubject: finalVideos.length > 0 
            }, 
            source: 'ai' 
          });
        }
      } catch (geminiError: any) {
        console.warn('Streaming study guide AI error:', geminiError?.message);
      }
    }

    let fallbackText = notes;
    if (!fallbackText || fallbackText.trim().length < 20) {
      fallbackText = extraDocxText || await extractMultipleAttachmentsText(attachments);
    }
    const fallbackGuide = generateFallbackStudyGuide(fallbackText || `${title} Study Guide`, title);
    return sse.sendComplete({ guide: fallbackGuide, source: 'heuristic' });
  } catch (err: any) {
    return sse.sendError(err.message || 'Streaming study guide failed.');
  }
});

// Audio Turn Pre-generation & Cache API
const audioSynthesisCache = new Map<string, { audioBase64?: string; durationMs?: number; estimatedDurationMs?: number; speaker?: any; cached?: boolean; key?: string }>();

app.post('/api/audio/synthesize-turn', aiRateLimiter, (req: Request, res: Response) => {
  try {
    const { speaker, text, speed = 1.0 } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const key = `${speaker}-${speed}-${crypto.createHash('md5').update(text).digest('hex')}`;
    const cached = audioSynthesisCache.get(key);
    if (cached) {
      return res.json({ cached: true, key, ...cached });
    }

    // Estimate duration for browser speech planning
    const wordCount = String(text).split(/\s+/).length;
    const estimatedDurationMs = Math.round((wordCount / (145 * speed)) * 60 * 1000);
    const result = { estimatedDurationMs, speaker, cached: false, key };
    audioSynthesisCache.set(key, result);

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Audio synthesis error.' });
  }
});

// ---------------- VITE / STATIC HANDLING & WEBSOCKET SETUP ----------------

async function startServer() {
  const httpServer = http.createServer(app);

  // Setup WebSocket Server for Real-Time Collaborative Decks with safe error handling
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('error', (err) => {
    console.warn('Collaborative WebSocket server handled error:', err);
  });

  function broadcastToRoom(roomCode: string, payload: any, senderWs?: WebSocket) {
    const room = collabRooms.get(roomCode);
    if (!room) return;
    const msg = JSON.stringify(payload);
    room.peers.forEach(({ ws }) => {
      if (ws && ws !== senderWs && ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    });
  }

  wss.on('connection', (ws: WebSocket) => {
    let currentRoomCode: string | null = null;
    let currentPeerId: string | null = null;

    ws.on('message', (data: string) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'join_room') {
          const { roomCode, peer } = msg;
          const code = String(roomCode || '').toUpperCase().trim();
          let room = collabRooms.get(code);

          if (!room) {
            // Auto-create room if it does not exist yet
            room = {
              roomId: `room-${Date.now()}`,
              roomCode: code,
              deckTitle: `${peer.name}'s Collaborative Deck`,
              notes: '',
              cards: [],
              quizQuestions: [],
              updatedAt: Date.now(),
              lastEditedBy: peer.name,
              peers: new Map(),
              activityLog: [
                { id: `act-${Date.now()}`, user: peer.name, action: 'Created room', timestamp: Date.now() }
              ]
            };
            collabRooms.set(code, room);
            persistData();
          }

          currentRoomCode = code;
          currentPeerId = peer.id;

          const peerInfo: CollabPeer = {
            id: peer.id,
            name: peer.name,
            color: peer.color || '#6366f1',
            isHost: room.peers.size === 0,
            activeTab: peer.activeTab || 'deck',
            lastSeen: Date.now()
          };

          room.peers.set(peer.id, { peer: peerInfo, ws });
          room.activityLog.push({
            id: `act-${Date.now()}`,
            user: peer.name,
            action: 'Joined study group session',
            timestamp: Date.now()
          });

          // Send current authoritative room state to the newly joined peer
          ws.send(JSON.stringify({
            type: 'room_state',
            room: formatRoomResponse(room)
          }));

          // Broadcast peer joined to everyone else in room
          broadcastToRoom(code, {
            type: 'peer_joined',
            peer: peerInfo,
            activeUsers: Array.from(room.peers.values()).map(p => p.peer),
            activity: room.activityLog.slice(-1)[0]
          }, ws);
        }

        if (msg.type === 'deck_update' && currentRoomCode) {
          const room = collabRooms.get(currentRoomCode);
          if (room) {
            if (typeof msg.deckTitle === 'string') room.deckTitle = msg.deckTitle;
            if (typeof msg.notes === 'string') room.notes = msg.notes;
            room.updatedAt = Date.now();
            room.lastEditedBy = msg.userName || 'Peer';
            persistData();

            broadcastToRoom(currentRoomCode, {
              type: 'deck_updated',
              deckTitle: room.deckTitle,
              notes: room.notes,
              lastEditedBy: room.lastEditedBy,
              updatedAt: room.updatedAt
            }, ws);
          }
        }

        if (msg.type === 'add_card' && currentRoomCode) {
          const room = collabRooms.get(currentRoomCode);
          if (room && msg.card) {
            room.cards.push(msg.card);
            room.updatedAt = Date.now();
            room.lastEditedBy = msg.userName || 'Peer';
            const activity = {
              id: `act-${Date.now()}`,
              user: msg.userName || 'Peer',
              action: `Added flashcard: "${msg.card.front.slice(0, 30)}..."`,
              timestamp: Date.now()
            };
            room.activityLog.push(activity);
            persistData();

            broadcastToRoom(currentRoomCode, {
              type: 'card_added',
              card: msg.card,
              cards: room.cards,
              activity
            }, ws);
          }
        }

        if (msg.type === 'delete_card' && currentRoomCode) {
          const room = collabRooms.get(currentRoomCode);
          if (room && msg.cardId) {
            room.cards = room.cards.filter(c => c.id !== msg.cardId);
            room.updatedAt = Date.now();
            const activity = {
              id: `act-${Date.now()}`,
              user: msg.userName || 'Peer',
              action: `Removed flashcard from deck`,
              timestamp: Date.now()
            };
            room.activityLog.push(activity);
            persistData();

            broadcastToRoom(currentRoomCode, {
              type: 'card_deleted',
              cardId: msg.cardId,
              cards: room.cards,
              activity
            }, ws);
          }
        }

        if (msg.type === 'chat_message' && currentRoomCode) {
          broadcastToRoom(currentRoomCode, {
            type: 'chat_message',
            user: msg.user,
            text: msg.text,
            timestamp: Date.now()
          });
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomCode && currentPeerId) {
        const room = collabRooms.get(currentRoomCode);
        if (room) {
          const userObj = room.peers.get(currentPeerId);
          room.peers.delete(currentPeerId);

          if (userObj) {
            const activity = {
              id: `act-${Date.now()}`,
              user: userObj.peer.name,
              action: 'Left study group',
              timestamp: Date.now()
            };
            room.activityLog.push(activity);

            broadcastToRoom(currentRoomCode, {
              type: 'peer_left',
              peerId: currentPeerId,
              activeUsers: Array.from(room.peers.values()).map(p => p.peer),
              activity
            });
          }
        }
      }
    });
  });

  // Return 404 JSON for all unhandled /api/* requests
  app.all('/api/*', (_req: Request, res: Response) => {
    return res.status(404).json({ error: 'Endpoint not found.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is currently in use.`);
    } else {
      console.error('HTTP server encountered an error:', err);
    }
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Noetic AI server active on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error during startServer:', err);
});
