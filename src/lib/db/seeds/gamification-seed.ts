import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

type ActivityType =
  | 'pilula'
  | 'quiz'
  | 'reflexao'
  | 'lacuna'
  | 'verdadeiro_falso'
  | 'ordenar'
  | 'parear'
  | 'historia'
  | 'flashcard'
  | 'imagem'
  | 'desafio_dia';

interface Lesson {
  id: string;
  company_id: null;
  title: string;
  description: string;
  type: ActivityType;
  theme: string;
  content_json: string;
  xp_reward: number;
  duration_seconds: number;
  week_number: number;
  day_of_week: number;
  order_index: number;
  active: number;
}

const THEMES = ['hidratacao', 'sono', 'prevencao', 'nutricao', 'mental', 'ciclo'] as const;
const TYPES: Array<ActivityType> = ['pilula', 'quiz', 'reflexao', 'lacuna', 'verdadeiro_falso', 'ordenar', 'parear', 'historia', 'flashcard', 'imagem', 'desafio_dia'];

const lessons: Omit<Lesson, 'id' | 'company_id' | 'order_index' | 'active'>[] = [
  // ── Semana 1: Hidratacao ──
  {
    title: 'A importancia da agua para o corpo feminino',
    description: 'Descubra como a hidratacao impacta sua saude, pele e disposicao.',
    type: 'pilula',
    theme: 'hidratacao',
    content_json: JSON.stringify({
      tip: 'A agua representa cerca de 60% do corpo humano. Mulheres precisam de aproximadamente 2 litros por dia, podendo variar conforme atividade fisica e clima.',
      fact: 'A desidratacao leve (1-2%) ja causa queda de concentracao e aumento de dores de cabeca.',
      action: 'Comece o dia com um copo de agua antes do cafe da manha.',
    }),
    xp_reward: 20,
    duration_seconds: 30,
    week_number: 1,
    day_of_week: 1,
  },
  {
    title: 'Sinais de desidratacao que voce ignora',
    description: 'Aprenda a identificar quando seu corpo precisa de mais agua.',
    type: 'quiz',
    theme: 'hidratacao',
    content_json: JSON.stringify({
      questions: [
        {
          question: 'Qual destes e um sinal comum de desidratacao?',
          options: ['Pele oleosa', 'Urina escura', 'Excesso de energia', 'Apetite aumentado'],
          correct: 1,
          explanation: 'Urina escura e concentrada e um dos primeiros sinais de que voce precisa beber mais agua.',
        },
        {
          question: 'Quantos copos de agua por dia sao recomendados em media?',
          options: ['2 copos', '4 copos', '8 copos', '12 copos'],
          correct: 2,
          explanation: 'A recomendacao geral e de 8 copos (cerca de 2 litros), mas varia por pessoa.',
        },
      ],
    }),
    xp_reward: 30,
    duration_seconds: 60,
    week_number: 1,
    day_of_week: 2,
  },
  {
    title: 'Hidratacao e ciclo menstrual',
    description: 'Entenda por que voce sente mais sede em certas fases do ciclo.',
    type: 'pilula',
    theme: 'hidratacao',
    content_json: JSON.stringify({
      tip: 'Durante a fase lutea (apos a ovulacao), a progesterona aumenta e pode causar retencao de liquidos. Beber mais agua ajuda a reduzir o inchaco.',
      fact: 'Mulheres perdem mais liquidos durante a menstruacao e precisam repor com hidratacao adequada.',
      action: 'Acompanhe sua hidratacao durante diferentes fases do ciclo por uma semana.',
    }),
    xp_reward: 25,
    duration_seconds: 45,
    week_number: 1,
    day_of_week: 3,
  },
  {
    title: 'Agua vs bebidas: o que realmente hidrata?',
    description: 'Nem toda bebida hidrata da mesma forma.',
    type: 'reflexao',
    theme: 'hidratacao',
    content_json: JSON.stringify({
      prompt: 'Pense nas bebidas que voce consumiu hoje. Quantas delas eram agua pura? Cafe, sucos e refrigerantes contam parcialmente, mas nada substitui a agua.',
      reflection_question: 'O que voce poderia trocar na sua rotina para beber mais agua?',
      insight: 'Cafe e cha tem efeito diuretico leve. Para cada xicara de cafe, beba um copo extra de agua.',
    }),
    xp_reward: 20,
    duration_seconds: 90,
    week_number: 1,
    day_of_week: 4,
  },
  {
    title: 'Desafio: meta de hidratacao da semana',
    description: 'Estabeleca e cumpra sua meta pessoal de consumo de agua.',
    type: 'pilula',
    theme: 'hidratacao',
    content_json: JSON.stringify({
      tip: 'Use uma garrafa marcada com horarios para lembrar de beber agua ao longo do dia.',
      challenge: 'Beba pelo menos 2 litros de agua por dia durante os proximos 5 dias.',
      action: 'Coloque um alarme no celular para lembrar de beber agua a cada 2 horas.',
    }),
    xp_reward: 35,
    duration_seconds: 30,
    week_number: 1,
    day_of_week: 5,
  },

  // ── Semana 2: Sono ──
  {
    title: 'Sono feminino: por que dormimos diferente',
    description: 'Entenda as particularidades do sono na saude da mulher.',
    type: 'pilula',
    theme: 'sono',
    content_json: JSON.stringify({
      tip: 'Mulheres tem maior prevalencia de insonia que homens, em parte pela flutuacao hormonal. O estrogeno e a progesterona influenciam diretamente a qualidade do sono.',
      fact: 'Mulheres precisam em media de 20 minutos a mais de sono que homens por noite.',
      action: 'Tente dormir 15 minutos mais cedo essa semana e observe como se sente.',
    }),
    xp_reward: 20,
    duration_seconds: 40,
    week_number: 2,
    day_of_week: 1,
  },
  {
    title: 'Higiene do sono: mitos e verdades',
    description: 'Teste seus conhecimentos sobre boas praticas de sono.',
    type: 'quiz',
    theme: 'sono',
    content_json: JSON.stringify({
      questions: [
        {
          question: 'Qual destas praticas AJUDA a dormir melhor?',
          options: ['Usar celular na cama', 'Tomar cafe apos as 16h', 'Manter o quarto escuro e fresco', 'Fazer exercicio intenso antes de dormir'],
          correct: 2,
          explanation: 'Ambiente escuro e com temperatura entre 18-22 graus favorece a producao de melatonina.',
        },
        {
          question: 'Qual o tempo ideal de exposicao a telas antes de dormir?',
          options: ['Sem restricao', 'Parar 30min antes', 'Parar 1h antes', 'Parar 3h antes'],
          correct: 2,
          explanation: 'Idealmente, evite telas pelo menos 1 hora antes de dormir. A luz azul suprime a melatonina.',
        },
      ],
    }),
    xp_reward: 30,
    duration_seconds: 60,
    week_number: 2,
    day_of_week: 2,
  },
  {
    title: 'Sono e TPM: a conexao invisivel',
    description: 'Como o ciclo hormonal afeta suas noites de sono.',
    type: 'pilula',
    theme: 'sono',
    content_json: JSON.stringify({
      tip: 'Nos dias antes da menstruacao, a queda de progesterona pode causar insonia ou sono fragmentado. E normal sentir mais cansaco nesse periodo.',
      fact: '70% das mulheres relatam alteracoes no sono durante a fase pre-menstrual.',
      action: 'Anote a qualidade do seu sono durante uma semana e compare com seu ciclo menstrual.',
    }),
    xp_reward: 25,
    duration_seconds: 45,
    week_number: 2,
    day_of_week: 3,
  },
  {
    title: 'Sua rotina noturna: uma reflexao',
    description: 'Analise seus habitos antes de dormir.',
    type: 'reflexao',
    theme: 'sono',
    content_json: JSON.stringify({
      prompt: 'O que voce faz na ultima hora antes de dormir? Redes sociais, TV, trabalho? Reflita sobre como esses habitos podem estar afetando a qualidade do seu sono.',
      reflection_question: 'Se voce pudesse mudar uma coisa na sua rotina noturna, o que seria?',
      insight: 'Criar um ritual de sono (cha, leitura, alongamento) sinaliza ao cerebro que e hora de desacelerar.',
    }),
    xp_reward: 20,
    duration_seconds: 120,
    week_number: 2,
    day_of_week: 4,
  },
  {
    title: 'Construindo um ritual de sono',
    description: 'Passos praticos para melhorar suas noites.',
    type: 'pilula',
    theme: 'sono',
    content_json: JSON.stringify({
      tip: 'Um ritual de sono eficaz tem 3 etapas: desacelerar (desligar telas), relaxar (cha ou leitura), preparar (escurecer quarto, ajustar temperatura).',
      challenge: 'Crie um ritual de 20 minutos antes de dormir e siga por 5 dias consecutivos.',
      action: 'Escolha uma atividade relaxante (nao digital) para substituir o celular antes de dormir.',
    }),
    xp_reward: 40,
    duration_seconds: 45,
    week_number: 2,
    day_of_week: 5,
  },

  // ── Semana 3: Prevencao ──
  {
    title: 'Prevencao e autocuidado: o basico que salva vidas',
    description: 'Exames e habitos preventivos essenciais para mulheres.',
    type: 'pilula',
    theme: 'prevencao',
    content_json: JSON.stringify({
      tip: 'O autoexame das mamas deve ser feito mensalmente, de preferencia 7 dias apos o inicio da menstruacao. Nao substitui a mamografia, mas ajuda a conhecer seu corpo.',
      fact: 'O cancer de mama tem 95% de chance de cura quando detectado precocemente.',
      action: 'Agende hoje seu proximo exame preventivo (Papanicolau ou mamografia, conforme sua idade).',
    }),
    xp_reward: 25,
    duration_seconds: 45,
    week_number: 3,
    day_of_week: 1,
  },
  {
    title: 'Check-up feminino: o que voce sabe?',
    description: 'Teste seus conhecimentos sobre exames preventivos.',
    type: 'quiz',
    theme: 'prevencao',
    content_json: JSON.stringify({
      questions: [
        {
          question: 'A partir de que idade e recomendado o exame de Papanicolau?',
          options: ['15 anos', '21 anos', '25 anos', '30 anos'],
          correct: 2,
          explanation: 'O Ministerio da Saude recomenda o Papanicolau a partir dos 25 anos para mulheres que ja iniciaram atividade sexual.',
        },
        {
          question: 'Com que frequencia a mamografia deve ser feita apos os 40 anos?',
          options: ['A cada 6 meses', 'Anualmente', 'A cada 2 anos', 'Apenas quando sentir algo'],
          correct: 1,
          explanation: 'A recomendacao e fazer mamografia anualmente a partir dos 40 anos.',
        },
      ],
    }),
    xp_reward: 35,
    duration_seconds: 60,
    week_number: 3,
    day_of_week: 2,
  },
  {
    title: 'Vacinacao na vida adulta',
    description: 'Vacinas que toda mulher adulta deve manter em dia.',
    type: 'pilula',
    theme: 'prevencao',
    content_json: JSON.stringify({
      tip: 'Vacinas importantes para mulheres adultas: HPV (ate 45 anos), Hepatite B, Triplice viral, dT (difteria e tetano a cada 10 anos), e Influenza (anual).',
      fact: 'A vacina contra HPV previne ate 70% dos canceres de colo de utero.',
      action: 'Verifique sua carteira de vacinacao e identifique quais vacinas estao pendentes.',
    }),
    xp_reward: 20,
    duration_seconds: 40,
    week_number: 3,
    day_of_week: 3,
  },
  {
    title: 'Saude preventiva: sua relacao com o medico',
    description: 'Reflita sobre como voce cuida da sua saude de forma preventiva.',
    type: 'reflexao',
    theme: 'prevencao',
    content_json: JSON.stringify({
      prompt: 'Quando foi a ultima vez que voce fez um check-up completo? Muitas mulheres so procuram o medico quando ja estao com sintomas. A prevencao e o melhor remedio.',
      reflection_question: 'O que te impede de manter seus exames em dia? Tempo, medo, custo?',
      insight: 'Agendar exames no inicio do ano como compromisso fixo ajuda a manter a regularidade.',
    }),
    xp_reward: 20,
    duration_seconds: 90,
    week_number: 3,
    day_of_week: 4,
  },
  {
    title: 'Criando seu calendario de saude',
    description: 'Organize seus exames e consultas ao longo do ano.',
    type: 'pilula',
    theme: 'prevencao',
    content_json: JSON.stringify({
      tip: 'Crie um calendario anual de saude: Janeiro (check-up geral), Marco (ginecologista), Junho (dentista), Setembro (dermatologista), Novembro (mamografia se aplicavel).',
      challenge: 'Monte seu calendario de saude pessoal com pelo menos 3 consultas preventivas para este ano.',
      action: 'Anote no celular lembretes para cada consulta/exame preventivo.',
    }),
    xp_reward: 50,
    duration_seconds: 60,
    week_number: 3,
    day_of_week: 5,
  },

  // ── Semana 4: Nutricao ──
  {
    title: 'Nutrientes essenciais para a mulher',
    description: 'Ferro, calcio, acido folico: por que sao tao importantes.',
    type: 'pilula',
    theme: 'nutricao',
    content_json: JSON.stringify({
      tip: 'Mulheres em idade fertil precisam de mais ferro (18mg/dia vs 8mg para homens) devido a menstruacao. Fontes: feijao, lentilha, carne vermelha, folhas verde-escuras.',
      fact: 'A anemia por deficiencia de ferro afeta 30% das mulheres em idade reprodutiva no Brasil.',
      action: 'Inclua pelo menos uma fonte de ferro em suas refeicoes hoje.',
    }),
    xp_reward: 20,
    duration_seconds: 40,
    week_number: 4,
    day_of_week: 1,
  },
  {
    title: 'Alimentacao e humor: a conexao intestino-cerebro',
    description: 'Como o que voce come afeta como voce se sente.',
    type: 'quiz',
    theme: 'nutricao',
    content_json: JSON.stringify({
      questions: [
        {
          question: 'Qual porcentagem da serotonina (hormonio do bem-estar) e produzida no intestino?',
          options: ['10%', '30%', '60%', '90%'],
          correct: 3,
          explanation: 'Cerca de 90% da serotonina e produzida no intestino, por isso a alimentacao impacta diretamente o humor.',
        },
        {
          question: 'Qual alimento e rico em triptofano, precursor da serotonina?',
          options: ['Refrigerante', 'Banana', 'Pao branco', 'Batata frita'],
          correct: 1,
          explanation: 'A banana e rica em triptofano e vitamina B6, que ajudam na producao de serotonina.',
        },
      ],
    }),
    xp_reward: 30,
    duration_seconds: 60,
    week_number: 4,
    day_of_week: 2,
  },
  {
    title: 'Alimentacao durante o ciclo menstrual',
    description: 'O que comer em cada fase do ciclo para se sentir melhor.',
    type: 'pilula',
    theme: 'nutricao',
    content_json: JSON.stringify({
      tip: 'Fase menstrual: priorize ferro (carnes, feijao). Fase folicular: aumente proteinas e vegetais. Fase lutea: aposte em magnesio (chocolate amargo, castanhas) para reduzir TPM.',
      fact: 'O magnesio pode reduzir em ate 40% os sintomas de TPM como irritabilidade e inchaco.',
      action: 'Identifique em que fase do ciclo voce esta e ajuste uma refeicao de acordo.',
    }),
    xp_reward: 25,
    duration_seconds: 50,
    week_number: 4,
    day_of_week: 3,
  },
  {
    title: 'Sua relacao com a comida',
    description: 'Uma reflexao sobre alimentacao consciente.',
    type: 'reflexao',
    theme: 'nutricao',
    content_json: JSON.stringify({
      prompt: 'Voce come por fome ou por emocao? Muitas vezes usamos a comida para lidar com estresse, tristeza ou tedio. Reconhecer isso e o primeiro passo para uma relacao mais saudavel.',
      reflection_question: 'Em quais momentos voce percebe que come sem estar com fome de verdade?',
      insight: 'Comer consciente (mindful eating) significa prestar atencao ao que come, saborear cada garfada e respeitar os sinais de saciedade do corpo.',
    }),
    xp_reward: 20,
    duration_seconds: 120,
    week_number: 4,
    day_of_week: 4,
  },
  {
    title: 'Montando pratos coloridos e nutritivos',
    description: 'Dicas praticas para melhorar sua alimentacao no dia a dia.',
    type: 'pilula',
    theme: 'nutricao',
    content_json: JSON.stringify({
      tip: 'Regra do prato saudavel: metade vegetais/salada, um quarto proteina, um quarto carboidrato integral. Quanto mais cores no prato, mais nutrientes.',
      challenge: 'Monte um prato com pelo menos 5 cores diferentes em uma refeicao essa semana.',
      action: 'Adicione um vegetal ou fruta que voce nao come ha tempo na proxima compra do mercado.',
    }),
    xp_reward: 35,
    duration_seconds: 40,
    week_number: 4,
    day_of_week: 5,
  },

  // ── Semana 5: Saude Mental ──
  {
    title: 'Saude mental feminina: quebrando tabus',
    description: 'Por que mulheres sao mais afetadas por ansiedade e depressao.',
    type: 'pilula',
    theme: 'mental',
    content_json: JSON.stringify({
      tip: 'Mulheres tem 2x mais chances de desenvolver ansiedade e depressao. Fatores hormonais, sobrecarga mental (carga mental domestica) e pressao social contribuem.',
      fact: 'A Organizacao Mundial da Saude estima que a depressao sera a principal causa de incapacidade no mundo ate 2030.',
      action: 'Reconheca uma coisa que esta te causando estresse hoje e pense em uma acao concreta para aliviar.',
    }),
    xp_reward: 20,
    duration_seconds: 45,
    week_number: 5,
    day_of_week: 1,
  },
  {
    title: 'Estresse e corpo: voce conhece os sinais?',
    description: 'Identifique como o estresse se manifesta fisicamente.',
    type: 'quiz',
    theme: 'mental',
    content_json: JSON.stringify({
      questions: [
        {
          question: 'Qual destes e um sintoma fisico do estresse cronico?',
          options: ['Aumento de energia', 'Tensao muscular no pescoco e ombros', 'Melhora do sono', 'Aumento do apetite saudavel'],
          correct: 1,
          explanation: 'O estresse cronico causa tensao muscular, especialmente na regiao do pescoco, ombros e mandibula (bruxismo).',
        },
        {
          question: 'Qual tecnica pode reduzir o cortisol (hormonio do estresse) em minutos?',
          options: ['Checar redes sociais', 'Respiracao diafragmatica', 'Tomar cafe', 'Comer doces'],
          correct: 1,
          explanation: 'A respiracao diafragmatica (4 segundos inspira, 7 segura, 8 expira) ativa o sistema nervoso parassimpatico e reduz o cortisol.',
        },
      ],
    }),
    xp_reward: 30,
    duration_seconds: 60,
    week_number: 5,
    day_of_week: 2,
  },
  {
    title: 'Limites saudaveis: aprender a dizer nao',
    description: 'Estabelecer limites e um ato de autocuidado.',
    type: 'pilula',
    theme: 'mental',
    content_json: JSON.stringify({
      tip: 'Dizer "nao" nao e egoismo, e autopreservacao. Mulheres frequentemente assumem mais do que conseguem por medo de desapontar os outros.',
      fact: 'A sobrecarga mental (mental load) e o trabalho invisivel de planejar, organizar e lembrar de tudo na casa e familia, predominantemente carregado por mulheres.',
      action: 'Identifique uma tarefa que voce pode delegar ou recusar essa semana sem culpa.',
    }),
    xp_reward: 25,
    duration_seconds: 50,
    week_number: 5,
    day_of_week: 3,
  },
  {
    title: 'Momento de pausa: como voce esta?',
    description: 'Uma pausa para verificar seu estado emocional.',
    type: 'reflexao',
    theme: 'mental',
    content_json: JSON.stringify({
      prompt: 'Pare por um momento. Feche os olhos e respire fundo 3 vezes. Como voce esta se sentindo agora? Nomeie a emocao sem julgamento: cansada, ansiosa, tranquila, irritada?',
      reflection_question: 'O que voce precisa neste momento para se sentir um pouco melhor?',
      insight: 'Nomear emocoes (affect labeling) reduz sua intensidade. Quando voce diz "estou ansiosa", o cerebro ja comeca a processar e regular essa emocao.',
    }),
    xp_reward: 20,
    duration_seconds: 120,
    week_number: 5,
    day_of_week: 4,
  },
  {
    title: 'Micro-habitos para saude mental',
    description: 'Pequenas acoes diarias que fazem grande diferenca.',
    type: 'pilula',
    theme: 'mental',
    content_json: JSON.stringify({
      tip: '5 micro-habitos: 1) Gratidao (3 coisas boas do dia), 2) Movimento (10min caminhada), 3) Conexao (conversar com alguem), 4) Natureza (5min ao ar livre), 5) Desconexao (1h sem telas).',
      challenge: 'Escolha 2 desses micro-habitos e pratique por 5 dias consecutivos.',
      action: 'Antes de dormir hoje, escreva 3 coisas pelas quais voce e grata.',
    }),
    xp_reward: 40,
    duration_seconds: 45,
    week_number: 5,
    day_of_week: 5,
  },

  // ── Semana 6: Ciclo Menstrual ──
  {
    title: 'Conhecendo seu ciclo: as 4 fases',
    description: 'Entenda as fases do ciclo menstrual e como afetam seu corpo.',
    type: 'pilula',
    theme: 'ciclo',
    content_json: JSON.stringify({
      tip: 'As 4 fases: 1) Menstrual (dia 1-5): energia baixa, momento de descanso. 2) Folicular (dia 6-13): energia crescente, otimo para novos projetos. 3) Ovulatoria (dia 14-16): pico de energia e sociabilidade. 4) Lutea (dia 17-28): energia decrescente, foco em finalizar tarefas.',
      fact: 'O ciclo menstrual medio dura 28 dias, mas ciclos entre 21-35 dias sao considerados normais.',
      action: 'Comece a registrar seu ciclo em um app ou agenda para conhecer seus padroes.',
    }),
    xp_reward: 25,
    duration_seconds: 60,
    week_number: 6,
    day_of_week: 1,
  },
  {
    title: 'Ciclo e produtividade: verdade ou mito?',
    description: 'Teste seus conhecimentos sobre ciclo e desempenho.',
    type: 'quiz',
    theme: 'ciclo',
    content_json: JSON.stringify({
      questions: [
        {
          question: 'Em qual fase do ciclo a mulher tende a ter mais energia e criatividade?',
          options: ['Menstrual', 'Folicular/Ovulatoria', 'Lutea', 'Todas iguais'],
          correct: 1,
          explanation: 'Na fase folicular e ovulatoria, o estrogeno esta em alta, favorecendo energia, foco e criatividade.',
        },
        {
          question: 'Colicas intensas que impedem atividades normais sao:',
          options: ['Totalmente normais', 'Algo para investigar com medico', 'Frescura', 'So acontecem com sedentarias'],
          correct: 1,
          explanation: 'Colicas incapacitantes podem indicar endometriose ou outras condicoes. Sempre vale investigar com um ginecologista.',
        },
      ],
    }),
    xp_reward: 30,
    duration_seconds: 60,
    week_number: 6,
    day_of_week: 2,
  },
  {
    title: 'Exercicio e ciclo: como adaptar seu treino',
    description: 'Cada fase do ciclo pede um tipo de atividade diferente.',
    type: 'pilula',
    theme: 'ciclo',
    content_json: JSON.stringify({
      tip: 'Fase menstrual: yoga, caminhada leve. Fase folicular: treinos intensos, HIIT, pesos. Fase ovulatoria: exercicios sociais, esportes em grupo. Fase lutea: pilates, natacao, exercicios moderados.',
      fact: 'Adaptar o exercicio ao ciclo pode melhorar performance em ate 20% e reduzir risco de lesoes.',
      action: 'Identifique em que fase do ciclo voce esta e escolha uma atividade fisica adequada para hoje.',
    }),
    xp_reward: 25,
    duration_seconds: 50,
    week_number: 6,
    day_of_week: 3,
  },
  {
    title: 'Escutando seu corpo: um diario do ciclo',
    description: 'Reflita sobre como as diferentes fases afetam seu dia a dia.',
    type: 'reflexao',
    theme: 'ciclo',
    content_json: JSON.stringify({
      prompt: 'Durante o ultimo mes, voce notou mudancas de humor, energia ou apetite em momentos especificos? Muitas vezes descartamos esses sinais, mas eles estao conectados ao ciclo hormonal.',
      reflection_question: 'Como voce poderia usar o conhecimento do seu ciclo para planejar melhor sua semana?',
      insight: 'Conhecer seu ciclo e uma ferramenta poderosa. Agendar reunioes importantes na fase folicular e descanso na fase menstrual pode transformar sua produtividade e bem-estar.',
    }),
    xp_reward: 20,
    duration_seconds: 120,
    week_number: 6,
    day_of_week: 4,
  },
  {
    title: 'Vivendo em sintonia com seu ciclo',
    description: 'Integrando todo o aprendizado em um plano de acao pessoal.',
    type: 'pilula',
    theme: 'ciclo',
    content_json: JSON.stringify({
      tip: 'O cycle syncing (viver em sintonia com o ciclo) nao e moda passageira. E ciencia aplicada ao bem-estar feminino: alimentacao, exercicio, trabalho e descanso adaptados a cada fase.',
      challenge: 'Durante o proximo mes, tente adaptar pelo menos uma area (alimentacao, exercicio ou descanso) conforme a fase do seu ciclo.',
      action: 'Crie uma tabela simples com as 4 fases e o que voce quer priorizar em cada uma.',
    }),
    xp_reward: 50,
    duration_seconds: 60,
    week_number: 6,
    day_of_week: 5,
  },

  // ── Semana 7: Novos tipos — Hidratacao ──
  {
    title: 'Complete a frase: hidratacao diaria',
    description: 'Teste se voce sabe a quantidade certa de agua por dia.',
    type: 'lacuna',
    theme: 'hidratacao',
    content_json: JSON.stringify({
      sentence: 'A recomendacao diaria de agua para mulheres e de ___ ml.',
      blank: '2000',
      options: ['500', '1000', '2000', '3000'],
      explanation: 'O Ministerio da Saude recomenda cerca de 2 litros (2000 ml) por dia para adultos em geral.',
    }),
    xp_reward: 25,
    duration_seconds: 30,
    week_number: 7,
    day_of_week: 1,
  },
  {
    title: 'Verdade ou mito: hidratacao',
    description: 'Cafe conta como hidratacao?',
    type: 'verdadeiro_falso',
    theme: 'hidratacao',
    content_json: JSON.stringify({
      statement: 'Beber cafe conta igualmente como ingestao de agua para a hidratacao diaria.',
      answer: false,
      explanation: 'Cafe tem efeito diuretico leve, o que pode aumentar a perda de liquidos. Ele contribui parcialmente para a hidratacao, mas nao substitui a agua pura.',
    }),
    xp_reward: 20,
    duration_seconds: 25,
    week_number: 7,
    day_of_week: 2,
  },
  {
    title: 'Ordene: rotina de hidratacao ideal',
    description: 'Qual a melhor ordem para beber agua ao longo do dia?',
    type: 'ordenar',
    theme: 'hidratacao',
    content_json: JSON.stringify({
      instruction: 'Ordene os momentos do dia do mais ao menos importante para beber agua:',
      items: [
        'Ao acordar, em jejum',
        'Durante as refeicoes principais',
        'Antes de dormir',
        'Durante o exercicio fisico',
      ],
      correct_order: [0, 3, 2, 1],
      explanation: 'Ao acordar reidrata apos horas sem ingestao; durante exercicio repoe suor; antes de dormir complementa; durante refeicoes e menos prioritario pois pode diluir sucos gastricos.',
    }),
    xp_reward: 30,
    duration_seconds: 45,
    week_number: 7,
    day_of_week: 3,
  },
  {
    title: 'Combine: sintoma com causa de desidratacao',
    description: 'Conecte cada sintoma a sua causa relacionada a hidratacao.',
    type: 'parear',
    theme: 'hidratacao',
    content_json: JSON.stringify({
      instruction: 'Associe cada sintoma a sua causa:',
      pairs: [
        { left: 'Dor de cabeca', right: 'Falta de agua reduz volume sanguineo' },
        { left: 'Urina escura', right: 'Rim concentra toxinas por falta de agua' },
        { left: 'Pele ressecada', right: 'Celulas perdem turgidez sem hidratacao' },
        { left: 'Cansaco excessivo', right: 'Desidratacao reduz oxigenacao muscular' },
      ],
    }),
    xp_reward: 35,
    duration_seconds: 60,
    week_number: 7,
    day_of_week: 4,
  },
  {
    title: 'Desafio do dia: 8 copos de agua',
    description: 'Hoje o desafio e simples e poderoso.',
    type: 'desafio_dia',
    theme: 'hidratacao',
    content_json: JSON.stringify({
      challenge: 'Beba 8 copos de agua (2 litros) ao longo de hoje. Use lembretes no celular se precisar.',
      category: 'hidratacao',
      verification: 'honor_system',
      tips: [
        'Coloque uma garrafa de 500ml na mesa de trabalho',
        'Beba um copo ao acordar, antes de cada refeicao e antes de dormir',
        'Adicione rodelas de limao ou folhas de hortela para tornar mais gostoso',
      ],
      xp_bonus: 10,
    }),
    xp_reward: 40,
    duration_seconds: 30,
    week_number: 7,
    day_of_week: 5,
  },

  // ── Semana 8: Novos tipos — Sono ──
  {
    title: 'Flashcard: melatonina',
    description: 'Aprenda sobre o hormonio do sono.',
    type: 'flashcard',
    theme: 'sono',
    content_json: JSON.stringify({
      front: 'O que e melatonina e quando e produzida?',
      back: 'Melatonina e o hormonio responsavel por regular o ciclo sono-vigia. E produzida pela glandula pineal a partir do escurecimento do ambiente, sinalizando ao corpo que e hora de dormir. Luz azul de telas inibe sua producao.',
      category: 'sono',
    }),
    xp_reward: 20,
    duration_seconds: 40,
    week_number: 8,
    day_of_week: 1,
  },
  {
    title: 'Verdade ou mito: cochilos',
    description: 'Cochilos curtos prejudicam o sono noturno?',
    type: 'verdadeiro_falso',
    theme: 'sono',
    content_json: JSON.stringify({
      statement: 'Um cochilo de 20 minutos durante o dia sempre prejudica o sono da noite.',
      answer: false,
      explanation: 'Cochilos curtos (10-20 minutos) chamados de power naps melhoram o alerta e o desempenho cognitivo sem interferir no sono noturno. Cochilos acima de 90 minutos ou muito perto da hora de dormir e que podem atrapalhar.',
    }),
    xp_reward: 20,
    duration_seconds: 25,
    week_number: 8,
    day_of_week: 2,
  },
  {
    title: 'Complete a frase: ciclos do sono',
    description: 'Quantos ciclos de sono uma noite saudavel deve ter?',
    type: 'lacuna',
    theme: 'sono',
    content_json: JSON.stringify({
      sentence: 'Uma noite de sono saudavel e composta por ___ ciclos completos de aproximadamente 90 minutos cada.',
      blank: '4 a 6',
      options: ['1 a 2', '2 a 3', '4 a 6', '8 a 10'],
      explanation: 'Cada ciclo inclui fases leve, profunda e REM. Dormir entre 6 e 9 horas permite completar 4 a 6 ciclos completos.',
    }),
    xp_reward: 25,
    duration_seconds: 30,
    week_number: 8,
    day_of_week: 3,
  },
  {
    title: 'Historia: a noite antes da apresentacao',
    description: 'Como Maria pode melhorar seu sono antes de um dia importante?',
    type: 'historia',
    theme: 'sono',
    content_json: JSON.stringify({
      scenario: 'Maria tem uma apresentacao importante amanha cedo. Sao 22h e ela esta ansiosa, com o celular na mao, assistindo videos no Instagram. Ela precisa estar descansada. O que ela deveria fazer?',
      choices: [
        {
          text: 'Continuar assistindo videos ate cansar os olhos e pegar no sono naturalmente',
          feedback: 'A luz azul suprime a melatonina e o conteudo estimulante mantém o cerebro ativo. Isso atrasara o sono e reduzira a qualidade.',
          xp_bonus: 0,
        },
        {
          text: 'Largar o celular, fazer uma respiracao 4-7-8 e ler algo leve por 15 minutos',
          feedback: 'Excelente escolha! A respiracao 4-7-8 ativa o sistema nervoso parassimpatico, e a leitura leve desacelera o cerebro sem estimulo de tela.',
          xp_bonus: 15,
        },
        {
          text: 'Tomar um cafe para ficar alerta na apresentacao de amanha',
          feedback: 'Cafe tem meia-vida de 5-7 horas. Tomado as 22h, metade da cafeina ainda estara no organismo as 3h da manha, piorando muito o sono.',
          xp_bonus: 0,
        },
      ],
      correct: 1,
    }),
    xp_reward: 35,
    duration_seconds: 90,
    week_number: 8,
    day_of_week: 4,
  },
  {
    title: 'Desafio do dia: sem telas por 1 hora',
    description: 'Um desafio para melhorar a qualidade do seu sono.',
    type: 'desafio_dia',
    theme: 'sono',
    content_json: JSON.stringify({
      challenge: 'Desligue todas as telas (celular, TV, computador) pelo menos 1 hora antes de dormir esta noite.',
      category: 'sono',
      verification: 'honor_system',
      tips: [
        'Avise quem precisa que voce ficara indisponivel apos certo horario',
        'Substitua o celular por um livro, alongamento ou diario',
        'Ative o modo nao perturbe no celular para nao ser tentada a checar notificacoes',
      ],
      xp_bonus: 10,
    }),
    xp_reward: 40,
    duration_seconds: 30,
    week_number: 8,
    day_of_week: 5,
  },

  // ── Semana 9: Novos tipos — Nutricao ──
  {
    title: 'Complete a frase: ferro na alimentacao',
    description: 'Qual combinacao potencializa a absorcao de ferro?',
    type: 'lacuna',
    theme: 'nutricao',
    content_json: JSON.stringify({
      sentence: 'Para aumentar a absorcao de ferro nao-heme (de plantas), consuma-o junto com alimentos ricos em ___.',
      blank: 'vitamina C',
      options: ['calcio', 'vitamina C', 'vitamina D', 'zinco'],
      explanation: 'A vitamina C (presente em laranja, limao, morango, pimentao) pode aumentar a absorcao de ferro vegetal em ate 3 vezes. Evite cafe ou leite junto com a refeicao rica em ferro.',
    }),
    xp_reward: 25,
    duration_seconds: 30,
    week_number: 9,
    day_of_week: 1,
  },
  {
    title: 'Qual tem mais calcio?',
    description: 'Compare alimentos e escolha o mais rico em calcio.',
    type: 'imagem',
    theme: 'nutricao',
    content_json: JSON.stringify({
      question: 'Qual opcao tem maior teor de calcio por porcao?',
      images: [
        { label: 'Leite integral (200ml)', value: '240mg de calcio', correct: false },
        { label: 'Iogurte grego (200g)', value: '260mg de calcio', correct: false },
        { label: 'Sardinha em lata (100g)', value: '350mg de calcio', correct: true },
        { label: 'Brocolis cozido (100g)', value: '47mg de calcio', correct: false },
      ],
      explanation: 'A sardinha com espinha e uma das fontes mais concentradas de calcio. A espinha e comestivel e contem muito calcio biodisponivel.',
    }),
    xp_reward: 30,
    duration_seconds: 45,
    week_number: 9,
    day_of_week: 2,
  },
  {
    title: 'Ordene: prato saudavel por prioridade',
    description: 'Monte o prato ideal na ordem certa de proporcao.',
    type: 'ordenar',
    theme: 'nutricao',
    content_json: JSON.stringify({
      instruction: 'Ordene os grupos alimentares do maior para o menor espaco no prato saudavel:',
      items: [
        'Carboidratos integrais (arroz, batata)',
        'Proteinas (carne, ovo, leguminosas)',
        'Vegetais e saladas',
        'Gorduras saudaveis (azeite, abacate)',
      ],
      correct_order: [2, 1, 0, 3],
      explanation: 'O prato saudavel do Harvard recomenda: metade de vegetais e frutas, um quarto de proteinas, um quarto de graos integrais e uma porcao pequena de gorduras saudaveis.',
    }),
    xp_reward: 30,
    duration_seconds: 45,
    week_number: 9,
    day_of_week: 3,
  },
  {
    title: 'Combine: nutriente com funcao no corpo',
    description: 'Conecte cada nutriente a seu papel principal.',
    type: 'parear',
    theme: 'nutricao',
    content_json: JSON.stringify({
      instruction: 'Associe cada nutriente a sua funcao principal:',
      pairs: [
        { left: 'Ferro', right: 'Transporte de oxigenio no sangue' },
        { left: 'Calcio', right: 'Saude ossea e contracao muscular' },
        { left: 'Acido folico', right: 'Formacao do tubo neural e celulas vermelhas' },
        { left: 'Omega-3', right: 'Anti-inflamatorio e saude cerebral' },
      ],
    }),
    xp_reward: 35,
    duration_seconds: 60,
    week_number: 9,
    day_of_week: 4,
  },
  {
    title: 'Flashcard: acido folico',
    description: 'Tudo que voce precisa saber sobre esse nutriente essencial.',
    type: 'flashcard',
    theme: 'nutricao',
    content_json: JSON.stringify({
      front: 'Por que o acido folico e especialmente importante para mulheres em idade fertil?',
      back: 'O acido folico (vitamina B9) e essencial para a divisao celular e formacao do DNA. Em mulheres em idade fertil, ele previne defeitos no tubo neural do bebe nas primeiras semanas de gestacao, antes mesmo de a mulher saber que esta gravida. Fontes: feijao, lentilha, espinafre, brocolis, figa do forno, cereais enriquecidos.',
      category: 'nutricao',
    }),
    xp_reward: 20,
    duration_seconds: 40,
    week_number: 9,
    day_of_week: 5,
  },

  // ── Semana 10: Novos tipos — Prevencao ──
  {
    title: 'Verdade ou mito: autoexame das mamas',
    description: 'O autoexame substitui a mamografia?',
    type: 'verdadeiro_falso',
    theme: 'prevencao',
    content_json: JSON.stringify({
      statement: 'O autoexame das mamas substitui completamente a mamografia no rastreamento do cancer de mama.',
      answer: false,
      explanation: 'O autoexame ajuda a conhecer o proprio corpo e detectar mudancas, mas nao substitui a mamografia. Nodulos menores que 1cm geralmente nao sao palpados. A mamografia detecta lesoes de ate 0,2cm.',
    }),
    xp_reward: 20,
    duration_seconds: 25,
    week_number: 10,
    day_of_week: 1,
  },
  {
    title: 'Historia: o convite para o check-up',
    description: 'Ana procrastina seus exames ha anos. O que acontece?',
    type: 'historia',
    theme: 'prevencao',
    content_json: JSON.stringify({
      scenario: 'Ana tem 38 anos e nao faz um check-up ha 5 anos. Ela recebeu pelo UniHER um lembrete para agendar sua mamografia. Ela esta com a agenda cheia e pensando em adiar mais uma vez. O que Ana deveria fazer?',
      choices: [
        {
          text: 'Adiar para o proximo trimestre quando tiver mais tempo',
          feedback: 'Adiar exames preventivos e um habito comum, mas o tempo certo e sempre agora. Quanto mais cedo detectado, maior a chance de cura.',
          xp_bonus: 0,
        },
        {
          text: 'Agendar agora mesmo, mesmo que seja daqui a 3 semanas',
          feedback: 'Perfeito! Agendar com antecedencia garante que o exame aconteca. Uma data marcada e muito mais provavel de se concretizar do que uma intencao vaga.',
          xp_bonus: 15,
        },
        {
          text: 'Ir a emergencia quando sentir algo diferente',
          feedback: 'Saude preventiva nao espera sintomas. Muitas condicoes nao causam sintomas nos estagios iniciais, que e justamente quando o tratamento e mais eficaz.',
          xp_bonus: 0,
        },
      ],
      correct: 1,
    }),
    xp_reward: 35,
    duration_seconds: 90,
    week_number: 10,
    day_of_week: 2,
  },
  {
    title: 'Complete a frase: Papanicolau',
    description: 'Quando o Papanicolau deve ser feito?',
    type: 'lacuna',
    theme: 'prevencao',
    content_json: JSON.stringify({
      sentence: 'Apos dois exames de Papanicolau normais com intervalo de um ano, a mulher pode passar a fazer o exame a cada ___ anos.',
      blank: '3',
      options: ['1', '2', '3', '5'],
      explanation: 'O protocolo do Ministerio da Saude recomenda: dois exames com intervalo de 1 ano e, se ambos normais, repetir a cada 3 anos ate os 64 anos.',
    }),
    xp_reward: 25,
    duration_seconds: 30,
    week_number: 10,
    day_of_week: 3,
  },
  {
    title: 'Combine: vacina com doenca que previne',
    description: 'Cada vacina protege contra uma doenca especifica.',
    type: 'parear',
    theme: 'prevencao',
    content_json: JSON.stringify({
      instruction: 'Associe cada vacina a doenca que ela previne:',
      pairs: [
        { left: 'HPV', right: 'Cancer de colo de utero' },
        { left: 'Hepatite B', right: 'Doenca hepatica cronica e cirose' },
        { left: 'Influenza', right: 'Gripe sazonal e complicacoes respiratorias' },
        { left: 'dT', right: 'Difteria e tetano' },
      ],
    }),
    xp_reward: 35,
    duration_seconds: 60,
    week_number: 10,
    day_of_week: 4,
  },
  {
    title: 'Desafio do dia: agende um exame',
    description: 'O desafio de hoje e tomar uma acao real de prevencao.',
    type: 'desafio_dia',
    theme: 'prevencao',
    content_json: JSON.stringify({
      challenge: 'Identifique um exame preventivo que voce esta adiando e agende hoje (ou envie uma mensagem para marcar).',
      category: 'prevencao',
      verification: 'honor_system',
      tips: [
        'Papanicolau, mamografia, check-up geral ou densitometria ossea sao boas opcoes',
        'Muitos planos de saude cobrem exames preventivos sem carencia',
        'Anote no calendario o dia do exame assim que agendar',
      ],
      xp_bonus: 20,
    }),
    xp_reward: 50,
    duration_seconds: 30,
    week_number: 10,
    day_of_week: 5,
  },

  // ── Semana 11: Novos tipos — Saude Mental ──
  {
    title: 'Flashcard: cortisol',
    description: 'Entenda o hormonio do estresse.',
    type: 'flashcard',
    theme: 'mental',
    content_json: JSON.stringify({
      front: 'O que e cortisol e quais seus efeitos no corpo da mulher?',
      back: 'Cortisol e o principal hormonio do estresse, produzido pelas glandulas adrenais. Em doses adequadas, ele regula o metabolismo, controla a inflamacao e ajuda a responder a situacoes de emergencia. Em excesso cronico, causa: insonia, aumento de peso abdominal, queda de imunidade, irregularidade menstrual, irritabilidade e fadiga. Tecnicas como respiracao profunda, meditacao e exercicio regular reduzem o cortisol.',
      category: 'mental',
    }),
    xp_reward: 20,
    duration_seconds: 45,
    week_number: 11,
    day_of_week: 1,
  },
  {
    title: 'Verdade ou mito: ansiedade',
    description: 'Ansiedade e sempre um sinal de fraqueza?',
    type: 'verdadeiro_falso',
    theme: 'mental',
    content_json: JSON.stringify({
      statement: 'Sentir ansiedade e sempre um sinal de fraqueza ou de falta de controle emocional.',
      answer: false,
      explanation: 'Ansiedade e uma resposta natural do sistema nervoso a situacoes de ameaca percebida. Ela se torna um problema quando e desproporcional ou constante. Buscar ajuda profissional e um ato de coragem, nao de fraqueza.',
    }),
    xp_reward: 20,
    duration_seconds: 25,
    week_number: 11,
    day_of_week: 2,
  },
  {
    title: 'Ordene: tecnica de respiracao 4-7-8',
    description: 'Aprenda a sequencia correta para aliviar a ansiedade.',
    type: 'ordenar',
    theme: 'mental',
    content_json: JSON.stringify({
      instruction: 'Ordene os passos da tecnica de respiracao 4-7-8 na sequencia correta:',
      items: [
        'Expire completamente pela boca fazendo um som suave',
        'Inspire pelo nariz contando mentalmente ate 4',
        'Segure a respiracao contando ate 7',
        'Expire pela boca fazendo um som por 8 segundos',
      ],
      correct_order: [0, 1, 2, 3],
      explanation: 'A tecnica 4-7-8 do Dr. Andrew Weil ativa o sistema nervoso parassimpatico. Repita o ciclo 4 vezes para sentir o efeito calmante.',
    }),
    xp_reward: 30,
    duration_seconds: 45,
    week_number: 11,
    day_of_week: 3,
  },
  {
    title: 'Combine: emocao com estrategia de regulacao',
    description: 'Cada estado emocional tem uma tecnica ideal.',
    type: 'parear',
    theme: 'mental',
    content_json: JSON.stringify({
      instruction: 'Associe cada estado emocional a uma estrategia eficaz:',
      pairs: [
        { left: 'Ansiedade aguda', right: 'Respiracao diafragmatica ou 4-7-8' },
        { left: 'Tristeza persistente', right: 'Conversa com alguem de confianca ou terapia' },
        { left: 'Raiva intensa', right: 'Exercicio fisico ou tecnica de grounding 5-4-3-2-1' },
        { left: 'Esgotamento mental', right: 'Pausa ativa e desconexao de telas por 30 minutos' },
      ],
    }),
    xp_reward: 35,
    duration_seconds: 60,
    week_number: 11,
    day_of_week: 4,
  },
  {
    title: 'Desafio do dia: 5 minutos de gratidao',
    description: 'Uma pratica simples com impacto comprovado no bem-estar.',
    type: 'desafio_dia',
    theme: 'mental',
    content_json: JSON.stringify({
      challenge: 'Reserve 5 minutos hoje para escrever (ou pensar) em 3 coisas pelas quais voce e grata neste momento.',
      category: 'mental',
      verification: 'honor_system',
      tips: [
        'Podem ser coisas simples: o cafe da manha, uma conversa boa, o sol na janela',
        'Pesquisas mostram que a pratica de gratidao reduz sintomas depressivos em ate 25%',
        'Se puder, escreva em papel — a escrita manual potencializa o efeito',
      ],
      xp_bonus: 10,
    }),
    xp_reward: 35,
    duration_seconds: 30,
    week_number: 11,
    day_of_week: 5,
  },

  // ── Semana 12: Novos tipos — Ciclo Menstrual ──
  {
    title: 'Flashcard: fase folicular',
    description: 'Entenda a fase de maior energia do ciclo.',
    type: 'flashcard',
    theme: 'ciclo',
    content_json: JSON.stringify({
      front: 'O que acontece na fase folicular do ciclo menstrual?',
      back: 'A fase folicular ocorre do 1o ao 13o dia (contando desde o inicio da menstruacao). O FSH (hormonio foliculoestimulante) estimula o crescimento dos foliculos nos ovaros. O estrogeno aumenta progressivamente, causando aumento de energia, melhora de humor, libido elevada e maior clareza mental. E o melhor momento para comecar novos projetos, treinar com intensidade e tomar decisoes importantes.',
      category: 'ciclo',
    }),
    xp_reward: 20,
    duration_seconds: 45,
    week_number: 12,
    day_of_week: 1,
  },
  {
    title: 'Verdade ou mito: sincronizacao lunar',
    description: 'O ciclo menstrual realmente sincroniza com a lua?',
    type: 'verdadeiro_falso',
    theme: 'ciclo',
    content_json: JSON.stringify({
      statement: 'Todas as mulheres sincronizam naturalmente seu ciclo menstrual com as fases da lua.',
      answer: false,
      explanation: 'Embora a duracao media do ciclo (28 dias) se assemelhe ao ciclo lunar (29,5 dias), estudos cientificos nao comprovam sincronizacao universal. A similaridade de duracao pode ser coincidencia evolutiva. Fatores como estresse, sono e saude afetam muito mais o ciclo do que a lua.',
    }),
    xp_reward: 20,
    duration_seconds: 25,
    week_number: 12,
    day_of_week: 2,
  },
  {
    title: 'Complete a frase: ovulacao',
    description: 'Quando ocorre a ovulacao em um ciclo de 28 dias?',
    type: 'lacuna',
    theme: 'ciclo',
    content_json: JSON.stringify({
      sentence: 'Em um ciclo de 28 dias, a ovulacao geralmente ocorre por volta do dia ___, quando o LH atinge seu pico.',
      blank: '14',
      options: ['7', '10', '14', '21'],
      explanation: 'O pico do LH (hormonio luteinizante) ocorre aproximadamente 24-36 horas antes da ovulacao. Em ciclos de 28 dias, isso costuma ser no 14o dia. Ciclos mais longos ou curtos deslocam essa data.',
    }),
    xp_reward: 25,
    duration_seconds: 30,
    week_number: 12,
    day_of_week: 3,
  },
  {
    title: 'Ordene: as 4 fases do ciclo menstrual',
    description: 'Coloque as fases do ciclo na ordem correta.',
    type: 'ordenar',
    theme: 'ciclo',
    content_json: JSON.stringify({
      instruction: 'Ordene as fases do ciclo menstrual em sequencia cronologica (da primeira a ultima):',
      items: [
        'Fase Lutea',
        'Fase Menstrual',
        'Fase Ovulatoria',
        'Fase Folicular',
      ],
      correct_order: [1, 3, 2, 0],
      explanation: 'O ciclo comeca com a menstruacao (fase menstrual, dias 1-5), seguida da fase folicular (dias 6-13), ovulatoria (dias 14-16) e lutea (dias 17-28), que termina com a proxima menstruacao.',
    }),
    xp_reward: 30,
    duration_seconds: 45,
    week_number: 12,
    day_of_week: 4,
  },
  {
    title: 'Qual imagem representa a fase ovulatoria?',
    description: 'Identifique os sinais fisicos da ovulacao.',
    type: 'imagem',
    theme: 'ciclo',
    content_json: JSON.stringify({
      question: 'Qual caracteristica e tipica da fase ovulatoria?',
      images: [
        { label: 'Muco cervical espesso e opaco', value: 'Caracteristico da fase lutea', correct: false },
        { label: 'Ausencia de corrimento', value: 'Caracteristico de dias secos fora do periodo fertil', correct: false },
        { label: 'Muco transparente e filante (tipo clara de ovo)', value: 'Sinal classico de ovulacao iminente', correct: true },
        { label: 'Corrimento amarelado com odor forte', value: 'Pode indicar infeccao, nao ovulacao', correct: false },
      ],
      explanation: 'O muco cervical transparente, filante e com aspecto de clara de ovo e o principal sinal biologico da janela fertil. Ele facilita a mobilidade dos espermatozoides e indica pico de estrogeno.',
    }),
    xp_reward: 30,
    duration_seconds: 45,
    week_number: 12,
    day_of_week: 5,
  },

  // ── Semana 13: Revisao multiplos temas — novos tipos complementares ──
  {
    title: 'Historia: a escolha da Juliana no bufet',
    description: 'Uma historia sobre nutricao consciente no trabalho.',
    type: 'historia',
    theme: 'nutricao',
    content_json: JSON.stringify({
      scenario: 'Juliana esta no almoco de confraternizacao da empresa. O bufet tem pizza, salada, grelhados, refrigerante e suco natural. Ela esta na fase lutea do ciclo, sentindo vontade de doce e um pouco inchada. Qual a melhor escolha?',
      choices: [
        {
          text: 'Comer so pizza porque ja esta inchada mesmo',
          feedback: 'O gluten e o sodio da pizza podem piorar a retencao de liquido da fase lutea. Nao e a melhor escolha quando se quer reduzir o inchaco.',
          xp_bonus: 0,
        },
        {
          text: 'Montar um prato com salada, frango grelhado e uma pequena porcao de carboidrato, beber suco natural',
          feedback: 'Otima escolha! Proteina e vegetais dao saciedade, o suco natural hidrata sem cafeina. Para a vontade de doce, uma fruta de sobremesa seria ideal.',
          xp_bonus: 15,
        },
        {
          text: 'Nao comer nada por estar inchada e em dieta',
          feedback: 'Pular refeicoes pode aumentar a compulsao alimentar mais tarde e piora o humor na fase lutea. O corpo precisa de nutrientes regulares.',
          xp_bonus: 0,
        },
      ],
      correct: 1,
    }),
    xp_reward: 35,
    duration_seconds: 90,
    week_number: 13,
    day_of_week: 1,
  },
  {
    title: 'Qual alimento tem mais omega-3?',
    description: 'Identifique a melhor fonte de gordura boa.',
    type: 'imagem',
    theme: 'nutricao',
    content_json: JSON.stringify({
      question: 'Qual alimento e a fonte mais rica em omega-3 por porcao?',
      images: [
        { label: 'Oleo de girassol (1 colher)', value: 'Rico em omega-6, nao omega-3', correct: false },
        { label: 'Salmao grelhado (100g)', value: '2,2g de omega-3', correct: true },
        { label: 'Amendoim (30g)', value: 'Rico em omega-6 e proteinas, pouco omega-3', correct: false },
        { label: 'Azeite de oliva (1 colher)', value: 'Rico em omega-9 (oleico), pouco omega-3', correct: false },
      ],
      explanation: 'O salmao e um dos alimentos mais ricos em EPA e DHA, as formas mais biodisponiveis de omega-3, essenciais para saude cardiovascular e cerebral.',
    }),
    xp_reward: 30,
    duration_seconds: 40,
    week_number: 13,
    day_of_week: 2,
  },
  {
    title: 'Complete a frase: meditacao',
    description: 'Quanto tempo de meditacao ja traz beneficios?',
    type: 'lacuna',
    theme: 'mental',
    content_json: JSON.stringify({
      sentence: 'Estudos mostram que apenas ___ minutos de meditacao mindfulness por dia ja produzem mudancas mensuraveis no cortex pre-frontal em 8 semanas.',
      blank: '10',
      options: ['2', '5', '10', '30'],
      explanation: 'A pesquisa do Dr. Jon Kabat-Zinn mostrou que 10 minutos diarios de mindfulness por 8 semanas causam neuroplasticidade positiva, reduzindo ansiedade e melhorando foco.',
    }),
    xp_reward: 25,
    duration_seconds: 30,
    week_number: 13,
    day_of_week: 3,
  },
  {
    title: 'Combine: fase do ciclo com alimento ideal',
    description: 'Cada fase pede nutrientes especificos.',
    type: 'parear',
    theme: 'ciclo',
    content_json: JSON.stringify({
      instruction: 'Associe cada fase do ciclo ao alimento mais indicado:',
      pairs: [
        { left: 'Fase menstrual', right: 'Feijao e carnes vermelhas (reposicao de ferro)' },
        { left: 'Fase folicular', right: 'Vegetais cruciferos e ovos (suporte ao estrogeno)' },
        { left: 'Fase ovulatoria', right: 'Frutas antioxidantes e fibras (reducao de inflamacao)' },
        { left: 'Fase lutea', right: 'Castanhas e chocolate amargo (magnesio para TPM)' },
      ],
    }),
    xp_reward: 35,
    duration_seconds: 60,
    week_number: 13,
    day_of_week: 4,
  },
  {
    title: 'Desafio do dia: 10 minutos ao ar livre',
    description: 'Natureza e terapia comprovada.',
    type: 'desafio_dia',
    theme: 'mental',
    content_json: JSON.stringify({
      challenge: 'Passe pelo menos 10 minutos ao ar livre hoje, sem celular. Pode ser no jardim, na varanda, em um parque ou apenas no lado de fora do trabalho.',
      category: 'mental',
      verification: 'honor_system',
      tips: [
        'A exposicao ao sol pela manha regula o ciclo circadiano e melhora o sono',
        'O contato com a natureza reduz o cortisol em ate 21% em apenas 20 minutos',
        'Preste atencao nos sons, cheiros e sensacoes ao redor — isso e grounding natural',
      ],
      xp_bonus: 10,
    }),
    xp_reward: 35,
    duration_seconds: 30,
    week_number: 13,
    day_of_week: 5,
  },

  // ── Semana 14: Consolidacao — novos tipos restantes ──
  {
    title: 'Flashcard: sindrome pre-menstrual (TPM)',
    description: 'O que e e como aliviar a TPM.',
    type: 'flashcard',
    theme: 'ciclo',
    content_json: JSON.stringify({
      front: 'O que causa a TPM e quais estrategias naturais ajudam a aliviar os sintomas?',
      back: 'A TPM (Tensao Pre-Menstrual) ocorre na fase lutea, causada pela queda de estrogeno e progesterona. Sintomas: irritabilidade, inchaco, dor de cabeca, ansiedade, compulsao alimentar. Estrategias comprovadas: magnesio (400mg/dia), vitamina B6, reducao de sodio e cafeina, exercicio aerobico moderado, sono regular e tecnicas de reducao de estresse. Em casos severos (TDPM), avalie com ginecologista.',
      category: 'ciclo',
    }),
    xp_reward: 20,
    duration_seconds: 50,
    week_number: 14,
    day_of_week: 1,
  },
  {
    title: 'Verdade ou mito: exercicio na menstruacao',
    description: 'Pode-se fazer exercicio durante a menstruacao?',
    type: 'verdadeiro_falso',
    theme: 'ciclo',
    content_json: JSON.stringify({
      statement: 'Fazer exercicio fisico durante a menstruacao e prejudicial e deve ser evitado.',
      answer: false,
      explanation: 'O exercicio moderado durante a menstruacao pode aliviar colicas, melhorar o humor e reduzir a fadiga. As endorfinas liberadas funcionam como analgesia natural. O que deve ser ajustado e a intensidade: prefira atividades mais leves como yoga, caminhada e pilates nos primeiros dias.',
    }),
    xp_reward: 20,
    duration_seconds: 25,
    week_number: 14,
    day_of_week: 2,
  },
  {
    title: 'Historia: o primeiro dia de colica',
    description: 'Como Beatriz pode aliviar as colicas de forma saudavel?',
    type: 'historia',
    theme: 'ciclo',
    content_json: JSON.stringify({
      scenario: 'Beatriz acordou com colicas fortes no primeiro dia de menstruacao. Ela tem trabalho importante hoje e quer se sentir melhor rapido. O que ela deveria tentar primeiro?',
      choices: [
        {
          text: 'Tomar varios analgesicos e ficar deitada o dia todo',
          feedback: 'Analgesicos podem ser necessarios em colicas intensas, mas isoladamente sem outras estrategias nao e a abordagem mais eficaz. Ficar completamente parada pode ate piorar as colicas.',
          xp_bonus: 0,
        },
        {
          text: 'Aplicar calor na barriga, beber cha de gengibre e fazer uma caminhada leve de 15 minutos',
          feedback: 'Excelente! O calor relaxa os musculos uterinos, o gengibre tem acao anti-inflamatoria comprovada e o movimento suave libera endorfinas que aliviam a dor naturalmente.',
          xp_bonus: 15,
        },
        {
          text: 'Tomar cafe forte para ter energia e ignorar a dor',
          feedback: 'Cafeina pode aumentar as colicas ao causar vasoconstricao e estimular contracoes musculares. Melhor evitar nos primeiros dias da menstruacao.',
          xp_bonus: 0,
        },
      ],
      correct: 1,
    }),
    xp_reward: 35,
    duration_seconds: 90,
    week_number: 14,
    day_of_week: 3,
  },
  {
    title: 'Qual imagem ilustra hidratacao adequada?',
    description: 'Aprenda a identificar o nivel de hidratacao pela urina.',
    type: 'imagem',
    theme: 'hidratacao',
    content_json: JSON.stringify({
      question: 'Qual cor de urina indica hidratacao adequada?',
      images: [
        { label: 'Amarelo escuro a laranja', value: 'Indica desidratacao moderada a severa', correct: false },
        { label: 'Amarelo palido a transparente', value: 'Indica hidratacao adequada', correct: true },
        { label: 'Incolor completamente', value: 'Pode indicar super-hidratacao ou problema renal', correct: false },
        { label: 'Amarelo forte com espuma', value: 'Pode indicar proteinuria ou desidratacao intensa', correct: false },
      ],
      explanation: 'A escala de cor da urina (1-8) e uma ferramenta simples: cores 1-3 (palido a levemente amarelo) indicam boa hidratacao. Acima de 4, beba mais agua. Cores alaranjadas ou com espuma merecem atencao medica.',
    }),
    xp_reward: 30,
    duration_seconds: 40,
    week_number: 14,
    day_of_week: 4,
  },
  {
    title: 'Desafio do dia: diario do ciclo',
    description: 'Comece a registrar seu ciclo para se conhecer melhor.',
    type: 'desafio_dia',
    theme: 'ciclo',
    content_json: JSON.stringify({
      challenge: 'Hoje, anote no celular ou papel: data de hoje, como voce esta se sentindo (energia, humor, dores) e o que comeu. Faca isso por 5 dias seguidos.',
      category: 'ciclo',
      verification: 'honor_system',
      tips: [
        'Apps como Clue, Flo ou Drip tornam o rastreamento mais facil e visual',
        'Apos 2-3 meses de registro, voce conseguira identificar padroes claros',
        'Compartilhe esse diario com seu ginecologista nas consultas',
      ],
      xp_bonus: 15,
    }),
    xp_reward: 40,
    duration_seconds: 30,
    week_number: 14,
    day_of_week: 5,
  },
];

