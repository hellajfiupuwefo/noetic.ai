import { YouTubeVideoSuggestion } from '../types';

export const MATH_KEYWORDS = [
  'math', 'calculus', 'derivative', 'differentiation', 'integral', 'integration',
  'linear algebra', 'matrix', 'matrices', 'eigenvalue', 'eigenvector', 'determinant',
  'vector', 'gradient', 'gradient descent', 'partial derivative', 'hessian',
  'probability', 'statistics', 'bayes', 'bayesian', 'variance', 'standard deviation',
  'distribution', 'normal distribution', 'regression', 'optimization', 'loss function',
  'backpropagation', 'differential equation', 'fourier', 'laplace', 'taylor series',
  'chain rule', 'euclidean', 'geometry', 'trigonometry', 'limit', 'limits',
  'svd', 'singular value decomposition', 'neural network math', 'dot product', 'cross product'
];

interface CuratedTopicMapping {
  matchTerms: string[];
  topic: string;
  videos: YouTubeVideoSuggestion[];
}

export const CURATED_MATH_TOPICS: CuratedTopicMapping[] = [
  {
    matchTerms: ['gradient descent', 'gradient', 'partial derivative', 'directional derivative', 'hessian'],
    topic: 'Gradient Descent & Multivariable Calculus',
    videos: [
      {
        title: 'Gradient Descent, Step-by-Step',
        channel: 'StatQuest with Josh Starmer',
        url: 'https://www.youtube.com/results?search_query=StatQuest+Gradient+Descent+step+by+step',
        reason: 'Visual, intuitive breakdown of how gradient descent updates parameters and minimizes loss.',
        durationEstimate: '23 mins'
      },
      {
        title: 'Essence of Calculus: What is a Derivative & Gradient?',
        channel: '3Blue1Brown',
        url: 'https://www.youtube.com/results?search_query=3Blue1Brown+essence+of+calculus+chapter+1',
        reason: 'Masterclass geometric animation explaining the intuition behind derivatives and multivariable gradients.',
        durationEstimate: '17 mins'
      },
      {
        title: 'Multivariable Calculus: Gradient Vector & Directional Derivatives',
        channel: 'Professor Leonard',
        url: 'https://www.youtube.com/results?search_query=Professor+Leonard+Multivariable+Calculus+Gradient',
        reason: 'In-depth university lecture style step-by-step problem walkthrough.',
        durationEstimate: '45 mins'
      }
    ]
  },
  {
    matchTerms: ['matrix', 'matrices', 'eigenvalue', 'eigenvector', 'linear algebra', 'determinant', 'transformation'],
    topic: 'Linear Algebra & Eigenvalues',
    videos: [
      {
        title: 'Essence of Linear Algebra: Vectors, Matrices & Transformations',
        channel: '3Blue1Brown',
        url: 'https://www.youtube.com/results?search_query=3Blue1Brown+essence+of+linear+algebra+chapter+1',
        reason: 'The gold standard visual curriculum for understanding matrices as geometric coordinate transformations.',
        durationEstimate: '10 mins'
      },
      {
        title: 'Eigenvectors and Eigenvalues Explained Geometrically',
        channel: '3Blue1Brown',
        url: 'https://www.youtube.com/results?search_query=3Blue1Brown+Eigenvectors+and+eigenvalues',
        reason: 'Clear geometric demonstration of why certain vectors only stretch without changing span.',
        durationEstimate: '17 mins'
      },
      {
        title: 'Linear Algebra: Eigenvalues and Eigenvectors Full Lecture',
        channel: 'MIT OpenCourseWare (Gilbert Strang)',
        url: 'https://www.youtube.com/results?search_query=MIT+OpenCourseWare+Gilbert+Strang+Eigenvalues',
        reason: 'Legendary MIT Professor Gilbert Strang teaching characteristic equations and diagonalization.',
        durationEstimate: '50 mins'
      }
    ]
  },
  {
    matchTerms: ['backpropagation', 'neural network math', 'loss function', 'activation function', 'chain rule', 'cross-entropy'],
    topic: 'Neural Network Math & Backpropagation',
    videos: [
      {
        title: 'What is Backpropagation Really Doing?',
        channel: '3Blue1Brown',
        url: 'https://www.youtube.com/results?search_query=3Blue1Brown+Backpropagation+calculus',
        reason: 'Mathematical derivation of the multivariable calculus chain rule across neural network layers.',
        durationEstimate: '14 mins'
      },
      {
        title: 'Neural Networks: Zero to Hero (Micrograd & Calculus)',
        channel: 'Andrej Karpathy',
        url: 'https://www.youtube.com/results?search_query=Andrej+Karpathy+micrograd+backpropagation',
        reason: 'Building a complete reverse-mode automatic differentiation engine from mathematical first principles.',
        durationEstimate: '2 hrs'
      },
      {
        title: 'Neural Networks & Cross Entropy Loss Step-by-Step',
        channel: 'StatQuest with Josh Starmer',
        url: 'https://www.youtube.com/results?search_query=StatQuest+Cross+Entropy+Loss',
        reason: 'Clear, bite-sized explanation of why cross-entropy evaluates probabilistic classification models.',
        durationEstimate: '12 mins'
      }
    ]
  },
  {
    matchTerms: ['integral', 'integration', 'area under curve', 'fundamental theorem of calculus', 'riemann sum'],
    topic: 'Integral Calculus & Accumulation',
    videos: [
      {
        title: 'Integration and the Fundamental Theorem of Calculus',
        channel: '3Blue1Brown',
        url: 'https://www.youtube.com/results?search_query=3Blue1Brown+Integration+fundamental+theorem+of+calculus',
        reason: 'Unifying derivatives with continuous accumulation in animated 3D.',
        durationEstimate: '20 mins'
      },
      {
        title: 'Definite Integrals and Area Under Curve Walkthrough',
        channel: 'Khan Academy',
        url: 'https://www.youtube.com/results?search_query=Khan+Academy+Definite+Integrals',
        reason: 'High-clarity practice problem walkthroughs with standard notation.',
        durationEstimate: '15 mins'
      },
      {
        title: '100 Integrals Speedrun / Masterclass Tutorial',
        channel: 'Blackpenredpen',
        url: 'https://www.youtube.com/results?search_query=Blackpenredpen+integrals+for+calculus',
        reason: 'Mastering integration techniques including substitution, by parts, and partial fractions.',
        durationEstimate: '30 mins'
      }
    ]
  },
  {
    matchTerms: ['probability', 'bayes', 'bayesian', 'variance', 'standard deviation', 'distribution', 'normal distribution'],
    topic: 'Probability & Bayesian Statistics',
    videos: [
      {
        title: 'Bayes theorem, the geometry of changing your mind',
        channel: '3Blue1Brown',
        url: 'https://www.youtube.com/results?search_query=3Blue1Brown+Bayes+theorem',
        reason: 'Visually intuitive explanation of prior probability, likelihood ratios, and posterior updates.',
        durationEstimate: '15 mins'
      },
      {
        title: 'The Normal Distribution, Clearly Explained!',
        channel: 'StatQuest with Josh Starmer',
        url: 'https://www.youtube.com/results?search_query=StatQuest+The+Normal+Distribution',
        reason: 'Step-by-step breakdown of bell curves, mean, variance, and standard deviation.',
        durationEstimate: '8 mins'
      },
      {
        title: 'Probability and Statistics: Probability Density Functions',
        channel: 'Khan Academy',
        url: 'https://www.youtube.com/results?search_query=Khan+Academy+Probability+Density+Functions',
        reason: 'Clear walkthrough of continuous random variables and cumulative probability.',
        durationEstimate: '12 mins'
      }
    ]
  }
];

