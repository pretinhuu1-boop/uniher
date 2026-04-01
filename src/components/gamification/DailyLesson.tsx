'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  pilula: '💊',
  quiz: '📝',
  reflexao: '🧘',
  lacuna: '✏️',
  verdadeiro_falso: '⚖️',
  ordenar: '🔢',
  parear: '🔗',
  historia: '📖',
  flashcard: '🃏',
  imagem: '🖼️',
  desafio_dia: '🎯',
};

const TYPE_LABELS: Record<string, string> = {
  pilula: 'Pílula de Saúde',
  quiz: 'Quiz',
  reflexao: 'Reflexão',
  lacuna: 'Preencha a Lacuna',
  verdadeiro_falso: 'Verdadeiro ou Falso',
  ordenar: 'Ordenar',
  parear: 'Parear',
  historia: 'História Interativa',
  flashcard: 'Flashcard',
  imagem: 'Escolha a Imagem',
  desafio_dia: 'Desafio do Dia',
};

const THEME_COLORS: Record<string, string> = {
  hidratacao: '#3B82F6',
  sono: '#8B5CF6',
  prevencao: '#EC4899',
  nutricao: '#10B981',
  mental: '#F59E0B',
  ciclo: '#F43F5E',
  geral: '#C9A264',
};

const THEME_EMOJIS: Record<string, string> = {
  hidratacao: '💧',
  sono: '🌙',
  prevencao: '🏥',
  nutricao: '🥗',
  mental: '🧠',
  ciclo: '🌸',
  geral: '✨',
};

// ─── Types ───────────────────────────────────────────────────────────────────

type LessonType =
  | 'quiz' | 'pilula' | 'reflexao'
  | 'lacuna' | 'verdadeiro_falso' | 'ordenar'
  | 'parear' | 'historia' | 'flashcard'
  | 'imagem' | 'desafio_dia';

interface Lesson {
  id: string;
  type: LessonType;
  title: string;
  content: string | Record<string, unknown>;
  content_json?: string;
  xp_reward: number;
  theme: string;
  description?: string;
  duration_seconds?: number;
  completed?: boolean;
  user_completed?: boolean;
}

interface DailyLessonProps {
  onComplete?: (lessonId: string, xpEarned: number) => void;
}

// ─── Content shape per type ──────────────────────────────────────────────────

interface QuizContent {
  questions: { question: string; options: string[]; correct: number; explanation: string }[];
}
interface PilulaContent { tip: string; }
interface ReflexaoContent {
  reflection: string;
  context?: string;
  options?: string[];
  action_label?: string;
}
interface LacunaContent {
  sentence: string; // e.g. "Beber ___ por dia ajuda o metabolismo."
  options: string[];
  correct: number;
  explanation: string;
}
interface VerdadeiroFalsoContent {
  statement: string;
  correct: boolean; // true = verdadeiro, false = falso
  explanation: string;
}
interface OrdenarContent {
  items: string[];
  correct_order: number[]; // indices of correct sorted order
  explanation: string;
}
interface ParearContent {
  pairs: { left: string; right: string }[];
}
interface HistoriaContent {
  scenario: string;
  choices: { text: string; correct: boolean; feedback: string }[];
}
interface FlashcardContent {
  front: string; // question / term
  back: string;  // answer / definition
}
interface ImagemContent {
  question: string;
  options: { emoji: string; label: string }[];
  correct: number;
  explanation: string;
}
interface DesafioDiaContent {
  challenge: string;
  motivation: string;
  tip?: string;
}

function extractLessonTopicTitle(title: string): string {
  const [, ...rest] = title.split(':');
  return (rest.join(':').trim() || title).trim();
}

function firstSentenceText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  const sentence = cleaned.split('.').map((part) => part.trim()).find(Boolean);
  return sentence || fallback;
}

