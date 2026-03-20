const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = 'UniHER';
pres.title = 'UniHER — Saúde Feminina que Engaja';

// ── Color Palette ──
const C = {
  rose:    "F43F5E",
  roseDk:  "C01040",
  gold:    "B8922A",
  goldLt:  "F5E6C0",
  cream:   "FDF6F0",
  creamMd: "F7EDE5",
  dark:    "1A0A00",
  darkMd:  "2D1A10",
  white:   "FFFFFF",
  gray:    "6B7280",
  grayLt:  "F3F4F6",
  green:   "16A34A",
  amber:   "D97706",
  red:     "DC2626",
};

const makeShadow = () => ({ type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.12 });

// ════════════════════════════════════════════════
// SLIDE 1 — CAPA
// ════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.dark };

  // Rose accent bar left
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color: C.rose }, line: { color: C.rose } });

  // Gold decorative dots (right side)
  for (let i = 0; i < 5; i++) {
    s.addShape(pres.shapes.OVAL, {
      x: 8.8 + (i % 3) * 0.45, y: 0.4 + i * 0.55, w: 0.18, h: 0.18,
      fill: { color: C.gold, transparency: i * 15 }, line: { color: C.gold }
    });
  }

  // Large background circle (decorative)
  s.addShape(pres.shapes.OVAL, {
    x: 6.5, y: -1.5, w: 5, h: 5,
    fill: { color: C.rose, transparency: 88 }, line: { color: C.rose, transparency: 88 }
  });
  s.addShape(pres.shapes.OVAL, {
    x: 7.5, y: 2.5, w: 3, h: 3,
    fill: { color: C.gold, transparency: 90 }, line: { color: C.gold, transparency: 90 }
  });

  // Heart-like icon (circle cluster)
  s.addShape(pres.shapes.OVAL, { x: 0.55, y: 0.55, w: 0.55, h: 0.55, fill: { color: C.gold }, line: { color: C.gold } });

  // Tag: SaaS
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.65, y: 0.5, w: 1.8, h: 0.32, fill: { color: C.rose, transparency: 80 }, line: { color: C.rose }, rectRadius: 0.05
  });
  s.addText("B2B SaaS · Saúde Feminina", { x: 0.65, y: 0.5, w: 1.8, h: 0.32, fontSize: 7, color: C.rose, bold: true, align: "center", margin: 0 });

  // Main title
  s.addText("UniHER", {
    x: 0.5, y: 1.1, w: 9, h: 1.4,
    fontSize: 72, fontFace: "Georgia", color: C.white, bold: true, align: "left", margin: 0
  });

  // Rose accent on HER
  s.addText("HER", {
    x: 3.17, y: 1.1, w: 3, h: 1.4,
    fontSize: 72, fontFace: "Georgia", color: C.rose, bold: true, align: "left", margin: 0
  });

  // Tagline
  s.addText("Saúde Feminina que Engaja", {
    x: 0.5, y: 2.55, w: 8, h: 0.55,
    fontSize: 24, fontFace: "Georgia", color: C.goldLt, italic: true, align: "left", margin: 0
  });

  // Subtitle
  s.addText("O Duolingo da Saúde Feminina no Trabalho", {
    x: 0.5, y: 3.2, w: 8, h: 0.4,
    fontSize: 14, fontFace: "Calibri", color: "CCBBAA", align: "left", margin: 0
  });

  // Horizontal rule
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 3.72, w: 4, h: 0.025, fill: { color: C.gold }, line: { color: C.gold } });

  // Three pillars row
  const pillars = [
    { icon: "🎮", label: "Gamificação" },
    { icon: "💗", label: "Saúde" },
    { icon: "📊", label: "Dados para RH" },
  ];
  pillars.forEach((p, i) => {
    const x = 0.5 + i * 2.5;
    s.addText(p.icon, { x, y: 4.0, w: 0.5, h: 0.4, fontSize: 20, align: "left", margin: 0 });
    s.addText(p.label, { x: x + 0.55, y: 4.05, w: 1.8, h: 0.35, fontSize: 11, color: "CCBBAA", fontFace: "Calibri", align: "left", margin: 0 });
  });

  // Bottom date / version
  s.addText("2026 · Versão 1.0", {
    x: 0.5, y: 5.2, w: 4, h: 0.25, fontSize: 9, color: "776655", align: "left", margin: 0
  });
}

