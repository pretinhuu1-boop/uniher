import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getUserRoleLabel } from '@/lib/users/role-label';

describe('user role labels', () => {
  it('renders the correct platform profile label for each role', () => {
    expect(getUserRoleLabel('admin')).toBe('Admin Master');
    expect(getUserRoleLabel('rh')).toBe('Admin Empresa');
    expect(getUserRoleLabel('lideranca')).toBe('Liderança');
    expect(getUserRoleLabel('colaboradora')).toBe('Colaboradora');
  });

  it('does not collapse unknown populated roles into collaborator', () => {
    expect(getUserRoleLabel('auditoria')).toBe('auditoria');
    expect(getUserRoleLabel(null)).toBe('Colaboradora');
  });

  it('keeps user-facing panel role labels on the canonical helper', () => {
    const files = [
      'src/components/platform/Sidebar.tsx',
      'src/app/(platform)/configuracoes/page.tsx',
      'src/app/(platform)/convites/page.tsx',
      'src/app/(platform)/colaboradoras-gestao/page.tsx',
      'src/app/(platform)/primeiro-acesso/page.tsx',
      'src/app/invite/[token]/page.tsx',
      'src/lib/mail/templates.ts',
    ];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain('getUserRoleLabel');
      expect(source).not.toMatch(/rh:\s*['"]Admin['"]/);
      expect(source).not.toMatch(/admin:\s*['"]Master['"]/);
    }
  });
});
