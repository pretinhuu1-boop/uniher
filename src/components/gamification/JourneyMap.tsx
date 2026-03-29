'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const THEME_EMOJI: Record<string, string> = {
  hidratacao: '💧',
  sono: '😴',
  prevencao: '🩺',
  nutricao: '🥗',
  mental: '🧠',
  ciclo: '🌸',
  geral: '✨',
};

const THEME_NAMES: Record<string, string> = {
  hidratacao: 'Hidratação',
  sono: 'Sono & Energia',
  prevencao: 'Prevenção',
  nutricao: 'Nutrição',
  mental: 'Saúde Mental',
  ciclo: 'Ciclo & Corpo',
  geral: 'Geral',
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

interface Week {
  weekNumber: number;
  theme: string;
  lessons: { id: string; title: string; completed: boolean; type: string }[];
  completedCount: number;
  totalLessons: number;
  isComplete: boolean;
}

interface JourneyData {
  weeks: Week[];
  currentWeek: number;
  progress: {
    totalLessons: number;
    completedLessons: number;
    progressPercentage: number;
    totalWeeks: number;
    completedWeeks: number;
  };
}

export default function JourneyMap() {
  const { data } = useSWR<JourneyData>(
    '/api/gamification/journey',
    fetcher,
    { revalidateOnFocus: false }
  );

  if (!data?.weeks?.length) {
    return (
      <div className="bg-white rounded-2xl border border-border-1 p-6 text-center">
        <div className="text-4xl mb-2">🗺️</div>
        <h3 className="font-display font-bold text-uni-text-900">Sua Jornada</h3>
        <p className="text-sm text-uni-text-400 mt-1">A jornada será desbloqueada quando as lições começarem.</p>
      </div>
    );
  }

  const { weeks, currentWeek, progress } = data;
  const overallProgress = progress?.progressPercentage ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-border-1 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-bold text-uni-text-900">Sua Jornada</h3>
          <p className="text-xs text-uni-text-400">Semana {currentWeek} de {progress?.totalWeeks ?? weeks.length}</p>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold" style={{ color: '#C9A264' }}>{overallProgress}%</span>
          <p className="text-[10px] text-uni-text-400">concluído</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-cream-100 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${overallProgress}%`, background: 'linear-gradient(90deg, #C9A264, #E8C97A)' }}
        />
      </div>

      {/* Journey path */}
      <div className="space-y-3">
        {weeks.map((week, idx) => {
          const isCurrent = week.weekNumber === currentWeek;
          const isCompleted = week.isComplete;
          const isFuture = week.weekNumber > currentWeek;
          const color = THEME_COLORS[week.theme] || THEME_COLORS.geral;
          const weekProgress = week.totalLessons > 0 ? Math.round((week.completedCount / week.totalLessons) * 100) : 0;

          return (
            <div
              key={`week-${week.weekNumber}`}
              className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all ${
                isCurrent ? 'border-2 shadow-sm' : 'border-border-1'
              } ${isFuture ? 'opacity-50' : ''}`}
              style={isCurrent ? { borderColor: color, background: `${color}08` } : {}}
            >
              {/* Connection line */}
              {idx < weeks.length - 1 && (
                <div className="absolute left-[29px] top-[56px] w-0.5 h-4 -mb-4" style={{ background: isCompleted ? color : '#e5e7eb' }} />
              )}

              {/* Week circle */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
                style={{
                  background: isCompleted ? color : isCurrent ? `${color}20` : '#f5f5f5',
                  border: `2px solid ${isCompleted || isCurrent ? color : '#e5e7eb'}`,
                }}
              >
                {isCompleted ? '✓' : THEME_EMOJI[week.theme] || '✨'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: isFuture ? '#9ca3af' : color }}>
                    Semana {week.weekNumber}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: color }}>
                      ATUAL
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-uni-text-900 truncate">
                  {THEME_NAMES[week.theme] || week.theme}
                </p>
                {!isFuture && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${weekProgress}%`, background: color }} />
                    </div>
                    <span className="text-[10px] text-uni-text-400">{week.completedCount}/{week.totalLessons}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
