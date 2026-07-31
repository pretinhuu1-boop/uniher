import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendEmail } from '@/lib/mail';

const originalNodeEnv = process.env.NODE_ENV;
const originalApiKey = process.env.RESEND_API_KEY;

describe('production email provider boundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
  });

  it('fails closed when production has no Resend API key', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.RESEND_API_KEY;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(sendEmail({
      to: 'user@example.com',
      subject: 'Security test',
      html: '<p>test</p>',
    })).resolves.toBe(false);
  });
});
