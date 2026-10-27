export interface FrqRubricScore {
  criterion: string;
  awarded: boolean;
  note: string;
}

export interface FrqConceptComparison {
  concept: string;
  expectedInExemplar: string;
  studentCoverage: string;
  status: 'covered' | 'partial' | 'missed';
}

export interface FrqDiffHighlight {
  matchedSegments: string[];
  omittedConcepts: string[];
  conceptComparisons: FrqConceptComparison[];
  socraticHint?: string;
}

export interface FrqGradeResult {
  score: number; // e.g. 4.5 out of 5
  maxScore: number; // 5
  percentage: number; // 90
  feedback: string;
  keyStrengths: string[];
  missingConcepts: string[];
  rubricScores: FrqRubricScore[];
  exemplarComparison?: string;
  diffHighlights?: FrqDiffHighlight;
  socraticPrompt?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[]; // for MCQ
  answer: number; // 0, 1, 2, 3 for MCQ
  explanation: string;
  concept?: string;
  flagged?: boolean;
  tier?: 'recall' | 'analytical' | 'synthesis';
  difficultyLevel?: 'Easy' | 'Medium' | 'Hard';
  type?: 'mcq' | 'frq';
  rubricCriteria?: string[];
  sampleSolution?: string;
  keywords?: string[];
  maxScore?: number;
  studentAnswer?: string;
  aiGradeResult?: FrqGradeResult;
  sourceExcerpt?: string;
  sourceSupported?: boolean;
  userFlagged?: boolean;
  flagReason?: string;
  targetedFollowUp?: boolean;
}

export type QuizFormat = 'mcq' | 'frq' | 'mixed';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category?: string;
  mastery?: 'learning' | 'review' | 'mastered';
  rating?: number; // 1 to 5
  // SuperMemo / Anki SM-2 Spaced Repetition metrics
  interval?: number; // In days (e.g. 1, 3, 7, 14...)
  easeFactor?: number; // Defaults to 2.5 (min 1.3)
  repetitions?: number; // Consecutive successful recalls
  nextReviewDate?: number; // Epoch timestamp in milliseconds
  lastReviewed?: number; // Timestamp of last review session
  history?: Array<{ date: number; rating: number; interval: number }>;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'mastery' | 'streak' | 'voice' | 'audio' | 'xp' | 'explorer';
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
}

export interface DailyGoal {
  id: string;
  title: string;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  xpReward: number;
  type: 'questions' | 'cards' | 'xp' | 'minutes';
}

export interface UserGamificationProfile {
  xp: number;
  level: number;
  xpToNextLevel: number;
  streakDays: number;
  lastStudyDate: string;
  streakFreezeTokens: number;
  dailyGoal: DailyGoal;
  badges: Badge[];
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  institution: string;
  xp: number;
  level: number;
  badgeCount: number;
  isCurrentUser?: boolean;
}

export interface PodcastSpeakerTurn {
  id: string;
  speaker: 'Alex' | 'Sam';
  text: string;
  tone?: 'enthusiastic' | 'thoughtful' | 'curious' | 'explaining';
  keyConcept?: string;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  dialogue: PodcastSpeakerTurn[];
  summary: string;
  generatedAt: number;
}

export interface KeyConceptItem {
  term: string;
  explanation: string;
  example?: string;
}

export interface QuickReviewQA {
  q: string;
  a: string;
}

export interface ConceptMapNode {
  name: string;
  details: string;
  subtopics: string[];
}

export interface YouTubeVideoSuggestion {
  title: string;
  channel: string;
  url: string;
  reason: string;
  topic?: string;
  durationEstimate?: string;
}

export interface StudyGuide {
  title: string;
  overview: string;
  keyConcepts: KeyConceptItem[];
  keyTakeaways: string[];
  quickReviewQuestions: QuickReviewQA[];
  conceptMap?: {
    root: string;
    children: ConceptMapNode[];
  };
  mathVideos?: YouTubeVideoSuggestion[];
  isMathSubject?: boolean;
}

export interface QuizSessionRecord {
  id: string;
  title: string;
  date: string;
  timestamp: number;
  score: number;
  total: number;
  percentage: number;
  durationSeconds: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Adaptive';
  mode: 'interactive' | 'exam';
  timed: boolean;
  missedQuestions: QuizQuestion[];
  weakCards?: Flashcard[];
  adaptiveStats?: {
    startTier: string;
    peakTier: string;
    maxStreak: number;
    tierBreakdown: { recall: number; analytical: number; synthesis: number };
  };
}

