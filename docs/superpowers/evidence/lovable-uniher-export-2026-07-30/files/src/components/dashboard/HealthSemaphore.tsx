import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { useUser, HealthItem } from "@/contexts/UserContext";
import { HealthItemModal } from "@/components/modals/HealthItemModal";

const statusConfig = {
  safe: {
    icon: CheckCircle2,
    bg: "bg-health-safe-soft",
    text: "text-health-safe",
    border: "border-health-safe/20",
    label: "Em dia",
  },
  attention: {
    icon: AlertTriangle,
    bg: "bg-health-attention-soft",
    text: "text-health-attention",
    border: "border-health-attention/20",
    label: "Atenção",
  },
  urgent: {
    icon: AlertCircle,
    bg: "bg-health-urgent-soft",
    text: "text-health-urgent",
    border: "border-health-urgent/20",
    label: "Urgente",
  },
};

export function HealthSemaphore() {
  const { healthItems } = useUser();
  const [selectedItem, setSelectedItem] = useState<HealthItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const safeCount = healthItems.filter((i) => i.status === "safe").length;
  const attentionCount = healthItems.filter((i) => i.status === "attention").length;
  const urgentCount = healthItems.filter((i) => i.status === "urgent").length;

  const handleItemClick = (item: HealthItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  return (
    <>
      <div className="bg-card rounded-2xl shadow-card p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Semáforo de Saúde</h2>
            <p className="text-sm text-muted-foreground">Clique para ver detalhes</p>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-health-safe-soft text-health-safe">
              <span className="w-2 h-2 rounded-full bg-health-safe" />
              {safeCount}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-health-attention-soft text-health-attention">
              <span className="w-2 h-2 rounded-full bg-health-attention" />
              {attentionCount}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-health-urgent-soft text-health-urgent">
              <span className="w-2 h-2 rounded-full bg-health-urgent" />
              {urgentCount}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {healthItems.map((item, index) => {
            const config = statusConfig[item.status];
            const Icon = config.icon;

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-card cursor-pointer hover:scale-[1.02]",
                  config.bg,
                  config.border
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", config.text, "bg-card")}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-card-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.dueDate}</p>
                </div>
                <div className={cn("px-3 py-1 rounded-full text-xs font-medium", config.bg, config.text)}>
                  {config.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <HealthItemModal item={selectedItem} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
