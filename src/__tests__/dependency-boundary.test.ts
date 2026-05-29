import fs from 'node:fs';
import path from 'node:path';

type BoundaryRule = {
  scope: string;
  forbiddenImportPrefixes: string[];
  forbiddenImports?: string[];
};

const SRC_ROOT = path.join(process.cwd(), 'src');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);

const rules: BoundaryRule[] = [
  {
    scope: 'infra/datasources',
    forbiddenImportPrefixes: ['@/usecases/', '@/features/', '@/hooks/'],
  },
  {
    scope: 'infra/repositories',
    forbiddenImportPrefixes: ['@/usecases/', '@/features/', '@/hooks/'],
  },
  {
    scope: 'lib/stamina/spend-stage-stamina.ts',
    forbiddenImportPrefixes: ['@/hooks/'],
  },
  {
    scope: 'usecases/stage-battle/local-stage-battle-usecases.ts',
    forbiddenImportPrefixes: ['@/hooks/'],
  },
  {
    scope: 'ai/engine/giant-piece.ts',
    forbiddenImportPrefixes: ['@/features/'],
    forbiddenImports: ['@/ai/model'],
  },
];

function collectSourceFiles(root: string): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const nextPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      files.push(...collectSourceFiles(nextPath));
      continue;
    }

    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
    files.push(nextPath);
  }

  return files;
}

function extractImports(source: string): string[] {
  const matches = source.matchAll(/from\s+['"]([^'"]+)['"]/g);
  return Array.from(matches, (match) => match[1] ?? '').filter(Boolean);
}

describe('dependency boundaries', () => {
  const files = collectSourceFiles(SRC_ROOT);

  it('rejects forbidden cross-layer imports in protected areas', () => {
    const violations: string[] = [];

    for (const file of files) {
      const relativePath = path.relative(SRC_ROOT, file);
      const source = fs.readFileSync(file, 'utf8');
      const imports = extractImports(source);

      for (const rule of rules) {
        if (!relativePath.startsWith(rule.scope)) continue;
        for (const imported of imports) {
          if (rule.forbiddenImports?.includes(imported)) {
            violations.push(`${relativePath} -> ${imported}`);
            continue;
          }
          if (!rule.forbiddenImportPrefixes.some((prefix) => imported.startsWith(prefix))) continue;
          violations.push(`${relativePath} -> ${imported}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