// ════════════════════════════════════════════════
// SLIDE 2 — O PROBLEMA
// ════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.cream };

  // Top accent bar
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.rose }, line: { color: C.rose } });

  s.addText("O Problema que Ninguém Fala", {
    x: 0.5, y: 0.25, w: 9, h: 0.65,
    fontSize: 30, fontFace: "Georgia", color: C.dark, bold: true, align: "left", margin: 0
  });
  s.addText("Saúde feminina no trabalho é invisível — e isso custa caro para as empresas.", {
    x: 0.5, y: 0.95, w: 9, h: 0.35, fontSize: 13, fontFace: "Calibri", color: C.gray, align: "left", margin: 0
  });

  // 3 stat cards
  const stats = [
    { num: "73%", label: "das colaboradoras", sub: "nunca falaram sobre saúde no trabalho", color: C.rose },
    { num: "3x", label: "mais absenteísmo", sub: "em empresas sem programas de saúde feminina", color: C.gold },
    { num: "R$ 28 bi", label: "perdidos por ano", sub: "em produtividade no Brasil por problemas de saúde feminina não tratados", color: C.dark },
  ];

  stats.forEach((st, i) => {
    const x = 0.4 + i * 3.1;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.55, w: 2.9, h: 2.6, fill: { color: C.white }, line: { color: "E5D5CB" }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.55, w: 2.9, h: 0.065, fill: { color: st.color }, line: { color: st.color } });
    s.addText(st.num, { x, y: 1.75, w: 2.9, h: 0.85, fontSize: 42, fontFace: "Georgia", color: st.color, bold: true, align: "center", margin: 0 });
    s.addText(st.label, { x, y: 2.6, w: 2.9, h: 0.3, fontSize: 10, fontFace: "Calibri", color: C.dark, bold: true, align: "center", margin: 0 });
    s.addText(st.sub, { x: x + 0.15, y: 2.95, w: 2.6, h: 0.9, fontSize: 9.5, fontFace: "Calibri", color: C.gray, align: "center", margin: 0 });
  });

  // Bottom callout
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 4.4, w: 9.2, h: 0.9, fill: { color: "FEE2E2" }, line: { color: "FECACA" } });
  s.addText("⚠️  Empresas que ignoram a saúde feminina enfrentam turnover elevado, clima organizacional ruim e perda de talentos.", {
    x: 0.6, y: 4.47, w: 8.8, h: 0.76, fontSize: 11.5, fontFace: "Calibri", color: C.roseDk, align: "left", margin: 0
  });
}

// ════════════════════════════════════════════════
// SLIDE 3 — A SOLUÇÃO
// ════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.rose };

  // Decorative circles
  s.addShape(pres.shapes.OVAL, { x: 7.5, y: -0.5, w: 4, h: 4, fill: { color: C.roseDk, transparency: 60 }, line: { color: C.roseDk, transparency: 60 } });
  s.addShape(pres.shapes.OVAL, { x: -0.5, y: 3, w: 3, h: 3, fill: { color: C.roseDk, transparency: 70 }, line: { color: C.roseDk, transparency: 70 } });

  s.addText("A Solução:", {
    x: 0.5, y: 0.4, w: 9, h: 0.5,
    fontSize: 18, fontFace: "Georgia", color: "FFCDD9", italic: true, align: "left", margin: 0
  });
  s.addText("UniHER", {
    x: 0.5, y: 0.9, w: 9, h: 1.1,
    fontSize: 58, fontFace: "Georgia", color: C.white, bold: true, align: "left", margin: 0
  });
  s.addText("A plataforma que transforma saúde feminina em engajamento real —\ncom gamificação, dados e acompanhamento contínuo.", {
    x: 0.5, y: 2.05, w: 6.5, h: 0.8,
    fontSize: 13.5, fontFace: "Calibri", color: "FFE4EC", align: "left", margin: 0
  });

  // 3 pillar boxes
  const pillars = [
    { icon: "🎮", title: "Gamificação", desc: "Missões diárias, XP, níveis, ligas e badges que mantêm o engajamento ativo todos os dias." },
    { icon: "💗", title: "Saúde Personalizada", desc: "Semáforo de saúde em 6 dimensões, quiz de arquétipo e trilhas adaptadas a cada colaboradora." },
    { icon: "📊", title: "Dados para o RH", desc: "Dashboard com KPIs em tempo real, ranking de departamentos, ROI e exportação de relatórios." },
  ];

  pillars.forEach((p, i) => {
    const x = 0.4 + i * 3.15;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 3.1, w: 3.0, h: 2.2, fill: { color: C.white, transparency: 10 }, line: { color: C.white, transparency: 40 }, shadow: makeShadow() });
    s.addText(p.icon, { x, y: 3.2, w: 3.0, h: 0.55, fontSize: 26, align: "center", margin: 0 });
    s.addText(p.title, { x, y: 3.78, w: 3.0, h: 0.35, fontSize: 12, fontFace: "Georgia", color: C.dark, bold: true, align: "center", margin: 0 });
    s.addText(p.desc, { x: x + 0.12, y: 4.18, w: 2.76, h: 0.85, fontSize: 9, fontFace: "Calibri", color: "3D1A10", align: "center", margin: 0 });
  });
}

