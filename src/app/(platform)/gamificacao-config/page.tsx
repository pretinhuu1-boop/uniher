'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import styles from './gamificacao-config.module.css';

const LESSON_TYPES = [
  'pilula',
  'quiz',
  'reflexao',
  'lacuna',
  'verdadeiro_falso',
  'ordenar',
  'parear',
  'historia',
  'flashcard',
  'imagem',
  'desafio_dia',
] as const;

const LESSON_THEMES = ['hidratacao', 'sono', 'prevencao', 'nutricao', 'mental', 'ciclo', 'geral'] as const;

type LessonType = (typeof LESSON_TYPES)[number];
type LessonTheme = (typeof LESSON_THEMES)[number];

type Lesson = {
  id: string;
  title: string;
  description: string;
  type: LessonType;
  theme: LessonTheme;
  week_number: number;
  day_of_week: number;
  order_index: number;
  duration_seconds: number;
  active: number;
  campaign_context: string | null;
  content_json: Record<string, unknown> | null;
  isGlobal: boolean;
  isValidated: boolean;
  canManage: boolean;
  validation_notes?: string | null;
};

type LessonsResponse = {
  lessons: Lesson[];
  total: number;
  totalPages: number;
};

type LessonForm = {
  title: string;
  description: string;
  type: LessonType;
  theme: LessonTheme;
  week_number: string;
  day_of_week: string;
  order_index: string;
  duration_seconds: string;
  campaign_context: string;
  contentText: string;
  validated: boolean;
  validation_notes: string;
};

const TYPE_LABELS: Record<LessonType, string> = {
  pilula: 'Pilula educativa',
  quiz: 'Quiz',
  reflexao: 'Reflexao',
  lacuna: 'Lacuna',
  verdadeiro_falso: 'Verdadeiro ou falso',
  ordenar: 'Ordenar',
  parear: 'Parear',
  historia: 'Historia',
  flashcard: 'Flashcard',
  imagem: 'Imagem',
  desafio_dia: 'Desafio do dia',
};

const THEME_LABELS: Record<LessonTheme, string> = {
  hidratacao: 'Hidratacao',
  sono: 'Sono',
  prevencao: 'Prevencao',
  nutricao: 'Nutricao',
  mental: 'Saude mental',
  ciclo: 'Ciclo',
  geral: 'Geral',
};

const CONTENT_TEMPLATES: Record<LessonType, Record<string, unknown>> = {
  pilula: {
    tip: 'Escreva uma orientacao curta e pratica.',
    fact: 'Inclua um fato educativo verificavel.',
    action: 'Sugira uma acao simples para hoje.',
  },
  quiz: {
    question: 'Pergunta educativa',
    options: ['Opcao A', 'Opcao B', 'Opcao C', 'Opcao D'],
    correct: 0,
    explanation: 'Explique a resposta correta.',
  },
  reflexao: {
    reflection: 'Qual cuidado simples voce quer priorizar hoje?',
  },
  lacuna: {
    text: 'Beber agua ajuda a manter ____ ao longo do dia.',
    options: ['energia', 'tensao', 'pressa', 'isolamento'],
    correct: 0,
  },
  verdadeiro_falso: {
    statement: 'Pausas curtas podem apoiar foco e bem-estar.',
    correct: true,
    explanation: 'Explique por que a afirmacao e verdadeira ou falsa.',
  },
  ordenar: {
    instruction: 'Ordene os passos de uma rotina de autocuidado.',
    items: ['Identificar necessidade', 'Escolher uma acao', 'Executar', 'Registrar aprendizado'],
  },
  parear: {
    pairs: [
      { left: 'Sono', right: 'Descanso e recuperacao' },
      { left: 'Hidratacao', right: 'Agua ao longo do dia' },
      { left: 'Pausa', right: 'Respiracao e foco' },
    ],
  },
  historia: {
    scenario: 'Descreva uma situacao realista do trabalho.',
    question: 'Qual seria uma escolha saudavel nessa situacao?',
    options: ['Pausar e respirar', 'Ignorar sinais', 'Adiar todo cuidado', 'Acelerar sem avaliar'],
    correct: 0,
  },
  flashcard: {
    cards: [
      { front: 'Pergunta curta', back: 'Resposta educativa' },
      { front: 'Sinal de atencao', back: 'Orientacao segura' },
    ],
  },
  imagem: {
    question: 'Qual opcao representa melhor a orientacao?',
    options: [
      { emoji: 'A', label: 'Opcao segura' },
      { emoji: 'B', label: 'Opcao a evitar' },
    ],
    correct: 0,
  },
  desafio_dia: {
    challenge: 'Escolha uma microacao de autocuidado para hoje.',
    duration: 'hoje',
    tips: ['Comece pequeno', 'Registre como se sentiu', 'Repita se funcionou'],
  },
};

