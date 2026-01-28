#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * i18n audit script for Reticle2.
 *
 * What it finds:
 * - Missing translation keys (keys used via t('...') / i18n.t('...') but absent from locales)
 * - Likely user-facing hard-coded strings:
 *   - JSX text nodes (e.g. <Text>Save</Text>)
 *   - JSX expressions with string literals (e.g. <Text>{'Save'}</Text>)
 *   - Common user-facing JSX attributes (title/label/placeholder/etc) with string literals
 *   - Alert/Toast calls with string literal arguments
 *
 * Output:
 * - Writes a JSON report to docs/i18n-audit.json
 * - Writes a Markdown summary to docs/I18N_AUDIT.md
 */

const fs = require('fs');
const path = require('path');

let ts;
try {
  // typescript is a devDependency in this repo
  ts = require('typescript');
} catch (err) {
  console.error('ERROR: typescript is required to run this audit. Install deps and retry.');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');

const INCLUDE_DIRS = [
  'app',
  'components',
  'modules',
  'services',
  'hooks',
  'contexts',
  'constants',
  'store',
  'lib',
  'utils',
  'video',
  'helpers',
  'types',
  'theme',
];

const LOCALE_PATHS = {
  en: path.join(ROOT, 'lib', 'i18n', 'locales', 'en.json'),
  he: path.join(ROOT, 'lib', 'i18n', 'locales', 'he.json'),
};

const USER_FACING_ATTRS = new Set([
  'title',
  'label',
  'placeholder',
  'subtitle',
  'description',
  'message',
  'headerTitle',
  'cancelText',
  'confirmText',
  'okText',
  'buttonText',
  'accessibilityLabel',
  'accessibilityHint',
]);

const USER_FACING_CALLEES = new Set(['Alert.alert', 'Toast.show', 'ToastAndroid.show']);

const HEBREW_RE = /[\u0590-\u05FF]/;
const LATIN_RE = /[A-Za-z]/;

function hasLetters(text) {
  return LATIN_RE.test(text) || HEBREW_RE.test(text);
}

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return null;
  }
}

function readJson(filePath) {
  const raw = safeReadFile(filePath);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`ERROR: Failed to parse JSON at ${filePath}`);
    return null;
  }
}

function flattenTranslationKeys(value, prefix = '', out = new Set()) {
  if (value == null) return out;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    if (prefix) out.add(prefix);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      const next = prefix ? `${prefix}.${idx}` : String(idx);
      flattenTranslationKeys(item, next, out);
    });
    return out;
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => {
      const next = prefix ? `${prefix}.${k}` : k;
      flattenTranslationKeys(v, next, out);
    });
  }
  return out;
}

function walkDir(dirPath, outFiles) {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // We only walk inside INCLUDE_DIRS roots, but still skip noisy build/artifact dirs.
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === '.expo' ||
        entry.name === 'coverage' ||
        entry.name === '.cursor' ||
        entry.name === '.idea' ||
        entry.name === '.planning' ||
        entry.name === '.agents' ||
        entry.name === '.claude' ||
        entry.name === 'ConnectIQ.xcframework' ||
        entry.name === 'assets' ||
        entry.name === 'docs'
      ) {
        continue;
      }
      walkDir(fullPath, outFiles);
      continue;
    }

    if (!entry.isFile()) continue;
    if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      outFiles.push(fullPath);
    }
  }
}

function gatherSourceFiles() {
  const files = [];
  for (const rel of INCLUDE_DIRS) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
      walkDir(abs, files);
    }
  }

  // Also include root index.js only if it exists (Expo entry sometimes).
  const rootIndexJs = path.join(ROOT, 'index.js');
  if (fs.existsSync(rootIndexJs)) {
    files.push(rootIndexJs);
  }

  return files;
}

function getScriptKind(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.tsx') return ts.ScriptKind.TSX;
  if (ext === '.ts') return ts.ScriptKind.TS;
  if (ext === '.jsx') return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function extractCalleeName(expr) {
  if (!expr) return null;
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) {
    const left = extractCalleeName(expr.expression);
    return left ? `${left}.${expr.name.text}` : expr.name.text;
  }
  // Optional chaining variant (ts 4.1+)
  if (ts.isPropertyAccessChain && ts.isPropertyAccessChain(expr)) {
    const left = extractCalleeName(expr.expression);
    return left ? `${left}.${expr.name.text}` : expr.name.text;
  }
  return null;
}

function isTranslationCall(callExpr) {
  const callee = extractCalleeName(callExpr.expression);
  return callee === 't' || callee === 'i18n.t' || callee === 'i18next.t';
}

