'use client';

import { useEffect, useRef, useState } from 'react';
import s from './proposta.module.css';

/* ═══════════════════════════════════════════════
   Proposta Comercial — Full Cinematic HTML Experience
   No video dependency — pure CSS/JS animations
   ═══════════════════════════════════════════════ */

// ── Animated counter hook ──
function useCounter(target: number, isVisible: boolean, duration = 2000, prefix = '', suffix = '') {
  const [display, setDisplay] = useState(prefix + '0' + suffix);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;
    hasAnimated.current = true;

    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * eased);
      setDisplay(prefix + current.toLocaleString('pt-BR') + suffix);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isVisible, target, duration, prefix, suffix]);

  return display;
}

// ── Intersection Observer hook ──
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// ── Parallax hook ──
function useParallax(speed = 0.5) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerOffset = rect.top - window.innerHeight / 2;
      setOffset(centerOffset * speed * -1);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return { ref, offset };
}

// ── Particle canvas ──
function ParticleCanvas({ color = '#D4B060', count = 40 }: { color?: string; count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener('resize', resize);

    particles.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3 - 0.2,
      size: Math.random() * 2.5 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = canvas.offsetHeight + 10; p.x = Math.random() * canvas.offsetWidth; }
        if (p.x < -10) p.x = canvas.offsetWidth + 10;
        if (p.x > canvas.offsetWidth + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.round(p.alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [color, count]);

  return <canvas ref={canvasRef} className={s.particleCanvas} />;
}

// ── Scroll progress indicator ──
function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? scrolled / total : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={s.progressBar}>
      <div className={s.progressFill} style={{ width: `${progress * 100}%` }} />
    </div>
  );
}

// ═══════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════

export default function PropostaPage() {
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const hide = () => { if (window.scrollY > 100) setShowHint(false); };
    window.addEventListener('scroll', hide, { passive: true });
    return () => window.removeEventListener('scroll', hide);
  }, []);

  return (
    <div className={s.page}>
      <ScrollProgress />
      <CoverSection showHint={showHint} />
      <ProblemSection />
      <SolutionSection />
      <MetricsSection />
      <ProductSection />
      <SuspenseSection />
      <PriceSection />
      <CTASection />
    </div>
  );
}

// ═══════════════════════════════════════════════
// SECTION COMPONENTS
// ═══════════════════════════════════════════════

function CoverSection({ showHint }: { showHint: boolean }) {
  const { ref, inView } = useInView(0.3);
  const parallax = useParallax(0.15);

  return (
    <section ref={ref} className={`${s.section} ${s.coverSection}`}>
      <ParticleCanvas color="#D4B060" count={50} />
      <div className={s.coverVignette} />

      <div
        ref={parallax.ref}
        className={`${s.coverContent} ${inView ? s.visible : ''}`}
        style={{ transform: `translateY(${parallax.offset}px)` }}
      >
        <div className={s.coverTag}>PROPOSTA COMERCIAL</div>
        <h1 className={s.coverLogo}>UniHER</h1>
        <p className={s.coverSub}>Saude Feminina como Estrategia Corporativa</p>
        <div className={s.coverLine} />
      </div>

      {showHint && (
        <div className={s.scrollHint}>
          <div className={s.scrollArrow} />
          <span>Role para explorar</span>
        </div>
      )}

      <div className={s.signature}>
        <span className={s.sigName}>Nelson Neto</span>
        <span className={s.sigBrand}>SEED AGENTS</span>
      </div>
    </section>
  );
}

