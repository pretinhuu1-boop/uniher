import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";

export interface HealthItem {
  id: string;
  label: string;
  status: "safe" | "attention" | "urgent";
  dueDate?: string;
  description?: string;
  lastExamDate?: string;
  nextExamDate?: string;
  doctor?: string;
  location?: string;
  notes?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  category: string;
  duration: string;
  type: "video" | "article" | "quiz";
  thumbnail: string;
  progress: number;
  completed: boolean;
  content?: string;
  quizQuestions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "reminder" | "campaign" | "tip" | "achievement";
  time: string;
  read: boolean;
  actionType?: "schedule" | "content" | "campaign";
  actionId?: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  month: string;
  color: string;
  icon: string;
  progress: number;
  joined: boolean;
  tasks: CampaignTask[];
}

export interface CampaignTask {
  id: string;
  title: string;
  completed: boolean;
  points: number;
}

export interface UserProfile {
  id?: string;
  name: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  avatar: string;
  avatarUrl?: string;
  age: number;
  bloodType: string;
  weight: number;
  height: number;
  location: string;
  stressLevel: number;
  preferences: {
    preferredTime: string;
    consultationType: string;
    reminderDays: number;
    communicationChannel: string;
  };
  riskFactors: { id: string; label: string; value: boolean }[];
  points: number;
  streak: number;
  level: number;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

interface ScheduledExam {
  healthItemId: string;
  date: string;
  time: string;
  location: string;
  doctor: string;
  notes: string;
}

interface UserContextType {
  user: UserProfile;
  healthItems: HealthItem[];
  contents: ContentItem[];
  notifications: Notification[];
  campaigns: Campaign[];
  scheduledExams: ScheduledExam[];
  