// ════════════════════════════════════════════════
// SLIDE 4 — COMO FUNCIONA (Fluxo)
// ════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.white };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.gold }, line: { color: C.gold } });
  s.addText("Como Funciona", {
    x: 0.5, y: 0.22, w: 9, h: 0.6, fontSize: 30, fontFace: "Georgia", color: C.dark, bold: true, align: "left", margin: 0
  });
  s.addText("Da contratação ao engajamento contínuo — em 5 etapas simples.", {
    x: 0.5, y: 0.88, w: 9, h: 0.32, fontSize: 12.5, fontFace: "Calibri", color: C.gray, align: "left", margin: 0
  });

  const steps = [
    { num: "01", title: "Empresa contrata", desc: "RH configura a plataforma com identidade visual e convida colaboradoras.", color: C.rose },
    { num: "02", title: "Quiz de Arquétipo", desc: "Cada colaboradora descobre seu perfil de saúde em um quiz interativo.", color: C.gold },
    { num: "03", title: "Missões Diárias", desc: "Registro real de humor, hidratação, desafios e semáforo de saúde.", color: C.rose },
    { num: "04", title: "Gamificação", desc: "XP, níveis, ligas semanais e badges que criam hábitos saudáveis.", color: C.gold },
    { num: "05", title: "Dados para o RH", desc: "Dashboard com KPIs, alertas de risco e relatórios exportáveis.", color: C.dark },
  ];

  steps.forEach((st, i) => {
    const x = 0.4 + i * 1.88;
    // Card
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.45, w: 1.75, h: 3.6, fill: { color: C.cream }, line: { color: "E5D0C8" }, shadow: makeShadow() });
    // Number circle
    s.addShape(pres.shapes.OVAL, { x: x + 0.5, y: 1.6, w: 0.75, h: 0.75, fill: { color: st.color }, line: { color: st.color } });
    s.addText(st.num, { x: x + 0.5, y: 1.6, w: 0.75, h: 0.75, fontSize: 14, color: C.white, bold: true, align: "center", valign: "middle", margin: 0 });
    // Title
    s.addText(st.title, { x: x + 0.1, y: 2.48, w: 1.55, h: 0.55, fontSize: 11, fontFace: "Georgia", color: C.dark, bold: true, align: "center", margin: 0 });
    // Desc
    s.addText(st.desc, { x: x + 0.1, y: 3.1, w: 1.55, h: 1.8, fontSize: 9, fontFace: "Calibri", color: C.gray, align: "center", margin: 0 });
    // Arrow (not after last)
    if (i < 4) {
      s.addShape(pres.shapes.RECTANGLE, { x: x + 1.75, y: 2.7, w: 0.13, h: 0.025, fill: { color: C.gold }, line: { color: C.gold } });
    }
  });
}

// ════════════════════════════════════════════════
// SLIDE 5 — COLABORADORA
// ════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.cream };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.rose }, line: { color: C.rose } });

  // Left column: title
  s.addText("Experiência da\nColaboradora", {
    x: 0.4, y: 0.22, w: 3.8, h: 1.2, fontSize: 28, fontFace: "Georgia", color: C.dark, bold: true, align: "left", margin: 0
  });
  s.addText("Uma jornada gamificada que torna o cuidado com a saúde parte da rotina.", {
    x: 0.4, y: 1.45, w: 3.8, h: 0.7, fontSize: 11.5, fontFace: "Calibri", color: C.gray, align: "left", margin: 0
  });

  // Feature cards (right side)
  const features = [
    { icon: "⭐", title: "Missões Diárias", desc: "Registro real: humor, hidratação, desafios e semáforo — não apenas um clique." },
    { icon: "🔥", title: "Streak & XP", desc: "Sequência de dias, pontos de experiência e evolução de nível visível." },
    { icon: "🏆", title: "Liga Semanal", desc: "Competição saudável entre colegas: Bronze → Prata → Ouro → Diamante." },
    { icon: "🏅", title: "Badges & Conquistas", desc: "Medalhas desbloqueáveis por metas reais: 7 dias seguidos, 50 desafios, e mais." },
    { icon: "🚦", title: "Semáforo de Saúde", desc: "6 dimensões de bem-estar: Prevenção, Sono, Energia, Mental, Hábitos, Engajamento." },
    { icon: "🆘", title: "Botão de Pânico", desc: "Contato de confiança acionado com um toque — privacidade total." },
  ];

  const cols = 2;
  features.forEach((f, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 4.55 + col * 2.7;
    const y = 0.25 + row * 1.7;

    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 2.55, h: 1.55, fill: { color: C.white }, line: { color: "E5D5CB" }, shadow: makeShadow() });
    s.addShape(pres.shapes.OVAL, { x: x + 0.12, y: y + 0.17, w: 0.45, h: 0.45, fill: { color: C.rose, transparency: 85 }, line: { color: C.rose, transparency: 85 } });
    s.addText(f.icon, { x: x + 0.12, y: y + 0.17, w: 0.45, h: 0.45, fontSize: 16, align: "center", margin: 0 });
    s.addText(f.title, { x: x + 0.65, y: y + 0.18, w: 1.8, h: 0.35, fontSize: 10.5, fontFace: "Georgia", color: C.dark, bold: true, align: "left", margin: 0 });
    s.addText(f.desc, { x: x + 0.12, y: y + 0.62, w: 2.3, h: 0.75, fontSize: 8.5, fontFace: "Calibri", color: C.gray, align: "left", margin: 0 });
  });
}

