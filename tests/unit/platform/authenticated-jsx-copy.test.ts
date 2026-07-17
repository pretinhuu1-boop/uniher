import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const files = [
  'src/app/(platform)/dashboard/page.tsx',
  'src/app/(platform)/dashboard/components/EngagementOverview.tsx',
  'src/app/(platform)/dashboard/components/DepartmentOverview.tsx',
  'src/app/(platform)/dashboard/components/DashboardDetails.tsx',
  'src/app/(platform)/dashboard/components/AgeOverview.tsx',
  'src/app/(platform)/historico/page.tsx',
  'src/app/(platform)/analytics-emails/page.tsx',
] as const;

const unicodeEscape = /\\u(?:\{[0-9a-f]+\}|[0-9a-f]{4})/gi;

function findRawJsxEscapes(relativeFile: string): string[] {
  const sourceText = fs.readFileSync(path.join(process.cwd(), relativeFile), 'utf8');
  const sourceFile = ts.createSourceFile(
    relativeFile,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const findings: string[] = [];

  function visit(node: ts.Node) {
    let raw: string | undefined;
    if (ts.isJsxText(node)) raw = node.getText(sourceFile);
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      raw = node.initializer.getText(sourceFile);
    }
    if (raw && unicodeEscape.test(raw)) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      findings.push(`${relativeFile}:${line}: ${raw}`);
    }
    unicodeEscape.lastIndex = 0;
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

describe('authenticated JSX copy', () => {
  it('contains no JavaScript Unicode escapes in JSX text or quoted attributes', () => {
    expect(files.flatMap(findRawJsxEscapes)).toEqual([]);
  });
});
