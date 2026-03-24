import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'UniHER <noreply@uniher.com.br>';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via Resend.
 * Falls back to console.log if no API key (dev mode).
 * Never throws — logs errors and returns success/failure.
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const resend = getResend();

  if (!resend) {
    console.log('\n[EMAIL] (sem API key — modo dev)');
    console.log(`  Para: ${to}`);
    console.log(`  Assunto: ${subject}`);
    console.log(`  Corpo: ${html.substring(0, 200)}...`);
    console.log('[/EMAIL]\n');
    return true;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[EMAIL] Erro ao enviar:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[EMAIL] Falha ao enviar:', err);
    return false;
  }
}

/**
 * Fire-and-forget email — doesn't await result.
 * Use for non-critical emails (invites, welcome).
 */
export function sendEmailAsync(options: SendEmailOptions): void {
  sendEmail(options).catch(() => {});
}