// ════════════════════════════════════════════════
// SLIDE 6 — RH / LIDERANÇA
// ════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.white };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.gold }, line: { color: C.gold } });
  s.addText("Dashboard RH & Liderança", {
    x: 0.5, y: 0.22, w: 9, h: 0.6, fontSize: 30, fontFace: "Georgia", color: C.dark, bold: true, align: "left", margin: 0
  });
  s.addText("Visibilidade total sobre a saúde e engajamento da equipe — sem achismos.", {
    x: 0.5, y: 0.88, w: 9, h: 0.32, fontSize: 12.5, fontFace: "Calibri", color: C.gray, align: "left", margin: 0
  });

  // KPI cards row
  const kpis = [
    { label: "Engajamento", value: "87%", icon: "📈", color: C.rose },
    { label: "Saúde Geral", value: "7.2", icon: "💗", color: C.green },
    { label: "Campanhas Ativas", value: "3", icon: "📅", color: C.gold },
    { label: "ROI Estimado", value: "4.2x", icon: "💰", color: C.dark },
  ];
  kpis.forEach((k, i) => {
    const x = 0.4 + i * 2.3;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.42, w: 2.15, h: 1.15, fill: { color: C.grayLt }, line: { color: "E0E7EF" }, shadow: makeShadow() });
    s.addText(k.icon + " " + k.value, { x, y: 1.5, w: 2.15, h: 0.55, fontSize: 22, fontFace: "Georgia", color: k.color, bold: true, align: "center", margin: 0 });
    s.addText(k.label, { x, y: 2.08, w: 2.15, h: 0.35, fontSize: 9.5, fontFace: "Calibri", color: C.gray, align: "center", margin: 0 });
  });

  // Feature list: 2 columns
  const rhFeatures = [
    { icon: "📊", title: "KPIs em Tempo Real", desc: "Engajamento, saúde, absenteísmo e campanhas atualizados automaticamente." },
    { icon: "🏅", title: "Ranking de Departamentos", desc: "Veja quais áreas estão mais engajadas e onde há oportunidade de melhoria." },
    { icon: "🚦", title: "Semáforo de Risco", desc: "Identifique dimensões de saúde críticas na equipe antes que virem problema." },
    { icon: "✉️", title: "Sistema de Convites", desc: "Links únicos, uso único, expiração configurável — controle total do onboarding." },
    { icon: "📋", title: "Relatórios Exportáveis", desc: "Dados de engajamento, ROI e saúde em CSV para apresentar à diretoria." },
    { icon: "🔔", title: "Alertas para a Equipe", desc: "Envie mensagens motivacionais e lembretes diretamente para as colaboradoras." },
  ];

  rhFeatures.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + col * 4.8;
    const y = 2.78 + row * 0.85;

    s.addShape(pres.shapes.OVAL, { x: x, y: y + 0.06, w: 0.38, h: 0.38, fill: { color: C.gold, transparency: 80 }, line: { color: C.gold, transparency: 80 } });
    s.addText(f.icon, { x, y: y + 0.06, w: 0.38, h: 0.38, fontSize: 14, align: "center", margin: 0 });
    s.addText(f.title, { x: x + 0.48, y: y + 0.06, w: 3.8, h: 0.25, fontSize: 10.5, fontFace: "Georgia", color: C.dark, bold: true, align: "left", margin: 0 });
    s.addText(f.desc, { x: x + 0.48, y: y + 0.33, w: 3.8, h: 0.38, fontSize: 9, fontFace: "Calibri", color: C.gray, align: "left", margin: 0 });
  });
}

