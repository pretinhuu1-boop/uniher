import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig, Img, Video, staticFile } from 'remotion';

// ─── Shared styles ───
const GOLD = '#C9A264';
const NAVY = '#1A3A6B';
const GREEN = '#4ade80';
const BG_DARK = '#0a0a0a';
const BG_LIGHT = '#FAF7F2';

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const y = spring({ frame: frame - delay, fps, config: { damping: 20 } }) * 30 - 30;
  return <div style={{ opacity: Math.max(0, opacity), transform: `translateY(${-y}px)` }}>{children}</div>;
}

function TypeWriter({ text, startFrame }: { text: string; startFrame: number }) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - startFrame, [0, text.length * 2], [0, text.length], { extrapolateRight: 'clamp' });
  const visible = text.slice(0, Math.max(0, Math.floor(progress)));
  return <span>{visible}<span style={{ opacity: frame % 20 < 10 ? 1 : 0 }}>|</span></span>;
}

// ─── Scene 1: Axial Agents Logo ───
function SceneAxial() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 15 } });
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const glowSize = interpolate(frame, [20, 60], [0, 40], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: BG_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', opacity, transform: `scale(${scale})` }}>
        {/* Axial A logo */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <svg width="120" height="120" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#888" />
                <stop offset="100%" stopColor="#444" />
              </linearGradient>
            </defs>
            <path d="M50 10 L85 85 H75 L50 25 L25 85 H15 Z" fill="url(#ag)" />
            <path d="M50 10 L60 35 L50 25 L40 35 Z" fill="#666" />
            <circle cx="50" cy="55" r={5 + glowSize * 0.1} fill={GREEN} opacity={0.9}>
              <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
            </circle>
          </svg>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: glowSize * 2, height: glowSize * 2, borderRadius: '50%', background: `radial-gradient(${GREEN}33, transparent)`, pointerEvents: 'none' }} />
        </div>
        <div style={{ fontFamily: 'Space Grotesk, system-ui', fontSize: 28, color: GREEN, letterSpacing: 6, marginTop: 16, textTransform: 'uppercase' }}>
          Axial Agents
        </div>
        <FadeIn delay={30}>
          <div style={{ fontSize: 13, color: '#555', letterSpacing: 4, marginTop: 20, textTransform: 'uppercase' }}>
            apresenta
          </div>
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
}

