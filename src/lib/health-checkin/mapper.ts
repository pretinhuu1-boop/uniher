export type HealthCheckinStatus = 'safe' | 'attention' | 'urgent';

export interface ExamAnswer {
  completedDate?: string | null;
  dueDate?: string | null;
  unknown?: boolean;
  notApplicable?: boolean;
  legacyStatus?: 'completed' | 'pending' | 'overdue';
}

export interface ExamDefinition {
  id: string;
  name: string;
  minAge: number;
  maxAge?: number;
  conditional?: boolean;
}

export interface HealthCheckinAnswers {
  birthDate: string;
  exams: Record<string, ExamAnswer>;
}

export interface HealthCheckinResult {
  source: 'semaforo_exam_quiz_v1';
  overallStatus: HealthCheckinStatus;
  nextAction: 'continue_semaforo' | 'update_agenda' | 'offer_concierge';
  conciergeRequired: boolean;
  counts: { green: number; yellow: number; red: number };
  examItems: {
    examId: string;
    examName: string;
    status: 'completed' | 'pending' | 'overdue';
    priority: HealthCheckinStatus;
    completedDate: string | null;
    dueDate: string | null;
  }[];
}

export const EXAM_CATALOG: ExamDefinition[] = [
  { id: 'papanicolau', name: 'Papanicolau', minAge: 25 },
  { id: 'colposcopy', name: 'Colposcopia', minAge: 25, conditional: true },
  { id: 'mammography', name: 'Mamografia', minAge: 40 },
  { id: 'pelvic_ultrasound', name: 'Ultrassonografia pelvica ou transvaginal', minAge: 20, conditional: true },
  { id: 'clinical_breast_exam', name: 'Exame clinico das mamas', minAge: 20 },
  { id: 'hormone_panel', name: 'Dosagem hormonal (TSH, estradiol, FSH e prolactina)', minAge: 20, conditional: true },
  { id: 'bone_density', name: 'Densitometria ossea', minAge: 50 },
  { id: 'fertility_profile', name: 'Perfil de fertilidade', minAge: 20, maxAge: 49, conditional: true },
  { id: 'cbc_ferritin', name: 'Hemograma completo e ferritina', minAge: 20 },
  { id: 'lipid_glucose', name: 'Perfil lipidico e glicemia', minAge: 20 },
  { id: 'vitamin_d', name: 'Vitamina D', minAge: 20, conditional: true },
  { id: 'serologies', name: 'Sorologias para HIV, sifilis e hepatites B e C', minAge: 20, conditional: true },
  { id: 'hpv_screening', name: 'Rastreio de HPV', minAge: 25, conditional: true },
  { id: 'colonoscopy', name: 'Colonoscopia', minAge: 50 },
  { id: 'cognitive_assessment', name: 'Avaliacao de funcao cognitiva', minAge: 65 },
  { id: 'mental_health_screening', name: 'Triagem estruturada de saude mental', minAge: 20 },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid date: ${value}`);

  const timestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (new Date(timestamp).toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid date: ${value}`);
  }
  return timestamp;
}

export function getSaoPauloDateOnly(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function calculateAge(birthDate: string, referenceDate = getSaoPauloDateOnly()): number {
  const birth = new Date(parseDateOnly(birthDate));
  const reference = new Date(parseDateOnly(referenceDate));
  let age = reference.getUTCFullYear() - birth.getUTCFullYear();

  const beforeBirthday = reference.getUTCMonth() < birth.getUTCMonth()
    || (
      reference.getUTCMonth() === birth.getUTCMonth()
      && reference.getUTCDate() < birth.getUTCDate()
    );
  if (beforeBirthday) age -= 1;
  return age;
}

export function classifyExamDueDate(
  dueDate: string | null | undefined,
  referenceDate = getSaoPauloDateOnly()
): HealthCheckinStatus {
  if (!dueDate) return 'attention';

  const daysUntilDue = Math.round(
    (parseDateOnly(dueDate) - parseDateOnly(referenceDate)) / DAY_MS
  );
  if (daysUntilDue <= -30) return 'urgent';
  if (daysUntilDue <= 60) return 'attention';
  return 'safe';
}

export function getApplicableExams(age: number): ExamDefinition[] {
  return EXAM_CATALOG.filter((exam) => (
    age >= exam.minAge && (exam.maxAge === undefined || age <= exam.maxAge)
  ));
}

function priorityRank(priority: HealthCheckinStatus): number {
  if (priority === 'urgent') return 3;
  if (priority === 'attention') return 2;
  return 1;
}

function mostSevere(priorities: HealthCheckinStatus[]): HealthCheckinStatus {
  return priorities.reduce<HealthCheckinStatus>(
    (current, next) => (priorityRank(next) > priorityRank(current) ? next : current),
    'safe'
  );
}

function mapExamAnswer(
  exam: ExamDefinition,
  answer: ExamAnswer,
  referenceDate: string
): HealthCheckinResult['examItems'][number] | null {
  if (answer.notApplicable && exam.conditional) return null;

  const priority = !answer.dueDate && answer.legacyStatus === 'overdue'
    ? 'urgent'
    : classifyExamDueDate(answer.unknown ? null : answer.dueDate, referenceDate);

  return {
    examId: exam.id,
    examName: exam.name,
    status: priority === 'urgent' ? 'overdue' : priority === 'safe' ? 'completed' : 'pending',
    priority,
    completedDate: answer.completedDate ?? null,
    dueDate: answer.unknown ? null : answer.dueDate ?? null,
  };
}

export function mapHealthCheckinToSemaphore(
  answers: HealthCheckinAnswers,
  options: { conciergeEnabled?: boolean; referenceDate?: string } = {}
): HealthCheckinResult {
  const referenceDate = options.referenceDate ?? getSaoPauloDateOnly();
  const age = calculateAge(answers.birthDate, referenceDate);
  const examItems = getApplicableExams(age)
    .map((exam) => mapExamAnswer(exam, answers.exams[exam.id] ?? { unknown: true }, referenceDate))
    .filter((item): item is HealthCheckinResult['examItems'][number] => item !== null);

  const overallStatus = mostSevere(examItems.map((item) => item.priority));
  const conciergeRequired = overallStatus === 'urgent';

  return {
    source: 'semaforo_exam_quiz_v1',
    overallStatus,
    nextAction: conciergeRequired && options.conciergeEnabled
      ? 'offer_concierge'
      : overallStatus === 'safe'
        ? 'continue_semaforo'
        : 'update_agenda',
    conciergeRequired,
    counts: {
      green: examItems.filter((item) => item.priority === 'safe').length,
      yellow: examItems.filter((item) => item.priority === 'attention').length,
      red: examItems.filter((item) => item.priority === 'urgent').length,
    },
    examItems,
  };
}