function normalizePairText(value: string): string {
  return value
    .replace(/^Opção:\s*/i, '')
    .replace(/^Alternativa:\s*/i, '')
    .replace(/^Relacionado a:\s*/i, '')
    .replace(/^Conceito de saúde feminina:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildReadablePairRight(left: string, right: string, lessonTitle: string): string {
  const cleanedLeft = normalizePairText(left);
  const cleanedRight = normalizePairText(right);

  if (!cleanedRight || cleanedRight.toLowerCase() === cleanedLeft.toLowerCase()) {
    if (/desidrata/i.test(lessonTitle)) return `Pode estar ligado à desidratação.`;
    if (/sono/i.test(lessonTitle)) return `Pode influenciar sua qualidade de sono.`;
    if (/estresse|mental/i.test(lessonTitle)) return `Pode impactar seu bem-estar emocional.`;
    return `Está relacionado ao tema da lição.`;
  }

  if (cleanedRight.toLowerCase().includes(cleanedLeft.toLowerCase())) {
    return cleanedRight;
  }

  return cleanedRight;
}

function buildCanonicalClientPairs(lesson: Lesson, parsed: Record<string, unknown>) {
  const topicTitle = extractLessonTopicTitle(lesson.title);
  const summary = firstSentenceText(parsed.explanation, `Entenda melhor ${topicTitle.toLowerCase()}.`);
  const questionText = typeof parsed.question === 'string' && parsed.question.trim()
    ? parsed.question.trim()
    : `Qual e o principal ponto sobre ${topicTitle.toLowerCase()}?`;
  const bestAnswer =
    Array.isArray(parsed.options) && typeof parsed.correct === 'number' && typeof parsed.options[parsed.correct] === 'string'
      ? String(parsed.options[parsed.correct]).trim()
      : typeof parsed.challenge === 'string' && parsed.challenge.trim()
      ? parsed.challenge.trim()
      : `Resposta correta sobre ${topicTitle.toLowerCase()}.`;
  const mythText =
    typeof parsed.v === 'string' && parsed.v.trim()
      ? parsed.v.trim()
      : `Afirmacao comum sobre ${topicTitle.toLowerCase()}.`;
  const verdictText =
    typeof parsed.vb === 'boolean'
      ? (parsed.vb ? 'Verdadeiro' : 'Falso')
      : 'Classifique como verdadeiro ou falso.';
  const reflectionPrompt =
    typeof parsed.reflection === 'string' && parsed.reflection.trim()
      ? parsed.reflection.trim()
      : typeof parsed.r === 'string' && parsed.r.trim()
      ? parsed.r.trim()
      : `Pensando na sua rotina, qual cuidado combina melhor com ${topicTitle.toLowerCase()}?`;
  const practicalAction =
    typeof parsed.challenge === 'string' && parsed.challenge.trim()
      ? parsed.challenge.trim()
      : typeof parsed.tip === 'string' && parsed.tip.trim()
      ? parsed.tip.trim()
      : 'Leve esse aprendizado para uma acao simples no seu dia.';

  return [
    { left: questionText, right: bestAnswer },
    { left: `Verdadeiro ou falso: ${mythText}`, right: verdictText },
    { left: `O que profissionais de saude explicam sobre ${topicTitle.toLowerCase()}?`, right: summary },
    { left: reflectionPrompt, right: practicalAction },
  ];
}

function buildReflectionChoices(topicTitle: string, challenge?: unknown): string[] {
  const topic = topicTitle.toLowerCase();
  const action =
    typeof challenge === 'string' && challenge.trim()
      ? challenge.trim()
      : `Quero testar um cuidado simples com ${topic}.`;

  return [
    'Isso já faz sentido para mim hoje.',
    'Quero observar melhor esse tema na minha rotina.',
    action,
    'Se isso continuar me incomodando, vou buscar orientação profissional.',
  ];
}

function createMixedOrder(length: number): number[] {
  if (length <= 1) return Array.from({ length }, (_, idx) => idx);
  if (length === 2) return [1, 0];

  const base = Array.from({ length }, (_, idx) => idx);

  for (let attempt = 0; attempt < 12; attempt++) {
    const shuffled = [...base];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const isDerangement = shuffled.every((value, idx) => value !== idx);
    if (isDerangement) return shuffled;
  }

  return base.map((_, idx) => (idx + 1) % length);
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function parseContent(lesson: Lesson): Record<string, unknown> {
  try {
    const raw = lesson.content_json || lesson.content;
    let parsed: Record<string, unknown> = {};
    if (typeof raw === 'string') parsed = JSON.parse(raw);
    else if (raw && typeof raw === 'object') parsed = raw as Record<string, unknown>;

    // Backward compatibility: old reflection payloads used "prompt".
    if (lesson.type === 'reflexao' && typeof parsed.prompt === 'string' && !parsed.reflection) {
      parsed.reflection = parsed.prompt;
    }
    if (lesson.type === 'reflexao') {
      const topicTitle = extractLessonTopicTitle(lesson.title);
      const reflection =
        typeof parsed.reflection === 'string'
          ? parsed.reflection.trim()
          : '';
      const invalid = !reflection || reflection.length < 8 || reflection === '///' || reflection === '...' || reflection === '--';
      if (invalid) {
        parsed.reflection = 'Pense em um cuidado simples que voce pode praticar hoje por voce.';
      }
      if (!Array.isArray(parsed.options) || parsed.options.length < 2) {
        parsed.options = buildReflectionChoices(
          topicTitle,
          parsed.challenge ?? parsed.tip ?? parsed.d
        );
      }
      if (typeof parsed.action_label !== 'string' || !parsed.action_label.trim()) {
        parsed.action_label = 'Registrar minha escolha';
      }
    }

    if (
      lesson.type === 'quiz' &&
      typeof parsed.question === 'string' &&
      Array.isArray(parsed.options) &&
      typeof parsed.correct === 'number' &&
      !Array.isArray(parsed.questions)
    ) {
      parsed.questions = [{
        question: parsed.question,
        options: parsed.options,
        correct: parsed.correct,
        explanation: typeof parsed.explanation === 'string'
          ? parsed.explanation
          : firstSentenceText(parsed.context, `Entenda melhor ${extractLessonTopicTitle(lesson.title).toLowerCase()}.`),
      }];
    }

    // Normalize imagem: seed uses { images: [{label, value, correct: bool}] }
    // Component expects { options: [{emoji, label}], correct: number }
    if (lesson.type === 'imagem' && Array.isArray(parsed.images) && !parsed.options) {
      const images = parsed.images as { label: string; value?: string; emoji?: string; correct: boolean }[];
      parsed.options = images.map(img => ({ emoji: img.emoji || '🍽️', label: img.label + (img.value ? `\n${img.value}` : '') }));
      parsed.correct = images.findIndex(img => img.correct);
    }

    // Normalize parear: supports legacy {term, definition} and fallback malformed entries.
    if (lesson.type === 'parear' && Array.isArray(parsed.pairs)) {
      const rawPairs = parsed.pairs as Array<Record<string, unknown>>;
      parsed.pairs = rawPairs.map((item, idx) => {
        const left =
          typeof item.left === 'string'
            ? item.left
            : typeof item.term === 'string'
            ? item.term
            : `Item ${idx + 1}`;
        const right =
          typeof item.right === 'string'
            ? item.right
            : typeof item.definition === 'string'
            ? item.definition
            : `Definição ${idx + 1}`;
        const cleanLeft = normalizePairText(left) || `Item ${idx + 1}`;
        const cleanRight = buildReadablePairRight(cleanLeft, right, lesson.title || '');
        return { left: cleanLeft, right: cleanRight };
      });
    }

    if (lesson.type === 'parear') {
      parsed.pairs = buildCanonicalClientPairs(lesson, parsed);
    }

    if (lesson.type === 'ordenar' && Array.isArray(parsed.steps) && Array.isArray(parsed.correctOrder)) {
      parsed.items = parsed.steps;
      parsed.correct_order = parsed.correctOrder;
      parsed.explanation = typeof parsed.explanation === 'string'
        ? parsed.explanation
        : 'Organize os passos do cuidado do mais imediato ao mais continuo.';
    }

    if (lesson.type === 'historia' && !Array.isArray(parsed.choices) && Array.isArray(parsed.options) && typeof parsed.correct === 'number') {
      const explanation = firstSentenceText(parsed.explanation, 'Escolha a resposta mais alinhada com a licao.');
      parsed.choices = (parsed.options as string[]).map((text, idx) => ({
        text,
        correct: idx === parsed.correct,
        feedback: idx === parsed.correct
          ? `${explanation} Essa e a resposta mais alinhada com a licao.`
          : `${explanation} Essa opcao parece possivel, mas nao e a melhor para esta situacao.`,
      }));
    }

    if (lesson.type === 'flashcard' && Array.isArray(parsed.cards) && !parsed.front && !parsed.back) {
      const firstCard = (parsed.cards as Array<Record<string, unknown>>)[0] ?? {};
      parsed.front = typeof firstCard.front === 'string'
        ? firstCard.front
        : `O que observar sobre ${extractLessonTopicTitle(lesson.title)}?`;
      parsed.back = typeof firstCard.back === 'string'
        ? firstCard.back
        : firstSentenceText(parsed.explanation, 'Aplique esse aprendizado de forma simples no seu dia.');
    }

    if (lesson.type === 'desafio_dia') {
      parsed.challenge = typeof parsed.challenge === 'string'
        ? parsed.challenge
        : `Escolha uma acao simples sobre ${extractLessonTopicTitle(lesson.title).toLowerCase()} para praticar hoje.`;
      parsed.motivation = typeof parsed.motivation === 'string'
        ? parsed.motivation
        : firstSentenceText(parsed.reflection ?? parsed.context, 'Um pequeno passo hoje ajuda a consolidar esse cuidado.');
      parsed.tip = typeof parsed.tip === 'string'
        ? parsed.tip
        : firstSentenceText(parsed.context, 'Comece pelo passo mais simples e sustentavel para voce.');
    }

    return parsed;
  } catch {}
  return {};
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FeedbackBanner({ correct, explanation }: { correct: boolean; explanation: string }) {
  return (
    <div
      className="rounded-xl p-3 mt-4 text-sm leading-relaxed"
      style={{
        background: correct ? '#f0fdf4' : '#fff1f2',
        border: `1px solid ${correct ? '#86efac' : '#fda4af'}`,
        color: correct ? '#166534' : '#881337',
      }}
    >
      {correct ? '✅' : '❌'} {explanation}
    </div>
  );
}

function XPBadge({ xp, color }: { xp: number; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white"
      style={{ background: color }}
    >
      +{xp} XP
    </span>
  );
}

function ActionButton({
  onClick,
  disabled,
  color,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-50 mt-4"
      style={{ background: color }}
    >
      {children}
    </button>
  );
}

// ─── Activity renderers ───────────────────────────────────────────────────────

function PilulaActivity({
  content, color, completing, onComplete,
}: { content: PilulaContent; color: string; completing: boolean; onComplete: () => void }) {
  return (
    <div>
      <p className="text-sm text-uni-text-700 leading-relaxed mb-6">{content.tip}</p>
      <ActionButton onClick={onComplete} disabled={completing} color={color}>
        {completing ? 'Salvando…' : 'Entendi! ✓'}
      </ActionButton>
    </div>
  );
}

function ReflexaoActivity({
  content, color, completing, onComplete,
}: { content: ReflexaoContent; color: string; completing: boolean; onComplete: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const options = Array.isArray(content.options) ? content.options.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];

  return (
    <div>
      <div
        className="rounded-2xl p-4 mb-4 text-sm leading-relaxed text-uni-text-700"
        style={{ background: `${color}10`, borderLeft: `3px solid ${color}` }}
      >
        <p className="font-semibold text-uni-text-900 mb-2 text-xs uppercase tracking-wide" style={{ color }}>
          Reflexão guiada
        </p>
        <p className="italic">"{content.reflection}"</p>
        {content.context && (
          <p className="mt-3 text-xs text-uni-text-500 leading-6">
            {content.context}
          </p>
        )}
      </div>

      <p className="text-xs font-bold text-uni-text-500 mb-2">Qual opção combina mais com você hoje?</p>
      <div className="space-y-2 mb-5">
        {options.map((option, idx) => {
          const isSelected = selected === idx;
          return (
            <button
              key={idx}
              onClick={() => setSelected(idx)}
              className="w-full text-left px-4 py-3 rounded-xl border text-sm transition-all active:scale-[0.99]"
              style={{
                borderColor: isSelected ? color : '#e5e7eb',
                background: isSelected ? `${color}12` : '#fff',
                color: '#1f2937',
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: isSelected ? color : '#f3f4f6', color: isSelected ? '#fff' : '#6b7280' }}
                >
                  {idx + 1}
                </span>
                <span className="flex-1 leading-relaxed">{option}</span>
              </div>
            </button>
          );
        })}
      </div>

      <ActionButton onClick={onComplete} disabled={completing || selected === null} color={color}>
        {completing ? 'Salvando…' : (content.action_label || 'Registrar minha escolha')}
      </ActionButton>
    </div>
  );
}

function QuizActivity({
  content, color, completing, onComplete,
}: { content: QuizContent; color: string; completing: boolean; onComplete: (score: number) => void }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const questions = content.questions || [];
  const q = questions[currentQuestion];

  function handleAnswer(idx: number) {
    if (showResult || !q) return;
    setSelectedAnswer(idx);
    setShowResult(true);
    if (idx === q.correct) setScore(s => s + 1);
  }

  function nextQuestion() {
    const lastScore = score + (selectedAnswer === q.correct ? 1 : 0);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(c => c + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      onComplete(lastScore);
    }
  }

  if (!q) return null;

  return (
    <div>
      {/* Progress dots */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-[11px] font-bold text-uni-text-400">
          {currentQuestion + 1} / {questions.length}
        </span>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all"
              style={{ background: i <= currentQuestion ? color : '#e5e7eb' }}
            />
          ))}
        </div>
      </div>

      <p className="text-sm font-semibold text-uni-text-900 mb-4">{q.question}</p>

      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correct;
          const isSelected = i === selectedAnswer;
          let cls = 'bg-cream-50 border-border-1';
          if (showResult && isCorrect) cls = 'bg-green-50 border-green-300';
          if (showResult && isSelected && !isCorrect) cls = 'bg-red-50 border-red-300';

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={showResult}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${cls} ${!showResult ? 'hover:bg-cream-100 active:scale-[0.99]' : ''}`}
            >
              {opt}
              {showResult && isCorrect && ' ✓'}
              {showResult && isSelected && !isCorrect && ' ✗'}
            </button>
          );
        })}
      </div>

      {showResult && (
        <>
          <FeedbackBanner
            correct={selectedAnswer === q.correct}
            explanation={q.explanation}
          />
          <ActionButton onClick={nextQuestion} disabled={completing} color={color}>
            {currentQuestion < questions.length - 1
              ? 'Próxima →'
              : completing ? 'Finalizando…' : 'Finalizar ✓'}
          </ActionButton>
        </>
      )}
    </div>
  );
}

function LacunaActivity({
  content, color, completing, onComplete,
}: { content: LacunaContent; color: string; completing: boolean; onComplete: (score: number) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const parts = content.sentence.split('___');
  const isCorrect = selected === content.correct;

  function confirm() {
    if (selected === null) return;
    setConfirmed(true);
  }

  return (
    <div>
      {/* Sentence with blank */}
      <div className="bg-cream-50 rounded-xl p-4 mb-5 text-sm text-uni-text-800 leading-relaxed">
        {parts[0]}
        <span
          className="inline-block px-3 py-0.5 mx-1 rounded-lg font-bold border-b-2 transition-all text-sm"
          style={{
            minWidth: 80,
            textAlign: 'center',
            borderColor: confirmed
              ? (isCorrect ? '#16a34a' : '#dc2626')
              : color,
            background: confirmed
              ? (isCorrect ? '#f0fdf4' : '#fff1f2')
              : `${color}15`,
            color: confirmed
              ? (isCorrect ? '#15803d' : '#b91c1c')
              : color,
          }}
        >
          {selected !== null ? content.options[selected] : '___'}
        </span>
        {parts[1]}
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-2 mb-4">
        {content.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => { if (!confirmed) setSelected(i); }}
            disabled={confirmed}
            className="px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95"
            style={{
              background: selected === i ? color : 'white',
              color: selected === i ? 'white' : '#374151',
              borderColor: selected === i ? color : '#d1d5db',
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {confirmed && (
        <>
          <FeedbackBanner correct={isCorrect} explanation={content.explanation} />
          <ActionButton
            onClick={() => onComplete(isCorrect ? 1 : 0)}
            disabled={completing}
            color={color}
          >
            {completing ? 'Salvando…' : 'Continuar →'}
          </ActionButton>
        </>
      )}

      {!confirmed && (
        <ActionButton
          onClick={confirm}
          disabled={selected === null || completing}
          color={color}
        >
          Confirmar
        </ActionButton>
      )}
    </div>
  );
}

function VerdadeiroFalsoActivity({
  content, color, completing, onComplete,
}: { content: VerdadeiroFalsoContent; color: string; completing: boolean; onComplete: (score: number) => void }) {
  const [answered, setAnswered] = useState<boolean | null>(null);

  const isCorrect = answered === content.correct;

  return (
    <div>
      <div className="bg-cream-50 rounded-2xl p-5 mb-6 text-center">
        <p className="text-base font-semibold text-uni-text-900 leading-snug">
          {content.statement}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {([true, false] as const).map(val => {
          const label = val ? '✓ Verdadeiro' : '✗ Falso';
          const isSelected = answered === val;
          const showFeedback = answered !== null;

          let bg = '#f9fafb';
          let border = '#d1d5db';
          let textColor = '#374151';

          if (showFeedback && isSelected) {
            bg = isCorrect ? '#f0fdf4' : '#fff1f2';
            border = isCorrect ? '#86efac' : '#fda4af';
            textColor = isCorrect ? '#166534' : '#881337';
          } else if (!showFeedback) {
            bg = 'white';
          }

          return (
            <button
              key={String(val)}
              onClick={() => { if (answered === null) setAnswered(val); }}
              disabled={answered !== null}
              className="py-4 rounded-2xl border-2 text-sm font-bold transition-all active:scale-95"
              style={{ background: bg, borderColor: border, color: textColor }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {answered !== null && (
        <>
          <FeedbackBanner correct={isCorrect} explanation={content.explanation} />
          <ActionButton
            onClick={() => onComplete(isCorrect ? 1 : 0)}
            disabled={completing}
            color={color}
          >
            {completing ? 'Salvando…' : 'Continuar →'}
          </ActionButton>
        </>
      )}
    </div>
  );
}

function OrdenarActivity({
  content, color, completing, onComplete,
}: { content: OrdenarContent; color: string; completing: boolean; onComplete: (score: number) => void }) {
  const [order, setOrder] = useState<number[]>(() => content.items.map((_, i) => i));
  const [submitted, setSubmitted] = useState(false);

  function moveUp(pos: number) {
    if (pos === 0 || submitted) return;
    const next = [...order];
    [next[pos - 1], next[pos]] = [next[pos], next[pos - 1]];
    setOrder(next);
  }

  function moveDown(pos: number) {
    if (pos === order.length - 1 || submitted) return;
    const next = [...order];
    [next[pos], next[pos + 1]] = [next[pos + 1], next[pos]];
    setOrder(next);
  }

  function checkOrder() {
    setSubmitted(true);
  }

  // Check if order matches correct_order
  const isCorrect = order.every((itemIdx, pos) => content.correct_order[pos] === itemIdx);

  return (
    <div>
      <p className="text-xs text-uni-text-400 mb-3">Arraste ou use as setas para ordenar os itens corretamente:</p>

      <div className="space-y-2 mb-4">
        {order.map((itemIdx, pos) => {
          const isInPlace = submitted && content.correct_order[pos] === itemIdx;
          const isWrong = submitted && content.correct_order[pos] !== itemIdx;

          return (
            <div
              key={itemIdx}
              className="flex items-center gap-2 rounded-xl border px-3 py-3 transition-all"
              style={{
                borderColor: submitted ? (isInPlace ? '#86efac' : '#fda4af') : '#e5e7eb',
                background: submitted ? (isInPlace ? '#f0fdf4' : '#fff1f2') : 'white',
              }}
            >
              <span
                className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}20`, color }}
              >
                {pos + 1}
              </span>
              <span className="flex-1 text-sm text-uni-text-800">{content.items[itemIdx]}</span>
              {!submitted && (
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveUp(pos)}
                    disabled={pos === 0}
                    className="text-uni-text-400 hover:text-uni-text-700 disabled:opacity-20 text-base leading-none px-1"
                    aria-label="Mover para cima"
                  >▲</button>
                  <button
                    onClick={() => moveDown(pos)}
                    disabled={pos === order.length - 1}
                    className="text-uni-text-400 hover:text-uni-text-700 disabled:opacity-20 text-base leading-none px-1"
                    aria-label="Mover para baixo"
                  >▼</button>
                </div>
              )}
              {submitted && (isInPlace ? <span className="text-green-500">✓</span> : <span className="text-red-400">✗</span>)}
            </div>
          );
        })}
      </div>

      {submitted && (
        <>
          <div
            className="rounded-xl p-3 text-sm mb-4"
            style={{
              background: isCorrect ? '#f0fdf4' : '#fff1f2',
              border: `1px solid ${isCorrect ? '#86efac' : '#fda4af'}`,
              color: isCorrect ? '#166534' : '#881337',
            }}
          >
            {isCorrect ? '🎉 Ordem correta!' : `💡 ${content.explanation}`}
          </div>
          <ActionButton
            onClick={() => onComplete(isCorrect ? 1 : 0)}
            disabled={completing}
            color={color}
          >
            {completing ? 'Salvando…' : 'Continuar →'}
          </ActionButton>
        </>
      )}

      {!submitted && (
        <ActionButton onClick={checkOrder} color={color}>
          Confirmar ordem
        </ActionButton>
      )}
    </div>
  );
}

