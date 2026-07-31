export type HealthCheckinStatus = 'safe' | 'attention' | 'urgent';
export type ExamAnswer = 'in_day' | 'due_soon' | 'overdue' | 'not_sure' | 'not_applicable';

export interface ExamDefinition {
  id: string;
  name: string;
  minAge: number;
  maxAge?: number;
  conditional?: boolean;
}

export interface HealthCheckinAnswers {
  age: number;
  exams: Record<string, ExamAnswer>;
}

export interface HealthCheckinResult {
  source: 'semaforo_exam_quiz_v1';
  overallStatus: HealthCheckinStatus;
  nextAction: 'continue_semaforo' | 'update_agenda' | 'offer_concierge';
  createConciergeCase: false;
  counts: { green: number; yellow: number; red: number };
  examItems: {
    examId: string;
    examName: string;
    status: 'completed' | 'pending' | 'overdue';
    priority: HealthCheckinStatus;
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
  answer: ExamAnswer
): HealthCheckinResult['examItems'][number] | null {
  if (answer === 'not_applicable') return null;
  if (answer === 'overdue') {
    return {
      examId: exam.id,
      examName: exam.name,
      status: 'overdue',
      priority: 'urgent',
    };
  }
  if (answer === 'due_soon' || answer === 'not_sure') {
    return {
      examId: exam.id,
      examName: exam.name,
      status: 'pending',
      priority: 'attention',
    };
  }
  return {
    examId: exam.id,
    examName: exam.name,
    status: 'completed',
    priority: 'safe',
  };
}

export function mapHealthCheckinToSemaphore(
  answers: HealthCheckinAnswers,
  options: { conciergeEnabled?: boolean } = {}
): HealthCheckinResult {
  const examItems = getApplicableExams(answers.age)
    .map((exam) => mapExamAnswer(exam, answers.exams[exam.id] ?? 'not_sure'))
    .filter((item): item is HealthCheckinResult['examItems'][number] => item !== null);

  const overallStatus = mostSevere(examItems.map((item) => item.priority));

  return {
    source: 'semaforo_exam_quiz_v1',
    overallStatus,
    nextAction: overallStatus === 'urgent' && options.conciergeEnabled
      ? 'offer_concierge'
      : overallStatus === 'safe'
        ? 'continue_semaforo'
        : 'update_agenda',
    createConciergeCase: false,
    counts: {
      green: examItems.filter((item) => item.priority === 'safe').length,
      yellow: examItems.filter((item) => item.priority === 'attention').length,
      red: examItems.filter((item) => item.priority === 'urgent').length,
    },
    examItems,
  };
}
