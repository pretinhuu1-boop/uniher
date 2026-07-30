import { useState } from "react";
import { motion } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { HeartPulse, CheckCircle2, AlertTriangle, AlertCircle, Calendar, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, HealthItem } from "@/contexts/UserContext";
import { HealthItemModal } from "@/components/modals/HealthItemModal";
import { PageTransition } from "@/components/animations/PageTransition";

type HealthStatus = "safe" | "attention" | "urgent" | "all";

const statusConfig = {
  safe: { icon: CheckCircle2, bg: "bg-health-safe-soft", text: "text-health-safe", label: "Em dia" },
  attention: { icon: AlertTriangle, bg: "bg-health-attention-soft", text: "text-health-attention", label: "Atenção" },
  urgent: { icon: AlertCircle, bg: "bg-health-urgent-soft", text: "text-health-urgent", label: "Urgente" },
};

const HealthStatusPage = () => {
  const { healthItems } = useUser();
  const [selectedItem, setSelectedItem] = useState<HealthItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<HealthStatus>("all");

  const safeCount = healthItems.filter((e) => e.status === "safe").length;
  const attentionCount = healthItems.filter((e) => e.status === "attention").length;
  const urgentCount = healthItems.filter((e) => e.status === "urgent").length;

  const filteredItems = activeFilter === "all" ? healthItems : healthItems.filter(item => item.status === activeFilter);

  return (
    <MainLayout>
      <PageTransition>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center gap-3 mb-2">
            <HeartPulse className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium text-primary">Monitoramento Contínuo</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">Semáforo de Saúde</h1>
          <p className="text-muted-foreground max-w-2xl mb-8">Visualize o status de todos os seus exames e consultas.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="grid grid-cols-3 gap-4 mb-8">
          {[
            { filter: "safe" as const, count: safeCount, Icon: CheckCircle2, color: "health-safe", title: "Exames em Dia", sub: "Parabéns!" },
            { filter: "attention" as const, count: attentionCount, Icon: AlertTriangle, color: "health-attention", title: "Precisam de Atenção", sub: "Agende em breve." },
            { filter: "urgent" as const, count: urgentCount, Icon: AlertCircle, color: "health-urgent", title: "Ação Necessária", sub: "Exames atrasados." },
          ].map(({ filter, count, Icon, color, title, sub }) => (
            <motion.div key={filter} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveFilter(filter)}
              className={cn(`bg-${color}-soft rounded-2xl p-6 border border-${color}/10 cursor-pointer`, activeFilter === filter && `ring-2 ring-${color}`)}>
              <div className="flex items-center gap-3 mb-4">
                <Icon className={`w-8 h-8 text-${color}`} />
                <span className={`text-4xl font-bold text-${color}`}>{count}</span>
              </div>
              <p className="font-medium text-card-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{sub}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {["all", "safe", "attention", "urgent"].map((f) => (
              <button key={f} onClick={() => setActiveFilter(f as HealthStatus)}
                className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                  activeFilter === f ? (f === "all" ? "bg-primary text-primary-foreground" : `bg-${f === "safe" ? "health-safe" : f === "attention" ? "health-attention" : "health-urgent"} text-white`) : "bg-muted text-muted-foreground")}>
                {f === "all" ? "Todos" : f === "safe" ? `Em dia (${safeCount})` : f === "attention" ? `Atenção (${attentionCount})` : `Urgente (${urgentCount})`}
              </button>
            ))}
          </div>
          {activeFilter !== "all" && (
            <button onClick={() => setActiveFilter("all")} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/50">
              <X className="w-4 h-4" /> Limpar filtro
            </button>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl shadow-card">
          <div className="divide-y divide-border">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center"><p className="text-muted-foreground">Nenhum exame encontrado.</p></div>
            ) : filteredItems.map((item) => {
              const config = statusConfig[item.status];
              const Icon = config.icon;
              return (
                <motion.div key={item.id} whileHover={{ backgroundColor: "hsl(var(--muted)/0.3)" }} onClick={() => { setSelectedItem(item); setModalOpen(true); }}
                  className="flex items-center gap-4 p-5 cursor-pointer group">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", config.bg)}>
                    <Icon className={cn("w-6 h-6", config.text)} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">{item.label}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      {item.lastExamDate && <span>Último: {item.lastExamDate}</span>}
                      {item.nextExamDate && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Próximo: {item.nextExamDate}</span>}
                    </div>
                    {item.dueDate && <p className={cn("text-sm mt-1 font-medium", config.text)}>{item.dueDate}</p>}
                  </div>
                  <div className={cn("px-4 py-2 rounded-xl text-sm font-medium", config.bg, config.text)}>{config.label}</div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </PageTransition>
      <HealthItemModal item={selectedItem} open={modalOpen} onOpenChange={setModalOpen} />
    </MainLayout>
  );
};

export default HealthStatusPage;