function ParearActivity({
  content, color, completing, onComplete,
}: { content: ParearContent; color: string; completing: boolean; onComplete: (score: number) => void }) {
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>({}); // leftIdx → rightIdx
  const [checked, setChecked] = useState(false);

  const pairs = content.pairs || [];

  // Shuffle right column indices for display
  const [rightOrder] = useState<number[]>(() => {
    return createMixedOrder(pairs.length);
  });

  function handleLeftClick(leftIdx: number) {
    if (checked) return;
    setSelectedLeft(prev => prev === leftIdx ? null : leftIdx);
  }

  function handleRightClick(rightIdx: number) {
    if (checked || selectedLeft === null) return;
    setMatches(prev => ({ ...prev, [selectedLeft]: rightIdx }));
    setSelectedLeft(null);
  }

  function checkMatches() {
    setChecked(true);
  }

  function clearMatches() {
    if (checked) return;
    setMatches({});
    setSelectedLeft(null);
  }

  const correctCount = Object.entries(matches).filter(
    ([leftIdx, rightIdx]) => parseInt(leftIdx) === rightIdx
  ).length;
  const allCorrect = checked && correctCount === pairs.length;
  const allMatched = Object.keys(matches).length === pairs.length;

  // Color palette for matched pairs
  const matchColors = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#F43F5E'];
  const pairCount = pairs.length;

  function getMatchColor(leftIdx: number) {
    const keys = Object.keys(matches).map(Number);
    const pos = keys.indexOf(leftIdx);
    return pos >= 0 ? matchColors[pos % matchColors.length] : null;
  }

  function renderLeftTile(pair: { left: string }, leftIdx: number) {
    const matchedColor = getMatchColor(leftIdx);
    const isSelected = selectedLeft === leftIdx;
    const isCorrectMatch = checked && matches[leftIdx] === leftIdx;
    const isWrongMatch = checked && matches[leftIdx] !== undefined && matches[leftIdx] !== leftIdx;
    const borderColor = isSelected
      ? color
      : matchedColor
      ? matchedColor
      : checked
      ? (isCorrectMatch ? '#86efac' : isWrongMatch ? '#fda4af' : '#e5e7eb')
      : '#e5e7eb';
    const background = isSelected
      ? `${color}10`
      : matchedColor
      ? `${matchedColor}15`
      : checked
      ? (isCorrectMatch ? '#f0fdf4' : isWrongMatch ? '#fff1f2' : 'white')
      : 'white';
    return (
      <button
        key={`left-${leftIdx}`}
        onClick={() => handleLeftClick(leftIdx)}
        disabled={checked}
        className="w-full text-left px-3 py-3.5 rounded-2xl border-2 text-sm font-normal transition-all active:scale-95"
        style={{ borderColor, background, color: '#1f2937' }}
      >
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ background: `${color}18`, color }}
          >
            {leftIdx + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-uni-text-900 leading-relaxed">{pair.left}</p>
            <p className="text-[11px] text-uni-text-500 mt-1">Toque para escolher a resposta correspondente.</p>
          </div>
        </div>
      </button>
    );
  }

  function renderRightTile(rightIdx: number) {
    const pair = pairs[rightIdx];
    const matchedByLeft = Object.keys(matches).find(k => matches[parseInt(k)] === rightIdx);
    const matchedColor = matchedByLeft !== undefined ? getMatchColor(parseInt(matchedByLeft)) : null;
    const isCorrectHere = checked && matchedByLeft !== undefined && parseInt(matchedByLeft) === rightIdx;
    const borderColor = matchedColor
      ? matchedColor
      : checked
      ? (isCorrectHere ? '#86efac' : '#fda4af')
      : '#e5e7eb';
    const background = matchedColor
      ? `${matchedColor}10`
      : checked
      ? (isCorrectHere ? '#f0fdf4' : '#fff1f2')
      : 'white';
    return (
      <button
        key={`right-${rightIdx}`}
        onClick={() => handleRightClick(rightIdx)}
        disabled={checked || (Object.values(matches).includes(rightIdx) && selectedLeft === null)}
        className="w-full text-left px-3 py-4 rounded-2xl border-2 text-sm font-normal transition-all active:scale-95 flex flex-col gap-2"
        style={{ borderColor, background, color: '#1f2937' }}
      >
        <p className="text-sm leading-relaxed">{pair.right}</p>
        <p className="text-[11px] text-uni-text-400">
          {matchedByLeft !== undefined
            ? `Ligado a “${pairs[parseInt(matchedByLeft)]?.left}”`
            : 'Toque para conectar com o card da esquerda.'}
        </p>
      </button>
    );
  }

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-border-1 bg-white/90 p-4 space-y-2">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-uni-text-400">Parear</p>
        <p className="text-sm text-uni-text-700 leading-relaxed">
          A esquerda voce vera uma pergunta, uma afirmacao clinica, um ponto-chave e uma reflexao pratica. Conecte cada uma com a resposta certa na direita.
        </p>
        <p className="text-[11px] text-uni-text-400">
          {Object.keys(matches).length}/{pairCount} conectados
        </p>
      </div>

      <div className="grid gap-4 mb-4 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-uni-text-500">Coluna esquerda</p>
          {pairs.map((pair, idx) => renderLeftTile(pair, idx))}
        </div>
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-uni-text-500">Coluna direita</p>
          {rightOrder.map(renderRightTile)}
        </div>
      </div>

      <div className="mb-4 text-xs text-uni-text-400">
        {!allMatched
          ? 'Conecte os 4 pares para revisar o tema completo.'
          : 'Tudo conectado. Agora verifique se cada ligacao realmente faz sentido.'}
      </div>

      {checked && (
        <>
          <div
            className="rounded-2xl p-3 text-sm mb-4 text-center font-bold"
            style={{
              background: allCorrect ? '#f0fdf4' : '#fff1f2',
              border: `1px solid ${allCorrect ? '#86efac' : '#fda4af'}`,
              color: allCorrect ? '#166534' : '#881337',
            }}
          >
            {allCorrect ? '🎉 Todos corretos!' : `${correctCount}/${pairs.length} pares certos`}
          </div>
          <ActionButton
            onClick={() => onComplete(correctCount === pairs.length ? 1 : 0)}
            disabled={completing}
            color={color}
          >
            {completing ? 'Salvando…' : 'Continuar →'}
          </ActionButton>
        </>
      )}

      {!checked && (
        <div className="space-y-2">
          <ActionButton
            onClick={checkMatches}
            disabled={!allMatched}
            color={color}
          >
            Verificar pares
          </ActionButton>
          <button
            onClick={clearMatches}
            disabled={Object.keys(matches).length === 0}
            className="w-full py-2.5 rounded-xl text-sm font-semibold border border-border-1 text-uni-text-600 bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Limpar pares
          </button>
        </div>
      )}
    </div>
  );
}

