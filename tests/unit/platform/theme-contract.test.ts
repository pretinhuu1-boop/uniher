import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const themePath = path.join(process.cwd(), 'src/app/platform-theme.css');
const themeCss = fs.readFileSync(themePath, 'utf8');

function expectToken(name: string, value: string) {
  expect(themeCss).toContain(`--${name}: ${value};`);
}

describe('UniHER platform semantic theme contract', () => {
  it('defines the approved semantic color roles', () => {
    expectToken('platform-shell', '#201812');
    expectToken('platform-canvas', '#fff9f1');
    expectToken('platform-action', '#b98643');
    expectToken('platform-positive', '#536444');
    expectToken('platform-critical', '#913337');
    expectToken('platform-ink', '#211813');
  });

  it('keeps surface rounding operational rather than promotional', () => {
    expectToken('platform-radius-surface', '14px');
    expect(themeCss).not.toMatch(
      /--platform-radius-surface:\s*(?:2\d|[3-9]\d|\d{3,})px;/,
    );
  });

  it('defines the approved motion durations', () => {
    expectToken('platform-duration-fast', '150ms');
    expectToken('platform-duration-normal', '220ms');
  });

  it('defines the approved z-index roles', () => {
    expectToken('z-dropdown', '20');
    expectToken('z-sticky', '30');
    expectToken('z-drawer-backdrop', '40');
    expectToken('z-drawer', '50');
    expectToken('z-modal', '70');
    expectToken('z-toast', '80');
  });
});
