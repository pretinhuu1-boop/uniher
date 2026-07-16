import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const importPattern = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;

function resolveSource(importer: string, specifier: string): string | null {
  if (!specifier.startsWith('@/') && !specifier.startsWith('.')) return null;

  const base = specifier.startsWith('@/')
    ? path.join(sourceRoot, specifier.slice(2))
    : path.resolve(path.dirname(importer), specifier);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];

  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

function collectReachableSources(entry: string): Map<string, string> {
  const reachable = new Map<string, string>();
  const pending = [path.join(root, entry)];

  while (pending.length > 0) {
    const file = pending.pop()!;
    const relativeFile = path.relative(root, file).replaceAll('\\', '/');
    if (reachable.has(relativeFile)) continue;

    const source = fs.readFileSync(file, 'utf8');
    reachable.set(relativeFile, source);
    for (const match of source.matchAll(importPattern)) {
      const dependency = resolveSource(file, match[1]);
      if (dependency) pending.push(dependency);
    }
  }

  return reachable;
}

describe('public home legacy gamification quarantine', () => {
  it('keeps the root HomeClient graph unable to reach legacy ranking, points, level, or XP promises', () => {
    const reachable = collectReachableSources('src/app/page.tsx');
    const publicHomeSource = [...reachable.values()].join('\n');

    expect([...reachable.keys()]).toContain('src/components/HomeClient.tsx');
    expect([...reachable.keys()]).not.toContain('src/components/sections/Gamification.tsx');
    expect(publicHomeSource).not.toMatch(/Arena por Departamento|87\.840|pontos totais|Nv\.9|Level 5|2\.370 \/ 2\.500/);
  });

  it('does not expose a dead footer link to the quarantined gamification section', () => {
    const publicHomeSource = [...collectReachableSources('src/app/page.tsx').values()].join('\n');

    expect(publicHomeSource).not.toContain('href="#gamification"');
  });

  it('does not expose dead desktop or mobile navigation links to the quarantined section', () => {
    const reachable = collectReachableSources('src/app/page.tsx');

    expect(reachable.get('src/components/layout/Navbar.tsx')).not.toMatch(/['"]gamification['"]/);
  });
});
