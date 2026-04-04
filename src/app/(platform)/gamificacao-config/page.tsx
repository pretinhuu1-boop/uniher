'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import styles from './gamificacao-config.module.css';

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Erro ao carregar dados');
  return r.json();
});

function normalizeText(value: string) {
  if (!value || !/[\u00C3\u00C2\u00E2\u00F0\uFFFD]/.test(value)) return value;
  try {
    return decodeURIComponent(escape(value));
  } catch {
    return value
      .replace(/Ã§/g, 'ç')
      .replace(/Ã£/g, 'ã')
      .replace(/Ã¡/g, 'á')
      .replace(/Ã©/g, 'é')
      .replace(/Ãª/g, 'ê')
      .replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/Ãµ/g, 'õ')
      .replace(/Ãº/g, 'ú')
      .replace(/Ã‰/g, 'É')
      .replace(/Ã‡/g, 'Ç')
      .replace(/Â·/g, '·');
  }
}

const THEME_LABELS: Record<string, string> = {
  hidratacao: 'Hidratação',
  sono: 'Sono',
  prevencao: 'Prevenção',
  nutricao: 'Nutrição',
  mental: 'Saúde Mental',
  ciclo: 'Ciclo Menstrual',
  geral: 'Geral',
};

const LESSON_TYPE_LABELS: Record<string, string> = {
  pilula: '💊 Pílula',
  quiz: '❓ Quiz',
  reflexao: '🪞 Reflexão',
  lacuna: '✏️ Lacuna',
  verdadeiro_falso: '✅ V/F',
  ordenar: '🔢 Ordenar',
  parear: '🔗 Parear',
  historia: '📖 História',
  flashcard: '🎴 Flashcard',
  imagem: '🖼️ Imagem',
  desafio_dia: '🎯 Desafio',
};

const DAY_LABELS: Record<number, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
  7: 'Domingo',
};

const LESSON_TYPE_HELP: Record<string, { title: string; description: string }> = {
  pilula: {
    title: 'Pílula educativa',
    description: 'Boa para ensinar algo rápido: conceito central, fato importante e uma ação prática.',
  },
  quiz: {
    title: 'Quiz de múltipla escolha',
    description: 'A colaboradora lê uma pergunta, escolhe uma resposta e recebe feedback da opção correta.',
  },
  reflexao: {
    title: 'Reflexão guiada',
    description: 'Use uma pergunta única, simples e acolhedora, para incentivar autocuidado e observação.',
  },
  lacuna: {
    title: 'Complete a frase',
    description: 'Ideal para fixar um conceito curto com uma frase principal e opções de resposta.',
  },
  verdadeiro_falso: {
    title: 'Verdadeiro ou falso',
    description: 'Mostre uma afirmação clara de um lado e a explicação da resposta certa do outro.',
  },
  ordenar: {
    title: 'Ordem correta',
    description: 'Serve para sequências, rotinas e passo a passo de cuidados.',
  },
  parear: {
    title: 'Associar itens',
    description: 'A colaboradora relaciona um item com a orientação, benefício ou significado correto.',
  },
  historia: {
    title: 'Caso prático',
    description: 'Traga um cenário do dia a dia e peça a melhor decisão entre as alternativas.',
  },
  flashcard: {
    title: 'Flashcards',
    description: 'Perfeito para revisão rápida, com frente de um lado e resposta do outro.',
  },
  imagem: {
    title: 'Escolha visual',
    description: 'Use ícones ou emojis quando quiser comparar opções de forma mais intuitiva.',
  },
  desafio_dia: {
    title: 'Desafio do dia',
    description: 'Crie uma ação simples, possível de cumprir no mesmo dia, com orientação objetiva.',
  },
};

const CONTENT_TEMPLATES: Record<string, object> = {
  pilula: {
    tip: 'Explique em linguagem simples o aprendizado principal desta lição.',
    fact: 'Compartilhe um fato confiável ou orientação importante sobre o tema.',
    action: 'Sugira uma ação prática que a colaboradora possa aplicar hoje.',
  },
  quiz: {
    question: 'Escreva uma pergunta objetiva sobre o conteúdo da lição.',
    options: [
      'Alternativa correta',
      'Alternativa incorreta 1',
      'Alternativa incorreta 2',
      'Alternativa incorreta 3',
    ],
    correct: 0,
  },
  reflexao: { reflection: 'Escreva uma pergunta de reflexão que ajude a colaboradora a pensar sobre a própria rotina.' },
  lacuna: { text: 'Complete: A mulher precisa de ___ horas de sono por dia.', options: ['6', '7-9', '10', '12'], correct: 1 },
  verdadeiro_falso: {
    statement: 'Escreva uma afirmação clara para a colaboradora avaliar como verdadeira ou falsa.',
    correct: true,
    explanation: 'Explique por que essa afirmação está certa ou errada.',
  },
  ordenar: {
    instruction: 'Descreva a ordem correta das etapas desta rotina ou cuidado.',
    items: ['Primeira etapa', 'Segunda etapa', 'Terceira etapa', 'Quarta etapa'],
    correct_order: [0, 1, 2, 3],
  },
  parear: {
    pairs: [
      { left: 'Sintoma', right: 'Orientação correspondente' },
      { left: 'Hábito saudável', right: 'Benefício principal' },
    ],
  },
  historia: {
    scenario: 'Descreva uma situação realista vivida por uma colaboradora.',
    question: 'Qual seria a melhor decisão nessa situação?',
    options: ['Opção recomendada', 'Opção inadequada 1', 'Opção inadequada 2', 'Opção inadequada 3'],
    correct: 0,
  },
  flashcard: {
    cards: [
      { front: 'Conceito ou pergunta', back: 'Resposta curta e clara' },
      { front: 'Sinal de atenção', back: 'O que observar ou fazer' },
    ],
  },
  imagem: {
    question: 'Escreva a pergunta que a colaboradora deve responder ao analisar as opções.',
    options: [
      { emoji: '🥗', label: 'Opção saudável' },
      { emoji: '🍔', label: 'Opção menos adequada' },
    ],
    correct: 0,
  },
  desafio_dia: {
    challenge: 'Descreva um desafio simples e possível de cumprir no mesmo dia.',
    duration: 'hoje',
    tips: ['Explique como começar', 'Diga o que observar ao concluir'],
  },
};

interface Lesson {
  id: string;
  title: string;
  description: string;
  type: string;
  theme: string;
  week_number: number;
  day_of_week: number;
  order_index: number;
  xp_reward: number;
  duration_seconds: number;
  active: number;
  campaign_context: string | null;
  content_json: Record<string, unknown> | null;
  isGlobal: boolean;
  isValidated?: boolean;
  validated_at?: string | null;
  validated_by?: string | null;
  validation_notes?: string | null;
  canManage?: boolean;
}

const REWARD_TYPE_LABELS: Record<string, string> = {
  voucher: 'Voucher',
  folga: 'Folga',
  produto: 'Produto',
  experiencia: 'Experiência',
};

interface GamificationConfig {
  company_id: string;
  xp_checkin: number;
  xp_lesson: number;
  xp_quiz: number;
  xp_challenge: number;
  xp_exam: number;
  daily_xp_goal: number;
  streak_notifications: number;
  streak_min_days: number;
  hearts_enabled: number;
  hearts_per_day: number;
  hearts_refill_hours: number;
  league_enabled: number;
  league_anonymous: number;
  active_themes: string[];
  theme_order: string[];
  isDefault?: boolean;
}

interface Reward {
  id: string;
  title: string;
  description: string | null;
  points_cost: number;
  type: string;
  quantity_available: number;
  active: number;
  total_redemptions?: number;
  pending_redemptions?: number;
}

interface Redemption {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  created_at: string;
  reward_title: string;
  reward_type: string;
  user_name: string;
  user_email: string;
}

type LessonContent = Record<string, unknown>;

function cloneLessonTemplate(type: string): LessonContent {
  return JSON.parse(JSON.stringify(CONTENT_TEMPLATES[type] ?? {})) as LessonContent;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asStringArray(value: unknown, minLength: number, prefix: string): string[] {
  const source = Array.isArray(value) ? value.filter((item) => typeof item === 'string') as string[] : [];
  return Array.from({ length: Math.max(minLength, source.length || minLength) }, (_, index) => {
    return source[index] ?? `${prefix} ${index + 1}`;
  });
}

function asPairArray(value: unknown, minLength: number): Array<{ left: string; right: string }> {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: Math.max(minLength, source.length || minLength) }, (_, index) => {
    const current = source[index] as { left?: unknown; right?: unknown } | undefined;
    return {
      left: typeof current?.left === 'string' ? current.left : `Item ${index + 1}`,
      right: typeof current?.right === 'string' ? current.right : `Descrição ${index + 1}`,
    };
  });
}