// ════════════════════════════════════════════════
// SLIDE 7 — GAMIFICAÇÃO
// ════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.darkMd };

  // Decorative shapes
  s.addShape(pres.shapes.OVAL, { x: 7, y: -1, w: 5, h: 5, fill: { color: C.rose, transparency: 88 }, line: { color: C.rose, transparency: 88 } });
  s.addShape(pres.shapes.OVAL, { x: -1, y: 3, w: 4, h: 4, fill: { color: C.gold, transparency: 90 }, line: { color: C.gold, transparency: 90 } });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.07, fill: { color: C.rose }, line: { color: C.rose } });
  s.addText("Sistema de Gamificação", {
    x: 0.5, y: 0.22, w: 9, h: 0.6, fontSize: 30, fontFace: "Georgia", color: C.white, bold: true, align: "left", margin: 0
  });
  s.addText("Engajamento que não depende de força de vontade — depende de design.", {
    x: 0.5, y: 0.88, w: 9, h: 0.32, fontSize: 12.5, fontFace: "Calibri", color: "CCBBAA", align: "left", margin: 0
  });

  // Mechanics grid
  const mechanics = [
    { icon: "📋", title: "Missões Diárias", points: ["3 missões por dia, escolhidas por algoritmo", "Cada tipo exige registro real (humor, copos, desafio)", "Não é possível completar sem de fato registrar"], color: C.rose },
    { icon: "⚡", title: "XP & Níveis", points: ["XP ganho em cada ação (check-in, desafio, badge)", "Progressão de nível com curva crescente", "Meta diária de XP com barra de progresso"], color: C.gold },
    { icon: "🔥", title: "Streak Diário", points: ["Sequência de dias consecutivos com ação", "Marcos a cada 7, 14, 30, 60 e 100 dias", "Freeze de streak disponível como recompensa"], color: C.rose },
    { icon: "🏆", title: "Liga Semanal", points: ["Bronze → Prata → Ouro → Diamante", "Ranking entre colegas renovado semanalmente", "Promoção e rebaixamento automáticos"], color: C.gold },
    { icon: "🏅", title: "Badges & Conquistas", points: ["Desbloqueio automático por metas reais", "Ex: 7 dias de streak, 50 desafios, 6 dimensões ≥ 7", "Visíveis no perfil e compartilháveis"], color: C.rose },
    { icon: "✅", title: "Desafios", points: ["Padrão (curados) e personalizados pela usuária", "Progresso incremental registrado", "Categorias: saúde mental, sono, hábitos, energia"], color: C.gold },
  ];

  mechanics.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.38 + col * 3.22;
    const y = 1.48 + row * 2.0;

    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 3.05, h: 1.85, fill: { color: C.white, transparency: 92 }, line: { color: C.white, transparency: 70 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.055, h: 1.85, fill: { color: m.color }, line: { color: m.color } });
    s.addText(m.icon + "  " + m.title, { x: x + 0.12, y: y + 0.1, w: 2.85, h: 0.35, fontSize: 11, fontFace: "Georgia", color: C.white, bold: true, align: "left", margin: 0 });
    m.points.forEach((pt, pi) => {
      s.addText([{ text: pt, options: { bullet: true } }], {
        x: x + 0.12, y: y + 0.5 + pi * 0.38, w: 2.85, h: 0.36,
        fontSize: 8.5, fontFace: "Calibri", color: "D0C8C0", align: "left", margin: 0
      });
    });
  });
}

// ════════════════════════════════════════════════
// SLIDE 8 — PAINEL MASTER & SEGURANÇA
// ════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.cream };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.dark }, line: { color: C.dark } });
  s.addText("Painel Master & Segurança", {
    x: 0.5, y: 0.22, w: 9, h: 0.6, fontSize: 30, fontFace: "Georgia", color: C.dark, bold: true, align: "left", margin: 0
  });
  s.addText("Controle total para o administrador da plataforma — com rastreabilidade completa.", {
    x: 0.5, y: 0.88, w: 9, h: 0.32, fontSize: 12, fontFace: "Calibri", color: C.gray, align: "left", margin: 0
  });

  // Left column: Master features
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 1.35, w: 4.5, h: 3.95, fill: { color: C.dark }, line: { color: C.dark }, shadow: makeShadow() });
  s.addText("Painel Master (Admin)", { x: 0.4, y: 1.35, w: 4.5, h: 0.45, fontSize: 13, fontFace: "Georgia", color: C.gold, bold: true, align: "center", margin: 0 });

  const masterFeats = [
    "Gestão de empresas, usuários e roles",
    "Identidade visual personalizável (white-label): nome, logo, cores",
    "Log de auditoria completo — 90 dias, busca, filtros, exportação CSV",
    "Envio de alertas manuais por empresa ou para todas",
    "Gestão de badges e campanhas globais",
    "Health check do sistema e migrações aplicadas",
  ];
  masterFeats.forEach((f, i) => {
    s.addText([{ text: f, options: { bullet: true } }], {
      x: 0.6, y: 1.9 + i * 0.5, w: 4.1, h: 0.45,
      fontSize: 9.5, fontFace: "Calibri", color: "E0D0C0", align: "left", margin: 0
    });
  });

  // Right column: Security
  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 1.35, w: 4.5, h: 3.95, fill: { color: C.grayLt }, line: { color: "E0E7EF" }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 1.35, w: 4.5, h: 0.045, fill: { color: C.rose }, line: { color: C.rose } });
  s.addText("🔐  Segurança & Compliance", { x: 5.1, y: 1.38, w: 4.5, h: 0.42, fontSize: 13, fontFace: "Georgia", color: C.dark, bold: true, align: "center", margin: 0 });

  const secFeats = [
    { icon: "🔑", text: "JWT com refresh token rotativo (sessão persistente segura)" },
    { icon: "🔒", text: "Primeiro acesso obrigatório com troca de senha e regras de força" },
    { icon: "🛡️", text: "Rate limiting e proteção contra brute force em todos os endpoints" },
    { icon: "🧹", text: "Sanitização de inputs e proteção contra XSS/Injection" },
    { icon: "📋", text: "Auditoria de todas as ações sensíveis com IP, ator e entidade" },
    { icon: "🇧🇷", text: "Preparado para LGPD: anonimização em dados agregados de RH" },
  ];
  secFeats.forEach((f, i) => {
    s.addText(f.icon, { x: 5.2, y: 1.93 + i * 0.5, w: 0.4, h: 0.38, fontSize: 13, align: "center", margin: 0 });
    s.addText(f.text, { x: 5.65, y: 1.93 + i * 0.5, w: 3.85, h: 0.38, fontSize: 9.5, fontFace: "Calibri", color: C.dark, align: "left", margin: 0 });
  });
}

