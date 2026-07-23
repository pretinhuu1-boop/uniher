import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const shellPages = [
  'src/app/(platform)/saude-primaria/page.tsx',
  'src/app/(platform)/concierge/page.tsx',
  'src/app/(platform)/viva-sipat/page.tsx',
  'src/app/(platform)/desenvolvimento-humano/page.tsx',
  'src/app/(platform)/canal-denuncias/page.tsx',
  'src/app/(platform)/produtos-modulos/page.tsx',
] as const;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Paola P3 locked module shells', () => {
  it.each(shellPages)('keeps %s as a contained static shell', (relativePath) => {
    const source = read(relativePath);

    expect(source).toContain('ContainedSurfacePreview');
    expect(source).toContain('allowedItems');
    expect(source).toContain('blockedItems');
    expect(source).not.toMatch(/useSWR|fetch\s*\(|getReadDb|getWriteQueue|initDb|withAuth|onSubmit|router\.push|<form|<input|<textarea|\/api\//i);
  });

  it('keeps Viva SIPAT source-needed and does not invent content', () => {
    const source = read('src/app/(platform)/viva-sipat/page.tsx');

    expect(source).toContain('Fonte de conteudo pendente');
    expect(source).toContain('nao cria aulas, campanhas, videos ou materiais novos');
    expect(source).not.toMatch(/certificado emitido|conteudo publicado|aula disponivel|cronograma oficial/i);
  });

  it('keeps the denunciation shell partner-managed without receiving reports', () => {
    const source = read('src/app/(platform)/canal-denuncias/page.tsx');

    expect(source).toContain('Parceiro pendente');
    expect(source).toContain('Nenhum relato, protocolo, caixa de entrada');
    expect(source).not.toMatch(/<textarea|<input|method=['"]post|fetch\s*\(|api\/denuncia|api\/denuncias/i);
  });
});
