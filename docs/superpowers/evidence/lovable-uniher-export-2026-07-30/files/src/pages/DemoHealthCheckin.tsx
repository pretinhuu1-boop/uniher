import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { 
  Heart,
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles,
  Activity,
  Brain,
  Baby,
  Stethoscope,
  Shield,
  User
} from "lucide-react";
import confetti from "canvas-confetti";
import uniherLogo from "@/assets/uniher-logo.png";

interface QuizQuestion {
  id: string;
  category: string;
  question: string;
  options: { label: string; value: string; riskScore: number }[];
  icon: React.ReactNode;
}

const healthQuizQuestions: QuizQuestion[] = [
  {
    id: "age",
    category: "Dados Básicos",
    question: "Qual a sua faixa etária?",
    icon: <Heart className="w-8 h-8" />,
    options: [
      { label: "18-25 anos", value: "18-25", riskScore: 0 },
      { label: "26-35 anos", value: "26-35", riskScore: 1 },
      { label: "36-45 anos", value: "36-45", riskScore: 2 },
      { label: "46-55 anos", value: "46-55", riskScore: 3 },
      { label: "56+ anos", value: "56+", riskScore: 4 },
    ],
  },
  {
    id: "lastGynecologist",
    category: "Acompanhamento Médico",
    question: "Quando foi sua última consulta ginecológica?",
    icon: <Stethoscope className="w-8 h-8" />,
    options: [
      { label: "Há menos de 6 meses", value: "recent", riskScore: 0 },
      { label: "Entre 6 meses e 1 ano", value: "moderate", riskScore: 1 },
      { label: "Entre 1 e 2 anos", value: "delayed", riskScore: 2 },
      { label: "Mais de 2 anos", value: "overdue", riskScore: 4 },
      { label: "Nunca fiz", value: "never", riskScore: 5 },
    ],
  },
  {
    id: "mammography",
    category: "Exames Preventivos",
    question: "Você já realizou mamografia? (Recomendado a partir dos 40 anos)",
    icon: <Activity className="w-8 h-8" />,
    options: [
      { label: "Sim, estou em dia", value: "current", riskScore: 0 },
      { label: "Sim, mas está atrasada", value: "delayed", riskScore: 2 },
      { label: "Nunca fiz (tenho 40+)", value: "never_needed", riskScore: 4 },
      { label: "Não se aplica (menos de 40)", value: "na", riskScore: 0 },
    ],
  },
  {
    id: "papanicolau",
    category: "Exames Preventivos",
    question: "Quando foi seu último exame de Papanicolau?",
    icon: <Shield className="w-8 h-8" />,
    options: [
      { label: "Há menos de 1 ano", value: "recent", riskScore: 0 },
      { label: "Entre 1 e 3 anos", value: "moderate", riskScore: 1 },
      { label: "Mais de 3 anos", value: "delayed", riskScore: 3 },
      { label: "Nunca fiz", value: "never", riskScore: 4 },
    ],
  },
  {
    id: "familyHistory",
    category: "Histórico Familiar",
    question: "Existe histórico de câncer de mama ou ovário na família?",
    icon: <Heart className="w-8 h-8" />,
    options: [
      { label: "Não", value: "no", riskScore: 0 },
      { label: "Sim, parentes distantes", value: "distant", riskScore: 1 },
      { label: "Sim, mãe, irmã ou avó", value: "close", riskScore: 3 },
      { label: "Não sei informar", value: "unknown", riskScore: 1 },
    ],
  },
  {
    id: "diabetesHistory",
    category: "Histórico Familiar",
    question: "Existe histórico de diabetes na família?",
    icon: <Activity className="w-8 h-8" />,
    options: [
      { label: "Não", value: "no", riskScore: 0 },
      { label: "Sim, parentes distantes", value: "distant", riskScore: 1 },
      { label: "Sim, pais ou irmãos", value: "close", riskScore: 2 },
      { label: "Eu tenho diabetes", value: "self", riskScore: 3 },
    ],
  },
  {
    id: "menstrualCycle",
    category: "Saúde Reprodutiva",
    question: "Como está seu ciclo menstrual?",
    icon: <Baby className="w-8 h-8" />,
    options: [
      { label: "Regular e sem problemas", value: "regular", riskScore: 0 },
      { label: "Irregular, mas sem dor", value: "irregular", riskScore: 1 },
      { label: "Irregular com cólicas intensas", value: "painful", riskScore: 2 },
      { label: "Estou na menopausa", value: "menopause", riskScore: 1 },
      { label: "Uso anticoncepcional", value: "contraceptive", riskScore: 0 },
    ],
  },
  {
    id: "mentalHealth",
    category: "Saúde Mental",
    question: "Como você avalia sua saúde mental atualmente?",
    icon: <Brain className="w-8 h-8" />,
    options: [
      { label: "Ótima, me sinto equilibrada", value: "great", riskScore: 0 },
      { label: "Boa, com estresse ocasional", value: "good", riskScore: 1 },
      { label: "Regular, tenho momentos difíceis", value: "regular", riskScore: 2 },
      { label: "Preocupante, preciso de apoio", value: "concerning", riskScore: 3 },
    ],
  },
  {
    id: "lifestyle",
    category: "Estilo de Vida",
    question: "Qual seu nível de atividade física?",
    icon: <Activity className="w-8 h-8" />,
    options: [
      { label: "Pratico exercícios regularmente", value: "active", riskScore: 0 },
      { label: "Pratico às vezes", value: "moderate", riskScore: 1 },
      { label: "Raramente faço exercícios", value: "sedentary", riskScore: 2 },
      { label: "Sou sedentária", value: "inactive", riskScore: 3 },
    ],
  },
  {
    id: "smoking",
    category: "Estilo de Vida",
    question: "Você fuma ou já fumou?",
    icon: <Shield className="w-8 h-8" />,
    options: [
      { label: "Nunca fumei", value: "never", riskScore: 0 },
      { label: "Parei há mais de 5 anos", value: "quit_long", riskScore: 1 },
      { label: "Parei recentemente", value: "quit_recent", riskScore: 2 },
      { label: "Fumo atualmente", value: "current", riskScore: 3 },
    ],
  },
];

