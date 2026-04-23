#!/usr/bin/env node
/**
 * Fixes broken TypeScript generics syntax across the codebase.
 * Pattern: `Identifier < Type > (...)` -> `Identifier<Type>(...)`
 *
 * Usage:
 *   node scripts/fix-generics.js
 *   node scripts/fix-generics.js src
 */

const fs = require('fs');
const path = require('path');

const rootArg = process.argv[2] || 'src';
const ROOT = path.resolve(process.cwd(), rootArg);

if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
  console.error(`Error: directory '${rootArg}' not found`);
  process.exit(1);
}

const timestamp = Date.now();
const BACKUP_DIR = `${ROOT}.backup-${timestamp}`;

copyRecursive(ROOT, BACKUP_DIR);
console.log(`==> Backup in ${BACKUP_DIR}`);

const files = listFiles(ROOT, (file) => file.endsWith('.ts') || file.endsWith('.tsx'));

const WHITELIST = [
  'React\\.createContext',
  'React\\.forwardRef',
  'React\\.useMemo',
  'React\\.useState',
  'React\\.useRef',
  'React\\.useCallback',
  'React\\.ElementRef',
  'React\\.ComponentProps',
  'React\\.ComponentPropsWithoutRef',
  'React\\.ComponentPropsWithRef',
  'React\\.HTMLAttributes',
  'React\\.RefObject',
  'React\\.MutableRefObject',
  'useState',
  'useRef',
  'useMemo',
  'useCallback',
  'createContext',
  'createClient',
  'forwardRef',
  'apiFetch',
  'fetchApi',
  'extractPayload',
  'getAuthenticatedJson',
  'parseResponse',
  'unwrapResponse',
  'new\\s+Map',
  'new\\s+Set',
  'new\\s+Array',
  'new\\s+WeakMap',
  'new\\s+WeakSet',
  'Record',
  'Array',
  'Map',
  'Set',
  'Promise',
  'Partial',
  'Pick',
  'Omit',
  'Readonly',
  'ReturnType',
  '\\.reduce',
  '\\.map',
];

const HOOK_RE = new RegExp(`(${WHITELIST.join('|')})\\s+<\\s+`, 'g');

function normalizeGenericBody(body) {
  return body
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

function fixContent(src) {
  let out = '';
  let i = 0;
  let changed = false;

  while (i < src.length) {
    HOOK_RE.lastIndex = i;
    const match = HOOK_RE.exec(src);

    if (!match) {
      out += src.slice(i);
      break;
    }

    out += src.slice(i, match.index);

    const hookName = match[1];
    const ltPos = src.indexOf('<', match.index + hookName.length);

    if (ltPos === -1) {
      out += src.slice(match.index);
      break;
    }

    let depth = 1;
    let j = ltPos + 1;

    while (j < src.length && depth > 0) {
      const ch = src[j];
      if (ch === '<') depth++;
      else if (ch === '>') depth--;
      if (depth === 0) break;
      j++;
    }

    if (depth !== 0) {
      out += src.slice(match.index, j);
      i = j;
      continue;
    }

    const genericBody = src.slice(ltPos + 1, j).trim();
    const normalized = normalizeGenericBody(genericBody);

    let k = j + 1;
    while (k < src.length && /\s/.test(src[k])) k++;

    if (src[k] !== '(') {
      out += `${hookName}<${normalized}>`;
      i = j + 1;
      changed = true;
      continue;
    }

    out += `${hookName}<${normalized}>(`;
    i = k + 1;
    changed = true;
  }

  return { out, changed };
}

let fixedCount = 0;

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  let current = original;

  for (let pass = 0; pass < 8; pass++) {
    const result = fixContent(current);
    if (!result.changed) break;
    current = result.out;
  }

  if (current !== original) {
    fs.writeFileSync(file, current, 'utf8');
    fixedCount++;
  }
}

console.log(`==> Fixed ${fixedCount} files.`);

const remainingHook = countMatches(files, /(useState|useRef|useMemo|useCallback|createContext)\s+<\s+/g);
const remainingContainer = countMatches(files, /new\s+(Map|Set|Array|WeakMap|WeakSet)\s+<\s+/g);
const remainingApi = countMatches(files, /(apiFetch|fetchApi|createClient|extractPayload)\s+<\s+/g);

console.log(`==> Remaining broken hook generics:      ${remainingHook}`);
console.log(`==> Remaining broken new Container<>:    ${remainingContainer}`);
console.log(`==> Remaining broken API fetch generics: ${remainingApi}`);

const total = remainingHook + remainingContainer + remainingApi;

if (total > 0) {
  console.log('');
  console.log('WARNING: some occurrences remain (may be comparisons, not generics):');

  const warnRe = /(useState|useRef|useMemo|useCallback|createContext|new\s+(Map|Set|Array|WeakMap|WeakSet)|apiFetch|fetchApi|createClient|extractPayload)\s+<\s+/g;
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (warnRe.test(line)) {
        console.log(`${file}:${idx + 1}:${line}`);
      }
      warnRe.lastIndex = 0;
    });
  }
}

function listFiles(dir, predicate) {
  const result = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFiles(fullPath, predicate));
    } else if (entry.isFile() && predicate(fullPath)) {
      result.push(fullPath);
    }
  }

  return result;
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function countMatches(filesToScan, regex) {
  let totalMatches = 0;
  for (const file of filesToScan) {
    const text = fs.readFileSync(file, 'utf8');
    const matches = text.match(regex);
    totalMatches += matches ? matches.length : 0;
  }
  return totalMatches;
}

