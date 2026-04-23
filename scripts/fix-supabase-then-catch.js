#!/usr/bin/env node
/**
 * Fix: Supabase 2.x returns PromiseLike, not Promise.
 * `.catch()` may not exist on PromiseLike.
 *
 * Pattern:
 *   .then(() => undefined).catch((e) => { ... })
 * becomes:
 *   .then(undefined, (e) => { ... })
 *
 * Usage:
 *   node scripts/fix-supabase-then-catch.js
 *   node scripts/fix-supabase-then-catch.js src
 */

const fs = require('fs');
const path = require('path');

const rootArg = process.argv[2] || 'src';
const ROOT = path.resolve(process.cwd(), rootArg);

if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
    console.error(`Error: directory '${rootArg}' not found`);
    process.exit(1);
}

const BACKUP_DIR = `${ROOT}.backup-thencatch-${Date.now()}`;
copyRecursive(ROOT, BACKUP_DIR);
console.log(`==> Backup in ${BACKUP_DIR}`);

const files = listFiles(ROOT, (file) => (file.endsWith('.ts') || file.endsWith('.tsx')));

const marker = '.then(() => undefined)';
const candidateFiles = files.filter((file) => fs.readFileSync(file, 'utf8').includes(marker));

if (candidateFiles.length === 0) {
    console.log('No .then() markers found.');
    process.exit(0);
}

let fixedCount = 0;

for (const file of candidateFiles) {
    const src = fs.readFileSync(file, 'utf8');
    const result = fixContent(src);

    if (result.changed && result.out !== src) {
        fs.writeFileSync(file, result.out, 'utf8');
        fixedCount++;
    }
}

console.log(`==> Fixed ${fixedCount} files.`);

const remaining = countMatches(candidateFiles, /\.then\(\(\) => undefined\)/g);
console.log(`==> Remaining .then(() => undefined) occurrences: ${remaining}`);

function fixContent(src) {
    let out = '';
    let i = 0;
    let changed = false;

    while (i < src.length) {
        const idx = src.indexOf(marker, i);

        if (idx === -1) {
            out += src.slice(i);
            break;
        }

        out += src.slice(i, idx);

        let k = idx + marker.length;
        while (k < src.length && /\s/.test(src[k])) k++;

        if (src.slice(k, k + 7) !== '.catch(') {
            out += marker;
            i = idx + marker.length;
            continue;
        }

        let depth = 1;
        let j = k + 7;
        const argStart = j;
        let inStr = null;

        while (j < src.length && depth > 0) {
            const ch = src[j];

            if (inStr) {
                if (ch === '\\') {
                    j += 2;
                    continue;
                }
                if (ch === inStr) inStr = null;
                j++;
                continue;
            }

            if (ch === "'" || ch === '"' || ch === '`') {
                inStr = ch;
                j++;
                continue;
            }

            if (ch === '(') depth++;
            else if (ch === ')') {
                depth--;
                if (depth === 0) break;
            }

            j++;
        }

        if (depth !== 0) {
            out += src.slice(idx, j);
            i = j;
            continue;
        }

        const catchArg = src.slice(argStart, j);
        out += `.then(undefined, ${catchArg})`;
        i = j + 1;
        changed = true;
    }

    return { out, changed };
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

