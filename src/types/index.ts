export interface QuizOption {
  label: string;
  description: string;
}

export interface QuizQuestion {
  type: 'single' | 'multi' | 'scale';
  question: string;
  subtitle: string;
  options: QuizOption[] | string[];
}

export interface ArchetypeData {
  name: string;
  description: string;
  base: number[];
  growth30: number[];
  growth60: number[];
  growth90: number[];
  missions: number;
  campaigns: number;
  habits: number;
}

export type ArchetypeKey = 'guardia' | 'protetora' | 'guerreira' | 'equilibrista';

export interface QuizState {
  currentQuestion: number;
  answers: (number | number[] | null)[];
  archetype: ArchetypeKey | null;
  screen: 'intro' | 'question' | 'analyzing' | 'results';
}

export interface CampaignData {
  month: string;
  name: string;
  progress: number;
  color: string;
  status: 'done' | 'active' | 'next';
  statusLabel: string;
}