const blankForm = (): LessonForm => ({
  title: '',
  description: '',
  type: 'pilula',
  theme: 'geral',
  week_number: '',
  day_of_week: '',
  order_index: '0',
  duration_seconds: '120',
  campaign_context: '',
  contentText: formatJson(CONTENT_TEMPLATES.pilula),
  validated: false,
  validation_notes: '',
});

async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'Nao foi possivel carregar os dados.');
  }
  return payload as T;
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function toNumber(value: string, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toOptionalNumber(value: string) {
  if (!value) return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function formFromLesson(lesson: Lesson): LessonForm {
  return {
    title: lesson.title,
    description: lesson.description,
    type: lesson.type,
    theme: lesson.theme,
    week_number: String(lesson.week_number ?? ''),
    day_of_week: String(lesson.day_of_week ?? ''),
    order_index: String(lesson.order_index ?? 0),
    duration_seconds: String(lesson.duration_seconds ?? 120),
    campaign_context: lesson.campaign_context ?? '',
    contentText: formatJson(lesson.content_json ?? CONTENT_TEMPLATES[lesson.type]),
    validated: lesson.isValidated,
    validation_notes: lesson.validation_notes ?? '',
  };
}

function parseContent(text: string): Record<string, unknown> {
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('O conteudo precisa ser um objeto JSON.');
  }
  return parsed as Record<string, unknown>;
}

export default function EducationalLessonsManagerPage() {
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState('');
  const [type, setType] = useState('');
  const [week, setWeek] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<LessonForm>(blankForm);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const lessonsUrl = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '12' });
    if (search.trim()) params.set('search', search.trim());
    if (theme) params.set('theme', theme);
    if (type) params.set('type', type);
    if (week) params.set('week', week);
    return `/api/rh/lessons?${params.toString()}`;
  }, [page, search, theme, type, week]);

  const { data, error, isLoading, mutate } = useSWR<LessonsResponse>(lessonsUrl, fetcher, {
    revalidateOnFocus: false,
  });

  const lessons = data?.lessons ?? [];

  function openCreateLesson() {
    setEditingLesson(null);
    setForm(blankForm());
    setMessage(null);
    setShowForm(true);
  }

  function openEditLesson(lesson: Lesson) {
    setEditingLesson(lesson);
    setForm(formFromLesson(lesson));
    setMessage(null);
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingLesson(null);
  }

  function updateType(nextType: LessonType) {
    setForm((current) => ({
      ...current,
      type: nextType,
      contentText: formatJson(CONTENT_TEMPLATES[nextType]),
    }));
  }

  async function saveLesson() {
    setSaving(true);
    setMessage(null);
    try {
      const content = parseContent(form.contentText);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        theme: form.theme,
        content_json: content,
        week_number: toOptionalNumber(form.week_number),
        day_of_week: toOptionalNumber(form.day_of_week),
        order_index: toNumber(form.order_index, 0),
        duration_seconds: toNumber(form.duration_seconds, 120),
        campaign_context: form.campaign_context.trim() || undefined,
        ...(editingLesson
          ? { validated: form.validated, validation_notes: form.validation_notes.trim() || undefined }
          : {}),
      } as Record<string, unknown>;

      if (!form.week_number) delete payload.week_number;
      if (!form.day_of_week) delete payload.day_of_week;
      if (!payload.campaign_context) delete payload.campaign_context;

      const response = await fetch(editingLesson ? `/api/rh/lessons/${editingLesson.id}` : '/api/rh/lessons', {
        method: editingLesson ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Nao foi possivel salvar a licao.');

      await mutate();
      setShowForm(false);
      setEditingLesson(null);
      setMessage({ kind: 'success', text: editingLesson ? 'Licao atualizada.' : 'Licao criada.' });
    } catch (saveError) {
      setMessage({
        kind: 'error',
        text: saveError instanceof Error ? saveError.message : 'Nao foi possivel salvar a licao.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteLesson(lesson: Lesson) {
    if (!window.confirm('Excluir esta licao educativa?')) return;
    setDeletingId(lesson.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/rh/lessons/${lesson.id}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Nao foi possivel excluir a licao.');
      await mutate();
      setMessage({ kind: 'success', text: 'Licao excluida.' });
    } catch (deleteError) {
      setMessage({
        kind: 'error',
        text: deleteError instanceof Error ? deleteError.message : 'Nao foi possivel excluir a licao.',
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Conteudos educativos</h1>
      <p className={styles.subtitle}>
        Editor ativo de licoes para RH, com publicacao educativa e governanca privada.
      </p>

      <div className={styles.sections}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>ED</span>
            <h2 className={styles.sectionTitle}>Biblioteca educativa</h2>
          </div>

          <p className={styles.sectionDesc}>
            Liste, filtre, crie e mantenha licoes da empresa usando o contrato real de conteudo educativo. Licoes globais ou
            ja vencidas podem aparecer como somente leitura.
          </p>

          <span className={styles.lessonWarning}>
            A publicacao usa somente campos editoriais aprovados para conteudo educativo.
          </span>

          {message && (
            <span className={message.kind === 'error' ? styles.lessonWarning : `${styles.lessonBadge} ${styles.lessonValidatedBadge}`}>
              {message.text}
            </span>
          )}

          <div className={styles.lessonFilters}>
            <input
              className={styles.input}
              placeholder="Buscar titulo"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <select
              className={styles.select}
              value={theme}
              onChange={(event) => {
                setTheme(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os temas</option>
              {LESSON_THEMES.map((item) => (
                <option key={item} value={item}>{THEME_LABELS[item]}</option>
              ))}
            </select>
            <select
              className={styles.select}
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os tipos</option>
              {LESSON_TYPES.map((item) => (
                <option key={item} value={item}>{TYPE_LABELS[item]}</option>
              ))}
            </select>
            <input
              className={styles.input}
              type="number"
              min={1}
              max={52}
              placeholder="Semana"
              value={week}
              onChange={(event) => {
                setWeek(event.target.value);
                setPage(1);
              }}
            />
            <button type="button" className={`${styles.saveBtn} ${styles.newLessonBtn}`} onClick={openCreateLesson}>
              Nova licao
            </button>
          </div>

          {isLoading ? (
            <div className={styles.skeletonBlock} />
          ) : error ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>{error.message}</p>
            </div>
          ) : lessons.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>0</div>
              <p className={styles.emptyText}>Nenhuma licao encontrada para estes filtros.</p>
            </div>
          ) : (
            <div className={styles.lessonList}>
              {lessons.map((lesson) => (
                <article key={lesson.id} className={styles.lessonCard}>
                  <div className={styles.lessonTopRow}>
                    <span className={styles.lessonWeek}>S{lesson.week_number}</span>
                    <div className={styles.lessonBadges}>
                      <span className={`${styles.lessonBadge} ${styles.lessonTypeBadge}`}>{TYPE_LABELS[lesson.type] ?? lesson.type}</span>
                      <span className={`${styles.lessonBadge} ${styles.lessonThemeBadge}`}>{THEME_LABELS[lesson.theme] ?? lesson.theme}</span>
                      {lesson.isGlobal && <span className={`${styles.lessonBadge} ${styles.lessonGlobalBadge}`}>Global</span>}
                      <span className={`${styles.lessonBadge} ${lesson.isValidated ? styles.lessonValidatedBadge : styles.lessonPendingBadge}`}>
                        {lesson.isValidated ? 'Validada' : 'Pendente'}
                      </span>
                    </div>
                  </div>

                  <h3 className={styles.lessonTitle}>{lesson.title}</h3>
                  <p className={styles.lessonMetaText}>
                    Dia {lesson.day_of_week} | ordem {lesson.order_index} | {lesson.duration_seconds}s
                  </p>
                  <p className={styles.lessonMetaText}>{lesson.description}</p>
                  {lesson.campaign_context && <p className={styles.lessonCampaign}>{lesson.campaign_context}</p>}

                  <div className={styles.lessonActions}>
                    {lesson.canManage ? (
                      <>
                        <button
                          type="button"
                          className={`${styles.saveBtnSmall} ${styles.lessonActionBtn}`}
                          onClick={() => openEditLesson(lesson)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className={`${styles.saveBtnDanger} ${styles.lessonActionBtn}`}
                          onClick={() => deleteLesson(lesson)}
                          disabled={deletingId === lesson.id}
                        >
                          {deletingId === lesson.id ? 'Excluindo...' : 'Excluir'}
                        </button>
                      </>
                    ) : (
                      <span className={styles.lessonMetaText}>Somente leitura pelo calendario ou origem global.</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {(data?.totalPages ?? 1) > 1 && (
            <div className={styles.saveRow}>
              <button type="button" className={styles.saveBtnOutline} onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                Anterior
              </button>
              <button type="button" className={styles.saveBtnOutline} onClick={() => setPage((current) => Math.min(data?.totalPages ?? 1, current + 1))} disabled={page === (data?.totalPages ?? 1)}>
                Proxima
              </button>
            </div>
          )}
        </section>
      </div>

      {showForm && (
        <div className={styles.modalOverlay} onClick={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <div className={`${styles.modal} ${styles.lessonModal}`} role="dialog" aria-modal="true" aria-labelledby="lesson-modal-title">
            <div className={styles.lessonModalHeader}>
              <div>
                <h2 id="lesson-modal-title" className={styles.modalTitle}>{editingLesson ? 'Editar licao' : 'Nova licao'}</h2>
                <p className={styles.lessonModalSubtitle}>Preencha o contrato educativo. Dados competitivos continuam bloqueados.</p>
              </div>
              <button type="button" className={styles.lessonCloseBtn} onClick={closeForm} aria-label="Fechar">x</button>
            </div>

            <div className={styles.lessonModalContent}>
              <div className={styles.lessonFormSection}>
                <div className={styles.lessonFormSectionHead}>
                  <span className={styles.lessonStep}>1</span>
                  <div>
                    <strong>Identificacao</strong>
                    <p>Titulo, descricao, tema e tipo da licao.</p>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="lesson-title">Titulo</label>
                    <input id="lesson-title" className={styles.input} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="lesson-description">Descricao</label>
                    <input id="lesson-description" className={styles.input} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="lesson-type">Tipo</label>
                    <select id="lesson-type" className={styles.select} value={form.type} onChange={(event) => updateType(event.target.value as LessonType)}>
                      {LESSON_TYPES.map((item) => <option key={item} value={item}>{TYPE_LABELS[item]}</option>)}
                    </select>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="lesson-theme">Tema</label>
                    <select id="lesson-theme" className={styles.select} value={form.theme} onChange={(event) => setForm((current) => ({ ...current, theme: event.target.value as LessonTheme }))}>
                      {LESSON_THEMES.map((item) => <option key={item} value={item}>{THEME_LABELS[item]}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className={styles.lessonFormSection}>
                <div className={styles.lessonFormSectionHead}>
                  <span className={styles.lessonStep}>2</span>
                  <div>
                    <strong>Agenda</strong>
                    <p>Semana, dia, ordem e contexto opcional de campanha.</p>
                  </div>
                </div>

                <div className={styles.formGrid3}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="lesson-week">Semana</label>
                    <input id="lesson-week" className={styles.input} type="number" min={1} max={52} value={form.week_number} onChange={(event) => setForm((current) => ({ ...current, week_number: event.target.value }))} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="lesson-day">Dia</label>
                    <input id="lesson-day" className={styles.input} type="number" min={1} max={7} value={form.day_of_week} onChange={(event) => setForm((current) => ({ ...current, day_of_week: event.target.value }))} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="lesson-duration">Duracao em segundos</label>
                    <input id="lesson-duration" className={styles.input} type="number" min={30} max={3600} value={form.duration_seconds} onChange={(event) => setForm((current) => ({ ...current, duration_seconds: event.target.value }))} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="lesson-order">Ordem</label>
                    <input id="lesson-order" className={styles.input} type="number" min={0} value={form.order_index} onChange={(event) => setForm((current) => ({ ...current, order_index: event.target.value }))} />
                  </div>
                  <div className={`${styles.fieldGroup} ${styles.fieldGroupFull}`}>
                    <label className={styles.label} htmlFor="lesson-campaign">Campanha opcional</label>
                    <input id="lesson-campaign" className={styles.input} value={form.campaign_context} onChange={(event) => setForm((current) => ({ ...current, campaign_context: event.target.value }))} />
                  </div>
                </div>
              </div>

              <div className={styles.lessonFormSection}>
                <div className={styles.lessonFormSectionHead}>
                  <span className={styles.lessonStep}>3</span>
                  <div>
                    <strong>Conteudo estruturado</strong>
                    <p>Edite o JSON educativo. O formato precisa ser um objeto.</p>
                  </div>
                </div>

                <textarea
                  className={styles.textarea}
                  rows={14}
                  value={form.contentText}
                  onChange={(event) => setForm((current) => ({ ...current, contentText: event.target.value }))}
                  spellCheck={false}
                />
              </div>

              {editingLesson && (
                <div className={styles.lessonFormSection}>
                  <div className={styles.lessonFormSectionHead}>
                    <span className={styles.lessonStep}>4</span>
                    <div>
                      <strong>Validacao interna</strong>
                      <p>Marque quando o conteudo ja passou pela revisao responsavel.</p>
                    </div>
                  </div>

                  <label className={styles.themeCheckbox}>
                    <input
                      className={styles.themeCheck}
                      type="checkbox"
                      checked={form.validated}
                      onChange={(event) => setForm((current) => ({ ...current, validated: event.target.checked }))}
                    />
                    Conteudo validado
                  </label>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="lesson-notes">Notas de validacao</label>
                    <textarea id="lesson-notes" className={`${styles.textarea} ${styles.textareaCompact}`} value={form.validation_notes} onChange={(event) => setForm((current) => ({ ...current, validation_notes: event.target.value }))} />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.lessonModalFooter}>
              <div className={styles.lessonMobileFooterActions}>
                <button type="button" className={styles.saveBtnOutline} onClick={closeForm}>Cancelar</button>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={saveLesson}
                  disabled={saving || form.title.trim().length < 3 || form.description.trim().length < 1}
                >
                  {saving ? 'Salvando...' : editingLesson ? 'Salvar alteracoes' : 'Criar licao'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
