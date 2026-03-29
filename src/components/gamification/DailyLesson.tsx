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
}

interface DailyLessonProps {
  onComplete?: (lessonId: string, xpEarned: number) => void;
}

// ─── Content shape per type ──────────────────────────────────────────────────

interface QuizContent {
  questions: { question: string; options: string[]; correct: number; explanation: string }[];
}
interface PilulaContent { tip: string; }
interface ReflexaoContent { reflection: string; }
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

// ─── Helper ──────────────────────────────────────────────────────────────────

function parseContent(lesson: Lesson): Record<string, unknown> {
  try {
    const raw = lesson.content_json || lesson.content;
    let parsed: Record<string, unknown> = {};
    if (typeof raw === 'string') parsed = JSON.parse(raw);
    else if (raw && typeof raw === 'object') parsed = raw as Record<string, unknown>;

    // Normalize imagem: seed uses { images: [{label, value, correct: bool}] }
    // Component expects { options: [{emoji, label}], correct: number }
    if (lesson.type === 'imagem' && Array.isArray(parsed.images) && !parsed.options) {
      const images = parsed.images as { label: string; value?: string; emoji?: string; correct: boolean }[];
      parsed.options = images.map(img => ({ emoji: img.emoji || '🍽️', label: img.label + (img.value ? `\n${img.value}` : '') }));
      parsed.correct = images.findIndex(img => img.correct);
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
  return (
    <div>
      <p className="text-sm text-uni-text-700 leading-relaxed italic mb-3">"{content.reflection}"</p>
      <p className="text-xs text-uni-text-400 mb-6">Reserve 30 segundos para refletir sobre isso. 🧘</p>
      <ActionButton onClick={onComplete} disabled={completing} color={color}>
        {completing ? 'Salvando…' : 'Refleti ✓'}
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
    const arr = pairs.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
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

  const correctCount = Object.entries(matches).filter(
    ([leftIdx, rightIdx]) => parseInt(leftIdx) === rightIdx
  ).length;
  const allCorrect = checked && correctCount === pairs.length;
  const allMatched = Object.keys(matches).length === pairs.length;

  // Color palette for matched pairs
  const matchColors = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#F43F5E'];

  function getMatchColor(leftIdx: number) {
    const keys = Object.keys(matches).map(Number);
    const pos = keys.indexOf(leftIdx);
    return pos >= 0 ? matchColors[pos % matchColors.length] : null;
  }

  return (
    <div>
      <p className="text-xs text-uni-text-400 mb-3">Clique em um item da esquerda, depois conecte com o da direita:</p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {/* Left column */}
        <div className="space-y-2">
          {pairs.map((pair, leftIdx) => {
            const matchedColor = getMatchColor(leftIdx);
            const isSelected = selectedLeft === leftIdx;
            const isCorrectMatch = checked && matches[leftIdx] === leftIdx;
            const isWrongMatch = checked && matches[leftIdx] !== undefined && matches[leftIdx] !== leftIdx;

            return (
              <button
                key={leftIdx}
                onClick={() => handleLeftClick(leftIdx)}
                disabled={checked}
                className="w-full text-left px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition-all active:scale-95"
                style={{
                  borderColor: isSelected
                    ? color
                    : matchedColor
                    ? matchedColor
                    : checked
                    ? (isCorrectMatch ? '#86efac' : isWrongMatch ? '#fda4af' : '#e5e7eb')
                    : '#e5e7eb',
                  background: isSelected
                    ? `${color}15`
                    : matchedColor
                    ? `${matchedColor}15`
                    : checked
                    ? (isCorrectMatch ? '#f0fdf4' : isWrongMatch ? '#fff1f2' : 'white')
                    : 'white',
                  color: '#374151',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {pair.left}
              </button>
            );
          })}
        </div>

        {/* Right column (shuffled) */}
        <div className="space-y-2">
          {rightOrder.map(rightIdx => {
            const isMatched = Object.values(matches).includes(rightIdx);
            const matchedByLeft = Object.keys(matches).find(k => matches[parseInt(k)] === rightIdx);
            const matchedColor = matchedByLeft !== undefined ? getMatchColor(parseInt(matchedByLeft)) : null;
            const isCorrectHere = checked && matches[rightIdx] === rightIdx;
            const isWrongHere = checked && isMatched && matches[rightIdx] !== rightIdx;

            return (
              <button
                key={rightIdx}
                onClick={() => handleRightClick(rightIdx)}
                disabled={checked || (isMatched && selectedLeft === null)}
                className="w-full text-left px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition-all active:scale-95"
                style={{
                  borderColor: matchedColor
                    ? matchedColor
                    : checked
                    ? (isCorrectHere ? '#86efac' : isWrongHere ? '#fda4af' : '#e5e7eb')
                    : selectedLeft !== null ? `${color}60` : '#e5e7eb',
                  background: matchedColor
                    ? `${matchedColor}15`
                    : checked
                    ? (isCorrectHere ? '#f0fdf4' : isWrongHere ? '#fff1f2' : 'white')
                    : selectedLeft !== null ? `${color}08` : 'white',
                  color: '#374151',
                }}
              >
                {pairs[rightIdx].right}
              </button>
            );
          })}
        </div>
      </div>

      {checked && (
        <>
          <div
            className="rounded-xl p-3 text-sm mb-4 text-center font-bold"
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
        <ActionButton
          onClick={checkMatches}
          disabled={!allMatched}
          color={color}
        >
          Verificar pares
        </ActionButton>
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
  const [completed, setCompleted] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const lesson: Lesson | undefined = data?.lesson;
  const alreadyDone: boolean = data?.completed ?? false;

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
          lesson_id: lesson.id,
          score,
          ...(extra !== undefined ? { knew_already: extra } : {}),
        }),
      });
      const earned = lesson.xp_reward;
      setXpEarned(earned);
      setCompleted(true);
      mutate();
      onCompleteProp?.(lesson.id, earned);
    } catch {}
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
  if (!lesson) {
    return (
      <div className="bg-white rounded-2xl border border-border-1 p-6 text-center">
        <div className="text-4xl mb-2">🎉</div>
        <h3 className="font-display font-bold text-uni-text-900">Lição do Dia</h3>
        <p className="text-sm text-uni-text-400 mt-1">Nenhuma lição disponível hoje. Volte amanhã!</p>
      </div>
    );
  }

  // ── Already done ──
  if (alreadyDone || completed) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: `linear-gradient(135deg, #f0fdf4, #ecfdf5)`, border: '1px solid #86efac' }}
      >
        <div className="text-4xl mb-2">🎉</div>
        <h3 className="font-display font-bold text-green-800">Lição Concluída!</h3>
        <p className="text-sm text-green-600 mt-1">
          +{xpEarned || lesson.xp_reward} XP ganhos hoje
        </p>
        <p className="text-xs text-green-500 mt-0.5">Volte amanhã para uma nova lição!</p>
      </div>
    );
  }

  const parsedContent = parseContent(lesson);

  return (
    <div className="bg-white rounded-2xl border border-border-1 overflow-hidden">
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