function asCardArray(value: unknown, minLength: number): Array<{ front: string; back: string }> {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: Math.max(minLength, source.length || minLength) }, (_, index) => {
    const current = source[index] as { front?: unknown; back?: unknown } | undefined;
    return {
      front: typeof current?.front === 'string' ? current.front : `Frente ${index + 1}`,
      back: typeof current?.back === 'string' ? current.back : `Verso ${index + 1}`,
    };
  });
}

function asImageOptionArray(value: unknown, minLength: number): Array<{ emoji: string; label: string }> {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: Math.max(minLength, source.length || minLength) }, (_, index) => {
    const current = source[index] as { emoji?: unknown; label?: unknown } | undefined;
    return {
      emoji: typeof current?.emoji === 'string' ? current.emoji : index === 0 ? '🥗' : '🍎',
      label: typeof current?.label === 'string' ? current.label : `Opção ${index + 1}`,
    };
  });
}

function sanitizeLessonContent(type: string, content: LessonContent): LessonContent {
  switch (type) {
    case 'pilula':
      return {
        tip: asString(content.tip),
        fact: asString(content.fact),
        action: asString(content.action),
      };
    case 'quiz': {
      const options = asStringArray(content.options, 4, 'Opção');
      return {
        question: asString(content.question),
        options,
        correct: Math.min(Math.max(asNumber(content.correct, 0), 0), options.length - 1),
      };
    }
    case 'reflexao':
      return { reflection: asString(content.reflection) };
    case 'lacuna': {
      const options = asStringArray(content.options, 4, 'Resposta');
      return {
        text: asString(content.text),
        options,
        correct: Math.min(Math.max(asNumber(content.correct, 0), 0), options.length - 1),
      };
    }
    case 'verdadeiro_falso':
      return {
        statement: asString(content.statement),
        correct: asBoolean(content.correct, true),
        explanation: asString(content.explanation),
      };
    case 'ordenar': {
      const items = asStringArray(content.items, 4, 'Passo');
      return {
        instruction: asString(content.instruction),
        items,
        correct_order: items.map((_, index) => index),
      };
    }
    case 'parear':
      return { pairs: asPairArray(content.pairs, 3) };
    case 'historia': {
      const options = asStringArray(content.options, 4, 'Caminho');
      return {
        scenario: asString(content.scenario),
        question: asString(content.question),
        options,
        correct: Math.min(Math.max(asNumber(content.correct, 0), 0), options.length - 1),
      };
    }
    case 'flashcard':
      return { cards: asCardArray(content.cards, 3) };
    case 'imagem': {
      const options = asImageOptionArray(content.options, 2);
      return {
        question: asString(content.question),
        options,
        correct: Math.min(Math.max(asNumber(content.correct, 0), 0), options.length - 1),
      };
    }
    case 'desafio_dia':
      return {
        challenge: asString(content.challenge),
        duration: asString(content.duration, 'hoje'),
        tips: asStringArray(content.tips, 3, 'Dica'),
      };
    default:
      return content;
  }
}

function getCurrentLessonWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000) + 1);
}

function getCurrentLessonDay() {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

function getLessonScheduleState(lesson: Pick<Lesson, 'week_number' | 'day_of_week'>) {
  const currentWeek = getCurrentLessonWeek();
  const currentDay = getCurrentLessonDay();

  if (lesson.week_number < currentWeek) return 'past';
  if (lesson.week_number === currentWeek && lesson.day_of_week < currentDay) return 'past';
  if (lesson.week_number === currentWeek && lesson.day_of_week === currentDay) return 'today';
  return 'future';
}

function getLessonScheduleLabel(lesson: Pick<Lesson, 'week_number' | 'day_of_week'>) {
  const state = getLessonScheduleState(lesson);
  if (state === 'today') return 'Hoje';
  if (state === 'future') return 'Agendada';
  return 'Já passou';
}

function getLessonContentIssues(type: string, content: LessonContent) {
  const parsed = sanitizeLessonContent(type, content);

  switch (type) {
    case 'pilula': {
      const issues: string[] = [];
      if (!asString(parsed.tip).trim()) issues.push('preencha o texto principal');
      if (!asString(parsed.fact).trim()) issues.push('adicione um fato importante');
      if (!asString(parsed.action).trim()) issues.push('adicione uma ação prática');
      return issues;
    }
    case 'quiz':
      return [
        !asString((parsed as { question?: string }).question).trim() ? 'escreva a pergunta do quiz' : '',
        ...asStringArray((parsed as { options?: unknown }).options, 4, 'Opção')
          .map((option, index) => (!option.trim() ? `preencha a alternativa ${index + 1}` : '')),
      ].filter(Boolean);
    case 'reflexao':
      return !asString((parsed as { reflection?: string }).reflection).trim() ? ['escreva a pergunta de reflexão'] : [];
    case 'lacuna':
      return [
        !asString((parsed as { text?: string }).text).trim() ? 'escreva o texto com lacuna' : '',
        ...asStringArray((parsed as { options?: unknown }).options, 4, 'Resposta')
          .map((option, index) => (!option.trim() ? `preencha a resposta ${index + 1}` : '')),
      ].filter(Boolean);
    case 'verdadeiro_falso': {
      const issues: string[] = [];
      if (!asString((parsed as { statement?: string }).statement).trim()) issues.push('escreva a afirmação');
      if (!asString((parsed as { explanation?: string }).explanation).trim()) issues.push('adicione a explicação da resposta');
      return issues;
    }
    case 'ordenar':
      return [
        !asString((parsed as { instruction?: string }).instruction).trim() ? 'escreva a instrução da atividade' : '',
        ...asStringArray((parsed as { items?: unknown }).items, 4, 'Passo')
          .map((item, index) => (!item.trim() ? `preencha o passo ${index + 1}` : '')),
      ].filter(Boolean);
    case 'parear':
      return asPairArray((parsed as { pairs?: unknown }).pairs, 3).flatMap((pair, index) => ([
        !pair.left.trim() ? `preencha o item ${index + 1}` : '',
        !pair.right.trim() ? `preencha a correspondência ${index + 1}` : '',
      ])).filter(Boolean);
    case 'historia':
      return [
        !asString((parsed as { scenario?: string }).scenario).trim() ? 'descreva o cenário da história' : '',
        !asString((parsed as { question?: string }).question).trim() ? 'escreva a pergunta final' : '',
        ...asStringArray((parsed as { options?: unknown }).options, 4, 'Caminho')
          .map((option, index) => (!option.trim() ? `preencha o caminho ${index + 1}` : '')),
      ].filter(Boolean);
    case 'flashcard':
      return asCardArray((parsed as { cards?: unknown }).cards, 3).flatMap((card, index) => ([
        !card.front.trim() ? `preencha a frente do card ${index + 1}` : '',
        !card.back.trim() ? `preencha o verso do card ${index + 1}` : '',
      ])).filter(Boolean);
    case 'imagem':
      return [
        !asString((parsed as { question?: string }).question).trim() ? 'escreva a pergunta da imagem' : '',
        ...asImageOptionArray((parsed as { options?: unknown }).options, 2).flatMap((option, index) => ([
          !option.emoji.trim() ? `preencha o emoji da opção ${index + 1}` : '',
          !option.label.trim() ? `preencha a legenda da opção ${index + 1}` : '',
        ])),
      ].filter(Boolean);
    case 'desafio_dia':
      return [
        !asString((parsed as { challenge?: string }).challenge).trim() ? 'descreva o desafio do dia' : '',
        !asString((parsed as { duration?: string }).duration).trim() ? 'informe o prazo ou duração' : '',
        ...asStringArray((parsed as { tips?: unknown }).tips, 3, 'Dica')
          .map((tip, index) => (!tip.trim() ? `preencha a dica ${index + 1}` : '')),
      ].filter(Boolean);
    default:
      return [];
  }
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div
      className={`${styles.toast} ${type === 'success' ? styles.toastSuccess : styles.toastError}`}
      onClick={onClose}
      role="alert"
    >
      {type === 'success' ? '✓ ' : '✕ '}{message}
    </div>
  );
}