function HistoriaActivity({
  content, color, completing, onComplete,
}: { content: HistoriaContent; color: string; completing: boolean; onComplete: (score: number) => void }) {
  const [chosen, setChosen] = useState<number | null>(null);

  function handleChoice(idx: number) {
    if (chosen !== null) return;
    setChosen(idx);
  }

  const choice = chosen !== null ? content.choices[chosen] : null;

  return (
    <div>
      {/* Scenario */}
      <div
        className="rounded-2xl p-4 mb-5 text-sm leading-relaxed text-uni-text-700"
        style={{ background: `${color}10`, borderLeft: `3px solid ${color}` }}
      >
        <p className="font-semibold text-uni-text-900 mb-1 text-xs uppercase tracking-wide" style={{ color }}>Cenário</p>
        {content.scenario}
      </div>

      {/* Choices */}
      {chosen === null && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-uni-text-500 mb-2">O que você faria?</p>
          {content.choices.map((c, i) => (
            <button
              key={i}
              onClick={() => handleChoice(i)}
              className="w-full text-left px-4 py-3 rounded-xl border border-border-1 text-sm text-uni-text-800 hover:bg-cream-50 active:scale-[0.99] transition-all"
            >
              {c.text}
            </button>
          ))}
        </div>
      )}

      {/* Result */}
      {choice !== null && (
        <>
          <div
            className="rounded-xl p-4 text-sm mb-4"
            style={{
              background: choice.correct ? '#f0fdf4' : '#fff7ed',
              border: `1px solid ${choice.correct ? '#86efac' : '#fed7aa'}`,
              color: choice.correct ? '#166534' : '#9a3412',
            }}
          >
            <p className="font-bold mb-1">{choice.correct ? '🌟 Ótima escolha!' : '💡 Boa reflexão!'}</p>
            <p>{choice.feedback}</p>
            {choice.correct && (
              <p className="text-xs mt-2 font-bold" style={{ color }}>Bônus: +XP extra ganho!</p>
            )}
          </div>

          <ActionButton
            onClick={() => onComplete(choice.correct ? 1 : 0)}
            disabled={completing}
            color={color}
          >
            {completing ? 'Salvando…' : 'Continuar →'}
          </ActionButton>
        </>
      )}
    </div>
  );
}