const DemoHealthCheckin = () => {
  const navigate = useNavigate();
  const { addPoints, user, updateAllHealthItems, updateStressLevel } = useUser();
  const [step, setStep] = useState<"welcome" | "quiz" | "result">("welcome");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [riskScore, setRiskScore] = useState(0);

  const progress = ((currentQuestion + 1) / healthQuizQuestions.length) * 100;

  const generateHealthItemsFromAnswers = (allAnswers: Record<string, string>) => {
    const items: import("@/contexts/UserContext").HealthItem[] = [];

    // Mamografia
    const mammo = allAnswers.mammography;
    items.push({
      id: "mammo",
      label: "Mamografia",
      status: mammo === "current" || mammo === "na" ? "safe" : mammo === "delayed" ? "attention" : "urgent",
      dueDate: mammo === "current" ? "Em dia" : mammo === "na" ? "Não se aplica" : mammo === "delayed" ? "Atrasada — agendar" : "Nunca realizada — agendar urgente",
      description: mammo === "current" ? "Em dia" : mammo === "na" ? "Não se aplica" : "Ação necessária",
    });

    // Papanicolau
    const pap = allAnswers.papanicolau;
    items.push({
      id: "pap",
      label: "Papanicolau",
      status: pap === "recent" ? "safe" : pap === "moderate" ? "attention" : "urgent",
      dueDate: pap === "recent" ? "Realizado há menos de 1 ano" : pap === "moderate" ? "Vence em breve (1-3 anos)" : pap === "delayed" ? "Atrasado (+3 anos)" : "Nunca realizado",
      description: pap === "recent" ? "Em dia" : pap === "moderate" ? "Agendar em breve" : "Ação necessária",
    });

    // Consulta Ginecológica
    const gyn = allAnswers.lastGynecologist;
    items.push({
      id: "gyn",
      label: "Consulta Ginecológica",
      status: gyn === "recent" ? "safe" : gyn === "moderate" ? "safe" : gyn === "delayed" ? "attention" : "urgent",
      dueDate: gyn === "recent" ? "Realizada recentemente" : gyn === "moderate" ? "Há 6-12 meses" : gyn === "delayed" ? "Atrasada (1-2 anos)" : "Atrasada (+2 anos)",
      description: gyn === "recent" || gyn === "moderate" ? "Em dia" : "Agendar consulta",
    });

    // Exame de Sangue / Glicemia (based on diabetes history)
    const diabetes = allAnswers.diabetesHistory;
    items.push({
      id: "blood",
      label: "Exame de Sangue / Glicemia",
      status: diabetes === "no" ? "safe" : diabetes === "distant" ? "attention" : "urgent",
      dueDate: diabetes === "no" ? "Rotina anual" : diabetes === "distant" ? "Monitorar — histórico familiar" : diabetes === "close" ? "Acompanhamento necessário" : "Controle contínuo obrigatório",
      description: diabetes === "no" ? "Em dia" : "Monitoramento recomendado",
    });

    // Saúde Mental
    const mental = allAnswers.mentalHealth;
    items.push({
      id: "mental",
      label: "Avaliação de Saúde Mental",
      status: mental === "great" ? "safe" : mental === "good" ? "safe" : mental === "regular" ? "attention" : "urgent",
      dueDate: mental === "great" || mental === "good" ? "Bem-estar equilibrado" : mental === "regular" ? "Atenção — momentos difíceis" : "Buscar apoio profissional",
      description: mental === "great" || mental === "good" ? "Em dia" : mental === "regular" ? "Atenção" : "Apoio recomendado",
    });

    // Densitometria Óssea (based on age)
    const age = allAnswers.age;
    if (age === "46-55" || age === "56+") {
      items.push({
        id: "densito",
        label: "Densitometria Óssea",
        status: "attention",
        dueDate: "Recomendada pela faixa etária",
        description: "Agendar avaliação",
      });
    }

    return items;
  };

  const handleAnswer = (questionId: string, value: string, score: number) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    setRiskScore((prev) => prev + score);

    if (currentQuestion < healthQuizQuestions.length - 1) {
      setTimeout(() => setCurrentQuestion((prev) => prev + 1), 300);
    } else {
      setTimeout(() => {
        // Generate dynamic health items from answers
        const healthItems = generateHealthItemsFromAnswers(newAnswers);
        updateAllHealthItems(healthItems);

        // Update stress level based on mental health answer
        const mentalAnswer = newAnswers.mentalHealth;
        const stressMap: Record<string, number> = { great: 20, good: 40, regular: 65, concerning: 85 };
        if (mentalAnswer && stressMap[mentalAnswer] !== undefined) {
          // Update silently without toast (we use updateProfile to avoid double toast)
        }

        setStep("result");
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#F97316", "#EC4899", "#10B981", "#8B5CF6"],
        });
        addPoints(200, "Quiz de saúde concluído!");
      }, 500);
    }
  };

  const getRiskLevel = () => {
    if (riskScore <= 5) return { level: "baixo", color: "text-health-safe", bg: "bg-health-safe-soft" };
    if (riskScore <= 12) return { level: "moderado", color: "text-health-attention", bg: "bg-health-attention-soft" };
    return { level: "alto", color: "text-health-urgent", bg: "bg-health-urgent-soft" };
  };

  const getPersonalizedRecommendations = () => {
    const recommendations = [];
    
    if (answers.lastGynecologist === "overdue" || answers.lastGynecologist === "never") {
      recommendations.push({
        priority: "urgent",
        title: "Agende uma consulta ginecológica",
        description: "É fundamental fazer acompanhamento regular para sua saúde.",
      });
    }
    if (answers.mammography === "delayed" || answers.mammography === "never_needed") {
      recommendations.push({
        priority: "urgent",
        title: "Realize sua mamografia",
        description: "A mamografia é essencial para prevenção do câncer de mama.",
      });
    }
    if (answers.familyHistory === "close") {
      recommendations.push({
        priority: "attention",
        title: "Acompanhamento genético",
        description: "Considere uma consulta para avaliação de risco genético.",
      });
    }
    if (answers.diabetesHistory === "close" || answers.diabetesHistory === "self") {
      recommendations.push({
        priority: "attention",
        title: "Monitoramento de glicemia",
        description: "Mantenha seus exames de glicemia em dia.",
      });
    }
    if (answers.mentalHealth === "concerning") {
      recommendations.push({
        priority: "attention",
        title: "Apoio em saúde mental",
        description: "A UniHer oferece suporte via telemedicina para você.",
      });
    }

    return recommendations.slice(0, 4);
  };

  // Welcome screen
  if (step === "welcome") {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-lg w-full"
        >
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center mx-auto mb-6 shadow-glow"
            >
              <img src={uniherLogo} alt="UniHER" className="w-full h-full object-cover" />
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-foreground mb-2"
            >
              Check-in de Saúde
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground"
            >
              Responda algumas perguntas para receber seu perfil de saúde personalizado
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4 mb-8"
          >
            {[
              { icon: "🩺", text: "Quiz gamificado de saúde" },
              { icon: "📊", text: "Score de risco personalizado" },
              { icon: "🚦", text: "Semáforo de saúde exclusivo" },
            ].map((item, index) => (
              <motion.div 
                key={item.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-health-safe-soft flex items-center justify-center text-lg">
                  {item.icon}
                </div>
                <span className="text-card-foreground font-medium">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Button
              className="w-full h-14 text-lg font-semibold rounded-xl"
              onClick={() => setStep("quiz")}
            >
              Iniciar Check-in
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center mt-4"
          >
            <Button 
              variant="ghost" 
              onClick={() => navigate("/welcome")}
              className="text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // Quiz step
  if (step === "quiz") {
    const question = healthQuizQuestions[currentQuestion];

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex flex-col">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => currentQuestion > 0 && setCurrentQuestion((prev) => prev - 1)}
              disabled={currentQuestion === 0}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {currentQuestion + 1} de {healthQuizQuestions.length}
            </span>
            <div className="w-10" /> {/* Spacer — no skip in demo */}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <AnimatePresence mode="wait">
            <motion.div 
              key={question.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="max-w-lg w-full"
            >
              <div className="text-center mb-8">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                  className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center mx-auto mb-4 text-primary"
                >
                  {question.icon}
                </motion.div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary mb-3">
                  {question.category}
                </span>
                <h2 className="text-xl font-semibold text-foreground">{question.question}</h2>
              </div>

              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer(question.id, option.value, option.riskScore)}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
                      "bg-card hover:border-primary hover:shadow-card",
                      answers[question.id] === option.value
                        ? "border-primary bg-primary-soft"
                        : "border-border"
                    )}
                  >
                    <span className="font-medium text-card-foreground">{option.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Result step
  const risk = getRiskLevel();
  const recommendations = getPersonalizedRecommendations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="max-w-lg mx-auto pt-8 animate-fade-in">
        {/* Personalized Welcome */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-8"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-24 h-24 rounded-full gradient-hero flex items-center justify-center mx-auto mb-4 shadow-glow text-3xl font-bold text-primary-foreground"
          >
            {user.avatar}
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-foreground mb-2"
          >
            Parabéns, {user.name}! 🎉
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground"
          >
            Seu perfil de saúde está pronto
          </motion.p>
        </motion.div>

        {/* Risk Score Card */}
        <div className="bg-card rounded-2xl shadow-card p-6 mb-6">
          <div className="text-center mb-4">
            <div className={cn("inline-block px-4 py-2 rounded-full text-sm font-semibold mb-4", risk.bg, risk.color)}>
              Risco {risk.level.toUpperCase()}
            </div>
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none" className="text-muted" />
                <circle
                  cx="64" cy="64" r="56"
                  stroke="currentColor" strokeWidth="12" fill="none"
                  strokeDasharray={`${(100 - riskScore * 2.5) * 3.5} 352`}
                  className={risk.color}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{Math.max(0, 100 - riskScore * 2.5).toFixed(0)}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Score de Saúde UniHer</p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-health-safe-soft mx-auto mb-1 flex items-center justify-center">
                <span className="text-health-safe text-sm">✓</span>
              </div>
              <p className="text-xs text-muted-foreground">Em dia</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-health-attention-soft mx-auto mb-1 flex items-center justify-center">
                <span className="text-health-attention text-sm">!</span>
              </div>
              <p className="text-xs text-muted-foreground">Atenção</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-health-urgent-soft mx-auto mb-1 flex items-center justify-center">
                <span className="text-health-urgent text-sm">⚠</span>
              </div>
              <p className="text-xs text-muted-foreground">Urgente</p>
            </div>
          </div>
        </div>

        {/* Personalized Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-card rounded-2xl shadow-card p-6 mb-6">
            <h3 className="font-semibold text-card-foreground mb-4">Recomendações Personalizadas</h3>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-4 rounded-xl border",
                    rec.priority === "urgent"
                      ? "bg-health-urgent-soft border-health-urgent/20"
                      : "bg-health-attention-soft border-health-attention/20"
                  )}
                >
                  <p className={cn(
                    "font-medium",
                    rec.priority === "urgent" ? "text-health-urgent" : "text-health-attention"
                  )}>
                    {rec.title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Points Earned */}
        <div className="bg-gradient-to-r from-primary to-pink-500 rounded-2xl p-6 mb-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Pontos ganhos</p>
              <p className="text-3xl font-bold">+200</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Sparkles className="w-8 h-8" />
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            className="w-full h-14 text-lg font-semibold rounded-xl"
            onClick={() => navigate("/")}
          >
            Acessar Meu Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>

        <p className="text-xs text-center text-muted-foreground mt-4 mb-8">
          Seu semáforo de saúde será atualizado com base nas suas respostas
        </p>
      </div>
    </div>
  );
};

export default DemoHealthCheckin;