export interface CollaborativePeer {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  activeTab?: string;
  lastSeen: number;
}

export interface CollaborativeActivity {
  id: string;
  user: string;
  action: string;
  timestamp: number;
}

export interface CollaborativeRoomState {
  roomId: string;
  roomCode: string;
  deckTitle: string;
  notes: string;
  cards: Flashcard[];
  quizQuestions: QuizQuestion[];
  updatedAt: number;
  lastEditedBy: string;
  activeUsers: CollaborativePeer[];
  activityLog: CollaborativeActivity[];
}

export interface SampleDeck {
  id: string;
  title: string;
  category: string;
  defaultDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Adaptive';
  notes: string;
  icon?: string;
  questionCount?: number;
  tags?: string[];
  estimatedMinutes?: number;
}

export const DEFAULT_STARTER_DECKS: SampleDeck[] = [
  {
    id: 'deck-bio',
    title: 'Photosynthesis & Respiration',
    category: 'Biology',
    defaultDifficulty: 'Easy',
    icon: 'sprout',
    questionCount: 8,
    estimatedMinutes: 5,
    tags: ['chloroplast', 'atp', 'krebs'],
    notes: `Photosynthesis converts light energy into chemical energy stored in glucose.
Light reactions occur in the thylakoid membranes, producing ATP and NADPH while releasing oxygen.
The Calvin cycle occurs in the stroma, using ATP, NADPH, and CO2 to synthesize glucose.
Cellular respiration breaks down glucose to release energy via glycolysis and the Krebs cycle.`
  },
  {
    id: 'deck-cs',
    title: 'Machine Learning Basics',
    category: 'Computer Science',
    defaultDifficulty: 'Medium',
    icon: 'code',
    questionCount: 10,
    estimatedMinutes: 7,
    tags: ['gradient', 'weights', 'loss'],
    notes: `Supervised learning trains models on labeled datasets for classification and regression tasks.
Unsupervised learning discovers latent patterns and clusters in unlabeled data.
Backpropagation computes gradients of the loss function using the chain rule to update neural network weights.
Overfitting occurs when a model memorizes training noise; regularization techniques reduce error.`
  },
  {
    id: 'deck-neuro',
    title: 'Synaptic Transmission',
    category: 'Neuroscience',
    defaultDifficulty: 'Hard',
    icon: 'brain',
    questionCount: 12,
    estimatedMinutes: 10,
    tags: ['action-potential', 'gaba', 'axon'],
    notes: `Action potentials propagate along myelinated axons via saltatory conduction at nodes of Ranvier.
Voltage-gated calcium channels open at the axon terminal, triggering neurotransmitter exocytosis.
Neurotransmitters bind ligand-gated ion channels on the post-synaptic membrane.
Inhibitory neurotransmitters like GABA cause hyperpolarization; excitatory neurotransmitters like glutamate cause depolarization.`
  },
  {
    id: 'deck-econ',
    title: 'Supply, Demand & Markets',
    category: 'Economics',
    defaultDifficulty: 'Easy',
    icon: 'chart',
    questionCount: 6,
    estimatedMinutes: 4,
    tags: ['equilibrium', 'elasticity', 'price'],
    notes: `The Law of Demand states that as the price of a good increases, quantity demanded decreases.
The Law of Supply states that quantity supplied increases as prices rise.
Market equilibrium occurs at the intersection of supply and demand curves where quantity demanded equals quantity supplied.
Elasticity measures the responsiveness of quantity demanded to a change in price.`
  },
  {
    id: 'deck-chem',
    title: 'Organic Chemistry Reactions',
    category: 'Chemistry',
    defaultDifficulty: 'Medium',
    icon: 'flask',
    questionCount: 10,
    estimatedMinutes: 8,
    tags: ['sn1-sn2', 'electrophile', 'carbocation'],
    notes: `SN1 reactions proceed via a two-step mechanism through a carbocation intermediate.
SN2 reactions occur via a concerted backside attack leading to inversion of stereochemistry.
Electrophiles accept electron pairs; nucleophiles donate electron pairs to form covalent bonds.`
  },
  {
    id: 'deck-psych',
    title: 'Cognitive Psychology & Memory',
    category: 'Psychology',
    defaultDifficulty: 'Easy',
    icon: 'lightbulb',
    questionCount: 8,
    estimatedMinutes: 5,
    tags: ['working-memory', 'encoding', 'retrieval'],
    notes: `Sensory memory holds vast sensory information briefly for milliseconds to seconds.
Working memory has limited capacity (7 ± 2 items) and involves the central executive and phonological loop.
Long-term memory consists of explicit (declarative: episodic and semantic) and implicit (procedural) memory.
Spaced retrieval practice significantly improves long-term memory retention over massed cramming.`
  },
  {
    id: 'deck-hist',
    title: 'Scientific Revolution',
    category: 'History',
    defaultDifficulty: 'Medium',
    icon: 'scroll',
    questionCount: 8,
    estimatedMinutes: 6,
    tags: ['heliocentrism', 'galileo', 'newton'],
    notes: `The Copernican revolution challenged the geocentric Ptolemaic model with a heliocentric universe.
Galileo utilized telescopic observations of Jupiter's moons to substantiate planetary motion.
Francis Bacon formalized the inductive empirical scientific method.
Isaac Newton published the Principia Mathematica formulating the laws of universal gravitation and motion.`
  },
  {
    id: 'deck-med',
    title: 'Cardiovascular Physiology',
    category: 'Medicine',
    defaultDifficulty: 'Hard',
    icon: 'activity',
    questionCount: 12,
    estimatedMinutes: 10,
    tags: ['cardiac-output', 'ecg', 'ventricle'],
    notes: `Cardiac output equals stroke volume multiplied by heart rate (CO = SV × HR).
The cardiac cycle consists of ventricular systole (contraction) and diastole (relaxation and filling).
The sinoatrial (SA) node functions as the primary intrinsic cardiac pacemaker.
Preload represents ventricular end-diastolic volume; afterload is the systemic vascular resistance opposing ventricular ejection.`
  }
];

