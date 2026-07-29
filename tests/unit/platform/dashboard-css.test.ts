import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  resolve(process.cwd(), 'src/app/(platform)/dashboard/dashboard.module.css'),
  'utf8',
);

describe('RH dashboard spacing contract', () => {
  it('uses the 8px layout rhythm with only 4px typographic micro-spacing', () => {
    const spacingDeclarations = [
      ...css.matchAll(
        /^\s*(padding(?:-(?:top|right|bottom|left))?|margin(?:-(?:top|right|bottom|left))?|gap|row-gap|column-gap):\s*([^;]+);/gm,
      ),
    ];
    const violations = spacingDeclarations.flatMap(([, property, value]) =>
      [...value.matchAll(/(\d+)px/g)]
        .map((match) => Number(match[1]))
        .filter((pixels) => pixels !== 4 && pixels % 8 !== 0)
        .map((pixels) => `${property}: ${value.trim()} (${pixels}px)`),
    );

    expect(violations).toEqual([]);
  });

  it('uses 24px padding on dashboard surfaces', () => {
    const surfaceRule = css.match(/\.surface\s*\{([\s\S]*?)\}/)?.[1] ?? '';

    expect(surfaceRule).toMatch(/padding:\s*24px;/);
  });

  it('uses fluid desktop filters without hiding horizontal overflow', () => {
    const pageRule = css.match(/\.page\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    const desktopRules = css.match(/@media \(min-width: 1200px\)\s*\{([\s\S]*?)@media/)?.[1]
      ?? css.slice(css.indexOf('@media (min-width: 1200px)'));

    expect(pageRule).not.toMatch(/overflow-x:\s*(?:clip|hidden)/);
    expect(desktopRules).toMatch(/\.detailsHeading\s*\{[\s\S]*?flex-wrap:\s*wrap;/);
    expect(desktopRules).toMatch(/\.filters\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
    expect(desktopRules).not.toMatch(/grid-template-columns:\s*240px 220px 220px/);
  });
});