export default function GamificacaoConfigPage() {
  const lessonModalRef = useRef<HTMLDivElement | null>(null);
  const [isLessonEditorMobile, setIsLessonEditorMobile] = useState(false);
  const [lessonEditorStep, setLessonEditorStep] = useState(1);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Fetch config
  const { data: configData, isLoading: configLoading } = useSWR<GamificationConfig>(
    '/api/gamification/config', fetcher, { revalidateOnFocus: false }
  );

  // Fetch rewards
  const { data: rewardsData, isLoading: rewardsLoading } = useSWR<{ rewards: Reward[]; userPoints: number }>(
    '/api/gamification/rewards', fetcher, { revalidateOnFocus: false }
  );

  // Fetch pending redemptions
  const { data: redemptionsData, isLoading: redemptionsLoading } = useSWR<{ redemptions: Redemption[]; meta: { total: number } }>(
    '/api/gamification/rewards/redemptions?status=pending&limit=50', fetcher, { revalidateOnFocus: false }
  );

  // â”€â”€ Section 1: XP Config â”€â”€
  const [xpValues, setXpValues] = useState<Record<string, number> | null>(null);
  const [dailyGoal, setDailyGoal] = useState<number | null>(null);
  const [xpSaving, setXpSaving] = useState(false);

  // Initialize local state from config once loaded
  const config = configData;
  const xp = xpValues ?? {
    xp_checkin: config?.xp_checkin ?? 50,
    xp_lesson: config?.xp_lesson ?? 20,
    xp_quiz: config?.xp_quiz ?? 30,
    xp_challenge: config?.xp_challenge ?? 40,
    xp_exam: config?.xp_exam ?? 100,
  };
  const goal = dailyGoal ?? config?.daily_xp_goal ?? 50;

  const handleXpChange = (key: string, val: number) => {
    setXpValues(prev => ({ ...xp, ...prev, [key]: val }));
  };

  async function saveXpConfig() {
    setXpSaving(true);
    try {
      const res = await fetch('/api/gamification/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...xp, daily_xp_goal: goal }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || 'Erro ao salvar XP', 'error');
      } else {
        showToast('Configuração de XP salva!', 'success');
        mutate('/api/gamification/config');
      }
    } catch {
      showToast('Erro de conexão', 'error');
    }
    setXpSaving(false);
  }

  // â”€â”€ Section 2-4: Toggle configs â”€â”€
  const [toggleSaving, setToggleSaving] = useState<string | null>(null);

  async function saveToggle(field: string, value: number) {
    setToggleSaving(field);
    try {
      const res = await fetch('/api/gamification/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || 'Erro ao salvar', 'error');
      } else {
        mutate('/api/gamification/config');
      }
    } catch {
      showToast('Erro de conexão', 'error');
    }
    setToggleSaving(null);
  }

  async function saveNumericField(field: string, value: number) {
    try {
      const res = await fetch('/api/gamification/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || 'Erro ao salvar', 'error');
      } else {
        showToast('Salvo!', 'success');
        mutate('/api/gamification/config');
      }
    } catch {
      showToast('Erro de conexão', 'error');
    }
  }

  // â”€â”€ Section 5: Themes â”€â”€
  const [themesSaving, setThemesSaving] = useState(false);
  const [localActiveThemes, setLocalActiveThemes] = useState<string[] | null>(null);
  const [localThemeOrder, setLocalThemeOrder] = useState<string[] | null>(null);

  const activeThemes = localActiveThemes ?? config?.active_themes ?? Object.keys(THEME_LABELS);
  const themeOrder = localThemeOrder ?? config?.theme_order ?? Object.keys(THEME_LABELS);

  function toggleTheme(theme: string) {
    const current = [...activeThemes];
    const idx = current.indexOf(theme);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(theme);
    }
    setLocalActiveThemes(current);
  }

  function moveTheme(index: number, direction: 'up' | 'down') {
    const order = [...themeOrder];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= order.length) return;
    [order[index], order[swapIdx]] = [order[swapIdx], order[index]];
    setLocalThemeOrder(order);
  }

  async function saveThemes() {
    setThemesSaving(true);
    try {
      const res = await fetch('/api/gamification/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_themes: activeThemes, theme_order: themeOrder }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || 'Erro ao salvar temas', 'error');
      } else {
        showToast('Temas salvos!', 'success');
        mutate('/api/gamification/config');
      }
    } catch {
      showToast('Erro de conexão', 'error');
    }
    setThemesSaving(false);
  }

  // â”€â”€ Section 6: Rewards â”€â”€
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    title: '', description: '', points_cost: 100, type: 'voucher', quantity_available: -1,
  });
  const [rewardSaving, setRewardSaving] = useState(false);

  async function createReward() {
    if (!rewardForm.title.trim()) {
      showToast('Título obrigatório', 'error');
      return;
    }
    setRewardSaving(true);
    try {
      const res = await fetch('/api/gamification/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: rewardForm.title.trim(),
          description: rewardForm.description.trim() || undefined,
          points_cost: rewardForm.points_cost,
          type: rewardForm.type,
          quantity_available: rewardForm.quantity_available,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || 'Erro ao criar recompensa', 'error');
      } else {
        showToast('Recompensa criada!', 'success');
        setRewardForm({ title: '', description: '', points_cost: 100, type: 'voucher', quantity_available: -1 });
        setShowRewardForm(false);
        mutate('/api/gamification/rewards');
      }
    } catch {
      showToast('Erro de conexão', 'error');
    }
    setRewardSaving(false);
  }

  // Redemption actions
  const [processingRedemption, setProcessingRedemption] = useState<string | null>(null);

  async function handleRedemption(redemptionId: string, status: 'approved' | 'rejected') {
    setProcessingRedemption(redemptionId);
    try {
      const res = await fetch('/api/gamification/rewards/redemptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redemptionId, status }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || 'Erro ao processar', 'error');
      } else {
        showToast(status === 'approved' ? 'Resgate aprovado!' : 'Resgate rejeitado', 'success');
        mutate('/api/gamification/rewards/redemptions?status=pending&limit=50');
        mutate('/api/gamification/rewards');
      }
    } catch {
      showToast('Erro de conexão', 'error');
    }
    setProcessingRedemption(null);
  }

  // â”€â”€ Section 8: Lesson Management â”€â”€
  const [lessonThemeFilter, setLessonThemeFilter] = useState('');
  const [lessonTypeFilter, setLessonTypeFilter] = useState('');
  const [lessonWeekFilter, setLessonWeekFilter] = useState('');
  const [lessonSearch, setLessonSearch] = useState('');
  const [lessonPage, setLessonPage] = useState(1);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonSaving, setLessonSaving] = useState(false);
  const [deletingLesson, setDeletingLesson] = useState<string | null>(null);
  const [lessonContent, setLessonContent] = useState<LessonContent>(() => cloneLessonTemplate('pilula'));
  const [lessonForm, setLessonForm] = useState({
    title: '', description: '', type: 'pilula', theme: 'hidratacao',
    week_number: '', day_of_week: '', order_index: 0, xp_reward: 20, duration_seconds: 90,
    campaign_context: '',
  });
  const lessonStepOneIssues = useMemo(() => {
    const issues: string[] = [];
    if (!lessonForm.title.trim()) issues.push('informe um título para a lição');
    if (!lessonForm.description.trim()) issues.push('adicione uma descrição simples do objetivo');
    return issues;
  }, [lessonForm.title, lessonForm.description]);
  const lessonContentIssues = useMemo(
    () => getLessonContentIssues(lessonForm.type, lessonContent),
    [lessonContent, lessonForm.type]
  );

  const lessonsUrl = (() => {
    const params = new URLSearchParams({ page: String(lessonPage), limit: '12' });
    if (lessonThemeFilter) params.set('theme', lessonThemeFilter);
    if (lessonTypeFilter) params.set('type', lessonTypeFilter);
    if (lessonWeekFilter) params.set('week', lessonWeekFilter);
    if (lessonSearch) params.set('search', lessonSearch);
    return `/api/rh/lessons?${params}`;
  })();
  const { data: lessonsData, isLoading: lessonsLoading, mutate: mutateLessons } = useSWR<{ lessons: Lesson[]; total: number; totalPages: number }>(
    lessonsUrl, fetcher, { revalidateOnFocus: false }
  );
  const visibleLessons = lessonsData?.lessons ?? [];
  const lessonsToReview = visibleLessons.filter((lesson) => !lesson.isGlobal && !lesson.isValidated && getLessonScheduleState(lesson) !== 'past');
  const todayLessonsToReview = lessonsToReview.filter((lesson) => getLessonScheduleState(lesson) === 'today');
  const nextLessonsToReview = lessonsToReview.filter((lesson) => getLessonScheduleState(lesson) === 'future').slice(0, 3);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const syncViewport = () => setIsLessonEditorMobile(mediaQuery.matches);

    syncViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewport);
      return () => mediaQuery.removeEventListener('change', syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (!showLessonForm) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.scrollTo({ top: 0, behavior: 'auto' });

    const frame = window.requestAnimationFrame(() => {
      if (lessonModalRef.current) {
        lessonModalRef.current.scrollTop = 0;
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [showLessonForm, lessonEditorStep]);

  const isStepVisible = (step: number) => !isLessonEditorMobile || lessonEditorStep === step;

  function closeLessonForm() {
    setShowLessonForm(false);
    setEditingLesson(null);
    setLessonEditorStep(1);
  }

  function openCreateLesson() {
    setEditingLesson(null);
    setLessonEditorStep(1);
    setLessonContent(cloneLessonTemplate('pilula'));
    setLessonForm({
      title: '',
      description: '',
      type: 'pilula',
      theme: 'hidratacao',
      week_number: String(getCurrentLessonWeek()),
      day_of_week: String(getCurrentLessonDay()),
      order_index: 0,
      xp_reward: 20,
      duration_seconds: 90,
      campaign_context: '',
    });
    setShowLessonForm(true);
  }

  function openEditLesson(lesson: Lesson) {
    if (lesson.canManage === false || getLessonScheduleState(lesson) === 'past') {
      showToast('Essa lição já passou. Só é possível editar ou excluir antes ou no dia agendado.', 'error');
      return;
    }

    setLessonEditorStep(1);
    setEditingLesson(lesson);
    setLessonContent(sanitizeLessonContent(lesson.type, (lesson.content_json ?? {}) as LessonContent));
    setLessonForm({
      title: lesson.title, description: lesson.description, type: lesson.type,
      theme: lesson.theme, week_number: String(lesson.week_number), day_of_week: String(lesson.day_of_week),
      order_index: lesson.order_index ?? 0,
      xp_reward: lesson.xp_reward, duration_seconds: lesson.duration_seconds,
      campaign_context: lesson.campaign_context ?? '',
    });
    setShowLessonForm(true);
  }

  async function saveLesson() {
    if (lessonStepOneIssues.length > 0) {
      showToast(`Para salvar, ${lessonStepOneIssues[0]}.`, 'error');
      setLessonEditorStep(1);
      return;
    }

    if (lessonContentIssues.length > 0) {
      showToast(`Para salvar, ${lessonContentIssues[0]}.`, 'error');
      setLessonEditorStep(3);
      return;
    }

    const contentParsed = sanitizeLessonContent(lessonForm.type, lessonContent);
    setLessonSaving(true);
    try {
      const body = {
        title: lessonForm.title.trim(), description: lessonForm.description.trim(),
        type: lessonForm.type, theme: lessonForm.theme,
        order_index: lessonForm.order_index,
        xp_reward: lessonForm.xp_reward, duration_seconds: lessonForm.duration_seconds,
        content_json: contentParsed,
        ...(lessonForm.week_number ? { week_number: Number(lessonForm.week_number) } : {}),
        ...(lessonForm.day_of_week ? { day_of_week: Number(lessonForm.day_of_week) } : {}),
        ...(lessonForm.campaign_context ? { campaign_context: lessonForm.campaign_context } : {}),
      };
      const url = editingLesson ? `/api/rh/lessons/${editingLesson.id}` : '/api/rh/lessons';
      const method = editingLesson ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); showToast(d.error || 'Erro ao salvar lição', 'error'); }
      else { showToast(editingLesson ? 'Lição atualizada!' : 'Lição criada!', 'success'); closeLessonForm(); mutateLessons(); }
    } catch { showToast('Erro de conexão', 'error'); }
    setLessonSaving(false);
  }

  function handleLessonTypeChange(type: string) {
    setLessonForm(f => ({ ...f, type }));
    setLessonContent(cloneLessonTemplate(type));
  }

  function goToNextLessonStep() {
    if (lessonEditorStep === 1 && lessonStepOneIssues.length > 0) {
      showToast(`Antes de continuar, ${lessonStepOneIssues[0]}.`, 'error');
      return;
    }

    setLessonEditorStep((current) => Math.min(3, current + 1));
  }

  function updateLessonContentField(key: string, value: unknown) {
    setLessonContent(prev => ({ ...prev, [key]: value }));
  }

  function updateLessonContentArray(key: string, index: number, value: string, minLength: number, prefix: string) {
    const current = asStringArray(lessonContent[key], minLength, prefix);
    current[index] = value;
    updateLessonContentField(key, current);
  }

  function updateLessonPair(index: number, side: 'left' | 'right', value: string) {
    const pairs = asPairArray(lessonContent.pairs, 3);
    pairs[index] = { ...pairs[index], [side]: value };
    updateLessonContentField('pairs', pairs);
  }

  function updateLessonCard(index: number, side: 'front' | 'back', value: string) {
    const cards = asCardArray(lessonContent.cards, 3);
    cards[index] = { ...cards[index], [side]: value };
    updateLessonContentField('cards', cards);
  }

  function updateLessonImageOption(index: number, key: 'emoji' | 'label', value: string) {
    const options = asImageOptionArray(lessonContent.options, 2);
    options[index] = { ...options[index], [key]: value };
    updateLessonContentField('options', options);
  }

  function renderLessonContentEditor() {
    switch (lessonForm.type) {
      case 'pilula':
        return (
          <div className={styles.contentBuilder}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Texto principal</label>
              <textarea className={styles.textarea} value={asString(lessonContent.tip)} onChange={e => updateLessonContentField('tip', e.target.value)} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Fato ou dado importante</label>
              <textarea className={styles.textarea} value={asString(lessonContent.fact)} onChange={e => updateLessonContentField('fact', e.target.value)} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Ação prática sugerida</label>
              <textarea className={styles.textarea} value={asString(lessonContent.action)} onChange={e => updateLessonContentField('action', e.target.value)} />
            </div>
          </div>
        );
      case 'quiz':
      case 'lacuna':
      case 'historia': {
        const options = asStringArray(lessonContent.options, 4, 'Opção');
        const correct = Math.min(Math.max(asNumber(lessonContent.correct, 0), 0), options.length - 1);
        return (
          <div className={styles.contentBuilder}>
            {lessonForm.type === 'historia' ? (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Cenário</label>
                <textarea className={styles.textarea} value={asString(lessonContent.scenario)} onChange={e => updateLessonContentField('scenario', e.target.value)} />
              </div>
            ) : (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{lessonForm.type === 'quiz' ? 'Pergunta' : 'Texto com lacuna'}</label>
                <textarea className={styles.textarea} value={asString(lessonForm.type === 'quiz' ? lessonContent.question : lessonContent.text)} onChange={e => updateLessonContentField(lessonForm.type === 'quiz' ? 'question' : 'text', e.target.value)} />
              </div>
            )}
            {lessonForm.type === 'historia' && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Pergunta final</label>
                <textarea className={styles.textarea} value={asString(lessonContent.question)} onChange={e => updateLessonContentField('question', e.target.value)} />
              </div>
            )}
            <div className={styles.contentGrid}>
              {options.map((option, index) => (
                <div key={`${lessonForm.type}-option-${index}`} className={styles.fieldGroup}>
                  <label className={styles.label}>Opção {index + 1}</label>
                  <input className={styles.input} value={option} onChange={e => updateLessonContentArray('options', index, e.target.value, 4, 'Opção')} />
                </div>
              ))}
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Resposta correta</label>
              <select className={styles.input} value={String(correct)} onChange={e => updateLessonContentField('correct', Number(e.target.value))}>
                {options.map((option, index) => (
                  <option key={`${lessonForm.type}-correct-${index}`} value={index}>
                    {`Opção ${index + 1}: ${option || 'Sem texto'}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      }
      case 'reflexao':
        return (
          <div className={styles.contentBuilder}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Pergunta de reflexão</label>
              <textarea className={styles.textarea} value={asString(lessonContent.reflection)} onChange={e => updateLessonContentField('reflection', e.target.value)} />
            </div>
          </div>
        );
      case 'verdadeiro_falso':
        return (
          <div className={styles.contentBuilder}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Afirmação</label>
              <textarea className={styles.textarea} value={asString(lessonContent.statement)} onChange={e => updateLessonContentField('statement', e.target.value)} />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Resposta correta</label>
                <select className={styles.input} value={String(asBoolean(lessonContent.correct, true))} onChange={e => updateLessonContentField('correct', e.target.value === 'true')}>
                  <option value="true">Verdadeiro</option>
                  <option value="false">Falso</option>
                </select>
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Explicação para a resposta</label>
              <textarea className={styles.textarea} value={asString(lessonContent.explanation)} onChange={e => updateLessonContentField('explanation', e.target.value)} />
            </div>
          </div>
        );
      case 'ordenar': {
        const items = asStringArray(lessonContent.items, 4, 'Passo');
        return (
          <div className={styles.contentBuilder}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Instrução</label>
              <textarea className={styles.textarea} value={asString(lessonContent.instruction)} onChange={e => updateLessonContentField('instruction', e.target.value)} />
            </div>
            <div className={styles.contentGrid}>
              {items.map((item, index) => (
                <div key={`ordenar-${index}`} className={styles.fieldGroup}>
                  <label className={styles.label}>Passo {index + 1}</label>
                  <input className={styles.input} value={item} onChange={e => updateLessonContentArray('items', index, e.target.value, 4, 'Passo')} />
                </div>
              ))}
            </div>
            <span className={styles.labelHint}>A ordem digitada acima será a ordem correta.</span>
          </div>
        );
      }
      case 'parear': {
        const pairs = asPairArray(lessonContent.pairs, 3);
        return (
          <div className={styles.contentBuilder}>
            {pairs.map((pair, index) => (
              <div key={`pair-${index}`} className={styles.contentPairRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Item {index + 1}</label>
                  <input className={styles.input} value={pair.left} onChange={e => updateLessonPair(index, 'left', e.target.value)} />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Correspondência {index + 1}</label>
                  <input className={styles.input} value={pair.right} onChange={e => updateLessonPair(index, 'right', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        );
      }
      case 'flashcard': {
        const cards = asCardArray(lessonContent.cards, 3);
        return (
          <div className={styles.contentBuilder}>
            {cards.map((card, index) => (
              <div key={`card-${index}`} className={styles.contentPairRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Frente do card {index + 1}</label>
                  <textarea className={styles.textarea} value={card.front} onChange={e => updateLessonCard(index, 'front', e.target.value)} />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Verso do card {index + 1}</label>
                  <textarea className={styles.textarea} value={card.back} onChange={e => updateLessonCard(index, 'back', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        );
      }
      case 'imagem': {
        const options = asImageOptionArray(lessonContent.options, 2);
        const correct = Math.min(Math.max(asNumber(lessonContent.correct, 0), 0), options.length - 1);
        return (
          <div className={styles.contentBuilder}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Pergunta</label>
              <textarea className={styles.textarea} value={asString(lessonContent.question)} onChange={e => updateLessonContentField('question', e.target.value)} />
            </div>
            {options.map((option, index) => (
              <div key={`image-option-${index}`} className={styles.contentPairRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Emoji da opção {index + 1}</label>
                  <input className={styles.input} value={option.emoji} onChange={e => updateLessonImageOption(index, 'emoji', e.target.value)} />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Legenda da opção {index + 1}</label>
                  <input className={styles.input} value={option.label} onChange={e => updateLessonImageOption(index, 'label', e.target.value)} />
                </div>
              </div>
            ))}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Resposta correta</label>
              <select className={styles.input} value={String(correct)} onChange={e => updateLessonContentField('correct', Number(e.target.value))}>
                {options.map((option, index) => (
                  <option key={`image-correct-${index}`} value={index}>
                    {`Opção ${index + 1}: ${option.label || 'Sem legenda'}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      }
      case 'desafio_dia': {
        const tips = asStringArray(lessonContent.tips, 3, 'Dica');
        return (
          <div className={styles.contentBuilder}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Desafio do dia</label>
              <textarea className={styles.textarea} value={asString(lessonContent.challenge)} onChange={e => updateLessonContentField('challenge', e.target.value)} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Prazo ou duração</label>
              <input className={styles.input} value={asString(lessonContent.duration, 'hoje')} onChange={e => updateLessonContentField('duration', e.target.value)} />
            </div>
            <div className={styles.contentGrid}>
              {tips.map((tip, index) => (
                <div key={`tip-${index}`} className={styles.fieldGroup}>
                  <label className={styles.label}>Dica {index + 1}</label>
                  <input className={styles.input} value={tip} onChange={e => updateLessonContentArray('tips', index, e.target.value, 3, 'Dica')} />
                </div>
              ))}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  }

  async function deleteLesson(id: string) {
    const lesson = (lessonsData?.lessons ?? []).find((item) => item.id === id);
    if (lesson && (lesson.canManage === false || getLessonScheduleState(lesson) === 'past')) {
      showToast('Essa lição já passou. Exclua ou altere somente antes ou no próprio dia.', 'error');
      return;
    }

    if (!confirm('Excluir esta lição?')) return;
    setDeletingLesson(id);
    try {
      const res = await fetch(`/api/rh/lessons/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); showToast(d.error || 'Erro ao excluir', 'error'); }
      else { showToast('Lição excluída', 'success'); mutateLessons(); }
    } catch { showToast('Erro de conexão', 'error'); }
    setDeletingLesson(null);
  }

  async function toggleLessonValidation(lesson: Lesson, validated: boolean) {
    if (lesson.canManage === false) {
      showToast('Essa lição não pode mais ser validada porque a data já passou.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/rh/lessons/${lesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validated,
          validation_notes: validated
            ? `Validada em ${new Date().toLocaleDateString('pt-BR')}`
            : '',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Erro ao atualizar validação da lição', 'error');
        return;
      }

      showToast(
        validated ? 'Lição marcada como validada.' : 'Lição voltou para pendente de validação.',
        'success'
      );
      mutateLessons();
    } catch {
      showToast('Erro de conexão', 'error');
    }
  }

  // â”€â”€ Debounced numeric inputs â”€â”€
  const [streakDays, setStreakDays] = useState<number | null>(null);
  const [heartsPerDay, setHeartsPerDay] = useState<number | null>(null);
  const [heartsRefill, setHeartsRefill] = useState<number | null>(null);

  const effectiveStreakDays = streakDays ?? config?.streak_min_days ?? 3;
  const effectiveHeartsPerDay = heartsPerDay ?? config?.hearts_per_day ?? 5;
  const effectiveHeartsRefill = heartsRefill ?? config?.hearts_refill_hours ?? 24;

  if (configLoading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Configuracao de Gamificacao</h1>
        <p className={styles.subtitle}>Carregando...</p>
        <div className={styles.sections}>
          {[1, 2, 3].map(i => <div key={i} className={styles.skeletonBlock} />)}
        </div>
      </div>
    );
  }

  const rewards = rewardsData?.rewards ?? [];
  const pendingRedemptions = redemptionsData?.redemptions ?? [];

  const XP_FIELDS = [
    { key: 'xp_checkin', label: 'Check-in Diário', max: 200 },
    { key: 'xp_lesson', label: 'Lição Concluída', max: 200 },
    { key: 'xp_quiz', label: 'Quiz Respondido', max: 200 },
    { key: 'xp_challenge', label: 'Desafio Completo', max: 300 },
    { key: 'xp_exam', label: 'Exame Realizado', max: 500 },
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Configuração de Gamificação</h1>
      <p className={styles.subtitle}>Personalize as regras de pontuação, mecânicas e recompensas da sua empresa</p>

      <div className={styles.sections}>
        {/* â•â•â• Section 1: XP & Pontuacao â•â•â• */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>⚡</span>
            <h2 className={styles.sectionTitle}>XP e Pontuação</h2>
          </div>
          <p className={styles.sectionDesc}>
            Defina quantos pontos de experiência (XP) cada atividade concede às colaboradoras.
          </p>

          {XP_FIELDS.map(({ key, label, max }) => (
            <div key={key} className={styles.xpRow}>
              <span className={styles.xpLabel}>{label}</span>
              <input
                type="range"
                className={styles.xpSlider}
                min={0}
                max={max}
                step={5}
                value={xp[key] ?? 0}
                onChange={e => handleXpChange(key, Number(e.target.value))}
                aria-label={`XP para ${label}`}
              />
              <span className={styles.xpValue}>{xp[key] ?? 0} XP</span>
            </div>
          ))}

          <div style={{ marginTop: 16 }}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Meta diária de XP
                <span className={styles.labelHint}> (mínimo para considerar o dia como ativo)</span>
              </label>
              <input
                type="number"
                className={styles.input}
                style={{ maxWidth: 160 }}
                min={10}
                max={500}
                value={goal}
                onChange={e => setDailyGoal(Math.max(10, Math.min(500, Number(e.target.value))))}
              />
            </div>
          </div>

          <div className={styles.saveRow}>
            <button className={styles.saveBtn} onClick={saveXpConfig} disabled={xpSaving}>
              {xpSaving ? 'Salvando...' : 'Salvar XP'}
            </button>
          </div>
        </section>

        {/* â•â•â• Section 2: Streak â•â•â• */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>🔥</span>
            <h2 className={styles.sectionTitle}>Streak (Sequência)</h2>
          </div>
          <p className={styles.sectionDesc}>
            A streak conta dias consecutivos de atividade. Colaboradoras que mantiverem a sequência ganham bônus de XP e badges especiais em marcos como 7, 14, 30 e 60 dias.
          </p>

          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>Notificações de streak</span>
              <span className={styles.toggleDesc}>Enviar lembretes para não perder a sequência</span>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={(config?.streak_notifications ?? 1) === 1}
                onChange={() => saveToggle('streak_notifications', config?.streak_notifications === 1 ? 0 : 1)}
                disabled={toggleSaving === 'streak_notifications'}
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>

          <div style={{ marginTop: 16 }}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Dias mínimos para streak</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  className={styles.input}
                  style={{ maxWidth: 100 }}
                  min={1}
                  max={365}
                  value={effectiveStreakDays}
                  onChange={e => setStreakDays(Math.max(1, Math.min(365, Number(e.target.value))))}
                />
                <button
                  className={styles.saveBtnOutline}
                  style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                  onClick={() => saveNumericField('streak_min_days', effectiveStreakDays)}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* â•â•â• Section 3: Hearts/Vidas â•â•â• */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>❤️</span>
            <h2 className={styles.sectionTitle}>Vidas (Hearts)</h2>
          </div>
          <p className={styles.sectionDesc}>
            O sistema de vidas limita quantas atividades incorretas a colaboradora pode fazer por dia. Ao errar um quiz ou desafio, perde uma vida. Quando acabam as vidas, precisa esperar o recarregamento. Isso incentiva atenção e estudo.
          </p>

          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>Ativar sistema de vidas</span>
              <span className={styles.toggleDesc}>Quando desativado, erros não consomem vidas</span>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={(config?.hearts_enabled ?? 0) === 1}
                onChange={() => saveToggle('hearts_enabled', config?.hearts_enabled === 1 ? 0 : 1)}
                disabled={toggleSaving === 'hearts_enabled'}
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>

          {(config?.hearts_enabled ?? 0) === 1 && (
            <div className={styles.formGrid} style={{ marginTop: 16 }}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Vidas por dia</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    className={styles.input}
                    style={{ maxWidth: 100 }}
                    min={1}
                    max={20}
                    value={effectiveHeartsPerDay}
                    onChange={e => setHeartsPerDay(Math.max(1, Math.min(20, Number(e.target.value))))}
                  />
                  <button
                    className={styles.saveBtnOutline}
                    style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                    onClick={() => saveNumericField('hearts_per_day', effectiveHeartsPerDay)}
                  >
                    Salvar
                  </button>
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Tempo de recarga (horas)</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    className={styles.input}
                    style={{ maxWidth: 100 }}
                    min={1}
                    max={168}
                    value={effectiveHeartsRefill}
                    onChange={e => setHeartsRefill(Math.max(1, Math.min(168, Number(e.target.value))))}
                  />
                  <button
                    className={styles.saveBtnOutline}
                    style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                    onClick={() => saveNumericField('hearts_refill_hours', effectiveHeartsRefill)}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* â•â•â• Section 4: Liga & Competicao â•â•â• */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>🏆</span>
            <h2 className={styles.sectionTitle}>Liga e Competição</h2>
          </div>
          <p className={styles.sectionDesc}>
            Ligas criam competições semanais entre colaboradoras. Quem pontuar mais sobe de divisão. A opção anônima mostra apenas apelidos/iniciais no ranking.
          </p>

          <div className={styles.toggleList}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>Ativar ligas</span>
                  <span className={styles.toggleDesc}>Competição semanal com ranking e divisões</span>
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  className={styles.toggleInput}
                  checked={(config?.league_enabled ?? 1) === 1}
                  onChange={() => saveToggle('league_enabled', config?.league_enabled === 1 ? 0 : 1)}
                  disabled={toggleSaving === 'league_enabled'}
                />
                <span className={styles.toggleSlider} />
              </label>
            </div>

            {(config?.league_enabled ?? 1) === 1 && (
              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>Ranking anônimo</span>
                  <span className={styles.toggleDesc}>Exibir apenas apelidos/iniciais em vez de nomes completos</span>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    className={styles.toggleInput}
                    checked={(config?.league_anonymous ?? 0) === 1}
                    onChange={() => saveToggle('league_anonymous', config?.league_anonymous === 1 ? 0 : 1)}
                    disabled={toggleSaving === 'league_anonymous'}
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>
            )}
          </div>
        </section>

        {/* â•â•â• Section 5: Temas & Trilha â•â•â• */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>📚</span>
            <h2 className={styles.sectionTitle}>Temas e Trilha de Saúde</h2>
          </div>
          <p className={styles.sectionDesc}>
            Selecione quais temas de saúde estão ativos para a empresa e defina a ordem em que aparecem na trilha.
          </p>

          <div style={{ marginBottom: 16 }}>
            <span className={styles.label} style={{ marginBottom: 8, display: 'block' }}>Temas ativos</span>
            <div className={styles.themeGrid}>
              {Object.entries(THEME_LABELS).map(([key, label]) => {
                const isActive = activeThemes.includes(key);
                return (
                  <label
                    key={key}
                    className={`${styles.themeCheckbox} ${isActive ? styles.themeCheckboxActive : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.themeCheck}
                      checked={isActive}
                      onChange={() => toggleTheme(key)}
                    />
                    {normalizeText(label)}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <span className={styles.label} style={{ marginBottom: 8, display: 'block' }}>Ordem da trilha</span>
            <div className={styles.themeOrderList}>
              {themeOrder.filter(t => activeThemes.includes(t)).map((theme, idx) => (
                <div key={theme} className={styles.themeOrderItem}>
                  <span className={styles.themeOrderIndex}>{idx + 1}.</span>
                  <span className={styles.themeOrderName}>{normalizeText(THEME_LABELS[theme] || theme)}</span>
                  <div className={styles.themeOrderBtns}>
                    <button
                      className={styles.themeOrderBtn}
                      onClick={() => moveTheme(themeOrder.indexOf(theme), 'up')}
                      disabled={idx === 0}
                      aria-label={`Mover ${THEME_LABELS[theme]} para cima`}
                    >
                      ▲
                    </button>
                    <button
                      className={styles.themeOrderBtn}
                      onClick={() => moveTheme(themeOrder.indexOf(theme), 'down')}
                      disabled={idx === themeOrder.filter(t => activeThemes.includes(t)).length - 1}
                      aria-label={`Mover ${THEME_LABELS[theme]} para baixo`}
                    >
                      ▼
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.saveRow}>
            <button className={styles.saveBtn} onClick={saveThemes} disabled={themesSaving}>
              {themesSaving ? 'Salvando...' : 'Salvar Temas'}
            </button>
          </div>
        </section>

        {/* â•â•â• Section 6: Recompensas â•â•â• */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>🎁</span>
            <h2 className={styles.sectionTitle}>Recompensas</h2>
          </div>
          <p className={styles.sectionDesc}>
            Gerencie as recompensas que as colaboradoras podem resgatar com seus pontos.
          </p>

          {/* Rewards list */}
          {rewardsLoading ? (
            <div className={styles.skeletonBlock} />
          ) : rewards.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎁</div>
              <p className={styles.emptyText}>Nenhuma recompensa cadastrada. Crie a primeira!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table className={styles.rewardsTable}>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Custo</th>
                    <th>Tipo</th>
                    <th>Qtd</th>
                    <th>Resgates</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.title}</td>
                      <td>{r.points_cost} pts</td>
                      <td>
                        <span className={`${styles.typeBadge} ${
                          r.type === 'voucher' ? styles.typeVoucher :
                          r.type === 'folga' ? styles.typeFolga :
                          r.type === 'produto' ? styles.typeProduto :
                          styles.typeExperiencia
                        }`}>
                          {REWARD_TYPE_LABELS[r.type] || r.type}
                        </span>
                      </td>
                      <td>{r.quantity_available === -1 ? 'Ilimitado' : r.quantity_available}</td>
                      <td>{r.total_redemptions ?? 0}{r.pending_redemptions ? ` (${r.pending_redemptions} pendente${r.pending_redemptions > 1 ? 's' : ''})` : ''}</td>
                      <td>
                        <span style={{
                          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                          background: r.active ? '#16a34a' : '#9ca3af', marginRight: 6, verticalAlign: 'middle',
                        }} />
                        {r.active ? 'Ativo' : 'Inativo'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* New reward form */}
          {!showRewardForm ? (
            <button className={styles.saveBtnOutline} onClick={() => setShowRewardForm(true)}>
              + Nova Recompensa
            </button>
          ) : (
            <div style={{ background: 'var(--cream-50)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-sm)', padding: 20, marginTop: 8 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-900)', marginBottom: 16 }}>Nova Recompensa</h3>
              <div className={styles.formGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Titulo *</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Ex: Vale-presente R$50"
                    value={rewardForm.title}
                    onChange={e => setRewardForm(f => ({ ...f, title: e.target.value }))}
                    maxLength={200}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Tipo</label>
                  <select
                    className={styles.select}
                    value={rewardForm.type}
                    onChange={e => setRewardForm(f => ({ ...f, type: e.target.value }))}
                  >
                    <option value="voucher">Voucher</option>
                    <option value="folga">Folga</option>
                    <option value="produto">Produto</option>
                    <option value="experiencia">Experiência</option>
                  </select>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Custo em pontos *</label>
                  <input
                    className={styles.input}
                    type="number"
                    min={1}
                    value={rewardForm.points_cost}
                    onChange={e => setRewardForm(f => ({ ...f, points_cost: Math.max(1, Number(e.target.value)) }))}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    Quantidade disponível
                    <span className={styles.labelHint}> (-1 = ilimitado)</span>
                  </label>
                  <input
                    className={styles.input}
                    type="number"
                    min={-1}
                    value={rewardForm.quantity_available}
                    onChange={e => setRewardForm(f => ({ ...f, quantity_available: Number(e.target.value) }))}
                  />
                </div>
                <div className={`${styles.fieldGroup} ${styles.fieldGroupFull}`}>
                  <label className={styles.label}>Descrição</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Descrição opcional da recompensa"
                    value={rewardForm.description}
                    onChange={e => setRewardForm(f => ({ ...f, description: e.target.value }))}
                    maxLength={1000}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                <button
                  className={styles.saveBtnOutline}
                  onClick={() => { setShowRewardForm(false); setRewardForm({ title: '', description: '', points_cost: 100, type: 'voucher', quantity_available: -1 }); }}
                >
                  Cancelar
                </button>
                <button className={styles.saveBtn} onClick={createReward} disabled={rewardSaving || !rewardForm.title.trim()}>
                  {rewardSaving ? 'Criando...' : 'Criar Recompensa'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* â•â•â• Section 7: Resgates Pendentes â•â•â• */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>📋</span>
            <h2 className={styles.sectionTitle}>Resgates Pendentes</h2>
          </div>
          <p className={styles.sectionDesc}>
            Aprove ou rejeite os resgates de recompensas solicitados pelas colaboradoras.
          </p>

          {redemptionsLoading ? (
            <div className={styles.skeletonBlock} />
          ) : pendingRedemptions.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>✅</div>
              <p className={styles.emptyText}>Nenhum resgate pendente no momento</p>
            </div>
          ) : (
            <div>
              {pendingRedemptions.map(r => (
                <div key={r.id} className={styles.redemptionCard}>
                  <div className={styles.redemptionInfo}>
                    <div className={styles.redemptionUser}>{r.user_name}</div>
                    <div className={styles.redemptionReward}>
                      {r.reward_title} — <strong>{r.points_spent} pts</strong>
                      {' '}
                      <span className={`${styles.typeBadge} ${
                        r.reward_type === 'voucher' ? styles.typeVoucher :
                        r.reward_type === 'folga' ? styles.typeFolga :
                        r.reward_type === 'produto' ? styles.typeProduto :
                        styles.typeExperiencia
                      }`}>
                        {REWARD_TYPE_LABELS[r.reward_type] || r.reward_type}
                      </span>
                    </div>
                    <div className={styles.redemptionDate}>
                      {new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className={styles.redemptionActions}>
                    <button
                      className={styles.saveBtnSuccess}
                      onClick={() => handleRedemption(r.id, 'approved')}
                      disabled={processingRedemption === r.id}
                    >
                      {processingRedemption === r.id ? '...' : 'Aprovar'}
                    </button>
                    <button
                      className={styles.saveBtnDanger}
                      onClick={() => handleRedemption(r.id, 'rejected')}
                      disabled={processingRedemption === r.id}
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        {/* â•â•â• Section 8: Gerenciamento de LiÃ§Ãµes â•â•â• */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>📚</span>
            <h2 className={styles.sectionTitle}>Gerenciamento de Lições</h2>
          </div>
          <p className={styles.sectionDesc}>
            Visualize as {lessonsData?.total ?? '...'} lições disponíveis e crie conteúdo personalizado para sua empresa. Lições globais são somente leitura.
          </p>

          {lessonsToReview.length > 0 && (
            <div className={styles.lessonReminder}>
              <div className={styles.lessonReminderIcon}>🔔</div>
              <div className={styles.lessonReminderContent}>
                <strong className={styles.lessonReminderTitle}>Lembrete de validação</strong>
                <p className={styles.lessonReminderText}>
                  {todayLessonsToReview.length > 0
                    ? `Antes de liberar o dia, revise ${todayLessonsToReview.length} lição${todayLessonsToReview.length > 1 ? 'ões' : ''} programada${todayLessonsToReview.length > 1 ? 's' : ''} para hoje.`
                    : 'Revise as próximas lições agendadas para garantir que pergunta, resposta e orientação estejam corretas.'}
                </p>
                {nextLessonsToReview.length > 0 && (
                  <p className={styles.lessonReminderMeta}>
                    Próximas para validar: {nextLessonsToReview.map((lesson) => `${lesson.title} (${DAY_LABELS[lesson.day_of_week] ?? `Dia ${lesson.day_of_week}`})`).join(' · ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className={styles.lessonFilters}>
            <input className={styles.input} placeholder="🔍 Buscar título..." value={lessonSearch} onChange={e => { setLessonSearch(e.target.value); setLessonPage(1); }} />
            <select className={styles.input} value={lessonThemeFilter} onChange={e => { setLessonThemeFilter(e.target.value); setLessonPage(1); }}>
              <option value="">Todos os temas</option>
              {Object.entries(THEME_LABELS).map(([k, v]) => <option key={k} value={k}>{normalizeText(v)}</option>)}
            </select>
            <select className={styles.input} value={lessonTypeFilter} onChange={e => { setLessonTypeFilter(e.target.value); setLessonPage(1); }}>
              <option value="">Todos os tipos</option>
              {Object.entries(LESSON_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{normalizeText(v)}</option>)}
            </select>
            <input className={styles.input} type="number" min={1} max={52} placeholder="Semana" value={lessonWeekFilter} onChange={e => { setLessonWeekFilter(e.target.value); setLessonPage(1); }} />
            <button className={`${styles.saveBtn} ${styles.newLessonBtn}`} onClick={openCreateLesson}>+ Nova Lição</button>
          </div>

          {/* Lesson list */}
          {lessonsLoading ? (
            <div className={styles.skeletonBlock} />
          ) : visibleLessons.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📝</div>
              <p className={styles.emptyText}>Nenhuma lição encontrada com esses filtros</p>
            </div>
          ) : (
            <div className={styles.lessonList}>
              {visibleLessons.map(lesson => (
                <div key={lesson.id} className={styles.lessonCard}>
                  <div className={styles.lessonTopRow}>
                    <span className={styles.lessonWeek}>S{lesson.week_number}</span>
                    <div className={styles.lessonBadges}>
                      <span className={`${styles.lessonBadge} ${styles.lessonTypeBadge}`}>{normalizeText(LESSON_TYPE_LABELS[lesson.type] ?? lesson.type)}</span>
                      <span className={`${styles.lessonBadge} ${styles.lessonThemeBadge}`}>{normalizeText(THEME_LABELS[lesson.theme] ?? lesson.theme)}</span>
                      <span className={`${styles.lessonBadge} ${lesson.isValidated ? styles.lessonValidatedBadge : styles.lessonPendingBadge}`}>
                        {lesson.isValidated ? 'Validada' : 'Pendente'}
                      </span>
                      <span className={`${styles.lessonBadge} ${
                        getLessonScheduleState(lesson) === 'past'
                          ? styles.lessonPastBadge
                          : getLessonScheduleState(lesson) === 'today'
                            ? styles.lessonTodayBadge
                            : styles.lessonFutureBadge
                      }`}>
                        {getLessonScheduleLabel(lesson)}
                      </span>
                    </div>
                  </div>
                  <span className={styles.lessonTitle}>{normalizeText(lesson.title)}</span>
                  <span className={styles.lessonMetaText}>
                    {DAY_LABELS[lesson.day_of_week] ?? `Dia ${lesson.day_of_week}`} · ordem {lesson.order_index + 1} · {lesson.xp_reward} XP
                  </span>
                  {lesson.campaign_context && <span className={styles.lessonCampaign}>🏷️ {normalizeText(lesson.campaign_context)}</span>}
                  {!lesson.isGlobal && (
                    <span className={styles.lessonMetaText}>
                      {lesson.isValidated
                        ? `Status: validada${lesson.validated_at ? ` em ${new Date(lesson.validated_at).toLocaleDateString('pt-BR')}` : ''}`
                        : 'Status: aguardando validação manual'}
                    </span>
                  )}
                  {!lesson.isGlobal && lesson.canManage === false && (
                    <span className={styles.lessonWarning}>
                      Essa lição já passou. A edição e a exclusão ficam liberadas somente antes ou no próprio dia.
                    </span>
                  )}
                  <div className={styles.lessonActions}>
                  {lesson.isGlobal ? (
                    <span className={`${styles.lessonBadge} ${styles.lessonGlobalBadge}`}>Global</span>
                  ) : (
                    <>
                      <button
                        className={`${lesson.isValidated ? styles.saveBtnOutline : styles.saveBtnSuccess} ${styles.lessonActionBtn}`}
                        onClick={() => toggleLessonValidation(lesson, !lesson.isValidated)}
                        disabled={lesson.canManage === false}
                      >
                        {lesson.isValidated ? 'Voltar para pendente' : 'Marcar como validada'}
                      </button>
                      <button className={`${styles.saveBtnSmall} ${styles.lessonActionBtn}`} onClick={() => openEditLesson(lesson)} disabled={lesson.canManage === false}>Editar</button>
                      <button className={`${styles.saveBtnDanger} ${styles.lessonActionBtn}`} onClick={() => deleteLesson(lesson.id)} disabled={deletingLesson === lesson.id || lesson.canManage === false}>
                        {deletingLesson === lesson.id ? '...' : 'Excluir'}
                      </button>
                    </>
                  )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {(lessonsData?.totalPages ?? 1) > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center', justifyContent: 'center' }}>
              <button className={styles.saveBtn} onClick={() => setLessonPage(p => Math.max(1, p - 1))} disabled={lessonPage === 1} style={{ padding: '4px 12px' }}>← Anterior</button>
              <span style={{ fontSize: 13 }}>Pág. {lessonPage} / {lessonsData?.totalPages}</span>
              <button className={styles.saveBtn} onClick={() => setLessonPage(p => Math.min(lessonsData?.totalPages ?? 1, p + 1))} disabled={lessonPage === (lessonsData?.totalPages ?? 1)} style={{ padding: '4px 12px' }}>Próxima →</button>
            </div>
          )}
        </section>
      </div>

      {/* Lesson Create/Edit Modal */}
      {showLessonForm && (
        <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) closeLessonForm(); }}>
          <div ref={lessonModalRef} className={`${styles.modal} ${styles.lessonModal}`}>
            <div className={styles.lessonModalHeader}>
              <div>
                <h3 className={styles.modalTitle}>{editingLesson ? 'Editar Lição' : 'Nova Lição'}</h3>
                <p className={styles.lessonModalSubtitle}>
                  Monte a lição em três passos: o que será ensinado, quando ela aparece e como a colaboradora vai interagir.
                </p>
              </div>
              <button type="button" className={styles.lessonCloseBtn} onClick={closeLessonForm} aria-label="Fechar editor de lição">
                ✕
              </button>
            </div>
            <div className={styles.lessonModalContent}>
            {isLessonEditorMobile && (
              <div className={styles.lessonMobileProgress}>
                <span className={styles.lessonMobileProgressLabel}>Etapa {lessonEditorStep} de 3</span>
                <div className={styles.lessonMobileProgressDots} aria-hidden="true">
                  {[1, 2, 3].map((step) => (
                    <span
                      key={step}
                      className={`${styles.lessonMobileProgressDot} ${lessonEditorStep === step ? styles.lessonMobileProgressDotActive : ''}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {isStepVisible(1) && <div className={styles.lessonFormSection}>
              <div className={styles.lessonFormSectionHead}>
                <span className={styles.lessonStep}>1</span>
                <div>
                  <strong>Informações básicas</strong>
                  <p>Defina um nome claro e uma descrição simples para a lição.</p>
                </div>
              </div>
              <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Título *</label>
                <input className={styles.input} placeholder="Ex: Verdades e mitos sobre hidratação" value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Descrição *</label>
                <input className={styles.input} placeholder="Ex: Lição curta para reforçar hábitos simples do dia a dia." value={lessonForm.description} onChange={e => setLessonForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              </div>
              {lessonStepOneIssues.length > 0 && (
                <span className={styles.lessonWarning}>
                  Para continuar, {lessonStepOneIssues[0]}.
                </span>
              )}

                <div className={styles.formGrid3}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Tipo *</label>
                <select className={styles.select} value={lessonForm.type} onChange={e => handleLessonTypeChange(e.target.value)}>
                  {Object.entries(LESSON_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{normalizeText(v)}</option>)}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Tema *</label>
                <select className={styles.select} value={lessonForm.theme} onChange={e => setLessonForm(f => ({ ...f, theme: e.target.value }))}>
                  {Object.entries(THEME_LABELS).map(([k, v]) => <option key={k} value={k}>{normalizeText(v)}</option>)}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>XP</label>
                <input type="number" className={styles.input} min={10} max={100} value={lessonForm.xp_reward} onChange={e => setLessonForm(f => ({ ...f, xp_reward: Number(e.target.value) }))} />
              </div>
              </div>
            </div>}

            {isStepVisible(2) && <div className={styles.lessonFormSection}>
              <div className={styles.lessonFormSectionHead}>
                <span className={styles.lessonStep}>2</span>
                <div>
                  <strong>Agendamento da lição</strong>
                  <p>Escolha a semana, o dia e a posição em que essa lição deve aparecer.</p>
                </div>
              </div>
            <div className={styles.formGrid3}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Semana (1-52)</label>
                <input type="number" className={styles.input} min={1} max={52} placeholder="Semana da publicação" value={lessonForm.week_number} onChange={e => setLessonForm(f => ({ ...f, week_number: e.target.value }))} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Dia da semana</label>
                <select className={styles.select} value={lessonForm.day_of_week} onChange={e => setLessonForm(f => ({ ...f, day_of_week: e.target.value }))}>
                  {Object.entries(DAY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Posição do dia</label>
                <input type="number" className={styles.input} min={0} max={99} value={lessonForm.order_index} onChange={e => setLessonForm(f => ({ ...f, order_index: Math.max(0, Number(e.target.value) || 0) }))} />
              </div>
            </div>
              <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Duração (seg)</label>
                <input type="number" className={styles.input} min={30} value={lessonForm.duration_seconds} onChange={e => setLessonForm(f => ({ ...f, duration_seconds: Number(e.target.value) }))} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Campanha <span className={styles.labelHint}>(opcional — ex: Outubro Rosa)</span></label>
                <input className={styles.input} placeholder="Ex: Outubro Rosa - Câncer de Mama" value={lessonForm.campaign_context} onChange={e => setLessonForm(f => ({ ...f, campaign_context: e.target.value }))} />
              </div>
              </div>
            </div>}

            {isStepVisible(3) && <div className={styles.lessonFormSection}>
              <div className={styles.lessonFormSectionHead}>
                <span className={styles.lessonStep}>3</span>
                <div>
                  <strong>Conteúdo e interação</strong>
                  <p>Preencha como a colaboradora vai ler, responder ou refletir nessa etapa.</p>
                </div>
              </div>
              <div className={styles.fieldGroup}>
              <label className={styles.label}>Conteúdo da lição *</label>
              <div className={styles.contentIntroBox}>
                <strong>{normalizeText(LESSON_TYPE_LABELS[lessonForm.type] ?? lessonForm.type)} · {LESSON_TYPE_HELP[lessonForm.type]?.title}</strong>
                <span className={styles.labelHint}>{LESSON_TYPE_HELP[lessonForm.type]?.description}</span>
              </div>
              {lessonContentIssues.length > 0 && (
                <span className={styles.lessonWarning}>
                  Ainda falta {lessonContentIssues[0]}.
                </span>
              )}
              {renderLessonContentEditor()}
              </div>
            </div>}
            </div>

            <div className={styles.lessonModalFooter}>
            {isLessonEditorMobile ? (
              <div className={styles.lessonMobileFooterActions}>
                <button
                  className={styles.saveBtnOutline}
                  onClick={() => {
                    if (lessonEditorStep === 1) {
                      closeLessonForm();
                      return;
                    }
                    setLessonEditorStep((current) => Math.max(1, current - 1));
                  }}
                >
                  {lessonEditorStep === 1 ? 'Cancelar' : 'Voltar'}
                </button>
                {lessonEditorStep < 3 ? (
                  <button
                    className={styles.saveBtn}
                    onClick={goToNextLessonStep}
                  >
                    Continuar
                  </button>
                ) : (
                  <button className={styles.saveBtn} onClick={saveLesson} disabled={lessonSaving}>
                    {lessonSaving ? 'Salvando...' : editingLesson ? 'Salvar Alterações' : 'Criar Lição'}
                  </button>
                )}
              </div>
            ) : (
            <div className={styles.saveRow}>
              <button className={styles.saveBtn} onClick={saveLesson} disabled={lessonSaving}>
                {lessonSaving ? 'Salvando...' : editingLesson ? 'Salvar Alterações' : 'Criar Lição'}
              </button>
              <button className={styles.saveBtnDanger} onClick={closeLessonForm} style={{ marginLeft: 8 }}>Cancelar</button>
            </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