function ProblemSection() {
  const { ref, inView } = useInView(0.2);

  const stats = [
    { value: '78%', label: 'das mulheres relatam impacto na produtividade' },
    { value: 'R$15bi', label: 'perdidos por ano em absenteismo feminino' },
    { value: '12%', label: 'das empresas tem programas de saude feminina' },
  ];

  return (
    <section ref={ref} className={`${s.section} ${s.problemSection}`}>
      <div className={s.sectionInner}>
        <div className={`${s.tagLine} ${inView ? s.visible : ''}`}>O CENARIO ATUAL</div>
        <h2 className={`${s.sectionTitle} ${inView ? s.visible : ''}`}>
          Doutora, voce conhece<br />esses numeros?
        </h2>

        <div className={s.statsGrid}>
          {stats.map((stat, i) => (
            <div
              key={i}
              className={`${s.statCard} ${inView ? s.visible : ''}`}
              style={{ transitionDelay: `${0.2 + i * 0.15}s` }}
            >
              <div className={s.statValue}>{stat.value}</div>
              <div className={s.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className={s.sectionDivider} />
    </section>
  );
}

function SolutionSection() {
  const { ref, inView } = useInView(0.2);

  const features = [
    { icon: '🎮', title: 'Gamificacao Duolingo', desc: 'Engajamento com XP, streaks e recompensas' },
    { icon: '📊', title: 'Dashboard RH', desc: 'Metricas em tempo real para gestores' },
    { icon: '📱', title: '16 Telas Funcionais', desc: 'App completo pronto para uso' },
    { icon: '🏆', title: 'Zero Concorrentes', desc: 'Unico no mercado brasileiro' },
  ];

  return (
    <section ref={ref} className={`${s.section} ${s.solutionSection}`}>
      <ParticleCanvas color="#C85C7E" count={20} />
      <div className={s.sectionInner}>
        <div className={`${s.tagLine} ${inView ? s.visible : ''}`}>A SOLUCAO</div>
        <h2 className={`${s.sectionTitle} ${inView ? s.visible : ''}`}>
          Produto pronto,<br />nao promessa
        </h2>

        <div className={s.featuresGrid}>
          {features.map((f, i) => (
            <div
              key={i}
              className={`${s.featureCard} ${inView ? s.visible : ''}`}
              style={{ transitionDelay: `${0.3 + i * 0.12}s` }}
            >
              <div className={s.featureIcon}>{f.icon}</div>
              <h3 className={s.featureTitle}>{f.title}</h3>
              <p className={s.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricsSection() {
  const { ref, inView } = useInView(0.3);

  const roi = useCounter(48, inView, 2000, '', 'x');
  const savings = useCounter(287, inView, 2200, 'R$', 'K');
  const absence = useCounter(23, inView, 1800, '-', '%');
  const engagement = useCounter(92, inView, 2400, '', '%');

  const metrics = [
    { display: roi, label: 'ROI Projetado', color: '#D4B060' },
    { display: savings, label: 'Economia Anual', color: '#4CAF50' },
    { display: absence, label: 'Absenteismo', color: '#C85C7E' },
    { display: engagement, label: 'Engajamento', color: '#D4B060' },
  ];

  return (
    <section ref={ref} className={`${s.section} ${s.metricsSection}`}>
      <div className={s.sectionInner}>
        <div className={`${s.tagLine} ${inView ? s.visible : ''}`}>RESULTADOS REAIS</div>
        <h2 className={`${s.sectionTitle} ${inView ? s.visible : ''}`}>
          Numeros que convencem<br />qualquer board
        </h2>

        <div className={s.metricsGrid}>
          {metrics.map((m, i) => (
            <div
              key={i}
              className={`${s.metricCard} ${inView ? s.visible : ''}`}
              style={{ transitionDelay: `${0.2 + i * 0.15}s` }}
            >
              <div className={s.metricValue} style={{ color: m.color }}>{m.display}</div>
              <div className={s.metricLabel}>{m.label}</div>
              <div className={s.metricGlow} style={{ background: m.color }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductSection() {
  const { ref, inView } = useInView(0.2);

  const items = [
    { value: '20.037', label: 'Linhas de Codigo', icon: '⌨️' },
    { value: '16', label: 'Paginas Funcionais', icon: '📄' },
    { value: '28', label: 'Componentes UI', icon: '🧩' },
    { value: '101', label: 'Arquivos Fonte', icon: '📁' },
    { value: 'Next.js 16', label: 'Tech Stack', icon: '⚡' },
    { value: 'Online', label: 'Deploy Ativo', icon: '🌐' },
  ];

  return (
    <section ref={ref} className={`${s.section} ${s.productSection}`}>
      <div className={s.sectionInner}>
        <div className={`${s.tagLine} ${inView ? s.visible : ''}`}>O PRODUTO</div>
        <h2 className={`${s.sectionTitle} ${inView ? s.visible : ''}`}>
          Tudo pronto para<br />uso imediato
        </h2>

        <div className={s.productGrid}>
          {items.map((item, i) => (
            <div
              key={i}
              className={`${s.productCard} ${inView ? s.visible : ''}`}
              style={{ transitionDelay: `${0.15 + i * 0.08}s` }}
            >
              <div className={s.productIcon}>{item.icon}</div>
              <div className={s.productValue}>{item.value}</div>
              <div className={s.productLabel}>{item.label}</div>
            </div>
          ))}
        </div>

        <div className={`${s.comparisonBadge} ${inView ? s.visible : ''}`}>
          <span>Custo de replicacao: </span>
          <strong>R$ 190.000 — R$ 365.000</strong>
        </div>
      </div>
    </section>
  );
}

function SuspenseSection() {
  const { ref, inView } = useInView(0.4);

  return (
    <section ref={ref} className={`${s.section} ${s.suspenseSection}`}>
      <div className={s.suspenseVignette} />
      <div className={s.sectionInner}>
        <div className={`${s.suspenseLine} ${inView ? s.visible : ''}`} style={{ transitionDelay: '0.2s' }}>
          UM PRODUTO QUE CUSTARIA
        </div>
        <div className={`${s.suspensePrice} ${inView ? s.visible : ''}`} style={{ transitionDelay: '0.6s' }}>
          R$ 190.000 a R$ 365.000
        </div>
        <div className={`${s.suspenseLine} ${inView ? s.visible : ''}`} style={{ transitionDelay: '1.0s' }}>
          para ser desenvolvido do zero...
        </div>
        <div className={`${s.suspenseQuestion} ${inView ? s.visible : ''}`} style={{ transitionDelay: '1.5s' }}>
          Por quanto voce pode ter tudo isso?
        </div>
      </div>
    </section>
  );
}

function PriceSection() {
  const { ref, inView } = useInView(0.4);

  return (
    <section ref={ref} className={`${s.section} ${s.priceSection}`}>
      <ParticleCanvas color="#D4B060" count={60} />
      <div className={`${s.priceFlash} ${inView ? s.active : ''}`} />
      <div className={s.sectionInner}>
        <div className={`${s.priceTag} ${inView ? s.visible : ''}`}>INVESTIMENTO TOTAL</div>
        <div className={`${s.priceValue} ${inView ? s.visible : ''}`}>
          R$ 20.000
        </div>
        <p className={`${s.priceSub} ${inView ? s.visible : ''}`}>
          Projeto completo com transferencia total de propriedade
        </p>

        <div className={`${s.priceOptions} ${inView ? s.visible : ''}`}>
          <div className={s.priceOption}>
            <span className={s.priceOptionLabel}>Economia de</span>
            <span className={s.priceOptionValue}>89% a 94%</span>
          </div>
          <div className={`${s.priceOption} ${s.priceOptionGreen}`}>
            <span>ou R$ 18.000 a vista (Pix)</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { ref, inView } = useInView(0.3);

  return (
    <section ref={ref} className={`${s.section} ${s.ctaSection}`}>
      <ParticleCanvas color="#D4B060" count={30} />
      <div className={s.sectionInner}>
        <div className={`${s.tagLine} ${inView ? s.visible : ''}`}>PROXIMO PASSO</div>
        <h2 className={`${s.ctaTitle} ${inView ? s.visible : ''}`}>
          Vamos conversar sobre<br />essa oportunidade?
        </h2>
        <p className={`${s.ctaSub} ${inView ? s.visible : ''}`}>
          Estou aberto a ouvir sua contraproposta.<br />
          O importante e que esse projeto ganhe vida.
        </p>
        <div className={`${s.ctaButton} ${inView ? s.visible : ''}`}>
          Agendar Conversa
        </div>

        <div className={`${s.ctaSignature} ${inView ? s.visible : ''}`}>
          <div className={s.ctaSigLine} />
          <span className={s.ctaSigName}>Nelson Neto</span>
          <span className={s.ctaSigBrand}>SEED AGENTS</span>
        </div>
      </div>
    </section>
  );
}
