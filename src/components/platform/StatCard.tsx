import { DashboardKPI } from '@/types/platform';
import { cn } from '@/lib/utils';

interface StatCardProps {
  kpi: DashboardKPI;
  className?: string;
}

const ICONS: Record<string, string> = {
  'users': '👥',
  'trending-up': '📈',
  'heart': '💗',
  'activity': '📋',
  'check-circle': '✅'
};

export default function StatCard({ kpi, className }: StatCardProps) {
  const isUp = kpi.trendDirection === 'up';

  return (
    <div className={cn(
      "p-6 rounded-xl bg-white border border-border-1 shadow-sm hover:shadow-md transition-all duration-300",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner-sm"
          style={{ 
            backgroundColor: `${kpi.color}15`, 
            color: kpi.color,
            boxShadow: `inset 0 0 10px ${kpi.color}10`
          }}
        >
          {ICONS[kpi.icon] || '🎯'}
        </div>
        
        {kpi.trend && (
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
            isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {kpi.trend}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-3xl font-display font-bold text-uni-text-900">
          {kpi.value}
        </div>
        <div className="text-sm font-medium text-uni-text-600">
          {kpi.label}
        </div>
        {kpi.subtitle && (
          <div className="text-[10px] text-uni-text-400 font-medium">
            {kpi.subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