  // Actions
  updateHealthItem: (id: string, updates: Partial<HealthItem>) => void;
  scheduleExam: (exam: ScheduledExam) => void;
  markContentProgress: (id: string, progress: number) => void;
  completeContent: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  joinCampaign: (id: string) => void;
  completeCampaignTask: (campaignId: string, taskId: string) => void;
  updateStressLevel: (level: number) => void;
  updatePreferences: (prefs: Partial<UserProfile["preferences"]>) => void;
  toggleRiskFactor: (id: string) => void;
  addPoints: (points: number, reason: string) => void;
  unlockAchievement: (id: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updateAllHealthItems: (items: HealthItem[]) => void;
}

const defaultUser: UserProfile = {
  id: "demo-user",
  name: "Ana Maria",
  fullName: "Ana Maria Silva",
  email: "ana.silva@empresa.com",
  phone: "(11) 99999-8888",
  birthDate: "1982-05-15",
  avatar: "AM",
  avatarUrl: undefined,
  age: 42,
  bloodType: "O+",
  weight: 68,
  height: 1.65,
  location: "São Paulo, SP",
  stressLevel: 55,
  preferences: {
    preferredTime: "morning",
    consultationType: "presential",
    reminderDays: 14,
    communicationChannel: "email_push",
  },
  riskFactors: [
    { id: "1", label: "Histórico familiar de câncer de mama", value: true },
    { id: "2", label: "Tabagismo atual ou passado", value: false },
    { id: "3", label: "Sedentarismo", value: true },
    { id: "4", label: "Obesidade", value: false },
    { id: "5", label: "Consumo excessivo de álcool", value: false },
    { id: "6", label: "Histórico de doenças cardíacas", value: false },
  ],
  points: 1250,
  streak: 12,
  level: 5,
  achievements: [
    { id: "1", title: "Primeira Consulta", description: "Realizou sua primeira consulta", icon: "🏥", unlocked: true, unlockedAt: "2024-01-15" },
    { id: "2", title: "Streak de 7 dias", description: "Acessou o app por 7 dias seguidos", icon: "🔥", unlocked: true, unlockedAt: "2024-02-01" },
    { id: "3", title: "Mestre dos Quizzes", description: "Complete 5 quizzes", icon: "🎓", unlocked: false },
    { id: "4", title: "Cuidado Contínuo", description: "Mantenha todos os exames em dia", icon: "✨", unlocked: false },
    { id: "5", title: "Streak de 30 dias", description: "Acessou o app por 30 dias seguidos", icon: "💎", unlocked: false },
  ],
};

const defaultHealthItems: HealthItem[] = [
  {
    id: "1",
    label: "Mamografia",
    status: "safe",
    dueDate: "Próximo em 8 meses",
    description: "Em dia",
    lastExamDate: "15/04/2024",
    nextExamDate: "15/12/2025",
    doctor: "Dra. Maria Santos",
    location: "Clínica São Lucas",
  },
  {
    id: "2",
    label: "Papanicolau",
    status: "attention",
    dueDate: "Vence em 2 meses",
    description: "Agendar em breve",
    lastExamDate: "10/01/2024",
    nextExamDate: "10/01/2025",
  },
  {
    id: "3",
    label: "Exame de Sangue",
    status: "urgent",
    dueDate: "Atrasado 3 meses",
    description: "Ação necessária",
    lastExamDate: "01/09/2023",
  },
  {
    id: "4",
    label: "Consulta Ginecológica",
    status: "safe",
    dueDate: "Realizada há 2 meses",
    description: "Em dia",
    lastExamDate: "20/10/2024",
    nextExamDate: "20/04/2025",
    doctor: "Dra. Juliana Ferreira",
  },
  {
    id: "5",
    label: "Densitometria Óssea",
    status: "attention",
    dueDate: "Vence em 1 mês",
    description: "Agendar",
    lastExamDate: "15/01/2023",
  },
];

const defaultContents: ContentItem[] = [
  {
    id: "1",
    title: "Autoexame de Mama: Passo a Passo",
    category: "Prevenção",
    duration: "5 min",
    type: "video",
    thumbnail: "🎥",
    progress: 100,
    completed: true,
    content: "Aprenda a realizar o autoexame de mama corretamente em 5 passos simples.",
  },
  {
    id: "2",
    title: "Alimentação e Saúde Hormonal",
    category: "Nutrição",
    duration: "8 min",
    type: "article",
    thumbnail: "📖",
    progress: 45,
    completed: false,
    content: "Descubra como a alimentação influencia diretamente seu equilíbrio hormonal e bem-estar.",
  },
  {
    id: "3",
    title: "Gerenciando o Estresse no Trabalho",
    category: "Bem-estar",
    duration: "10 min",
    type: "video",
    thumbnail: "🧘",
    progress: 0,
    completed: false,
    content: "Técnicas práticas para reduzir o estresse e aumentar a produtividade.",
  },
  {
    id: "4",
    title: "Quiz: Conheça seu Ciclo",
    category: "Autoconhecimento",
    duration: "3 min",
    type: "quiz",
    thumbnail: "❓",
    progress: 0,
    completed: false,
    quizQuestions: [
      {
        id: "q1",
        question: "Qual a duração média de um ciclo menstrual?",
        options: ["21 dias", "28 dias", "35 dias", "42 dias"],
        correctAnswer: 1,
      },
      {
        id: "q2",
        question: "Em qual fase do ciclo ocorre a ovulação?",
        options: ["Menstrual", "Folicular", "Ovulatória", "Lútea"],
        correctAnswer: 2,
      },
      {
        id: "q3",
        question: "O que pode indicar irregularidade menstrual persistente?",
        options: ["Nada preocupante", "Estresse passageiro", "Necessidade de avaliação médica", "Apenas mudança de rotina"],
        correctAnswer: 2,
      },
    ],
  },
];

const defaultNotifications: Notification[] = [
  {
    id: "1",
    title: "Lembrete de Exame",
    message: "Seu papanicolau vence em 2 meses. Agende agora!",
    type: "reminder",
    time: "Há 2 horas",
    read: false,
    actionType: "schedule",
    actionId: "2",
  },
  {
    id: "2",
    title: "Dezembro Laranja",
    message: "Nova trilha disponível sobre proteção solar",
    type: "campaign",
    time: "Há 1 dia",
    read: false,
    actionType: "campaign",
    actionId: "1",
  },
  {
    id: "3",
    title: "Dica do Dia",
    message: "Beba pelo menos 2L de água hoje ☀️",
    type: "tip",
    time: "Há 3 horas",
    read: true,
  },
];

const defaultCampaigns: Campaign[] = [
  {
    id: "1",
    title: "Dezembro Laranja",
    description: "Prevenção ao câncer de pele",
    month: "Dezembro",
    color: "from-orange-400 to-orange-600",
    icon: "☀️",
    progress: 65,
    joined: true,
    tasks: [
      { id: "t1", title: "Assistir vídeo sobre proteção solar", completed: true, points: 50 },
      { id: "t2", title: "Fazer quiz de conhecimento", completed: true, points: 100 },
      { id: "t3", title: "Agendar consulta dermatológica", completed: false, points: 200 },
      { id: "t4", title: "Compartilhar com uma amiga", completed: true, points: 50 },
    ],
  },
  {
    id: "2",
    title: "Janeiro Branco",
    description: "Saúde mental e emocional",
    month: "Janeiro",
    color: "from-slate-300 to-slate-500",
    icon: "🧠",
    progress: 0,
    joined: false,
    tasks: [
      { id: "t1", title: "Completar avaliação de bem-estar", completed: false, points: 100 },
      { id: "t2", title: "Praticar 5 minutos de meditação", completed: false, points: 50 },
      { id: "t3", title: "Ler artigo sobre saúde mental", completed: false, points: 50 },
      { id: "t4", title: "Registrar gratidão por 7 dias", completed: false, points: 150 },
    ],
  },
  {
    id: "3",
    title: "Outubro Rosa",
    description: "Prevenção ao câncer de mama",
    month: "Outubro",
    color: "from-pink-400 to-pink-600",
    icon: "🎀",
    progress: 100,
    joined: true,
    tasks: [
      { id: "t1", title: "Aprender autoexame de mama", completed: true, points: 100 },
      { id: "t2", title: "Agendar mamografia", completed: true, points: 200 },
      { id: "t3", title: "Completar quiz sobre câncer de mama", completed: true, points: 100 },
      { id: "t4", title: "Convidar amigas para a campanha", completed: true, points: 100 },
    ],
  },
];

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [healthItems, setHealthItems] = useState<HealthItem[]>(defaultHealthItems);
  const [contents, setContents] = useState<ContentItem[]>(defaultContents);
  const [notifications, setNotifications] = useState<Notification[]>(defaultNotifications);
  const [campaigns, setCampaigns] = useState<Campaign[]>(defaultCampaigns);
  const [scheduledExams, setScheduledExams] = useState<ScheduledExam[]>([]);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Listen to auth changes and load profile from database
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id ?? null;
      setAuthUserId(userId);