function FlashcardActivity({
  content, color, completing, onComplete,
}: { content: FlashcardContent; color: string; completing: boolean; onComplete: (score: number, knew: boolean) => void }) {
  const [flipped, setFlipped] = useState(false);
  const [decided, setDecided] = useState(false);

  return (
    <div>
      {/* Card */}
      <div
        className="rounded-2xl cursor-pointer select-none mb-4 transition-all duration-300"
        onClick={() => !flipped && setFlipped(true)}
        style={{ minHeight: 140 }}
      >
        {!flipped ? (
          <div
            className="rounded-2xl p-6 text-center flex flex-col items-center justify-center"
            style={{ background: `${color}12`, border: `2px dashed ${color}40`, minHeight: 140 }}
          >
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color }}>Frente</p>
            <p className="text-base font-semibold text-uni-text-900 leading-snug">{content.front}</p>
            <p className="text-xs text-uni-text-400 mt-3">Toque para virar o card ↓</p>
          </div>
        ) : (
          <div
            className="rounded-2xl p-6 text-center flex flex-col items-center justify-center animate-[fadeIn_0.25s_ease]"
            style={{ background: `${color}20`, border: `2px solid ${color}50`, minHeight: 140 }}
          >
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color }}>Verso</p>
            <p className="text-sm text-uni-text-700 leading-relaxed">{content.back}</p>
          </div>
        )}
      </div>

      {!flipped && (
        <button
          onClick={() => setFlipped(true)}
          className="w-full py-3 rounded-xl border-2 font-bold text-sm transition-all active:scale-95"
          style={{ borderColor: color, color }}
        >
          Virar card
        </button>
      )}

      {flipped && !decided && (
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            onClick={() => { setDecided(true); onComplete(1, true); }}
            disabled={completing}
            className="py-3 rounded-xl border-2 font-bold text-sm transition-all active:scale-95"
            style={{ borderColor: '#10B981', color: '#10B981', background: '#f0fdf4' }}
          >
            😎 Já sabia
          </button>
          <button
            onClick={() => { setDecided(true); onComplete(1, false); }}
            disabled={completing}
            className="py-3 rounded-xl border-2 font-bold text-sm transition-all active:scale-95"
            style={{ borderColor: color, color, background: `${color}10` }}
          >
            🆕 Aprendi agora
          </button>
        </div>
      )}

      {decided && (
        <div className="text-center py-3">
          <p className="text-sm text-uni-text-500">{completing ? 'Salvando…' : '✓ Registrado!'}</p>
        </div>
      )}
    </div>
  );
}

