const fs = require('fs');
const path = require('path');

// Read assets as base64
const b64 = (f, mime) => 'data:' + mime + ';base64,' + fs.readFileSync(f).toString('base64');

// Use compressed versions for v2
const useSmall = process.argv.includes('--v2');
const a = {
  logo: b64(useSmall ? 'screenshots-small/logo.png' : 'public/logo-uniher.png', useSmall ? 'image/png' : 'image/png'),
  video: b64(useSmall ? 'axial-intro-small.mp4' : 'axial-intro.mp4', 'video/mp4'),
  s02: b64(useSmall ? 'screenshots-small/02-dashboard-rh.jpg' : 'screenshots/02-dashboard-rh.jpg', 'image/jpeg'),
  s05: b64(useSmall ? 'screenshots-small/05-configuracoes.jpg' : 'screenshots/05-configuracoes.jpg', 'image/jpeg'),
  s06: b64(useSmall ? 'screenshots-small/06-landing.jpg' : 'screenshots/06-landing.jpg', 'image/jpeg'),
  s07: b64(useSmall ? 'screenshots-small/07-login.jpg' : 'screenshots/07-login.jpg', 'image/jpeg'),
};

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>UniHER — Axial Agents</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Montserrat:wght@300;400;500;600&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased}
body{font-family:'Montserrat',system-ui,sans-serif;background:#0a0a0a;color:#e0e0e0;overflow-x:hidden}
h1,h2{font-family:'Playfair Display',Georgia,serif}
.cinema{position:relative;width:100%;height:100vh;overflow:hidden;background:#000}
.cinema video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.85}
.cinema .ov{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 30%,rgba(0,0,0,.7) 100%)}
.cinema .ct{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center}
.scene{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:60px 24px;position:relative;overflow:hidden}
.s-dark{background:#0a0a0a}.s-gold{background:linear-gradient(135deg,#C9A264 0%,#9A7520 60%,#1A3A6B 100%)}.s-light{background:#FAF7F2;color:#3a3024}
[data-a]{opacity:0;transform:translateY(40px);transition:all .8s cubic-bezier(.25,.46,.45,.94)}
[data-a].v{opacity:1;transform:translateY(0)}
[data-a="s"]{transform:scale(.8);opacity:0}[data-a="s"].v{transform:scale(1);opacity:1}
[data-a="l"]{transform:translateX(-60px);opacity:0}[data-a="l"].v{transform:translateX(0);opacity:1}
[data-a="r"]{transform:translateX(60px);opacity:0}[data-a="r"].v{transform:translateX(0);opacity:1}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;width:100%;max-width:900px;margin:24px 0}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;width:100%;max-width:800px;margin:24px 0}
.g2{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;width:100%;max-width:900px;margin:24px 0}
.cd{background:#fff;border:1px solid #e8dfd0;border-radius:14px;padding:20px;text-align:center}
.cd-d{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#e0e0e0;border-radius:14px;padding:20px;text-align:center}
.sn{font-family:'Playfair Display',serif;font-size:40px;font-weight:700}
.sl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#9A7520;margin-top:4px;font-weight:600}
.ss{width:100%;max-width:800px;border-radius:12px;border:1px solid #e8dfd0;box-shadow:0 8px 32px rgba(0,0,0,.1)}
.badge{display:inline-block;padding:3px 12px;border-radius:12px;font-size:10px;font-weight:700}
.badge.ok{background:#dcfce7;color:#16a34a}.badge.wip{background:#fef3c7;color:#d97706}.badge.next{background:#e0e7ff;color:#4f46e5}
.gg{text-shadow:0 0 20px rgba(74,222,128,.5)}.gd{text-shadow:0 0 20px rgba(201,162,100,.5)}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}.fl{animation:float 3s ease-in-out infinite}
.pb{height:8px;background:#e8dfd0;border-radius:4px;overflow:hidden;margin:16px 0;width:100%;max-width:600px}
.pf{height:100%;background:linear-gradient(90deg,#C9A264,#9A7520);border-radius:4px;width:0;transition:width 1.5s ease}
.sa{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);cursor:pointer;animation:float 2s ease-in-out infinite;z-index:3}
table{width:100%;max-width:800px;border-collapse:collapse;font-size:13px}
table th{text-align:left;padding:8px 12px;background:rgba(255,255,255,.05);color:#C9A264;font-size:11px;text-transform:uppercase}
table td{padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.05)}
.note{border-left:3px solid #d97706;background:rgba(254,243,199,.15);padding:12px 16px;border-radius:0 8px 8px 0;font-size:13px;max-width:800px;width:100%}
.fi{display:flex;align-items:flex-start;gap:10px;padding:14px;background:#FAF7F2;border-radius:10px;text-align:left;font-size:13px}
.fi .ic{font-size:20px}.fi strong{color:#1A3A6B;display:block;font-size:13px}.fi span{color:#7a6b5a;font-size:11px}
.flow-steps{display:flex;flex-direction:column;align-items:center;gap:8px;width:100%;max-width:400px}
.flow-step{display:flex;align-items:center;gap:12px;background:rgba(201,162,100,.1);border:1px solid rgba(201,162,100,.25);padding:12px 24px;border-radius:12px;color:#C9A264;font-size:14px;font-weight:500;width:100%}
.flow-step-green{background:rgba(74,222,128,.08);border-color:rgba(74,222,128,.25);color:#4ade80}
.flow-num{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:rgba(201,162,100,.2);color:#C9A264;font-size:12px;font-weight:700;flex-shrink:0}
.flow-arrow{opacity:.4;margin:2px 0}
@media(max-width:768px){.g4,.g3{grid-template-columns:repeat(2,1fr)}.cinema{height:60vh}.scene{padding:40px 16px;min-height:auto}.sn{font-size:28px}}
@media(max-width:480px){.g4,.g3,.g2{grid-template-columns:1fr}}
</style>
</head>
<body>

<div class="cinema">
<video autoplay muted loop playsinline><source src="${a.video}" type="video/mp4"></video>
<div class="ov"></div>
<div class="ct">
<div style="font-family:'Space Grotesk',sans-serif;font-size:clamp(14px,3vw,20px);letter-spacing:8px;text-transform:uppercase;color:#4ade80" class="gg">Axial Agents</div>
<div style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#555;margin-top:24px">apresenta</div>
</div>
<div class="sa" onclick="document.querySelectorAll('.scene')[0].scrollIntoView({behavior:'smooth'})">
<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>
</div>
</div>

<div class="scene s-gold">
<img data-a="s" src="${a.logo}" style="width:120px;height:auto;filter:brightness(10)">
<h1 data-a style="font-size:clamp(32px,6vw,52px);color:#fff;font-weight:700;margin-top:12px">UniHER</h1>
<p data-a style="font-size:16px;color:rgba(255,255,255,.85);max-width:500px;text-align:center;font-weight:300;margin-top:8px">Plataforma de Saude Feminina Corporativa</p>
<div data-a style="background:rgba(255,255,255,.15);padding:4px 16px;border-radius:20px;font-size:12px;margin-top:12px;color:#fff">Marco 2026</div>
</div>

<div class="scene s-light">
<h2 data-a style="color:#1A3A6B;margin-bottom:8px">Progresso Geral</h2>
<div class="pb"><div class="pf" id="pb"></div></div>
<div style="display:flex;justify-content:space-between;width:100%;max-width:600px;font-size:11px;color:#7a6b5a"><span>Em desenvolvimento</span><span>68%</span></div>
<div class="g4" style="margin-top:24px">
<div class="cd" data-a="s"><div class="sn" style="color:#4ade80" data-c="25">0</div><div class="sl">Features</div></div>
<div class="cd" data-a="s"><div class="sn" style="color:#C9A264" data-c="102">0</div><div class="sl">Testes</div></div>
<div class="cd" data-a="s"><div class="sn" style="color:#ef4444" data-c="0">0</div><div class="sl">CVEs</div></div>
<div class="cd" data-a="s"><div class="sn" style="color:#1A3A6B" data-c="3">0</div><div class="sl">Perfis</div></div>
</div>
</div>

<div class="scene s-dark">
<h2 data-a style="color:#C9A264;margin-bottom:24px">Fluxo</h2>
<div class="flow-steps">
<div data-a class="flow-step"><span class="flow-num">1</span>Admin cria empresa</div>
<svg class="flow-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A264" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
<div data-a class="flow-step"><span class="flow-num">2</span>Cria admin da empresa</div>
<svg class="flow-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A264" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
<div data-a class="flow-step"><span class="flow-num">3</span>Admin convida colaboradoras</div>
<svg class="flow-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
<div data-a class="flow-step flow-step-green"><span class="flow-num" style="background:#4ade80;color:#0a0a0a">4</span>Colaboradora usa a plataforma</div>
</div>
</div>

<div class="scene s-light">
<h2 data-a style="color:#1A3A6B;margin-bottom:24px">Telas</h2>
<div class="g2">
<div data-a="l"><div style="font-size:11px;color:#9A7520;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px">Landing</div><img class="ss" src="${a.s06}"></div>
<div data-a="r"><div style="font-size:11px;color:#9A7520;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px">Login</div><img class="ss" src="${a.s07}"></div>
</div>
</div>

<div class="scene s-dark">
<h2 data-a style="color:#C9A264;margin-bottom:8px">Admin Empresa</h2>
<p data-a style="color:#777;font-size:13px;margin-bottom:20px">Gestao completa de colaboradoras, campanhas e metricas</p>
<img data-a="s" class="ss" src="${a.s02}" style="border-color:rgba(255,255,255,.1)">
<div class="g3" style="margin-top:24px">
<div class="cd-d" data-a><div style="font-size:24px">📊</div><strong style="color:#C9A264;margin-top:8px;display:block;font-size:13px">Dashboard</strong><span style="font-size:11px;color:#777">KPIs e ROI</span></div>
<div class="cd-d" data-a><div style="font-size:24px">👩</div><strong style="color:#C9A264;margin-top:8px;display:block;font-size:13px">Colaboradoras</strong><span style="font-size:11px;color:#777">CRUD completo</span></div>
<div class="cd-d" data-a><div style="font-size:24px">📧</div><strong style="color:#C9A264;margin-top:8px;display:block;font-size:13px">Convites</strong><span style="font-size:11px;color:#777">Individual e massa</span></div>
<div class="cd-d" data-a><div style="font-size:24px">📅</div><strong style="color:#C9A264;margin-top:8px;display:block;font-size:13px">Campanhas</strong><span style="font-size:11px;color:#777">Datas e temas</span></div>
<div class="cd-d" data-a><div style="font-size:24px">🎯</div><strong style="color:#C9A264;margin-top:8px;display:block;font-size:13px">Desafios</strong><span style="font-size:11px;color:#777">Gamificacao</span></div>
<div class="cd-d" data-a><div style="font-size:24px">🔒</div><strong style="color:#C9A264;margin-top:8px;display:block;font-size:13px">Seguranca</strong><span style="font-size:11px;color:#777">0 CVEs</span></div>
</div>
</div>

<div class="scene s-light">
<h2 data-a style="color:#1A3A6B;margin-bottom:24px">Colaboradora</h2>
<div class="g4" style="max-width:800px">
<div class="cd" data-a="s" style="padding:24px 12px"><div style="font-size:36px" class="fl">☀️</div><strong style="color:#1A3A6B;font-size:13px;margin-top:8px;display:block">Check-in</strong></div>
<div class="cd" data-a="s" style="padding:24px 12px"><div style="font-size:36px" class="fl">🚦</div><strong style="color:#1A3A6B;font-size:13px;margin-top:8px;display:block">Semaforo</strong></div>
<div class="cd" data-a="s" style="padding:24px 12px"><div style="font-size:36px" class="fl">🏆</div><strong style="color:#1A3A6B;font-size:13px;margin-top:8px;display:block">Badges</strong></div>
<div class="cd" data-a="s" style="padding:24px 12px"><div style="font-size:36px" class="fl">🏅</div><strong style="color:#1A3A6B;font-size:13px;margin-top:8px;display:block">Ranking</strong></div>
</div>
</div>

<div class="scene s-dark">
<h2 data-a style="color:#C9A264;margin-bottom:24px">Status</h2>
<table data-a>
<tr><th>Area</th><th style="text-align:center">Status</th></tr>
<tr><td>Login / Sessao</td><td style="text-align:center"><span class="badge ok">Pronto</span></td></tr>
<tr><td>Admin Master</td><td style="text-align:center"><span class="badge ok">Pronto</span></td></tr>
<tr><td>Empresas</td><td style="text-align:center"><span class="badge ok">Pronto</span><br><span style="font-size:9px;color:#d97706">em testes manuais</span></td></tr>
<tr><td>Colaboradoras</td><td style="text-align:center"><span class="badge ok">Pronto</span><br><span style="font-size:9px;color:#d97706">em testes manuais</span></td></tr>
<tr><td>Convites</td><td style="text-align:center"><span class="badge ok">Pronto</span><br><span style="font-size:9px;color:#d97706">em testes manuais</span></td></tr>
<tr><td>Campanhas</td><td style="text-align:center"><span class="badge ok">Pronto</span><br><span style="font-size:9px;color:#d97706">em testes manuais</span></td></tr>
<tr><td>Gamificacao</td><td style="text-align:center"><span class="badge ok">Pronto</span><br><span style="font-size:9px;color:#d97706">em testes manuais</span></td></tr>
<tr><td>Seguranca</td><td style="text-align:center"><span class="badge ok">Pronto</span></td></tr>
<tr><td>102 Testes</td><td style="text-align:center"><span class="badge ok">Pronto</span></td></tr>
<tr><td>LGPD</td><td style="text-align:center"><span class="badge ok">Pronto</span><br><span style="font-size:9px;color:#d97706">em testes manuais</span></td></tr>
<tr><td>UX Polish</td><td style="text-align:center"><span class="badge wip">Em andamento</span></td></tr>
<tr><td>Email (Resend)</td><td style="text-align:center"><span class="badge wip">Pre-config</span></td></tr>
<tr><td>Deploy</td><td style="text-align:center"><span class="badge next">Proximo</span></td></tr>
</table>
</div>

<div class="scene s-light" style="min-height:auto;padding:40px 24px">
<h2 data-a style="color:#1A3A6B;margin-bottom:16px">Fase Atual</h2>
<div class="note" data-a><strong>Teste manual ponta a ponta em andamento</strong> — validando cada funcionalidade como usuario real.</div>
<div class="g2" style="margin-top:16px;max-width:700px">
<div class="fi" data-a><span class="ic">🔍</span><div><strong>Testes manuais</strong><span>Cada tela e fluxo</span></div></div>
<div class="fi" data-a><span class="ic">✨</span><div><strong>UX</strong><span>Empty states, loading</span></div></div>
<div class="fi" data-a><span class="ic">📧</span><div><strong>Email</strong><span>Resend para convites</span></div></div>
<div class="fi" data-a><span class="ic">🚀</span><div><strong>Deploy</strong><span>VPS + dominio + SSL</span></div></div>
</div>
</div>

<div class="scene s-dark" style="min-height:60vh">
<img data-a="s" src="${a.logo}" style="width:80px;height:auto;filter:brightness(10);opacity:.8">
<h1 data-a style="color:#fff;font-size:36px;margin-top:12px" class="gd">UniHER</h1>
<div data-a style="color:#555;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-top:32px">desenvolvido por</div>
<div data-a style="font-family:'Space Grotesk',sans-serif;font-size:22px;color:#4ade80;letter-spacing:5px;text-transform:uppercase;font-weight:600;margin-top:8px" class="gg">Axial Agents</div>
<div style="color:#333;font-size:11px;margin-top:32px">Marco 2026</div>
</div>

<script>
const o=new IntersectionObserver(e=>{e.forEach((x,i)=>{if(x.isIntersecting)setTimeout(()=>x.target.classList.add('v'),i*80)})},{threshold:.15});
document.querySelectorAll('[data-a]').forEach(e=>o.observe(e));
const co=new IntersectionObserver(e=>{e.forEach(x=>{if(x.isIntersecting){const el=x.target,t=+el.dataset.c;let c=0;const s=Math.max(1,Math.floor(t/30));const i=setInterval(()=>{c+=s;if(c>=t){c=t;clearInterval(i)}el.textContent=c},30);co.unobserve(el)}})},{threshold:.5});
document.querySelectorAll('[data-c]').forEach(e=>co.observe(e));
const po=new IntersectionObserver(e=>{e.forEach(x=>{if(x.isIntersecting){x.target.style.width='68%';po.unobserve(x.target)}})},{threshold:.5});
const pb=document.getElementById('pb');if(pb)po.observe(pb);
</script>
</body>
</html>`;

const outFile = useSmall ? 'apresentacao-cliente-v2.html' : 'apresentacao-cliente.html';
fs.writeFileSync(outFile, html);
console.log('Size: ' + (Buffer.byteLength(html) / 1024 / 1024).toFixed(1) + ' MB');
console.log('Done - single file, no external dependencies!');