export function isMathContent(text: string, title: string = ''): boolean {
  const combined = (text + ' ' + title).toLowerCase();
  
  // Look for math symbols or equations
  if (/[∑∫∂√πθλσμβ∇]/.test(combined)) return true;
  if (/f\s*\(x\)\s*=|y\s*=\s*mx|\b\d+\s*[\+\-\*\/]\s*\d+\b/.test(combined)) return true;
  
  // Count keyword occurrences
  let hits = 0;
  for (const kw of MATH_KEYWORDS) {
    if (combined.includes(kw)) {
      hits++;
      if (hits >= 2) return true;
    }
  }
  return false;
}

export function getMathVideoSuggestions(notes: string, title: string = '', concept: string = ''): YouTubeVideoSuggestion[] {
  const combined = `${notes} ${title} ${concept}`.toLowerCase();
  const matchedTopics: YouTubeVideoSuggestion[] = [];

  for (const topicMap of CURATED_MATH_TOPICS) {
    const hasMatch = topicMap.matchTerms.some(term => combined.includes(term));
    if (hasMatch) {
      matchedTopics.push(...topicMap.videos);
    }
  }

  // If no direct specific match but general math is detected
  if (matchedTopics.length === 0 && isMathContent(combined)) {
    matchedTopics.push(
      {
        title: 'Essence of Mathematics & Intuition Masterclass',
        channel: '3Blue1Brown',
        url: `https://www.youtube.com/results?search_query=3Blue1Brown+${encodeURIComponent(title || 'mathematics')}`,
        reason: 'Foundational mathematical visualization tailored to your core concepts.',
        durationEstimate: '15 mins'
      },
      {
        title: 'Step-by-Step Math & Equation Problem Solver',
        channel: 'The Organic Chemistry Tutor',
        url: `https://www.youtube.com/results?search_query=The+Organic+Chemistry+Tutor+${encodeURIComponent(title || 'mathematics')}`,
        reason: 'Clear, practical chalkboard-style exercises and solved examples.',
        durationEstimate: '25 mins'
      },
      {
        title: 'Khan Academy: Comprehensive Topic Walkthrough',
        channel: 'Khan Academy',
        url: `https://www.youtube.com/results?search_query=Khan+Academy+${encodeURIComponent(title || 'math')}`,
        reason: 'Pedagogical curriculum standards and test preparation walkthrough.',
        durationEstimate: '12 mins'
      }
    );
  }

  // Deduplicate by URL and limit to top 4
  const seen = new Set<string>();
  const uniqueVideos: YouTubeVideoSuggestion[] = [];
  for (const v of matchedTopics) {
    if (!seen.has(v.title)) {
      seen.add(v.title);
      uniqueVideos.push(v);
      if (uniqueVideos.length >= 4) break;
    }
  }

  return uniqueVideos;
}
