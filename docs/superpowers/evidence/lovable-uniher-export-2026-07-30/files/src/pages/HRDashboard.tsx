import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart3, Users, TrendingUp, BookOpen, Calendar, Target, ArrowUp, ArrowDown, ArrowRight,
  Download, Filter, RefreshCw, Mail, Phone, MapPin, Building, Clock, CheckCircle2, AlertTriangle,
  Eye, Send, X, FileText, UserCheck, Activity, Heart, Zap, Award, Gift, Bell, UserPlus, Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { DemoRoleSwitcher } from "@/components/demo/DemoRoleSwitcher";
import { pageVariants, staggerContainer, staggerItem } from "@/components/animations/PageTransition";
import { exportToPDF, HRReportData } from "@/utils/pdfExport";
import { useRealtimeEngagement } from "@/hooks/useRealtimeEngagement";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BulkInviteModal } from "@/components/hr/BulkInviteModal";
import { InvitationTracker } from "@/components/hr/InvitationTracker";
import { ReportScheduler } from "@/components/hr/ReportScheduler";
import { AdvancedFilters, FilterState } from "@/components/hr/AdvancedFilters";
import { EmailAnalytics } from "@/components/hr/EmailAnalytics";
import { DepartmentGoals } from "@/components/hr/DepartmentGoals";
import { InactivityAlerts } from "@/components/hr/InactivityAlerts";
import { HistoricalCharts } from "@/components/hr/HistoricalCharts";
import { DepartmentComparison } from "@/components/hr/DepartmentComparison";
import { DepartmentGamification } from "@/components/hr/DepartmentGamification";
import { DepartmentNotifications } from "@/components/hr/DepartmentNotifications";
import { CrossDepartmentMissions } from "@/components/hr/CrossDepartmentMissions";
import { DepartmentCompetitionHistory } from "@/components/hr/DepartmentCompetitionHistory";
import { RealTimeMissionsDashboard } from "@/components/hr/RealTimeMissionsDashboard";
import { DepartmentAchievements } from "@/components/hr/DepartmentAchievements";
import { MonthlyReportGenerator } from "@/components/hr/MonthlyReportGenerator";
import { useHRMetrics } from "@/hooks/useHRMetrics";
import { HRCompanyRegistration } from "@/components/company/HRCompanyRegistration";
import { HROnboarding } from "@/components/company/HROnboarding";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const HR_ONBOARDING_KEY = "uniher_hr_onboarding_completed";

const engagementData = [
  { month: "Jul", acessos: 65, conteudos: 45, exames: 30 },
  { month: "Ago", acessos: 72, conteudos: 52, exames: 35 },
  { month: "Set", acessos: 80, conteudos: 60, exames: 42 },
  { month: "Out", acessos: 95, conteudos: 78, exames: 55 },
  { month: "Nov", acessos: 88, conteudos: 70, exames: 48 },
  { month: "Dez", acessos: 92, conteudos: 75, exames: 52 },
];

// Dados de evolução ao longo do tempo
const evolutionData = [
  { month: "Jan", engajamento: 45, retencao: 72, roi: 1.2 },
  { month: "Fev", engajamento: 52, retencao: 75, roi: 1.5 },
  { month: "Mar", engajamento: 58, retencao: 78, roi: 1.8 },
  { month: "Abr", engajamento: 62, retencao: 80, roi: 2.1 },
  { month: "Mai", engajamento: 68, retencao: 82, roi: 2.4 },
  { month: "Jun", engajamento: 72, retencao: 84, roi: 2.8 },
  { month: "Jul", engajamento: 75, retencao: 85, roi: 3.1 },
  { month: "Ago", engajamento: 78, retencao: 87, roi: 3.5 },
  { month: "Set", engajamento: 80, retencao: 88, roi: 3.8 },
  { month: "Out", engajamento: 82, retencao: 89, roi: 4.2 },
  { month: "Nov", engajamento: 85, retencao: 90, roi: 4.5 },
  { month: "Dez", engajamento: 88, retencao: 91, roi: 4.8 },
];

// Dados de saúde ao longo do tempo
const healthTrendData = [
  { month: "Jul", examesEmDia: 48, riscoBaixo: 35, riscoMedio: 45, riscoAlto: 20 },
  { month: "Ago", examesEmDia: 52, riscoBaixo: 38, riscoMedio: 42, riscoAlto: 20 },
  { month: "Set", examesEmDia: 55, riscoBaixo: 42, riscoMedio: 40, riscoAlto: 18 },
  { month: "Out", examesEmDia: 58, riscoBaixo: 45, riscoMedio: 38, riscoAlto: 17 },
  { month: "Nov", examesEmDia: 62, riscoBaixo: 48, riscoMedio: 37, riscoAlto: 15 },
  { month: "Dez", examesEmDia: 65, riscoBaixo: 52, riscoMedio: 35, riscoAlto: 13 },
];

const ageDistribution = [
  { name: "18-25", value: 15, color: "hsl(var(--primary))" },
  { name: "26-35", value: 32, color: "hsl(var(--secondary))" },
  { name: "36-45", value: 28, color: "hsl(var(--accent))" },
  { name: "46-55", value: 18, color: "hsl(var(--health-attention))" },
  { name: "56+", value: 7, color: "hsl(var(--health-safe))" },
];

