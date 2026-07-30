import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('gamification product copy boundary', () => {
  it('keeps first-access tour from promising classic gamification before product approval', () => {
    const source = read('src/app/(platform)/primeiro-acesso/page.tsx');

    expect(source).toMatch(/conte.{0,4}do di.{0,4}rio e recorr.{0,8}ncia guiada/i);
    expect(source).not.toMatch(/conte.{0,4}do di.{0,4}rio e gamifica|ranking|leaderboard|loja de recompensas|recompensas dispon|resgatar|ganh[ae] pontos|\bxp\b|badges?/i);
  });

  it('keeps education management active without operational rewards or ranking', () => {
    const educationSource = read('src/app/(platform)/gamificacao-config/page.tsx');
    const sidebarSource = read('src/components/platform/Sidebar.tsx');

    expect(educationSource).toContain('/api/rh/lessons');
    expect(educationSource).toContain('Editor ativo de licoes');
    expect(educationSource).not.toMatch(/governanca privada|contrato real|contrato educativo/i);
    expect(sidebarSource).not.toMatch(/Governan(?:ça|Ã§a|ca) privada|governanca privada/i);
    expect(educationSource).not.toMatch(/\/api\/gamification\/(?:rewards|league)|xp_reward|loja de recompensas|recompensas dispon|resgatar|comprar recompensa|ranking geral|leaderboard|ganh[ae] pontos|xp ganho/i);
  });

  it('keeps Liga compatibility routes redirect-only instead of operational rewards or ranking', () => {
    const compatibilitySources = [
      read('src/app/(platform)/liga/page.tsx'),
      read('src/app/(platform)/liga/gerenciar/page.tsx'),
    ].join('\n');

    expect(compatibilitySources).toContain("router.replace('/conquistas')");
    expect(compatibilitySources).toContain("router.replace('/gamificacao-config')");
    expect(compatibilitySources).not.toMatch(/em revis|LEGACY_GAMIFICATION_STATE|ContainedSurfacePreview|FeedbackState/);
    expect(compatibilitySources).not.toMatch(/loja de recompensas|recompensas dispon|resgatar|comprar recompensa|ranking geral|leaderboard|ganh[ae] pontos|xp ganho/i);
  });
});
