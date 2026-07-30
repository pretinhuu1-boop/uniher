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
const redirectHelper = 'src/components/platform/ModuleHoldRedirect.tsx';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Paola P3 locked module shells', () => {
  it.each(shellPages)('keeps %s hidden behind compatibility redirects', (relativePath) => {
    const source = read(relativePath);

    expect(source).toContain('ModuleHoldRedirect');
    expect(source).toMatch(/loginRedirect="%2F(?:concierge|nr1|viva-sipat|desenvolvimento-humano|canal-denuncias)"/);
    expect(source).not.toContain('ContainedSurfacePreview');
    expect(source).not.toContain('allowedItems');
    expect(source).not.toContain('blockedItems');
    expect(source).not.toMatch(/useSWR|fetch\s*\(|getReadDb|getWriteQueue|initDb|withAuth|onSubmit|router\.push|<form|<input|<textarea|\/api\//i);
  });

  it('keeps contract-gated module redirects centralized on useful authenticated surfaces', () => {
    const source = read(redirectHelper);

    expect(source).toContain('useAuth');
    expect(source).toContain('useRouter');
    expect(source).toContain('AuthLoadingScreen');
    expect(source).toContain("router.replace(`/auth?redirect=${loginRedirect}`)");
    expect(source).toContain("router.replace('/admin?tab=empresas')");
    expect(source).toContain("router.replace('/produtos-modulos')");
    expect(source).toContain('Boolean(user.also_collaborator)');
    expect(source).toContain("router.replace('/colaboradora')");
    expect(source).toContain("router.replace('/dashboard')");
    expect(source).not.toContain('ContainedSurfacePreview');
    expect(source).not.toMatch(/useSWR|fetch\s*\(|getReadDb|getWriteQueue|initDb|withAuth|onSubmit|router\.push|<form|<input|<textarea|\/api\//i);
  });

  it('keeps Viva SIPAT source-needed and does not invent content', () => {
    const source = read('src/app/(platform)/viva-sipat/page.tsx');

    expect(source).toContain('ModuleHoldRedirect');
    expect(source).not.toMatch(/certificado emitido|conte[uú]do publicado|aula dispon[ií]vel|cronograma oficial/i);
  });

  it('keeps Saude Primaria legacy route as a compatibility redirect to real surfaces', () => {
    const source = read('src/app/(platform)/saude-primaria/page.tsx');

    expect(source).toContain("router.replace('/dashboard?section=saude-primaria')");
    expect(source).toContain("router.replace('/semaforo')");
    expect(source).not.toContain('ContainedSurfacePreview');
    expect(source).not.toContain('allowedItems');
  });

  it('keeps Historico as a compatibility redirect instead of an unavailable product screen', () => {
    const source = read('src/app/(platform)/historico/page.tsx');

    expect(source).toContain("router.replace('/dashboard?section=exames')");
    expect(source).toContain("router.replace('/colaboradora')");
    expect(source).not.toContain('/api/analytics/history');
    expect(source).not.toContain('Histórico indisponível');
    expect(source).not.toContain('FeedbackState');
  });

  it('keeps Desafios management as a compatibility redirect to approved safe surfaces', () => {
    const source = read('src/app/(platform)/desafios/gerenciar/page.tsx');

    expect(source).toContain("router.replace('/gamificacao-config')");
    expect(source).toContain("user.role === 'lideranca'");
    expect(source).toContain("router.replace('/campanhas')");
    expect(source).toContain("router.replace('/desafios')");
    expect(source).not.toContain('LEGACY_GAMIFICATION_STATE');
    expect(source).not.toContain('Gestão de desafios em revisão');
    expect(source).not.toContain('FeedbackState');
  });

  it('keeps Liga routes as compatibility redirects instead of review/spec screens', () => {
    const ligaSource = read('src/app/(platform)/liga/page.tsx');
    const ligaManagementSource = read('src/app/(platform)/liga/gerenciar/page.tsx');
    const combinedSource = `${ligaSource}\n${ligaManagementSource}`;

    expect(ligaSource).toContain("router.replace('/conquistas')");
    expect(ligaSource).toContain("router.replace('/gamificacao-config')");
    expect(ligaSource).toContain("router.replace('/auth?redirect=%2Fliga')");
    expect(ligaSource).toContain("router.replace('/campanhas')");
    expect(ligaManagementSource).toContain("router.replace('/gamificacao-config')");
    expect(ligaManagementSource).toContain("router.replace('/conquistas')");
    expect(ligaManagementSource).toContain("router.replace('/auth?redirect=%2Fliga%2Fgerenciar')");
    expect(ligaManagementSource).toContain("router.replace('/campanhas')");
    expect(combinedSource).not.toContain('ContainedSurfacePreview');
    expect(combinedSource).not.toContain('FeedbackState');
    expect(combinedSource).not.toContain('LEGACY_GAMIFICATION_STATE');
    expect(combinedSource).not.toContain('Liga em revis');
    expect(combinedSource).not.toContain('Gestao de ligas em revis');
  });

  it('keeps NR-1 as a contract-gated shell separate from COPSOQ runtime', () => {
    const source = read('src/app/(platform)/nr1/page.tsx');

    expect(source).toContain('ModuleHoldRedirect');
    expect(source).not.toContain('COPSOQ');
    expect(source).not.toMatch(/CopsoqFlow|useCopsoq|\/api\/yavix\/copsoq|<form|<input|<textarea/i);
  });

  it('keeps the COPSOQ runtime route behind the NR-1 entitlement gate', () => {
    const source = read('src/app/(platform)/avaliacao-nr1/page.tsx');

    expect(source).toContain('getNr1RuntimeEntitlementForCurrentRequest');
    expect(source).toContain("description: 'Avaliacao NR-1 disponivel conforme liberacao autorizada.'");
    expect(source).not.toContain('runtime autorizado');
    expect(source).toContain("redirect('/nr1')");
    expect(source).toContain("if (!isYavixMock()) redirect('/nr1')");
    expect(source.indexOf('getNr1RuntimeEntitlementForCurrentRequest')).toBeLessThan(source.indexOf('<CopsoqFlow'));
    expect(source.indexOf("if (!isYavixMock()) redirect('/nr1')")).toBeLessThan(source.indexOf('<CopsoqFlow'));
    expect(source).not.toContain('Previa indisponivel');
    expect(source).not.toContain('Preview tecnico restrito');
  });

  it('keeps the collaborator NR-1 journey gated by company modules', () => {
    const source = read('src/app/(platform)/colaboradora/page.tsx');

    expect(source).toContain("useSWR<CompanyModulesResponse>('/api/company/modules'");
    expect(source).toContain('isNr1RuntimeEntitled(moduleData?.modules)');
    expect(source).toContain("const showNr1JourneyRow = nr1PreviewState === 'preview_available'");
    expect(source).toContain('{showNr1JourneyRow && <Nr1JourneyRow step={3} />}');
    expect(source).not.toContain('Prévia indisponível');
    expect(source).not.toContain('NEXT_PUBLIC_UNIHER_NR1_ENTITLEMENT');
  });

  it('keeps the denunciation shell partner-managed without receiving reports', () => {
    const source = read('src/app/(platform)/canal-denuncias/page.tsx');

    expect(source).toContain('ModuleHoldRedirect');
    expect(source).not.toMatch(/<textarea|<input|method=['"]post|fetch\s*\(|api\/denuncia|api\/denuncias/i);
  });

  it('promotes Produtos e Modulos from static spec shell to the real company modules surface', () => {
    const source = read('src/app/(platform)/produtos-modulos/page.tsx');

    expect(source).not.toContain('ContainedSurfacePreview');
    expect(source).toContain("useSWR<CompanyModulesResponse>('/api/company/modules'");
    expect(source).toContain('/api/company/modules');
    expect(source).toContain('SENSITIVE_MODULE_SLUGS');
    expect(source).toContain('Bloqueado por contrato');
    expect(source).toContain('Auditoria tecnica');
    expect(source).not.toContain('Modulo sensivel em HOLD');
    expect(source).not.toContain('Auditoria no backend');
    expect(source).not.toMatch(/\bcompany_modules\b/);
    expect(source).not.toMatch(/\bruntime\b/i);
    expect(source).not.toMatch(/\bscoring\b/i);
    expect(source).not.toMatch(/\bintake\b/i);
    expect(source).toContain('canEditNonSensitiveModules');
    expect(source).toContain('isMasterAdmin');
  });
});