const departmentData = [
  { name: "TI", engajamento: 85, exames: 72, colaboradoras: 156 },
  { name: "RH", engajamento: 92, exames: 88, colaboradoras: 48 },
  { name: "Financeiro", engajamento: 78, exames: 65, colaboradoras: 92 },
  { name: "Marketing", engajamento: 88, exames: 70, colaboradoras: 124 },
  { name: "Operações", engajamento: 65, exames: 55, colaboradoras: 312 },
];

const kpiCards = [
  {
    label: "Colaboradoras Ativas",
    value: "1.247",
    change: "+12%",
    trend: "up",
    icon: Users,
    description: "vs. mês anterior",
    detailType: "users",
  },
  {
    label: "Taxa de Engajamento",
    value: "78%",
    change: "+8%",
    trend: "up",
    icon: TrendingUp,
    description: "média mensal",
    detailType: "engagement",
  },
  {
    label: "Exames em Dia",
    value: "65%",
    change: "+15%",
    trend: "up",
    icon: Target,
    description: "da população",
    detailType: "exams",
  },
  {
    label: "Conteúdos Consumidos",
    value: "3.421",
    change: "+23%",
    trend: "up",
    icon: BookOpen,
    description: "este mês",
    detailType: "content",
  },
];

const employeesList = [
  { id: 1, name: "Ana Silva", department: "TI", status: "active", lastAccess: "Hoje", examsStatus: "ok", email: "ana.silva@empresa.com" },
  { id: 2, name: "Beatriz Santos", department: "RH", status: "active", lastAccess: "Ontem", examsStatus: "pending", email: "beatriz.santos@empresa.com" },
  { id: 3, name: "Carla Oliveira", department: "Marketing", status: "inactive", lastAccess: "5 dias", examsStatus: "urgent", email: "carla.oliveira@empresa.com" },
  { id: 4, name: "Diana Costa", department: "Financeiro", status: "active", lastAccess: "Hoje", examsStatus: "ok", email: "diana.costa@empresa.com" },
  { id: 5, name: "Elena Rodrigues", department: "Operações", status: "active", lastAccess: "2 dias", examsStatus: "pending", email: "elena.rodrigues@empresa.com" },
];

const campaignsList = [
  { id: 1, name: "Outubro Rosa", status: "completed", participation: 87, participants: 1085, startDate: "01/10/2024", endDate: "31/10/2024" },
  { id: 2, name: "Novembro Azul", status: "completed", participation: 72, participants: 898, startDate: "01/11/2024", endDate: "30/11/2024" },
  { id: 3, name: "Dezembro Laranja", status: "active", participation: 65, participants: 811, startDate: "01/12/2024", endDate: "31/12/2024" },
  { id: 4, name: "Janeiro Branco", status: "scheduled", participation: 0, participants: 0, startDate: "01/01/2025", endDate: "31/01/2025" },
];

const HRDashboardPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [engagementDetailOpen, setEngagementDetailOpen] = useState(false);
  const [ageDetailOpen, setAgeDetailOpen] = useState(false);
  const [departmentDetailOpen, setDepartmentDetailOpen] = useState(false);
  const [campaignDetailOpen, setCampaignDetailOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<typeof campaignsList[0] | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<typeof departmentData[0] | null>(null);
  const [filterPeriod, setFilterPeriod] = useState("6m");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activityFeedOpen, setActivityFeedOpen] = useState(false);
  const [showCompanyRegistration, setShowCompanyRegistration] = useState(false);
  const [showHROnboarding, setShowHROnboarding] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    departments: [],
    healthStatus: [],
    period: { from: undefined, to: undefined },
    engagementLevel: "all",
  });

  // Get user's company ID
  const { data: companyMembership, isLoading: loadingMembership } = useQuery({
    queryKey: ["hr-company-membership", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("company_memberships")
        .select("company_id, role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get company details if membership exists
  const { data: companyDetails } = useQuery({
    queryKey: ["company-details", companyMembership?.company_id],
    queryFn: async () => {
      if (!companyMembership?.company_id) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyMembership.company_id)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!companyMembership?.company_id,
  });

  const handleCompanyRegistrationSuccess = (companyId: string) => {
    setShowCompanyRegistration(false);
    queryClient.invalidateQueries({ queryKey: ["hr-company-membership"] });
    queryClient.invalidateQueries({ queryKey: ["company-details"] });
    // Show HR onboarding after successful company registration
    setShowHROnboarding(true);
  };

  const handleHROnboardingComplete = () => {
    localStorage.setItem(HR_ONBOARDING_KEY, "true");
    setShowHROnboarding(false);
  };

  // Real-time engagement data
  const { 
    stats: realtimeStats, 
    realtimeEvents, 
    lastUpdate, 
    isLoading: loadingRealtime,
    refreshAll 
  } = useRealtimeEngagement(companyMembership?.company_id);

  // HR Metrics with filters
  const { data: hrMetrics, isLoading: loadingMetrics } = useHRMetrics({
    companyId: companyMembership?.company_id,
    filters: advancedFilters,
  });

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "agora";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min atrás`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
    return `${Math.floor(seconds / 86400)}d atrás`;
  };

  // Get event icon and color
  const getEventStyle = (type: string) => {
    switch (type) {
      case "badge_earned":
        return { icon: Award, color: "text-amber-500", bg: "bg-amber-500/10" };
      case "challenge_completed":
        return { icon: Target, color: "text-green-500", bg: "bg-green-500/10" };
      case "reward_redeemed":
        return { icon: Gift, color: "text-purple-500", bg: "bg-purple-500/10" };
      case "profile_update":
        return { icon: UserCheck, color: "text-blue-500", bg: "bg-blue-500/10" };
      default:
        return { icon: Activity, color: "text-muted-foreground", bg: "bg-muted" };
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case "badge_earned": return "conquistou badge";
      case "challenge_completed": return "completou desafio";
      case "reward_redeemed": return "resgatou recompensa";
      case "profile_update": return "atualizou perfil";
      default: return "atividade";
    }
  };

  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);

  const handleExportReport = () => {
    const reportData: HRReportData = {
      companyName: "Empresa Exemplo S.A.",
      reportDate: new Date().toLocaleDateString("pt-BR"),
      period: "Dezembro 2024",
      generatedBy: "Gestor RH",
      stats: {
        totalEmployees: 1500,
        activeEmployees: 1247,
        engagementRate: 78,
        examsUpToDate: 65,
        contentConsumed: 3421,
        roiPercentage: 4.8,
      },
      departmentData,
      ageDistribution,
      monthlyEngagement: engagementData,
      healthTrend: healthTrendData,
    };
    
    toast({
      title: "Gerando relatório PDF...",
      description: "O arquivo será aberto em uma nova aba.",
    });
    
    setTimeout(() => {
      exportToPDF(reportData);
      toast({
        title: "Relatório gerado!",
        description: "Use Ctrl+P ou Cmd+P para salvar como PDF.",
      });
    }, 500);
  };

  const handleRefreshData = () => {
    setIsRefreshing(true);
    refreshAll();
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "Dados atualizados!",
        description: "Todas as métricas estão sincronizadas em tempo real.",
      });
    }, 800);
  };

  const handleSendReminder = (employee: typeof employeesList[0]) => {
    toast({
      title: "Lembrete enviado!",
      description: `${employee.name} receberá uma notificação.`,
    });
  };

  const handleScheduleCampaign = (campaign: typeof campaignsList[0]) => {
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    toast({
      title: "Campanha agendada!",
      description: `${campaign.name} está programada para começar em ${campaign.startDate}.`,
    });
    setCampaignDetailOpen(false);
  };

  const getKPIModalContent = () => {
    switch (selectedKPI) {
      case "users":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-health-safe-soft text-center">
                <p className="text-2xl font-bold text-health-safe">892</p>
                <p className="text-sm text-muted-foreground">Ativas</p>
              </div>
              <div className="p-4 rounded-xl bg-health-attention-soft text-center">
                <p className="text-2xl font-bold text-health-attention">245</p>
                <p className="text-sm text-muted-foreground">Inativas (7d)</p>
              </div>
              <div className="p-4 rounded-xl bg-health-urgent-soft text-center">
                <p className="text-2xl font-bold text-health-urgent">110</p>
                <p className="text-sm text-muted-foreground">Nunca acessaram</p>
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {employeesList.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold",
                      emp.status === "active" ? "bg-health-safe-soft text-health-safe" : "bg-muted text-muted-foreground"
                    )}>
                      {emp.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.department} • Último acesso: {emp.lastAccess}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {emp.status === "inactive" && (
                      <button 
                        onClick={() => handleSendReminder(emp)}
                        className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "engagement":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-primary-soft">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <p className="font-medium text-card-foreground">Média de Acessos</p>
                </div>
                <p className="text-3xl font-bold text-primary">4.2/semana</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-secondary" />
                  <p className="font-medium text-card-foreground">Tempo Médio</p>
                </div>
                <p className="text-3xl font-bold text-secondary">12min</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="font-medium text-card-foreground">Funcionalidades mais usadas:</p>
              {[
                { name: "Conteúdos Educacionais", usage: 89 },
                { name: "Semáforo de Saúde", usage: 76 },
                { name: "Campanhas", usage: 68 },
                { name: "Telemedicina", usage: 45 },
              ].map((feat) => (
                <div key={feat.name} className="p-3 rounded-xl bg-muted/30">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-card-foreground">{feat.name}</span>
                    <span className="text-sm font-semibold text-primary">{feat.usage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${feat.usage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "exams":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-health-safe-soft text-center">
                <CheckCircle2 className="w-6 h-6 text-health-safe mx-auto mb-2" />
                <p className="text-2xl font-bold text-health-safe">811</p>
                <p className="text-sm text-muted-foreground">Em dia</p>
              </div>
              <div className="p-4 rounded-xl bg-health-attention-soft text-center">
                <Clock className="w-6 h-6 text-health-attention mx-auto mb-2" />
                <p className="text-2xl font-bold text-health-attention">298</p>
                <p className="text-sm text-muted-foreground">Próximos 30 dias</p>
              </div>
              <div className="p-4 rounded-xl bg-health-urgent-soft text-center">
                <AlertTriangle className="w-6 h-6 text-health-urgent mx-auto mb-2" />
                <p className="text-2xl font-bold text-health-urgent">138</p>
                <p className="text-sm text-muted-foreground">Atrasados</p>
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {employeesList.filter(e => e.examsStatus !== "ok").map((emp) => (
                <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      emp.examsStatus === "pending" ? "bg-health-attention-soft" : "bg-health-urgent-soft"
                    )}>
                      {emp.examsStatus === "pending" ? (
                        <Clock className="w-5 h-5 text-health-attention" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-health-urgent" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.department}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSendReminder(emp)}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Enviar lembrete
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      case "content":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-primary-soft">
                <p className="text-2xl font-bold text-primary">156</p>
                <p className="text-sm text-muted-foreground">Artigos lidos</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/20">
                <p className="text-2xl font-bold text-secondary">89</p>
                <p className="text-sm text-muted-foreground">Vídeos assistidos</p>
              </div>
            </div>
            <p className="font-medium text-card-foreground">Conteúdos mais populares:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[
                { title: "Prevenção do câncer de mama", views: 892, type: "Artigo" },
                { title: "Saúde mental no trabalho", views: 756, type: "Vídeo" },
                { title: "Alimentação saudável", views: 634, type: "Artigo" },
                { title: "Exercícios para o dia a dia", views: 521, type: "Vídeo" },
              ].map((content, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{content.title}</p>
                      <p className="text-xs text-muted-foreground">{content.type}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-primary">{content.views} views</span>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // DEMO MODE: Skip loading and company registration checks when no user is logged in
  const isDemoMode = !user;

  // Show loading state (skip in demo mode)
  if (!isDemoMode && loadingMembership) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  // Role gate: only hr_admin members may view the HR dashboard (demo mode bypass preserved)
  if (!isDemoMode && companyMembership && companyMembership.role !== "hr_admin") {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground max-w-md mb-6">
            Esta área é exclusiva para administradores de RH da sua empresa.
          </p>
          <Button onClick={() => window.location.assign("/")}>Voltar ao início</Button>
        </div>
      </MainLayout>
    );
  }

  // Show company registration if no company is linked (skip in demo mode)
  if (!isDemoMode && (!companyMembership || showCompanyRegistration)) {
    return (
      <MainLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto py-8"
        >
          {/* Welcome Header for HR */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Área RH - UniHer</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Gerencie a saúde e bem-estar das colaboradoras da sua empresa. 
              Primeiro, precisamos cadastrar sua empresa no sistema.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-card border text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Gestão de Colaboradoras</h3>
              <p className="text-sm text-muted-foreground">Acompanhe o engajamento e saúde de toda equipe</p>
            </div>
            <div className="p-4 rounded-xl bg-card border text-center">
              <BarChart3 className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Relatórios Detalhados</h3>
              <p className="text-sm text-muted-foreground">Métricas e insights em tempo real</p>
            </div>
            <div className="p-4 rounded-xl bg-card border text-center">
              <Target className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Metas por Departamento</h3>
              <p className="text-sm text-muted-foreground">Defina e acompanhe objetivos de saúde</p>
            </div>
          </div>

          {/* Registration Form */}
          <HRCompanyRegistration 
            onSuccess={handleCompanyRegistrationSuccess}
            onCancel={companyMembership ? () => setShowCompanyRegistration(false) : undefined}
          />
        </motion.div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <motion.div
        initial="initial"
        animate="animate"
        variants={pageVariants}
      >
        <motion.div variants={staggerItem} className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium text-primary">
                {companyDetails?.trading_name || companyDetails?.name || "Gestão de Saúde"}
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
              Dashboard RH
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Visão geral da saúde e engajamento das colaboradoras da sua empresa.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-card rounded-xl p-1 border border-border">
              {["1m", "3m", "6m", "1a"].map((period) => (
                <button
                  key={period}
                  onClick={() => setFilterPeriod(period)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    filterPeriod === period 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {period}
                </button>
              ))}
            </div>
            
            {/* Realtime indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-600">Tempo real</span>
            </div>
            
            {/* Activity Feed Button */}
            <button 
              onClick={() => setActivityFeedOpen(true)}
              className="relative p-2.5 rounded-xl bg-card border border-border hover:bg-muted transition-colors"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {realtimeEvents.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                  {realtimeEvents.length > 9 ? "9+" : realtimeEvents.length}
                </span>
              )}
            </button>
            
            <button 
              onClick={handleRefreshData}
              className={cn(
                "p-2.5 rounded-xl bg-card border border-border hover:bg-muted transition-colors",
                isRefreshing && "animate-spin"
              )}
            >
              <RefreshCw className="w-5 h-5 text-muted-foreground" />
            </button>
            <button 
              onClick={() => setBulkInviteOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Convidar
            </button>
            <button 
              onClick={handleExportReport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </motion.div>
        
        {/* Last Update indicator */}
        <motion.div variants={staggerItem} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="w-4 h-4 text-primary" />
          <span>Última atualização: {formatTimeAgo(lastUpdate)}</span>
          {realtimeStats && (
            <span className="text-primary font-medium ml-2">
              • {realtimeStats.activeUsers} colaboradoras ativas
            </span>
          )}
        </motion.div>
        
        {/* Advanced Filters */}
        <motion.div variants={staggerItem} className="mb-6">
          <AdvancedFilters 
            filters={advancedFilters} 
            onFiltersChange={setAdvancedFilters}
            departments={departmentData.map(d => d.name)}
          />
        </motion.div>

        {/* Inactivity Alerts */}
        {hrMetrics && hrMetrics.inactiveUsers.length > 0 && (
          <motion.div variants={staggerItem} className="mb-6">
            <InactivityAlerts 
              companyId={companyMembership?.company_id} 
              inactiveUsers={hrMetrics.inactiveUsers} 
            />
          </motion.div>
        )}

        {/* KPI Cards - Now with real data */}
        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {[
            {
              label: "Colaboradoras Ativas",
              value: hrMetrics ? hrMetrics.activeCollaborators.toLocaleString() : kpiCards[0].value,
              change: hrMetrics ? `${hrMetrics.totalCollaborators} total` : kpiCards[0].change,
              trend: "up" as const,
              icon: Users,
              description: "ativas nos últimos 7 dias",
              detailType: "users",
            },
            {
              label: "Taxa de Engajamento",
              value: hrMetrics ? `${hrMetrics.engagementRate}%` : kpiCards[1].value,
              change: hrMetrics?.engagementRate >= 70 ? "+bom" : "melhorar",
              trend: (hrMetrics?.engagementRate || 0) >= 50 ? "up" as const : "down" as const,
              icon: TrendingUp,
              description: "últimos 30 dias",
              detailType: "engagement",
            },
            {
              label: "Exames em Dia",
              value: hrMetrics ? `${Math.round((hrMetrics.examsUpToDate / Math.max(1, hrMetrics.totalCollaborators)) * 100)}%` : kpiCards[2].value,
              change: hrMetrics ? `${hrMetrics.examsUpToDate} colaboradoras` : kpiCards[2].change,
              trend: "up" as const,
              icon: Target,
              description: "da população",
              detailType: "exams",
            },
            {
              label: "Atividades Completadas",
              value: hrMetrics ? hrMetrics.contentConsumed.toLocaleString() : kpiCards[3].value,
              change: "+ativo",
              trend: "up" as const,
              icon: BookOpen,
              description: "desafios e badges",
              detailType: "content",
            },
          ].map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.label}
                variants={staggerItem}
                whileHover={{ y: -4, scale: 1.02 }}
                onClick={() => setSelectedKPI(kpi.detailType)}
                className="bg-card rounded-2xl shadow-card p-6 hover:shadow-card-hover transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    kpi.trend === "up"
                      ? "bg-health-safe-soft text-health-safe"
                      : "bg-health-urgent-soft text-health-urgent"
                  )}
                >
                  {kpi.trend === "up" ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowDown className="w-3 h-3" />
                  )}
                  {kpi.change}
                </div>
              </div>
              <p className="text-3xl font-bold text-card-foreground mb-1">{kpi.value}</p>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{kpi.description}</p>
              <p className="text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                Clique para ver detalhes →
              </p>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Engagement Chart */}
        <div className="bg-card rounded-2xl shadow-card p-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-card-foreground">Evolução do Engajamento</h3>
              <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
            </div>
            <button 
              onClick={() => setEngagementDetailOpen(true)}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Ver detalhes
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={engagementData}>
                <defs>
                  <linearGradient id="colorAcessos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorConteudos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    boxShadow: "var(--shadow-md)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="acessos"
                  stroke="hsl(var(--primary))"
                  fill="url(#colorAcessos)"
                  strokeWidth={2}
                  name="Acessos"
                />
                <Area
                  type="monotone"
                  dataKey="conteudos"
                  stroke="hsl(var(--secondary))"
                  fill="url(#colorConteudos)"
                  strokeWidth={2}
                  name="Conteúdos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Age Distribution */}
        <div className="bg-card rounded-2xl shadow-card p-6 animate-slide-up" style={{ animationDelay: "150ms" }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-card-foreground">Distribuição por Idade</h3>
              <p className="text-sm text-muted-foreground">Dados demográficos</p>
            </div>
            <button 
              onClick={() => setAgeDetailOpen(true)}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Ver detalhes
            </button>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ageDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {ageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                  }}
                  formatter={(value: number) => [`${value}%`, "Participação"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {ageDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-muted-foreground">
                  {item.name} ({item.value}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NEW: Evolution Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Engagement Evolution Over Time */}
        <motion.div 
          className="bg-card rounded-2xl shadow-card p-6"
          variants={staggerItem}
          whileHover={{ y: -2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-card-foreground">Evolução do Engajamento</h3>
              <p className="text-sm text-muted-foreground">Tendência anual de engajamento e retenção</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-health-safe-soft text-health-safe text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              +95% em 12 meses
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="engajamento" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                  name="Engajamento %"
                />
                <Line 
                  type="monotone" 
                  dataKey="retencao" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--secondary))", strokeWidth: 2 }}
                  name="Retenção %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Health Trend Over Time */}
        <motion.div 
          className="bg-card rounded-2xl shadow-card p-6"
          variants={staggerItem}
          whileHover={{ y: -2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-card-foreground">Evolução da Saúde Populacional</h3>
              <p className="text-sm text-muted-foreground">Redução de risco ao longo do tempo</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-health-safe-soft text-health-safe text-sm font-medium">
              <Heart className="w-4 h-4" />
              -35% risco alto
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={healthTrendData}>
                <defs>
                  <linearGradient id="colorRiscoBaixo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--health-safe))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--health-safe))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRiscoMedio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--health-attention))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--health-attention))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRiscoAlto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--health-urgent))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--health-urgent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="riscoBaixo" 
                  stackId="1"
                  stroke="hsl(var(--health-safe))" 
                  fill="url(#colorRiscoBaixo)"
                  name="Risco Baixo %"
                />
                <Area 
                  type="monotone" 
                  dataKey="riscoMedio" 
                  stackId="1"
                  stroke="hsl(var(--health-attention))" 
                  fill="url(#colorRiscoMedio)"
                  name="Risco Médio %"
                />
                <Area 
                  type="monotone" 
                  dataKey="riscoAlto" 
                  stackId="1"
                  stroke="hsl(var(--health-urgent))" 
                  fill="url(#colorRiscoAlto)"
                  name="Risco Alto %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Historical Charts */}
      <div className="mb-6">
        <HistoricalCharts companyId={companyMembership?.company_id} />
      </div>

      {/* ROI Card */}
      <motion.div 
        className="bg-gradient-to-r from-primary to-pink-500 rounded-2xl p-6 mb-6"
        variants={staggerItem}
        whileHover={{ scale: 1.01 }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 text-primary-foreground">
          <div>
            <h3 className="text-xl font-bold mb-2">Projeção de ROI em Tempo Real</h3>
            <p className="text-sm opacity-90">Baseado na redução de absenteísmo e sinistralidade</p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold">4.8x</p>
              <p className="text-sm opacity-80">ROI Atual</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold">R$ 287k</p>
              <p className="text-sm opacity-80">Economia Estimada</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold">-23%</p>
              <p className="text-sm opacity-80">Absenteísmo</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* NEW: Invitations and Reports Section */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <InvitationTracker />
        <ReportScheduler />
      </div>

      {/* Email Analytics */}
      <div className="mb-6">
        <EmailAnalytics companyId={companyMembership?.company_id} />
      </div>

      {/* Department Comparison */}
      <div className="mb-6">
        <DepartmentComparison departments={departmentData.map(d => ({
          name: d.name,
          engajamento: d.engajamento,
          examesEmDia: d.exames,
          participacaoCampanhas: Math.round(d.engajamento * 0.9),
          pontosAcumulados: d.colaboradoras * 85,
          colaboradoras: d.colaboradoras,
          desafiosConcluidos: Math.round(d.engajamento * 0.85),
        }))} />
      </div>

      {/* Department Goals */}
      <div className="mb-6">
        <DepartmentGoals 
          companyId={companyMembership?.company_id} 
          departments={departmentData.map(d => d.name)} 
        />
      </div>

      {/* Department Gamification */}
      <div className="mb-6">
        <DepartmentGamification 
          companyId={companyMembership?.company_id}
          departments={departmentData.map(d => ({
            name: d.name,
            points: d.colaboradoras * 120,
            level: Math.floor(d.engajamento / 10) + 1,
            badges: [],
            streak: Math.floor(Math.random() * 15) + 1,
            engagementRate: d.engajamento,
            examsRate: d.exames,
            campaignsParticipation: Math.round(d.engajamento * 0.9),
            challengesCompleted: Math.round(d.colaboradoras * 0.7),
            employeeCount: d.colaboradoras,
          }))}
        />
      </div>

      {/* Department Notifications */}
      <div className="mb-6">
        <DepartmentNotifications companyId={companyMembership?.company_id} />
      </div>

      {/* Real-Time Missions Dashboard */}
      <div className="mb-6">
        <RealTimeMissionsDashboard companyId={companyMembership?.company_id} />
      </div>

      {/* Cross Department Missions */}
      <div className="mb-6">
        <CrossDepartmentMissions 
          companyId={companyMembership?.company_id}
          departments={departmentData.map(d => d.name)}
        />
      </div>

      {/* Department Achievements */}
      <div className="mb-6">
        <DepartmentAchievements companyId={companyMembership?.company_id} />
      </div>

      {/* Department Competition History */}
      <div className="mb-6">
        <DepartmentCompetitionHistory companyId={companyMembership?.company_id} />
      </div>

      {/* Monthly Report Generator */}
      <div className="mb-6">
        <MonthlyReportGenerator companyId={companyMembership?.company_id} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Department Engagement */}
        <div className="bg-card rounded-2xl shadow-card p-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-card-foreground">Engajamento por Departamento</h3>
              <p className="text-sm text-muted-foreground">Comparativo de áreas</p>
            </div>
            <button 
              onClick={() => setDepartmentDetailOpen(true)}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Ver detalhes
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="engajamento" 
                  fill="hsl(var(--primary))" 
                  name="Engajamento %" 
                  radius={[0, 4, 4, 0]} 
                  cursor="pointer"
                  onClick={(data) => {
                    const dept = departmentData.find(d => d.name === data.name);
                    if (dept) {
                      setSelectedDepartment(dept);
                      setDepartmentDetailOpen(true);
                    }
                  }}
                />
                <Bar 
                  dataKey="exames" 
                  fill="hsl(var(--secondary))" 
                  name="Exames em dia %" 
                  radius={[0, 4, 4, 0]} 
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign Performance */}
        <div className="bg-card rounded-2xl shadow-card p-6 animate-slide-up" style={{ animationDelay: "250ms" }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-card-foreground">Adesão às Campanhas</h3>
              <p className="text-sm text-muted-foreground">Performance mensal</p>
            </div>
            <button 
              onClick={() => setCampaignDetailOpen(true)}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Ver todas
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {campaignsList.slice(0, 3).map((campaign) => (
              <div 
                key={campaign.id} 
                onClick={() => {
                  setSelectedCampaign(campaign);
                  setCampaignDetailOpen(true);
                }}
                className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-card-foreground">{campaign.name}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      campaign.status === "completed" && "bg-health-safe-soft text-health-safe",
                      campaign.status === "active" && "bg-primary-soft text-primary",
                      campaign.status === "scheduled" && "bg-muted text-muted-foreground"
                    )}>
                      {campaign.status === "completed" ? "Finalizada" : campaign.status === "active" ? "Ativa" : "Agendada"}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-primary">{campaign.participation}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                    style={{ width: `${campaign.participation}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div 
            onClick={() => {
              const nextCampaign = campaignsList.find(c => c.status === "scheduled");
              if (nextCampaign) {
                setSelectedCampaign(nextCampaign);
                setCampaignDetailOpen(true);
              }
            }}
            className="mt-6 p-4 rounded-xl bg-primary-soft border border-primary/10 cursor-pointer hover:bg-primary-soft/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium text-card-foreground">Próxima Campanha</p>
                <p className="text-sm text-muted-foreground">Janeiro Branco - Saúde Mental</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Detail Modal */}
      <Dialog open={!!selectedKPI} onOpenChange={() => setSelectedKPI(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedKPI === "users" && <Users className="w-5 h-5 text-primary" />}
              {selectedKPI === "engagement" && <TrendingUp className="w-5 h-5 text-primary" />}
              {selectedKPI === "exams" && <Target className="w-5 h-5 text-primary" />}
              {selectedKPI === "content" && <BookOpen className="w-5 h-5 text-primary" />}
              {selectedKPI === "users" && "Colaboradoras Ativas"}
              {selectedKPI === "engagement" && "Taxa de Engajamento"}
              {selectedKPI === "exams" && "Exames em Dia"}
              {selectedKPI === "content" && "Conteúdos Consumidos"}
            </DialogTitle>
          </DialogHeader>
          {getKPIModalContent()}
        </DialogContent>
      </Dialog>

      {/* Engagement Detail Modal */}
      <Dialog open={engagementDetailOpen} onOpenChange={setEngagementDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Engajamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-primary-soft text-center">
                <p className="text-3xl font-bold text-primary">92</p>
                <p className="text-sm text-muted-foreground">Acessos este mês</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/20 text-center">
                <p className="text-3xl font-bold text-secondary">75</p>
                <p className="text-sm text-muted-foreground">Conteúdos consumidos</p>
              </div>
              <div className="p-4 rounded-xl bg-accent/20 text-center">
                <p className="text-3xl font-bold text-accent">52</p>
                <p className="text-sm text-muted-foreground">Exames agendados</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="acessos" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="conteudos" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="exames" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Age Distribution Detail Modal */}
      <Dialog open={ageDetailOpen} onOpenChange={setAgeDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Distribuição por Faixa Etária</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {ageDistribution.map((age) => (
              <div key={age.name} className="p-4 rounded-xl bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: age.color }} />
                    <span className="font-medium text-card-foreground">{age.name} anos</span>
                  </div>
                  <span className="font-bold" style={{ color: age.color }}>{age.value}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all" 
                    style={{ width: `${age.value}%`, backgroundColor: age.color }} 
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ~{Math.round(1247 * age.value / 100)} colaboradoras
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Department Detail Modal */}
      <Dialog open={departmentDetailOpen} onOpenChange={setDepartmentDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              {selectedDepartment ? `Departamento: ${selectedDepartment.name}` : "Departamentos"}
            </DialogTitle>
          </DialogHeader>
          {selectedDepartment ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-primary-soft text-center">
                  <p className="text-3xl font-bold text-primary">{selectedDepartment.engajamento}%</p>
                  <p className="text-sm text-muted-foreground">Engajamento</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/20 text-center">
                  <p className="text-3xl font-bold text-secondary">{selectedDepartment.exames}%</p>
                  <p className="text-sm text-muted-foreground">Exames em dia</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Colaboradoras</span>
                  <span className="font-bold text-card-foreground">{selectedDepartment.colaboradoras}</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  toast({
                    title: "Relatório sendo gerado",
                    description: `Relatório do departamento ${selectedDepartment.name} será enviado por email.`,
                  });
                  setDepartmentDetailOpen(false);
                }}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Exportar relatório do departamento
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {departmentData.map((dept) => (
                <div 
                  key={dept.name}
                  onClick={() => setSelectedDepartment(dept)}
                  className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-card-foreground">{dept.name}</p>
                      <p className="text-sm text-muted-foreground">{dept.colaboradoras} colaboradoras</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">{dept.engajamento}% eng.</p>
                      <p className="text-xs text-muted-foreground">{dept.exames}% exames</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Modal */}
      <Dialog open={campaignDetailOpen} onOpenChange={setCampaignDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {selectedCampaign ? selectedCampaign.name : "Campanhas"}
            </DialogTitle>
          </DialogHeader>
          {selectedCampaign ? (
            <div className="space-y-4">
              <div className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium inline-flex",
                selectedCampaign.status === "completed" && "bg-health-safe-soft text-health-safe",
                selectedCampaign.status === "active" && "bg-primary-soft text-primary",
                selectedCampaign.status === "scheduled" && "bg-muted text-muted-foreground"
              )}>
                {selectedCampaign.status === "completed" ? "Finalizada" : selectedCampaign.status === "active" ? "Em andamento" : "Agendada"}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30">
                  <p className="text-sm text-muted-foreground">Participação</p>
                  <p className="text-2xl font-bold text-primary">{selectedCampaign.participation}%</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <p className="text-sm text-muted-foreground">Participantes</p>
                  <p className="text-2xl font-bold text-card-foreground">{selectedCampaign.participants}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-muted/30">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Período</span>
                </div>
                <p className="font-medium text-card-foreground">
                  {selectedCampaign.startDate} - {selectedCampaign.endDate}
                </p>
              </div>
              {selectedCampaign.status === "scheduled" && (
                <button 
                  onClick={() => handleScheduleCampaign(selectedCampaign)}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  Confirmar lançamento da campanha
                </button>
              )}
              {selectedCampaign.status === "active" && (
                <button 
                  onClick={() => {
                    toast({
                      title: "Lembretes enviados!",
                      description: "352 colaboradoras receberão notificação sobre a campanha.",
                    });
                  }}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  Enviar lembretes de participação
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {campaignsList.map((campaign) => (
                <div 
                  key={campaign.id}
                  onClick={() => setSelectedCampaign(campaign)}
                  className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-card-foreground">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">{campaign.startDate} - {campaign.endDate}</p>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      campaign.status === "completed" && "bg-health-safe-soft text-health-safe",
                      campaign.status === "active" && "bg-primary-soft text-primary",
                      campaign.status === "scheduled" && "bg-muted text-muted-foreground"
                    )}>
                      {campaign.participation}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Activity Feed Modal */}
      <Dialog open={activityFeedOpen} onOpenChange={setActivityFeedOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Atividades em Tempo Real
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {realtimeEvents.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma atividade recente</p>
                <p className="text-sm text-muted-foreground/70">As atividades aparecerão aqui em tempo real</p>
              </div>
            ) : (
              <AnimatePresence>
                {realtimeEvents.map((event, index) => {
                  const style = getEventStyle(event.type);
                  const EventIcon = style.icon;
                  
                  return (
                    <motion.div
                      key={`${event.type}-${event.timestamp.getTime()}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border",
                        style.bg
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", style.bg)}>
                        <EventIcon className={cn("w-5 h-5", style.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-card-foreground text-sm">
                          {event.data.badgeName || event.data.rewardName || "Colaboradora"}{" "}
                          <span className="text-muted-foreground font-normal">{getEventLabel(event.type)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{formatTimeAgo(event.timestamp)}</p>
                      </div>
                      {event.data.badgeIcon && (
                        <span className="text-2xl">{event.data.badgeIcon}</span>
                      )}
                      {event.data.rewardIcon && (
                        <span className="text-2xl">{event.data.rewardIcon}</span>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
          
          {realtimeEvents.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {realtimeEvents.length} atividade{realtimeEvents.length !== 1 ? "s" : ""} recente{realtimeEvents.length !== 1 ? "s" : ""}
                </span>
                <button 
                  onClick={handleRefreshData}
                  className="text-primary font-medium hover:underline"
                >
                  Atualizar dados
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Invite Modal */}
      <BulkInviteModal open={bulkInviteOpen} onOpenChange={setBulkInviteOpen} />

      {/* HR Onboarding */}
      {showHROnboarding && companyDetails && (
        <HROnboarding 
          companyName={companyDetails.trading_name || companyDetails.name}
          onComplete={handleHROnboardingComplete}
        />
      )}
    </motion.div>
    <DemoRoleSwitcher />
  </MainLayout>
  );
};

export default HRDashboardPage;