// ════════════════════════════════════════════════
// SLIDE 9 — ALERTAS & ENGAJAMENTO
// ════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.white };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.rose }, line: { color: C.rose } });
  s.addText("Alertas & Engajamento Contínuo", {
    x: 0.5, y: 0.22, w: 9, h: 0.6, fontSize: 30, fontFace: "Georgia", color: C.dark, bold: true, align: "left", margin: 0
  });
  s.addText("O engajamento não acontece só quando a colaboradora abre o app.", {
    x: 0.5, y: 0.88, w: 9, h: 0.32, fontSize: 12.5, fontFace: "Calibri", color: C.gray, align: "left", margin: 0
  });

  const alertCards = [
    {
      icon: "⏰", title: "Lembretes Pessoais", color: C.rose,
      items: [
        "Até 5 horários de lembrete configuráveis por dia",
        "Lembretes por tipo de missão (check-in, hidratação, desafio...)",
        "Notificações do navegador — mesmo com o app fechado",
      ]
    },
    {
      icon: "📣", title: "Alertas do Admin", color: C.gold,
      items: [
        "Admin envia alertas para empresa específica ou todas",
        "Mensagem chega como notificação in-app para todas as usuárias",
        "Histórico de alertas enviados com data e destinatários",
      ]
    },
    {
      icon: "🔔", title: "Notificações Automáticas", color: C.dark,
      items: [
        "Badge desbloqueado, level-up, campanha nova",
        "Marco de streak (7, 14, 30, 60, 100 dias)",
        "Missões do dia concluídas — celebração automática",
      ]
    },
  ];

  alertCards.forEach((card, i) => {
    const x = 0.4 + i * 3.2;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.42, w: 3.0, h: 3.8, fill: { color: C.cream }, line: { color: "E5D5CB" }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.42, w: 3.0, h: 0.06, fill: { color: card.color }, line: { color: card.color } });
    s.addShape(pres.shapes.OVAL, { x: x + 1.1, y: 1.58, w: 0.8, h: 0.8, fill: { color: card.color, transparency: 85 }, line: { color: card.color, transparency: 85 } });
    s.addText(card.icon, { x: x + 1.1, y: 1.58, w: 0.8, h: 0.8, fontSize: 28, align: "center", margin: 0 });
    s.addText(card.title, { x, y: 2.5, w: 3.0, h: 0.4, fontSize: 12.5, fontFace: "Georgia", color: C.dark, bold: true, align: "center", margin: 0 });
    card.items.forEach((item, j) => {
      s.addText([{ text: item, options: { bullet: true } }], {
        x: x + 0.15, y: 3.02 + j * 0.62, w: 2.7, h: 0.58,
        fontSize: 9.5, fontFace: "Calibri", color: C.gray, align: "left", margin: 0
      });
    });
  });
}

