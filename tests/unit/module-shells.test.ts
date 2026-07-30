import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const shellPages = [
  'src/app/(platform)/concierge/page.tsx',
  'src/app/(platform)/nr1/page.tsx',
  'src/app/(platform)/viva-sipat/page.tsx',
  'src/app/(platform)/desenvolvimento-humano/page.tsx',
  'src/app/(platform)/canal-denuncias/page.tsx',
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

    expect(source).toContain('Fonte de conteúdo pendente');
    expect(source).toContain('não cria aulas, campanhas, vídeos ou materiais novos');
    expect(source).not.toMatch(/certificado emitido|conte[uú]do publicado|aula dispon[ií]vel|cronograma oficial/i);
  });

  it('keeps Saude Primaria legacy route as a compatibility redirect to real surfaces', () => {
    const source = read('src/app/(platform)/saude-primaria/page.tsx');

    expect(source).toContain("router.replace('/dashboard?section=saude-primaria')");
    expect(source).toContain("router.replace('/semaforo')");
    expect(source).not.toContain('ContainedSurfacePreview');
    expect(source).not.toContain('allowedItems');
  });

  it('keeps NR-1 as a contract-gated shell separate from COPSOQ runtime', () => {
    const source = read('src/app/(platform)/nr1/page.tsx');

    expect(source).toContain('Contrato pendente');
    expect(source).toContain('COPSOQ');
    expect(source).not.toMatch(/CopsoqFlow|useCopsoq|\/api\/yavix\/copsoq|<form|<input|<textarea/i);
  });

  it('keeps the COPSOQ runtime route behind the NR-1 entitlement gate', () => {
    const source = read('src/app/(platform)/avaliacao-nr1/page.tsx');

    expect(source).toContain('getNr1RuntimeEntitlementForCurrentRequest');
    expect(source).toContain("redirect('/nr1')");
    expect(source.indexOf('getNr1RuntimeEntitlementForCurrentRequest')).toBeLessThan(source.indexOf('<CopsoqFlow'));
  });

  it('keeps the collaborator NR-1 journey gated by company modules', () => {
    const source = read('src/app/(platform)/colaboradora/page.tsx');

    expect(source).toContain("useSWR<CompanyModulesResponse>('/api/company/modules'");
    expect(source).toContain('isNr1RuntimeEntitled(moduleData?.modules)');
    expect(source).not.toContain('NEXT_PUBLIC_UNIHER_NR1_ENTITLEMENT');
  });

  it('keeps the denunciation shell partner-managed without receiving reports', () => {
    const source = read('src/app/(platform)/canal-denuncias/page.tsx');

    expect(source).toContain('Parceiro pendente');
    expect(source).toContain('Nenhum relato, protocolo, caixa de entrada');
    expect(source).not.toMatch(/<textarea|<input|method=['"]post|fetch\s*\(|api\/denuncia|api\/denuncias/i);
  });

  it('promotes Produtos e Modulos from static spec shell to the real company modules surface', () => {
    const source = read('src/app/(platform)/produtos-modulos/page.tsx');

    expect(source).not.toContain('ContainedSurfacePreview');
    expect(source).toContain("useSWR<CompanyModulesResponse>('/api/company/modules'");
    expect(source).toContain('/api/company/modules');
    expect(source).toContain('SENSITIVE_MODULE_SLUGS');
    expect(source).toContain('Modulo sensivel em HOLD');
    expect(source).toContain('canEditNonSensitiveModules');
    expect(source).toContain('isMasterAdmin');
  });
});
