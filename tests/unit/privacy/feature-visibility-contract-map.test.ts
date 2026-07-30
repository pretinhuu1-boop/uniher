import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const docPath = path.join(
  process.cwd(),
  'docs/superpowers/plans/2026-07-29-uniher-authenticated-feature-visibility-contract-map.md',
);

function readDoc() {
  return fs.readFileSync(docPath, 'utf8');
}

describe('authenticated feature visibility contract map', () => {
  it('records the only current safe navigation unlock', () => {
    const doc = readDoc();

    expect(doc).toContain('UNLOCK_RH_NAV');
    expect(doc).toContain('/comunidade/gerenciar');
    expect(doc).toContain('Do not touch current public landing');
  });

  it('keeps sensitive modules contract-gated instead of operational', () => {
    const doc = readDoc();

    for (const feature of [
      'Concierge',
      'Canal de Denuncias',
      'Viva SIPAT',
      'Desenvolvimento Humano',
      'NR-1/Yavix real',
      'Liga/ranking/rewards',
      'Produtos/Modulos',
    ]) {
      expect(doc).toContain(feature);
    }

    expect(doc).toMatch(/fail-closed/i);
    expect(doc).toMatch(/privacy-review gated/i);
    expect(doc).toMatch(/sensitive module slugs/i);
  });
});
