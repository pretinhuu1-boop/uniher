import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendEmail } from '@/lib/mail';

describe('production email provider boundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('fails closed when production has no Resend API key', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RESEND_API_KEY', '');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(sendEmail({
      to: 'user@example.com',
      subject: 'Security test',
      html: '<p>test</p>',
    })).resolves.toBe(false);
  });
});
