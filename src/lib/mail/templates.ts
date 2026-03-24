const BASE_STYLE = `
  body { margin: 0; padding: 0; background-color: #FAF7F2; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
  .container { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
  .card { background: #FFFFFF; border-radius: 12px; padding: 40px 32px; border: 1px solid #E8DFD0; }
  .logo { text-align: center; margin-bottom: 24px; color: #C9A264; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
  .logo span { color: #1A3A6B; }
  h1 { color: #1A3A6B; font-size: 22px; margin: 0 0 16px 0; }
  p { color: #3D2E22; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; }
  .btn { display: inline-block; background: #C9A264; color: #FFFFFF !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 8px 0; }
  .muted { color: #8C7B6B; font-size: 13px; }
  .footer { text-align: center; padding: 24px 0 0; color: #8C7B6B; font-size: 12px; }
  .divider { border: none; border-top: 1px solid #E8DFD0; margin: 24px 0; }
`;

function layout(content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${BASE_STYLE}</style></head>
<body><div class="container"><div class="card">
  <div class="logo"><span>Uni</span>HER</div>
  ${content}
</div>
<div class="footer">
  <p>UniHER — Saúde Feminina Corporativa</p>
  <p class="muted">Este email foi enviado automaticamente. Não responda.</p>
</div>
</div></body></html>`;
}

// ─── Templates ───

export function inviteEmailHtml(data: {
  inviterName: string;
  companyName: string;
  inviteUrl: string;
  role: string;
  expiresInDays: number;
}): string {
  const roleLabel: Record<string, string> = {
    rh: 'RH',
    lideranca: 'Liderança',
    colaboradora: 'Colaboradora',
  };
  return layout(`
    <h1>Você foi convidada!</h1>
    <p><strong>${data.inviterName}</strong> convidou você para a plataforma <strong>UniHER</strong> da empresa <strong>${data.companyName}</strong> como <strong>${roleLabel[data.role] || data.role}</strong>.</p>
    <p>A UniHER é uma plataforma de saúde feminina corporativa com desafios, gamificação e acompanhamento personalizado.</p>
    <hr class="divider">
    <p style="text-align:center"><a href="${data.inviteUrl}" class="btn">Aceitar Convite</a></p>
    <hr class="divider">
    <p class="muted">Este convite expira em ${data.expiresInDays} dias. Se você não esperava este email, ignore-o com segurança.</p>
    <p class="muted" style="word-break:break-all">Link: ${data.inviteUrl}</p>
  `);
}

export function passwordResetEmailHtml(data: {
  userName: string;
  resetUrl: string;
}): string {
  return layout(`
    <h1>Redefinir sua senha</h1>
    <p>Olá, <strong>${data.userName}</strong>!</p>
    <p>Recebemos uma solicitação para redefinir sua senha na UniHER. Clique no botão abaixo para criar uma nova senha:</p>
    <p style="text-align:center"><a href="${data.resetUrl}" class="btn">Redefinir Senha</a></p>
    <hr class="divider">
    <p class="muted">Este link expira em <strong>1 hora</strong>. Se você não solicitou essa alteração, ignore este email — sua senha permanecerá a mesma.</p>
    <p class="muted" style="word-break:break-all">Link: ${data.resetUrl}</p>
  `);
}

export function welcomeEmailHtml(data: {
  userName: string;
  companyName: string;
  loginUrl: string;
}): string {
  return layout(`
    <h1>Bem-vinda à UniHER!</h1>
    <p>Olá, <strong>${data.userName}</strong>! Sua conta na plataforma <strong>${data.companyName}</strong> foi criada com sucesso.</p>
    <p>Agora você pode acessar desafios de saúde, participar de campanhas, ganhar badges e acompanhar seu bem-estar.</p>
    <p style="text-align:center"><a href="${data.loginUrl}" class="btn">Acessar Plataforma</a></p>
    <hr class="divider">
    <p class="muted">Dica: Complete o quiz de arquétipo para receber recomendações personalizadas!</p>
  `);
}
