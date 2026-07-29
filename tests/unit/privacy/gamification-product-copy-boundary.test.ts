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

    expect(source).toContain('conteúdo diário e recorrência guiada');
    expect(source).not.toMatch(/conte[uú]do di[aá]rio e gamifica(?:cao|ção)|ranking|leaderboard|loja de recompensas|recompensas dispon[ií]veis|resgatar|ganh[ae] pontos|\bxp\b|badges?/i);
  });

  it('keeps review routes explicit about HOLD instead of operational rewards or ranking', () => {
    const reviewSources = [
      read('src/app/(platform)/gamificacao-config/page.tsx'),
      read('src/app/(platform)/liga/page.tsx'),
      read('src/app/(platform)/liga/gerenciar/page.tsx'),
    ].join('\n');

    expect(reviewSources).toMatch(/em revis[aã]o|LEGACY_GAMIFICATION_STATE/);
    expect(reviewSources).not.toMatch(/loja de recompensas|recompensas dispon[ií]veis|resgatar|comprar recompensa|ranking geral|leaderboard|ganh[ae] pontos|xp ganho/i);
  });
});
