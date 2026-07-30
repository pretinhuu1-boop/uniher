import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

describe('employee import UI contract', () => {
  it('exposes spreadsheet import only from collaborator management', () => {
    const source = read('src/app/(platform)/colaboradoras-gestao/page.tsx');

    expect(source).toContain('Importar planilha');
    expect(source).toContain('Baixar modelo');
    expect(source).toContain('/api/rh/employees/import-template');
    expect(source).toContain('/api/rh/employees/import-preview');
    expect(source).toContain('/api/rh/employees/import-commit');
    expect(source).toContain('accept=".csv"');
  });

  it('uses product copy for the masked spreadsheet check instead of preview jargon', () => {
    const source = read('src/app/(platform)/colaboradoras-gestao/page.tsx');

    expect(source).toContain('Conferência mascarada antes da gravação');
    expect(source).toContain('Conferência segura');
    expect(source).not.toMatch(/Preview mascarado|Prévia segura/i);
  });

  it('points RH onboarding collaborator setup to the operational management page', () => {
    const source = read('src/app/(platform)/onboarding-rh/page.tsx');

    expect(source).toContain("href: '/colaboradoras-gestao'");
    expect(source).toContain('Importe ou convide colaboradoras');
  });

  it('keeps the invites page as the manual invite surface', () => {
    const source = read('src/app/(platform)/convites/page.tsx');

    expect(source).not.toContain('/api/rh/employees/import-preview');
    expect(source).not.toContain('/api/rh/employees/import-commit');
    expect(source).not.toContain('Importar planilha');
  });
});