// ════════════════════════════════════════════════
// SLIDE 10 — ONBOARDING & QUIZ
// ════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.cream };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.gold }, line: { color: C.gold } });
  s.addText("Onboarding Inteligente", {
    x: 0.5, y: 0.22, w: 9, h: 0.6, fontSize: 30, fontFace: "Georgia", color: C.dark, bold: true, align: "left", margin: 0
  });
  s.addText("A jornada começa com autoconhecimento — não com um tutorial chato.", {
    x: 0.5, y: 0.88, w: 9, h: 0.32, fontSize: 12.5, fontFace: "Calibri", color: C.gray, align: "left", margin: 0
  });

  // Left: quiz description
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 1.38, w: 4.4, h: 3.95, fill: { color: C.rose }, line: { color: C.rose }, shadow: makeShadow() });
  s.addText("Quiz de Arquétipo de Saúde", { x: 0.4, y: 1.45, w: 4.4, h: 0.5, fontSize: 14, fontFace: "Georgia", color: C.white, bold: true, align: "center", margin: 0 });
  s.addText("Cada colaboradora descobre seu perfil de saúde único através de perguntas sobre rotina, hábitos e bem-estar.", {
    x: 0.6, y: 2.0, w: 4.0, h: 0.75, fontSize: 10, fontFace: "Calibri", color: "FFD5DF", align: "center", margin: 0
  });

  const archetypes = [
    "🌱  Guardiã Resiliente",
    "🤫  Protetora Silenciosa",
    "⚡  Guerreira em Evolução",
    "☯️  Equilibrista Zen",
    "🔍  Exploradora de Hábitos",
    "👑  Soberana do Autocuidado",
  ];
  archetypes.forEach((a, i) => {
    s.addText(a, {
      x: 0.6, y: 2.85 + i * 0.38, w: 4.0, h: 0.34,
      fontSize: 10, fontFace: "Calibri", color: C.white, align: "left", margin: 0
    });
  });

  // Right: what happens after
  s.addShape(pres.shapes.RECTANGLE, { x: 5.0, y: 1.38, w: 4.6, h: 3.95, fill: { color: C.grayLt }, line: { color: "E0E7EF" }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.0, y: 1.38, w: 4.6, h: 0.045, fill: { color: C.gold }, line: { color: C.gold } });
  s.addText("Após o Quiz", { x: 5.0, y: 1.42, w: 4.6, h: 0.42, fontSize: 14, fontFace: "Georgia", color: C.dark, bold: true, align: "center", margin: 0 });

  const after = [
    { icon: "🎯", title: "Perfil personalizado", desc: "Dashboard e missões adaptados ao arquétipo identificado." },
    { icon: "📋", title: "Trilha de saúde", desc: "Missões, desafios e campanhas sugeridas com base no perfil." },
    { icon: "📊", title: "Semáforo inicial", desc: "6 dimensões de saúde mapeadas já no primeiro acesso." },
    { icon: "🏅", title: "Primeiro badge", desc: "Conquista de boas-vindas desbloqueada ao completar o quiz." },
  ];
  after.forEach((a, i) => {
    s.addText(a.icon, { x: 5.12, y: 1.98 + i * 0.88, w: 0.45, h: 0.45, fontSize: 18, align: "center", margin: 0 });
    s.addText(a.title, { x: 5.65, y: 1.98 + i * 0.88, w: 3.8, h: 0.28, fontSize: 10.5, fontFace: "Georgia", color: C.dark, bold: true, align: "left", margin: 0 });
    s.addText(a.desc, { x: 5.65, y: 2.28 + i * 0.88, w: 3.8, h: 0.45, fontSize: 9, fontFace: "Calibri", color: C.gray, align: "left", margin: 0 });
  });
}