export function seedGamificationLessons(db: Database.Database): void {
  // Check if table exists (migrations may not have run yet)
  const tableExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='daily_lessons'"
  ).get();
  if (!tableExists) {
    console.log('[seed] daily_lessons table does not exist yet, skipping gamification seed.');
    return;
  }

  const existing = db.prepare('SELECT COUNT(*) as count FROM daily_lessons WHERE company_id IS NULL').get() as { count: number };

  if (existing.count >= lessons.length) {
    console.log('[seed] Gamification lessons already seeded, skipping.');
    return;
  }

  // Clear any partial seed — also clean dependent records first
  if (existing.count > 0) {
    const progressTableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='user_lesson_progress'"
    ).get();
    if (progressTableExists) {
      db.prepare(`
        DELETE FROM user_lesson_progress
        WHERE lesson_id IN (SELECT id FROM daily_lessons WHERE company_id IS NULL)
      `).run();
    }
    db.prepare('DELETE FROM daily_lessons WHERE company_id IS NULL').run();
  }

  const insert = db.prepare(`
    INSERT INTO daily_lessons (id, company_id, title, description, type, theme, content_json, xp_reward, duration_seconds, week_number, day_of_week, order_index, active)
    VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertAll = db.transaction(() => {
    lessons.forEach((lesson, index) => {
      insert.run(
        randomUUID(),
        lesson.title,
        lesson.description,
        lesson.type,
        lesson.theme,
        lesson.content_json,
        lesson.xp_reward,
        lesson.duration_seconds,
        lesson.week_number,
        lesson.day_of_week,
        index,
      );
    });
  });

  insertAll();
  console.log(`[seed] Inserted ${lessons.length} gamification lessons.`);
}
