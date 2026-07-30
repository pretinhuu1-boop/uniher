export type HealthCheckinStatus = 'safe' | 'attention' | 'urgent';
export type SemaphoreStatus = 'green' | 'yellow' | 'red';

export interface HealthCheckinAnswers {
  lastGynecologist: string;
  mammography: string;
  papanicolau: string;
  familyHistory: string;
  diabetesHistory: string;
  menstrualCycle: string;
  mentalHealth: string;
  lifestyle: string;
  smoking: string;
}

export interface HealthCheckinResult {
  source: 'exam_quiz_v1';
  overallStatus: HealthCheckinStatus;
  nextAction: 'continue_semaforo' | 'update_agenda' | 'offer_concierge';
  createConciergeCase: boolean;
  semaforoScores: { dimension: string; score: number; status: SemaphoreStatus }[];
  examItems: { examName: string; status: string; priority: HealthCheckinStatus }[];
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

function statusToSemaphore(status: HealthCheckinStatus): SemaphoreStatus {
  if (status === 'urgent') return 'red';
  if (status === 'attention') return 'yellow';
  return 'green';
}

function statusToScore(status: HealthCheckinStatus): number {
  if (status === 'urgent') return 1;
  if (status === 'attention') return 5;
  return 9;
}

function gynecologistItem(answer: string): HealthCheckinResult['examItems'][number] {
  if (answer === 'recent' || answer === 'moderate') {
    return { examName: 'Consulta ginecologica', status: 'completed', priority: 'safe' };
  }
  if (answer === 'delayed') {
    return { examName: 'Consulta ginecologica', status: 'pending', priority: 'attention' };
  }
  return { examName: 'Consulta ginecologica', status: 'overdue', priority: 'urgent' };
}

function mammographyItem(answer: string): HealthCheckinResult['examItems'][number] | null {
  if (answer === 'never_needed' || answer === 'na') {
    return null;
  }
  if (answer === 'current') {
    return { examName: 'Mamografia', status: 'completed', priority: 'safe' };
  }
  if (answer === 'delayed') {
    return { examName: 'Mamografia', status: 'pending', priority: 'attention' };
  }
  return { examName: 'Mamografia', status: 'overdue', priority: 'urgent' };
}

function papanicolauItem(answer: string): HealthCheckinResult['examItems'][number] {
  if (answer === 'recent' || answer === 'moderate') {
    return { examName: 'Papanicolau', status: 'completed', priority: 'safe' };
  }
  if (answer === 'delayed') {
    return { examName: 'Papanicolau', status: 'pending', priority: 'attention' };
  }
  return { examName: 'Papanicolau', status: 'overdue', priority: 'urgent' };
}

function riskPriority(value: string, urgentValues: string[], attentionValues: string[]): HealthCheckinStatus {
  if (urgentValues.includes(value)) return 'urgent';
  if (attentionValues.includes(value)) return 'attention';
  return 'safe';
}

export function mapHealthCheckinToSemaphore(
  answers: HealthCheckinAnswers,
  options: { conciergeEnabled?: boolean } = {}
): HealthCheckinResult {
  const examItems = [
    gynecologistItem(answers.lastGynecologist),
    mammographyItem(answers.mammography),
    papanicolauItem(answers.papanicolau),
  ].filter((item): item is HealthCheckinResult['examItems'][number] => item !== null);

  const riskPriorities: HealthCheckinStatus[] = [
    ...examItems.map((item) => item.priority),
    riskPriority(answers.familyHistory, ['close'], ['distant', 'unknown']),
    riskPriority(answers.diabetesHistory, ['self', 'close'], ['distant']),
    riskPriority(answers.menstrualCycle, ['painful'], ['irregular', 'menopause']),
    riskPriority(answers.mentalHealth, ['concerning'], ['regular']),
    riskPriority(answers.lifestyle, ['inactive'], ['sedentary', 'moderate']),
    riskPriority(answers.smoking, ['current'], ['quit_recent', 'quit_long']),
  ];

  const overallStatus = mostSevere(riskPriorities);
  const preventionStatus = mostSevere([
    ...examItems.map((item) => item.priority),
    riskPriority(answers.familyHistory, ['close'], ['distant', 'unknown']),
    riskPriority(answers.diabetesHistory, ['self', 'close'], ['distant']),
  ]);

  return {
    source: 'exam_quiz_v1',
    overallStatus,
    nextAction: overallStatus === 'urgent' && options.conciergeEnabled
      ? 'offer_concierge'
      : overallStatus === 'safe'
        ? 'continue_semaforo'
        : 'update_agenda',
    createConciergeCase: false,
    semaforoScores: [{
      dimension: 'Prevencao',
      score: statusToScore(preventionStatus),
      status: statusToSemaphore(preventionStatus),
    }],
    examItems,
  };
}