function extractStringLike(expr, sourceFile) {
  if (!expr) return null;

  if (ts.isStringLiteral(expr)) return { kind: 'string', text: expr.text };
  if (ts.isNoSubstitutionTemplateLiteral(expr)) {
    return { kind: 'template', text: expr.text };
  }

  if (ts.isTemplateExpression(expr)) {
    // Preserve literal parts so the report is readable.
    const parts = [];
    const head = expr.head?.text ?? '';
    parts.push(head);
    for (const span of expr.templateSpans) {
      parts.push('${…}');
      parts.push(span.literal?.text ?? '');
    }
    return { kind: 'template_expr', text: parts.join('') };
  }

  // JSX expression wrapper: {...}
  if (ts.isJsxExpression(expr) && expr.expression) {
    return extractStringLike(expr.expression, sourceFile);
  }

  return null;
}

function main() {
  const en = readJson(LOCALE_PATHS.en) ?? {};
  const he = readJson(LOCALE_PATHS.he) ?? {};

  const enKeys = flattenTranslationKeys(en);
  const heKeys = flattenTranslationKeys(he);

  const files = gatherSourceFiles();

  /** @type {Map<string, Array<{file: string, line: number}>>} */
  const translationKeyOccurrences = new Map();

  /** @type {Array<{file: string, line: number, kind: string, text: string, code: string}>} */
  const hardcoded = [];

  function addKeyOccurrence(key, file, line) {
    const arr = translationKeyOccurrences.get(key) ?? [];
    arr.push({ file, line });
    translationKeyOccurrences.set(key, arr);
  }

  function addHardcoded(file, line, kind, text, codeLine) {
    const normalized = normalizeText(text);
    if (!normalized) return;
    if (!hasLetters(normalized)) return;
    hardcoded.push({
      file,
      line,
      kind,
      text: normalized,
      code: normalizeText(codeLine ?? ''),
    });
  }

  for (const filePath of files) {
    const content = safeReadFile(filePath);
    if (content == null) continue;

    const scriptKind = getScriptKind(filePath);
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKind);
    const lines = content.split(/\r?\n/);

    const getLineNumber = (node) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

    const getLineText = (lineNumber) => lines[Math.max(0, lineNumber - 1)] ?? '';

    const visit = (node) => {
      // Collect translation keys from t('...') and i18n.t('...').
      if (ts.isCallExpression(node) && isTranslationCall(node)) {
        const arg0 = node.arguments[0];
        const str = extractStringLike(arg0, sourceFile);
        if (str && str.kind !== 'template_expr') {
          const line = getLineNumber(node);
          addKeyOccurrence(str.text, filePath, line);
        }
      }

      // Collect user-facing alert/toast strings.
      if (ts.isCallExpression(node)) {
        const callee = extractCalleeName(node.expression);
        if (callee && USER_FACING_CALLEES.has(callee)) {
          const line = getLineNumber(node);
          const codeLine = getLineText(line);
          node.arguments.forEach((arg) => {
            // Skip translated expressions: Alert.alert(t('x')) etc.
            if (ts.isCallExpression(arg) && isTranslationCall(arg)) return;
            const str = extractStringLike(arg, sourceFile);
            if (str) addHardcoded(filePath, line, `call:${callee}`, str.text, codeLine);
          });
        }
      }

      // JSX text nodes: <Text>Save</Text>
      if (ts.isJsxText(node)) {
        const raw = node.getText(sourceFile);
        const normalized = normalizeText(raw);
        if (normalized && hasLetters(normalized)) {
          const line = getLineNumber(node);
          addHardcoded(filePath, line, 'jsx:text', normalized, getLineText(line));
        }
      }

      // JSX expressions that are string literals: <Text>{'Save'}</Text>
      if (ts.isJsxExpression(node) && node.expression) {
        if (ts.isCallExpression(node.expression) && isTranslationCall(node.expression)) {
          // {t('key')} is fine.
        } else {
          const str = extractStringLike(node.expression, sourceFile);
          if (str) {
            const line = getLineNumber(node);
            addHardcoded(filePath, line, 'jsx:expr', str.text, getLineText(line));
          }
        }
      }

      // Common user-facing JSX attributes with string literals: title="..." placeholder="..."
      if (ts.isJsxAttribute(node)) {
        const attrName = node.name?.text;
        if (attrName && USER_FACING_ATTRS.has(attrName) && node.initializer) {
          // initializer can be StringLiteral or JsxExpression
          if (ts.isStringLiteral(node.initializer)) {
            const line = getLineNumber(node);
            addHardcoded(filePath, line, `jsx:attr:${attrName}`, node.initializer.text, getLineText(line));
          } else if (ts.isJsxExpression(node.initializer) && node.initializer.expression) {
            const expr = node.initializer.expression;
            if (ts.isCallExpression(expr) && isTranslationCall(expr)) {
              // {t('key')} is fine.
            } else {
              const str = extractStringLike(expr, sourceFile);
              if (str) {
                const line = getLineNumber(node);
                addHardcoded(filePath, line, `jsx:attr:${attrName}`, str.text, getLineText(line));
              }
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  const usedKeys = Array.from(translationKeyOccurrences.keys()).sort();
  const missingInEn = usedKeys.filter((k) => !enKeys.has(k));
  const missingInHe = usedKeys.filter((k) => !heKeys.has(k));

  const hardcodedByFile = new Map();
  for (const item of hardcoded) {
    hardcodedByFile.set(item.file, (hardcodedByFile.get(item.file) ?? 0) + 1);
  }
  const topHardcodedFiles = Array.from(hardcodedByFile.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  const report = {
    generatedAt: new Date().toISOString(),
    scannedFileCount: files.length,
    translationKeys: {
      usedKeyCount: usedKeys.length,
      missingInEn,
      missingInHe,
      occurrences: Object.fromEntries(translationKeyOccurrences),
    },
    hardcoded: {
      count: hardcoded.length,
      topFiles: topHardcodedFiles.map(([file, count]) => ({ file, count })),
      items: hardcoded,
    },
  };

  const outJsonPath = path.join(ROOT, 'docs', 'i18n-audit.json');
  const outMdPath = path.join(ROOT, 'docs', 'I18N_AUDIT.md');

  try {
    fs.mkdirSync(path.dirname(outJsonPath), { recursive: true });
  } catch {
    // ignore
  }

  fs.writeFileSync(outJsonPath, JSON.stringify(report, null, 2), 'utf8');

  const mdLines = [];
  mdLines.push('# i18n audit');
  mdLines.push('');
  mdLines.push(`Generated: ${report.generatedAt}`);
  mdLines.push('');
  mdLines.push('## Summary');
  mdLines.push(`- Scanned files: ${report.scannedFileCount}`);
  mdLines.push(`- Translation keys used: ${report.translationKeys.usedKeyCount}`);
  mdLines.push(`- Missing keys in en: ${report.translationKeys.missingInEn.length}`);
  mdLines.push(`- Missing keys in he: ${report.translationKeys.missingInHe.length}`);
  mdLines.push(`- Likely hard-coded user-facing strings: ${report.hardcoded.count}`);
  mdLines.push('');

  mdLines.push('## Missing translation keys');
  mdLines.push('');
  mdLines.push('### Missing in en');
  if (missingInEn.length === 0) {
    mdLines.push('- (none)');
  } else {
    for (const k of missingInEn) mdLines.push(`- \`${k}\``);
  }
  mdLines.push('');
  mdLines.push('### Missing in he');
  if (missingInHe.length === 0) {
    mdLines.push('- (none)');
  } else {
    for (const k of missingInHe) mdLines.push(`- \`${k}\``);
  }
  mdLines.push('');

  mdLines.push('## Hard-coded user-facing strings (top files)');
  mdLines.push('');
  if (topHardcodedFiles.length === 0) {
    mdLines.push('- (none)');
  } else {
    for (const [file, count] of topHardcodedFiles) {
      mdLines.push(`- \`${path.relative(ROOT, file)}\`: ${count}`);
    }
  }
  mdLines.push('');

  mdLines.push('## Examples (first 200 findings)');
  mdLines.push('');
  mdLines.push('This section is intentionally capped. See `docs/i18n-audit.json` for the full list.');
  mdLines.push('');
  hardcoded.slice(0, 200).forEach((item) => {
    mdLines.push(`- \`${path.relative(ROOT, item.file)}:${item.line}\` **${item.kind}** → "${item.text}"`);
    if (item.code) mdLines.push(`  - \`${item.code}\``);
  });
  mdLines.push('');

  fs.writeFileSync(outMdPath, mdLines.join('\n'), 'utf8');

  console.log('i18n audit complete.');
  console.log(`Scanned files: ${files.length}`);
  console.log(`Translation keys used: ${usedKeys.length}`);
  console.log(`Missing keys in en: ${missingInEn.length}`);
  console.log(`Missing keys in he: ${missingInHe.length}`);
  console.log(`Hard-coded strings: ${hardcoded.length}`);
  console.log(`Wrote JSON report: ${path.relative(ROOT, outJsonPath)}`);
  console.log(`Wrote MD summary: ${path.relative(ROOT, outMdPath)}`);
}

main();
