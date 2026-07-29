import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');

describe('auth proxy secret validation', () => {
  it('uses the canonical JWT verifier instead of encoding JWT_SECRET directly', () => {
    const source = fs.readFileSync(path.join(root, 'src/proxy.ts'), 'utf8');

    expect(source).toContain("import { verifyAccessToken } from '@/lib/auth/jwt'");
    expect(source).toContain('verifyAccessToken(accessToken)');
    expect(source).not.toContain('new TextEncoder().encode(process.env.JWT_SECRET)');
  });
});