// ─── Scene 2: Transition ───
function SceneTransition() {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${BG_DARK} ${(1 - progress) * 100}%, ${BG_LIGHT} 100%)` }} />
  );
}

// ─── Scene 3: UniHER Hero ───
function SceneUniHER() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #9A7520 60%, ${NAVY} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', transform: `scale(${scale})` }}>
        {/* Lotus SVG */}
        <svg width="80" height="80" viewBox="0 0 200 160" fill="none">
          <path d="M100,148 C84,134 74,108 74,80 C74,52 84,22 100,10 C116,22 126,52 126,80 C126,108 116,134 100,148 Z" stroke="white" strokeWidth="3" fill="none" />
          <path d="M100,148 C86,132 56,122 34,104 C14,88 8,62 20,46 C34,30 62,38 76,62 C88,82 94,114 100,148 Z" stroke="white" strokeWidth="3" fill="none" />
          <path d="M100,148 C114,132 144,122 166,104 C186,88 192,62 180,46 C166,30 138,38 124,62 C112,82 106,114 100,148 Z" stroke="white" strokeWidth="3" fill="none" />
        </svg>
        <FadeIn delay={10}>
          <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 48, color: 'white', fontWeight: 700, marginTop: 12 }}>UniHER</div>
        </FadeIn>
        <FadeIn delay={25}>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,.85)', marginTop: 8, maxWidth: 450 }}>
            Saude Feminina Corporativa
          </div>
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
}

// ─── Scene 4: Stats ───
function SceneStats() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { num: 25, label: 'Features Prontas', color: GREEN },
    { num: 102, label: 'Testes Criados', color: GOLD },
    { num: 0, label: 'Vulnerabilidades', color: '#ef4444' },
    { num: 68, label: '% Concluido', color: NAVY },
  ];

  return (
    <AbsoluteFill style={{ background: BG_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: '100%', maxWidth: 800 }}>
        <FadeIn>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 32, color: NAVY, marginBottom: 32, textAlign: 'center' }}>
            Progresso Geral
          </div>
        </FadeIn>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
          {stats.map((s, i) => {
            const val = Math.min(s.num, Math.floor(interpolate(frame - 15 - i * 8, [0, 30], [0, s.num], { extrapolateRight: 'clamp' })));
            const sc = spring({ frame: frame - 10 - i * 8, fps, config: { damping: 15 } });
            return (
              <div key={i} style={{ flex: 1, background: 'white', borderRadius: 14, padding: '28px 16px', textAlign: 'center', border: '1px solid #e8dfd0', transform: `scale(${sc})` }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 40, fontWeight: 700, color: s.color }}>{Math.max(0, val)}</div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#9A7520', marginTop: 4, fontWeight: 600 }}>{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Scene 5: Features Admin ───
function SceneAdmin() {
  const frame = useCurrentFrame();
  const features = [
    { icon: '📊', title: 'Dashboard com KPIs', sub: 'Metricas em tempo real' },
    { icon: '👩', title: 'Gestao de Colaboradoras', sub: 'CRUD completo' },
    { icon: '📧', title: 'Convites', sub: 'Individual ou em massa' },
    { icon: '📅', title: 'Campanhas', sub: 'Datas e temas customizaveis' },
    { icon: '🎯', title: 'Desafios & Gamificacao', sub: 'Pontos, badges, ranking' },
    { icon: '🔒', title: 'Seguranca OWASP', sub: '0 vulnerabilidades' },
  ];

  return (
    <AbsoluteFill style={{ background: BG_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: '100%', maxWidth: 800 }}>
        <FadeIn>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: NAVY, marginBottom: 24, textAlign: 'center' }}>
            Admin Empresa
          </div>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {features.map((f, i) => {
            const delay = 10 + i * 8;
            const opacity = interpolate(frame - delay, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{ opacity: Math.max(0, opacity), background: 'white', borderRadius: 10, padding: 16, border: '1px solid #e8dfd0' }}>
                <div style={{ fontSize: 24 }}>{f.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginTop: 6 }}>{f.title}</div>
                <div style={{ fontSize: 11, color: '#7a6b5a', marginTop: 2 }}>{f.sub}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Scene 6: Colaboradora ───
function SceneColaboradora() {
  const frame = useCurrentFrame();
  const features = [
    { icon: '☀️', title: 'Check-in Diario' },
    { icon: '🚦', title: 'Semaforo de Saude' },
    { icon: '🏆', title: 'Badges & Conquistas' },
    { icon: '🏅', title: 'Ranking & Ligas' },
  ];

  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${GOLD}22 0%, ${BG_LIGHT} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <div style={{ textAlign: 'center' }}>
        <FadeIn>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: NAVY, marginBottom: 32 }}>
            Experiencia da Colaboradora
          </div>
        </FadeIn>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
          {features.map((f, i) => {
            const delay = 10 + i * 10;
            const opacity = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
            const y = interpolate(frame - delay, [0, 15], [20, 0], { extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{ opacity: Math.max(0, opacity), transform: `translateY(${Math.max(0, y)}px)`, background: 'white', borderRadius: 16, padding: '24px 20px', minWidth: 140, border: '1px solid #e8dfd0', boxShadow: '0 4px 16px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize: 36 }}>{f.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginTop: 8 }}>{f.title}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Scene 7: Closing ───
function SceneClosing() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: BG_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', opacity, transform: `scale(${Math.max(0.5, scale)})` }}>
        <svg width="60" height="60" viewBox="0 0 200 160" fill="none">
          <path d="M100,148 C84,134 74,108 74,80 C74,52 84,22 100,10 C116,22 126,52 126,80 C126,108 116,134 100,148 Z" stroke={GOLD} strokeWidth="3" fill="none" />
          <path d="M100,148 C86,132 56,122 34,104 C14,88 8,62 20,46 C34,30 62,38 76,62 C88,82 94,114 100,148 Z" stroke={GOLD} strokeWidth="3" fill="none" />
          <path d="M100,148 C114,132 144,122 166,104 C186,88 192,62 180,46 C166,30 138,38 124,62 C112,82 106,114 100,148 Z" stroke={GOLD} strokeWidth="3" fill="none" />
        </svg>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 36, color: 'white', marginTop: 12, fontWeight: 700 }}>UniHER</div>
        <div style={{ fontSize: 12, color: '#666', letterSpacing: 2, marginTop: 24, textTransform: 'uppercase' }}>desenvolvido por</div>
        <div style={{ fontFamily: 'Space Grotesk, system-ui', fontSize: 22, color: GREEN, letterSpacing: 4, marginTop: 8, textTransform: 'uppercase', fontWeight: 600 }}>
          Axial Agents
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Main Composition ───
export const Presentation: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={90}><SceneAxial /></Sequence>
      <Sequence from={90} durationInFrames={30}><SceneTransition /></Sequence>
      <Sequence from={120} durationInFrames={90}><SceneUniHER /></Sequence>
      <Sequence from={210} durationInFrames={90}><SceneStats /></Sequence>
      <Sequence from={300} durationInFrames={90}><SceneAdmin /></Sequence>
      <Sequence from={390} durationInFrames={90}><SceneColaboradora /></Sequence>
      <Sequence from={480} durationInFrames={90}><SceneClosing /></Sequence>
    </AbsoluteFill>
  );
};