function ImagemActivity({
  content, color, completing, onComplete,
}: { content: ImagemContent; color: string; completing: boolean; onComplete: (score: number) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const isCorrect = selected === content.correct;

  return (
    <div>
      <p className="text-sm font-semibold text-uni-text-900 mb-4 leading-snug">{content.question}</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {content.options.map((opt, i) => {
          const isSelected = selected === i;
          const showFeedback = confirmed;
          const isRight = i === content.correct;
          const isWrong = showFeedback && isSelected && !isRight;

          return (
            <button
              key={i}
              onClick={() => { if (!confirmed) setSelected(i); }}
              disabled={confirmed}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 py-5 text-center transition-all active:scale-95"
              style={{
                borderColor: showFeedback
                  ? (isRight ? '#86efac' : isWrong ? '#fda4af' : '#e5e7eb')
                  : isSelected ? color : '#e5e7eb',
                background: showFeedback
                  ? (isRight ? '#f0fdf4' : isWrong ? '#fff1f2' : 'white')
                  : isSelected ? `${color}15` : 'white',
              }}
            >
              <span className="text-4xl">{opt.emoji}</span>
              <span className="text-xs font-medium text-uni-text-700">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {confirmed && (
        <>
          <FeedbackBanner correct={isCorrect} explanation={content.explanation} />
          <ActionButton
            onClick={() => onComplete(isCorrect ? 1 : 0)}
            disabled={completing}
            color={color}
          >
            {completing ? 'Salvando…' : 'Continuar →'}
          </ActionButton>
        </>
      )}

      {!confirmed && (
        <ActionButton
          onClick={() => setConfirmed(true)}
          disabled={selected === null}
          color={color}
        >
          Confirmar
        </ActionButton>
      )}
    </div>
  );
}

function DesafioDiaActivity({
  content, color, xpReward, completing, onComplete,
}: { content: DesafioDiaContent; color: string; xpReward: number; completing: boolean; onComplete: () => void }) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div>
      {/* XP highlight */}
      <div
        className="flex items-center justify-center gap-2 rounded-xl py-3 mb-4 text-white font-bold text-sm"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
      >
        🏆 Complete e ganhe <span className="text-lg">+{xpReward} XP</span>
      </div>

      {/* Challenge card */}
      <div className="bg-cream-50 rounded-2xl p-4 mb-4">
        <p className="text-sm font-bold text-uni-text-900 mb-2">Desafio:</p>
        <p className="text-sm text-uni-text-700 leading-relaxed mb-3">{content.challenge}</p>
        {content.tip && (
          <p className="text-xs text-uni-text-500 bg-white rounded-lg p-2">
            💡 Dica: {content.tip}
          </p>
        )}
      </div>

      {/* Motivation */}
      <p className="text-xs text-center text-uni-text-500 italic mb-5">{content.motivation}</p>

      {!accepted ? (
        <ActionButton
          onClick={() => setAccepted(true)}
          color={color}
        >
          🎯 Aceitar desafio
        </ActionButton>
      ) : (
        <div className="space-y-3">
          <div
            className="rounded-xl p-3 text-sm text-center font-medium"
            style={{ background: `${color}15`, color }}
          >
            Ótimo! Realize o desafio e marque como concluído.
          </div>
          <ActionButton
            onClick={onComplete}
            disabled={completing}
            color={color}
          >
            {completing ? 'Salvando…' : '✅ Desafio Concluído!'}
          </ActionButton>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DailyLesson({ onComplete: onCompleteProp }: DailyLessonProps = {}) {
  const { data, mutate } = useSWR('/api/gamification/daily-lesson', fetcher, { revalidateOnFocus: false });
  const [completing, setCompleting] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);

  const lesson: Lesson | undefined = data?.lesson;
  const lessonPath: Lesson[] = data?.path ?? (lesson ? [lesson] : []);
  const pathProgress = data?.pathProgress ?? {
    completed: lessonPath.filter((l) => !!l.user_completed).length,
    total: lessonPath.length,
    remaining: lessonPath.filter((l) => !l.user_completed).length,
  };
  const alreadyDone: boolean = lessonPath.length > 0 && pathProgress.remaining === 0;

  const themeColor = lesson ? (THEME_COLORS[lesson.theme] || THEME_COLORS.geral) : THEME_COLORS.geral;
  const themeEmoji = lesson ? (THEME_EMOJIS[lesson.theme] || THEME_EMOJIS.geral) : THEME_EMOJIS.geral;

  const handleComplete = useCallback(async (score: number = 1, extra?: boolean) => {
    if (!lesson || completing) return;
    setCompleting(true);
    try {
      await fetch('/api/gamification/daily-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          score,
          ...(extra !== undefined ? { knew_already: extra } : {}),
        }),
      });
      const earned = lesson.xp_reward;
      setXpEarned(earned);
      setJustCompleted(true);
      await mutate();
      onCompleteProp?.(lesson.id, earned);
    } catch {}
    setTimeout(() => setJustCompleted(false), 1400);
    setCompleting(false);
  }, [lesson, completing, mutate, onCompleteProp]);

  // ── Loading state ──
  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-border-1 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-20 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── No lesson available ──
  if (!lesson && !alreadyDone) {
    return (
      <div className="bg-white rounded-2xl border border-border-1 p-6 text-center">
        <div className="text-4xl mb-2">🎉</div>
        <h3 className="font-display font-bold text-uni-text-900">Lição do Dia</h3>
        <p className="text-sm text-uni-text-400 mt-1">Nenhuma lição disponível hoje. Volte amanhã!</p>
      </div>
    );
  }

  // ── Already done ──
  if (alreadyDone) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: `linear-gradient(135deg, #f0fdf4, #ecfdf5)`, border: '1px solid #86efac' }}
      >
        <div className="text-4xl mb-2">🎉</div>
        <h3 className="font-display font-bold text-green-800">Lição Concluída!</h3>
        <p className="text-sm text-green-600 mt-1">
          +{xpEarned || 0} XP ganhos hoje
        </p>
        <p className="text-xs text-green-500 mt-0.5">Volte amanhã para uma nova lição!</p>
      </div>
    );
  }

  if (!lesson) return null;

  const parsedContent = parseContent(lesson);

  return (
    <div className="bg-white rounded-2xl border border-border-1 overflow-hidden">
      {lessonPath.length > 1 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-uni-text-500 uppercase tracking-wider">Trilha do dia</p>
            <p className="text-[11px] font-bold text-uni-text-400">{pathProgress.completed}/{pathProgress.total}</p>
          </div>
          <div className="flex items-center gap-2">
            {lessonPath.map((l: Lesson, idx: number) => {
              const isCompleted = !!l.user_completed;
              const isCurrent = lesson?.id === l.id;
              return (
                <div key={l.id || idx} className="flex items-center gap-2 flex-1">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border-2"
                    style={{
                      background: isCompleted ? '#ecfdf5' : isCurrent ? `${themeColor}20` : '#fff',
                      borderColor: isCompleted ? '#86efac' : isCurrent ? themeColor : '#e5e7eb',
                      color: isCompleted ? '#16a34a' : isCurrent ? themeColor : '#9ca3af',
                    }}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  {idx < lessonPath.length - 1 && (
                    <div className="h-1 flex-1 rounded-full" style={{ background: isCompleted ? '#86efac' : '#e5e7eb' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* ── Header ── */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ background: `${themeColor}12`, borderBottom: `2px solid ${themeColor}25` }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: `${themeColor}20` }}
        >
          {TYPE_ICONS[lesson.type] || '📖'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: themeColor }}>
            {themeEmoji} {TYPE_LABELS[lesson.type] || 'Lição'}
          </p>
          <h3 className="font-display font-bold text-uni-text-900 text-sm leading-tight truncate">
            {lesson.title}
          </h3>
        </div>
        <div className="text-right flex-shrink-0">
          <XPBadge xp={lesson.xp_reward} color={themeColor} />
          {lesson.duration_seconds && (
            <p className="text-[10px] text-uni-text-300 mt-0.5">
              ~{Math.ceil(lesson.duration_seconds / 60)} min
            </p>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-4">
        {justCompleted && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            +{xpEarned} XP registrado. Carregando proxima licao...
          </div>
        )}
        {lesson.type === 'pilula' && (
          <PilulaActivity
            content={parsedContent as unknown as PilulaContent}
            color={themeColor}
            completing={completing}
            onComplete={() => handleComplete(1)}
          />
        )}

        {lesson.type === 'reflexao' && (
          <ReflexaoActivity
            content={parsedContent as unknown as ReflexaoContent}
            color={themeColor}
            completing={completing}
            onComplete={() => handleComplete(1)}
          />
        )}

        {lesson.type === 'quiz' && (
          <QuizActivity
            content={parsedContent as unknown as QuizContent}
            color={themeColor}
            completing={completing}
            onComplete={(score) => handleComplete(score)}
          />
        )}

        {lesson.type === 'lacuna' && (
          <LacunaActivity
            content={parsedContent as unknown as LacunaContent}
            color={themeColor}
            completing={completing}
            onComplete={(score) => handleComplete(score)}
          />
        )}

        {lesson.type === 'verdadeiro_falso' && (
          <VerdadeiroFalsoActivity
            content={parsedContent as unknown as VerdadeiroFalsoContent}
            color={themeColor}
            completing={completing}
            onComplete={(score) => handleComplete(score)}
          />
        )}

        {lesson.type === 'ordenar' && (
          <OrdenarActivity
            content={parsedContent as unknown as OrdenarContent}
            color={themeColor}
            completing={completing}
            onComplete={(score) => handleComplete(score)}
          />
        )}

        {lesson.type === 'parear' && (
          <ParearActivity
            content={parsedContent as unknown as ParearContent}
            color={themeColor}
            completing={completing}
            onComplete={(score) => handleComplete(score)}
          />
        )}

        {lesson.type === 'historia' && (
          <HistoriaActivity
            content={parsedContent as unknown as HistoriaContent}
            color={themeColor}
            completing={completing}
            onComplete={(score) => handleComplete(score)}
          />
        )}

        {lesson.type === 'flashcard' && (
          <FlashcardActivity
            content={parsedContent as unknown as FlashcardContent}
            color={themeColor}
            completing={completing}
            onComplete={(score, knew) => handleComplete(score, knew)}
          />
        )}

        {lesson.type === 'imagem' && (
          <ImagemActivity
            content={parsedContent as unknown as ImagemContent}
            color={themeColor}
            completing={completing}
            onComplete={(score) => handleComplete(score)}
          />
        )}

        {lesson.type === 'desafio_dia' && (
          <DesafioDiaActivity
            content={parsedContent as unknown as DesafioDiaContent}
            color={themeColor}
            xpReward={lesson.xp_reward}
            completing={completing}
            onComplete={() => handleComplete(1)}
          />
        )}

        {/* Fallback for unknown types */}
        {!['pilula','reflexao','quiz','lacuna','verdadeiro_falso','ordenar','parear','historia','flashcard','imagem','desafio_dia'].includes(lesson.type) && (
          <div className="text-center py-6">
            <p className="text-sm text-uni-text-500">Tipo de atividade não reconhecido.</p>
            <ActionButton onClick={() => handleComplete(1)} disabled={completing} color={themeColor}>
              Marcar como concluído
            </ActionButton>
          </div>
        )}
      </div>
    </div>
  );
}