// ════════════════════════════════════════════════
// SLIDE 11 — DIFERENCIAIS
// ════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.dark };

  s.addShape(pres.shapes.OVAL, { x: 7.5, y: -1, w: 5, h: 5, fill: { color: C.gold, transparency: 92 }, line: { color: C.gold, transparency: 92 } });
  s.addShape(pres.shapes.OVAL, { x: -1, y: 3.5, w: 4, h: 4, fill: { color: C.rose, transparency: 90 }, line: { color: C.rose, transparency: 90 } });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.gold }, line: { color: C.gold } });
  s.addText("Por que UniHER?", {
    x: 0.5, y: 0.22, w: 9, h: 0.6, fontSize: 30, fontFace: "Georgia", color: C.white, bold: true, align: "left", margin: 0
  });
  s.addText("Não é mais um app de bem-estar. É uma plataforma B2B completa.", {
    x: 0.5, y: 0.88, w: 9, h: 0.32, fontSize: 12.5, fontFace: "Calibri", color: "CCBBAA", align: "left", margin: 0
  });

  const diffs = [
    { icon: "🎯", title: "Registro Real", desc: "Missões só completam com dados reais: humor, copos, desafio selecionado — sem clique vazio." },
    { icon: "🏢", title: "White-Label", desc: "Identidade visual 100% personalizável para a empresa cliente: nome, logo e cores." },
    { icon: "📊", title: "Dados Acionáveis", desc: "RH toma decisões com dados de saúde — não com pesquisas de clima anuais." },
    { icon: "🔐", title: "Segurança Enterprise", desc: "JWT rotativo, auditoria completa, rate limiting, LGPD — pronto para empresas exigentes." },
    { icon: "📱", title: "Mobile-First", desc: "Interface 100% responsiva, projetada para mobile antes de desktop." },
    { icon: "⚡", title: "Engajamento Sustentável", desc: "Streak, ligas e badges criam hábito — não dependem de campanha pontual." },
  ];

  diffs.forEach((d, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + col * 4.8;
    const y = 1.45 + row * 1.38;

    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.5, h: 1.25, fill: { color: C.white, transparency: 92 }, line: { color: C.white, transparency: 75 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.06, h: 1.25, fill: { color: i % 2 === col ? C.rose : C.gold }, line: { color: i % 2 === col ? C.rose : C.gold } });
    s.addText(d.icon + "  " + d.title, { x: x + 0.12, y: y + 0.1, w: 4.28, h: 0.38, fontSize: 11.5, fontFace: "Georgia", color: C.white, bold: true, align: "left", margin: 0 });
    s.addText(d.desc, { x: x + 0.12, y: y + 0.52, w: 4.28, h: 0.6, fontSize: 9.5, fontFace: "Calibri", color: "CCBBAA", align: "left", margin: 0 });
  });
}

// ════════════════════════════════════════════════
// SLIDE 12 — CTA / PRÓXIMOS PASSOS
// ════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.rose };

  s.addShape(pres.shapes.OVAL, { x: -1, y: -1, w: 5, h: 5, fill: { color: C.roseDk, transparency: 60 }, line: { color: C.roseDk, transparency: 60 } });
  s.addShape(pres.shapes.OVAL, { x: 7, y: 2.5, w: 4, h: 4, fill: { color: C.roseDk, transparency: 65 }, line: { color: C.roseDk, transparency: 65 } });

  // Gold accent bar
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.gold }, line: { color: C.gold } });

  s.addText("Próximos Passos", {
    x: 1, y: 0.5, w: 8, h: 0.65,
    fontSize: 20, fontFace: "Georgia", color: "FFD5DF", italic: true, align: "center", margin: 0
  });
  s.addText("Pronto para transformar\na saúde da sua equipe?", {
    x: 0.5, y: 1.15, w: 9, h: 1.5,
    fontSize: 40, fontFace: "Georgia", color: C.white, bold: true, align: "center", margin: 0
  });

  // Steps row
  const steps = [
    { num: "1", label: "Agendar demo", desc: "Apresentação personalizada para o seu time de RH." },
    { num: "2", label: "Piloto 30 dias", desc: "Deploy da plataforma com um departamento piloto." },
    { num: "3", label: "Expansão", desc: "Rollout para toda a empresa com suporte dedicado." },
  ];

  steps.forEach((st, i) => {
    const x = 1.0 + i * 2.85;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.95, w: 2.65, h: 2.1, fill: { color: C.white, transparency: 15 }, line: { color: C.white, transparency: 50 } });
    s.addShape(pres.shapes.OVAL, { x: x + 1.0, y: 3.08, w: 0.65, h: 0.65, fill: { color: C.gold }, line: { color: C.gold } });
    s.addText(st.num, { x: x + 1.0, y: 3.08, w: 0.65, h: 0.65, fontSize: 18, color: C.dark, bold: true, align: "center", valign: "middle", margin: 0 });
    s.addText(st.label, { x, y: 3.85, w: 2.65, h: 0.38, fontSize: 12, fontFace: "Georgia", color: C.white, bold: true, align: "center", margin: 0 });
    s.addText(st.desc, { x: x + 0.1, y: 4.28, w: 2.45, h: 0.65, fontSize: 9.5, fontFace: "Calibri", color: "FFD5DF", align: "center", margin: 0 });
  });

  // Footer contact
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.28, w: 10, h: 0.34, fill: { color: C.roseDk, transparency: 40 }, line: { color: C.roseDk, transparency: 40 } });
  s.addText("contato@uniher.com.br  ·  www.uniher.com.br  ·  UniHER © 2026", {
    x: 0, y: 5.3, w: 10, h: 0.3, fontSize: 9, fontFace: "Calibri", color: "FFD5DF", align: "center", margin: 0
  });
}

// ── Write file ──
pres.writeFile({ fileName: "C:\\Users\\User\\projetoss\\uniher\\uniher_apresentacao.pptx" })
  .then(() => console.log("✅ Apresentação criada: uniher_apresentacao.pptx"))
  .catch(e => { console.error("❌ Erro:", e); process.exit(1); });
