import React from 'react';
import { 
  Sprout, 
  Code2, 
  Brain, 
  BarChart3, 
  Atom, 
  Lightbulb, 
  ScrollText, 
  Activity, 
  BookOpen, 
  Sparkles,
  Zap,
  Layers,
  GraduationCap
} from 'lucide-react';

interface DeckIconProps {
  icon?: string;
  className?: string;
  containerClassName?: string;
}

export const DeckIcon: React.FC<DeckIconProps> = ({ 
  icon = 'book', 
  className = "w-5 h-5",
  containerClassName = "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
}) => {
  switch (icon?.toLowerCase()) {
    case 'sprout':
    case '🌱':
    case 'bio':
      return (
        <div className={`${containerClassName} bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20`}>
          <Sprout className={className} />
        </div>
      );
    case 'code':
    case '💻':
    case 'cs':
      return (
        <div className={`${containerClassName} bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20`}>
          <Code2 className={className} />
        </div>
      );
    case 'brain':
    case '🧠':
    case 'neuro':
      return (
        <div className={`${containerClassName} bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20`}>
          <Brain className={className} />
        </div>
      );
    case 'chart':
    case '📊':
    case 'econ':
      return (
        <div className={`${containerClassName} bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20`}>
          <BarChart3 className={className} />
        </div>
      );
    case 'flask':
    case '⚗️':
    case 'chem':
      return (
        <div className={`${containerClassName} bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20`}>
          <Atom className={className} />
        </div>
      );
    case 'lightbulb':
    case '💡':
    case 'psych':
      return (
        <div className={`${containerClassName} bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20`}>
          <Lightbulb className={className} />
        </div>
      );
    case 'scroll':
    case '📜':
    case 'hist':
      return (
        <div className={`${containerClassName} bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20`}>
          <ScrollText className={className} />
        </div>
      );
    case 'activity':
    case '🩺':
    case 'med':
      return (
        <div className={`${containerClassName} bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20`}>
          <Activity className={className} />
        </div>
      );
    case 'sparkles':
    case '✨':
      return (
        <div className={`${containerClassName} bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20`}>
          <Sparkles className={className} />
        </div>
      );
    case 'zap':
    case '⚡':
      return (
        <div className={`${containerClassName} bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20`}>
          <Zap className={className} />
        </div>
      );
    case 'layers':
      return (
        <div className={`${containerClassName} bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20`}>
          <Layers className={className} />
        </div>
      );
    default:
      return (
        <div className={`${containerClassName} bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20`}>
          <BookOpen className={className} />
        </div>
      );
  }
};
