import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss, {
  type AtRule,
  type Declaration,
  type Root,
  type Rule,
} from 'postcss';
import { describe, expect, it } from 'vitest';

const appDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../src/app',
);

function parseAppStylesheet(filename: string) {
  const filePath = path.join(appDirectory, filename);
  return postcss.parse(fs.readFileSync(filePath, 'utf8'), { from: filePath });
}

function getSingleRule(root: Root, selector: string) {
  const rules: Rule[] = [];
  root.walkRules(selector, (rule) => {
    rules.push(rule);
  });
  expect(rules, `expected one ${selector} rule`).toHaveLength(1);
  return rules[0];
}

function getSingleAtRule(root: Root, name: string, params: string) {
  const atRules: AtRule[] = [];
  root.walkAtRules(name, (atRule) => {
    if (atRule.params.trim() === params) atRules.push(atRule);
  });
  expect(atRules, `expected one @${name} ${params} rule`).toHaveLength(1);
  return atRules[0];
}

function directDeclarations(rule: Rule) {
  return rule.nodes.filter(
    (node): node is Declaration => node.type === 'decl',
  );
}

function declarationContract(rule: Rule) {
  return Object.fromEntries(
    directDeclarations(rule).map(({ prop, value, important }) => [
      prop,
      { value, important: Boolean(important) },
    ]),
  );
}

const themeRoot = parseAppStylesheet('platform-theme.css');
const globalsRoot = parseAppStylesheet('globals.css');

const expectedTokens: Record<string, string> = {
  '--platform-shell': '#201812',
  '--platform-shell-soft': '#33261d',
  '--platform-shell-text': '#fff7ec',
  '--platform-canvas': '#fff9f1',
  '--platform-surface': '#ffffff',
  '--platform-group': '#efe2d3',
  '--platform-action': '#b98643',
  '--platform-action-strong': '#8b622d',
  '--platform-positive': '#536444',
  '--platform-critical': '#913337',
  '--platform-warning': '#8a641c',
  '--platform-ink': '#211813',
  '--platform-muted': '#695b50',
  '--platform-line': '#e3d1bc',
  '--platform-radius-control': '8px',
  '--platform-radius-surface': '14px',
  '--platform-radius-pill': '999px',
  '--platform-shadow-raised': '0 4px 8px rgb(32 24 18 / 10%)',
  '--platform-duration-fast': '150ms',
  '--platform-duration-normal': '220ms',
  '--platform-ease-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
  '--z-dropdown': '20',
  '--z-sticky': '30',
  '--z-drawer-backdrop': '40',
  '--z-drawer': '50',
  '--z-modal-backdrop': '60',
  '--z-modal': '70',
  '--z-toast': '80',
  '--z-tooltip': '90',
};

const zIndexOrder = [
  '--z-dropdown',
  '--z-sticky',
  '--z-drawer-backdrop',
  '--z-drawer',
  '--z-modal-backdrop',
  '--z-modal',
  '--z-toast',
  '--z-tooltip',
] as const;

describe('UniHER platform semantic theme contract', () => {
  it('defines the complete approved token map exactly once in one :root rule', () => {
    const rootRule = getSingleRule(themeRoot, ':root');
    const customProperties = directDeclarations(rootRule).filter(({ prop }) =>
      prop.startsWith('--'),
    );
    const declarationCounts = customProperties.reduce<Map<string, number>>(
      (counts, { prop }) => counts.set(prop, (counts.get(prop) ?? 0) + 1),
      new Map(),
    );
    const duplicateProperties = [...declarationCounts]
      .filter(([, count]) => count > 1)
      .map(([prop]) => prop);

    expect(duplicateProperties).toEqual([]);
    expect(
      Object.fromEntries(
        customProperties.map(({ prop, value }) => [prop, value]),
      ),
    ).toEqual(expectedTokens);
  });

  it('keeps the effective surface radius below 15px', () => {
    const rootRule = getSingleRule(themeRoot, ':root');
    const values = directDeclarations(rootRule)
      .filter(({ prop }) => prop === '--platform-radius-surface')
      .map(({ value }) => value);

    expect(values).toEqual(['14px']);
    expect(Number.parseFloat(values[0])).toBeLessThan(15);
  });

  it('keeps the z-index roles strictly increasing', () => {
    const rootRule = getSingleRule(themeRoot, ':root');
    const tokens = new Map(
      directDeclarations(rootRule).map(({ prop, value }) => [prop, value]),
    );
    const values = zIndexOrder.map((token) => Number(tokens.get(token)));

    for (let index = 1; index < values.length; index += 1) {
      expect(values[index]).toBeGreaterThan(values[index - 1]);
    }
  });

  it('imports Tailwind before the platform theme', () => {
    const imports = globalsRoot.nodes
      .filter(
        (node): node is AtRule =>
          node.type === 'atrule' && node.name === 'import',
      )
      .map(({ params }) => params.trim());

    expect(imports.slice(0, 2)).toEqual([
      '"tailwindcss"',
      '"./platform-theme.css"',
    ]);
  });

  it('binds the platform surface to semantic ink and canvas tokens', () => {
    const surfaceRule = getSingleRule(themeRoot, '.platform-surface');

    expect(declarationContract(surfaceRule)).toEqual({
      color: { value: 'var(--platform-ink)', important: false },
      background: { value: 'var(--platform-canvas)', important: false },
    });
  });

  it('applies the complete reduced-motion contract to surfaces and descendants', () => {
    const mediaRule = getSingleAtRule(
      themeRoot,
      'media',
      '(prefers-reduced-motion: reduce)',
    );
    const rules = (mediaRule.nodes ?? []).filter(
      (node): node is Rule => node.type === 'rule',
    );

    expect(rules).toHaveLength(1);
    expect(rules[0].selectors).toEqual([
      '.platform-surface',
      '.platform-surface::before',
      '.platform-surface::after',
      '.platform-surface *',
      '.platform-surface *::before',
      '.platform-surface *::after',
    ]);
    expect(declarationContract(rules[0])).toEqual({
      'scroll-behavior': { value: 'auto', important: true },
      'animation-duration': { value: '0.01ms', important: true },
      'animation-iteration-count': { value: '1', important: true },
      'transition-duration': { value: '0.01ms', important: true },
    });
  });
});