      if (userId) {
        // Defer Supabase call to avoid deadlock
        setTimeout(() => {
          loadProfileFromDatabase(userId);
        }, 0);
      } else {
        // Reset to default user when logged out
        setUser(defaultUser);
      }
    });

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const userId = session?.user?.id ?? null;
      setAuthUserId(userId);
      if (userId) {
        loadProfileFromDatabase(userId);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfileFromDatabase = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile:", error);
        return;
      }

      if (data) {
        const firstName = data.full_name?.split(" ")[0] || "Usuário";
        setUser(prev => ({
          ...prev,
          id: data.id,
          name: firstName,
          fullName: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
          birthDate: data.birth_date || "",
          age: data.age || 0,
          bloodType: data.blood_type || "",
          weight: Number(data.weight) || 0,
          height: Number(data.height) ? Number(data.height) / 100 : 0,
          location: data.location || "",
          stressLevel: data.stress_level || 50,
          avatarUrl: data.avatar_url || undefined,
          avatar: firstName.slice(0, 2).toUpperCase(),
          points: data.points || 0,
          streak: data.streak || 0,
          level: data.level || 1,
          preferences: (data.preferences as unknown as UserProfile["preferences"]) || defaultUser.preferences,
          riskFactors: (data.risk_factors as unknown as UserProfile["riskFactors"]) || defaultUser.riskFactors,
          achievements: (data.achievements as unknown as UserProfile["achievements"]) || defaultUser.achievements,
        }));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const saveProfileToDatabase = useCallback(async (updates: Partial<UserProfile>) => {
    if (!authUserId) return;

    try {
      const dbUpdates: Record<string, any> = {};
      
      if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate;
      if (updates.age !== undefined) dbUpdates.age = updates.age;
      if (updates.bloodType !== undefined) dbUpdates.blood_type = updates.bloodType;
      if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
      if (updates.height !== undefined) dbUpdates.height = updates.height * 100; // Convert m to cm
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.stressLevel !== undefined) dbUpdates.stress_level = updates.stressLevel;
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
      if (updates.points !== undefined) dbUpdates.points = updates.points;
      if (updates.streak !== undefined) dbUpdates.streak = updates.streak;
      if (updates.level !== undefined) dbUpdates.level = updates.level;
      if (updates.preferences !== undefined) dbUpdates.preferences = updates.preferences;
      if (updates.riskFactors !== undefined) dbUpdates.risk_factors = updates.riskFactors;
      if (updates.achievements !== undefined) dbUpdates.achievements = updates.achievements;

      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from("profiles").update(dbUpdates).eq("user_id", authUserId);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  }, [authUserId]);

  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#F97316", "#EC4899", "#10B981", "#8B5CF6"],
    });
  }, []);

  const addPoints = useCallback((points: number, reason: string) => {
    setUser((prev) => {
      const newPoints = prev.points + points;
      const newLevel = Math.floor(newPoints / 500) + 1;
      const leveledUp = newLevel > prev.level;

      if (leveledUp) {
        setTimeout(() => {
          triggerConfetti();
          toast({
            title: "🎉 Subiu de Nível!",
            description: `Você alcançou o nível ${newLevel}! Continue cuidando de você.`,
          });
        }, 100);
      }

      return { ...prev, points: newPoints, level: newLevel };
    });

    toast({
      title: `+${points} pontos`,
      description: reason,
    });
  }, [triggerConfetti]);

  const unlockAchievement = useCallback((id: string) => {
    setUser((prev) => ({
      ...prev,
      achievements: prev.achievements.map((a) =>
        a.id === id ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a
      ),
    }));

    const achievement = defaultUser.achievements.find((a) => a.id === id);
    if (achievement) {
      triggerConfetti();
      toast({
        title: `🏆 Conquista Desbloqueada!`,
        description: `${achievement.icon} ${achievement.title}`,
      });
    }
  }, [triggerConfetti]);

  const updateHealthItem = useCallback((id: string, updates: Partial<HealthItem>) => {
    setHealthItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const scheduleExam = useCallback((exam: ScheduledExam) => {
    setScheduledExams((prev) => [...prev, exam]);
    updateHealthItem(exam.healthItemId, {
      status: "safe",
      description: "Agendado",
      dueDate: `Agendado para ${exam.date}`,
      nextExamDate: exam.date,
      doctor: exam.doctor,
      location: exam.location,
    });

    addPoints(100, "Exame agendado com sucesso!");

    // Check if all exams are now safe
    setTimeout(() => {
      setHealthItems((current) => {
        const allSafe = current.every((item) => item.status === "safe");
        if (allSafe) {
          unlockAchievement("4");
        }
        return current;
      });
    }, 500);
  }, [updateHealthItem, addPoints, unlockAchievement]);

  const markContentProgress = useCallback((id: string, progress: number) => {
    setContents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, progress: Math.min(100, progress) } : c))
    );
  }, []);

  const completeContent = useCallback((id: string) => {
    setContents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, progress: 100, completed: true } : c))
    );

    const content = contents.find((c) => c.id === id);
    if (content) {
      const points = content.type === "quiz" ? 100 : content.type === "video" ? 75 : 50;
      addPoints(points, `Conteúdo "${content.title}" concluído!`);

      // Check quiz achievement
      if (content.type === "quiz") {
        setTimeout(() => {
          setContents((current) => {
            const completedQuizzes = current.filter((c) => c.type === "quiz" && c.completed).length;
            if (completedQuizzes >= 5) {
              unlockAchievement("3");
            }
            return current;
          });
        }, 500);
      }
    }
  }, [contents, addPoints, unlockAchievement]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast({
      title: "Notificações lidas",
      description: "Todas as notificações foram marcadas como lidas.",
    });
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const joinCampaign = useCallback((id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, joined: true } : c))
    );
    addPoints(50, "Você entrou em uma nova campanha!");
  }, [addPoints]);

  const completeCampaignTask = useCallback((campaignId: string, taskId: string) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === campaignId) {
          const updatedTasks = c.tasks.map((t) =>
            t.id === taskId ? { ...t, completed: true } : t
          );
          const completedCount = updatedTasks.filter((t) => t.completed).length;
          const progress = Math.round((completedCount / updatedTasks.length) * 100);
          
          const task = c.tasks.find((t) => t.id === taskId);
          if (task && !task.completed) {
            addPoints(task.points, `Tarefa "${task.title}" concluída!`);
          }

          if (progress === 100 && c.progress < 100) {
            setTimeout(() => {
              triggerConfetti();
              toast({
                title: "🎉 Campanha Concluída!",
                description: `Parabéns! Você completou a campanha ${c.title}!`,
              });
            }, 100);
          }

          return { ...c, tasks: updatedTasks, progress };
        }
        return c;
      })
    );
  }, [addPoints, triggerConfetti]);

  const updateStressLevel = useCallback((level: number) => {
    setUser((prev) => ({ ...prev, stressLevel: level }));
    saveProfileToDatabase({ stressLevel: level });
    toast({
      title: "Nível de estresse atualizado",
      description: level < 30 ? "Ótimo! Continue assim." : level < 60 ? "Atenção ao seu bem-estar." : "Considere técnicas de relaxamento.",
    });
  }, [saveProfileToDatabase]);

  const updatePreferences = useCallback((prefs: Partial<UserProfile["preferences"]>) => {
    setUser((prev) => {
      const newPreferences = { ...prev.preferences, ...prefs };
      saveProfileToDatabase({ preferences: newPreferences });
      return {
        ...prev,
        preferences: newPreferences,
      };
    });
    toast({
      title: "Preferências salvas",
      description: "Suas preferências foram atualizadas com sucesso.",
    });
  }, [saveProfileToDatabase]);

  const toggleRiskFactor = useCallback((id: string) => {
    setUser((prev) => {
      const newRiskFactors = prev.riskFactors.map((rf) =>
        rf.id === id ? { ...rf, value: !rf.value } : rf
      );
      saveProfileToDatabase({ riskFactors: newRiskFactors });
      return {
        ...prev,
        riskFactors: newRiskFactors,
      };
    });
  }, [saveProfileToDatabase]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...updates }));
    saveProfileToDatabase(updates);
    toast({
      title: "Perfil atualizado",
      description: "Suas informações foram salvas com sucesso.",
    });
  }, [saveProfileToDatabase]);

  const updateAllHealthItems = useCallback((items: HealthItem[]) => {
    setHealthItems(items);
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        healthItems,
        contents,
        notifications,
        campaigns,
        scheduledExams,
        updateHealthItem,
        scheduleExam,
        markContentProgress,
        completeContent,
        markNotificationRead,
        markAllNotificationsRead,
        dismissNotification,
        joinCampaign,
        completeCampaignTask,
        updateStressLevel,
        updatePreferences,
        toggleRiskFactor,
        addPoints,
        unlockAchievement,
        updateProfile,
        updateAllHealthItems,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