export interface DeckAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  base64: string;
  dataUrl?: string;
  previewType: 'pdf' | 'image' | 'doc' | 'text';
  pageCount?: number;
}

export type DeckRole = 'Owner' | 'Collaborator' | 'Viewer';

export interface DeckMember {
  id: string;
  name: string;
  email: string;
  role: DeckRole;
  avatar: string;
  addedAt: number;
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  avatar: string;
  institution: string;
  major: string;
  role: 'student' | 'educator' | 'researcher';
  studyGoal: string;
  isVerified: boolean;
  isGuest?: boolean;
  createdAt: number;
}

export interface EmailDeliveryInfo {
  status: 'sent_via_api' | 'sent_via_smtp' | 'sent_via_ethereal' | 'instant_preview';
  provider: string; // e.g., 'Gmail SMTP', 'Custom SMTP', 'Resend API', 'SendGrid API'
  recipient: string;
  previewUrl?: string; // e.g. Ethereal message viewer if testing in sandbox
  note?: string;
  dispatchedAt: number;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: UserAccount;
  requiresVerification?: boolean;
  email?: string;
  sentViaSmtp?: boolean;
  delivery?: EmailDeliveryInfo;
  message?: string;
  error?: string;
}
export interface VerificationInboxMessage {
  id: string;
  toEmail: string;
  username: string;
  code: string;
  type: 'registration' | 'login_2fa' | 'password_reset' | 'resend';
  subject: string;
  timestamp: number;
  expiresAt: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  institution: string;
  major: string;
  role: 'student' | 'educator' | 'researcher';
  studyGoal: string;
  streakDays: number;
  isVerified?: boolean;
}

export type AppTheme = 
  | 'cream' 
  | 'dark' 
  | 'blue' 
  | 'sage' 
  | 'rose' 
  | 'sepia' 
  | 'cyberpunk' 
  | 'amoled';

export type UiMode = 'compact' | 'easy' | 'professional' | 'minimal' | 'advanced';

export interface UiSettings {
  mode: UiMode;
  fontScale?: number;
}

export interface AccessibilitySettings {
  dyslexicFont: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  relaxedSpacing: boolean;
  colorblindMarkers: boolean;
  largeFocusRings: boolean;
  fontFamily?: 'sans' | 'lexend' | 'serif' | 'mono';
  lineHeight?: 'normal' | 'relaxed' | 'loose';
  letterSpacing?: 'normal' | 'wide' | 'wider';
  simplifiedLayout?: boolean;
}

export type DashboardWidgetId = 
  | 'priority_focus'
  | 'spaced_due_queue'
  | 'quick_start'
  | 'readiness_analytics'
  | 'gamification_goals'
  | 'study_groups';

export interface DashboardWidgetConfig {
  id: DashboardWidgetId;
  title: string;
  enabled: boolean;
  order: number;
}

