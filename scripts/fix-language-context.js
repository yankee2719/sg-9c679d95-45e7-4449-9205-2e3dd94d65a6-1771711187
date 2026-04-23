#!/usr/bin/env node
/**
 * Fix i18n keys in src/contexts/LanguageContext.tsx:
 *   1. Remove duplicate keys within the same language section (keeps first).
 *   2. Relocate orphan keys placed between language blocks into the previous block.
 *
 * Usage:
 *   node scripts/fix-language-context.js
 *   node scripts/fix-language-context.js src
 */

const fs = require('fs');
const path = require('path');

const rootArg = process.argv[2] || 'src';
const ROOT = path.resolve(process.cwd(), rootArg);
const FILE = path.join(ROOT, 'contexts', 'LanguageContext.tsx');

if (!fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
    console.error(`Error: ${path.relative(process.cwd(), FILE)} not found`);
    process.exit(1);
}

const backupFile = `${FILE}.backup-${Date.now()}`;
fs.copyFileSync(FILE, backupFile);
console.log(`==> Backup in ${backupFile}`);

const lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/);

const SECTION_START = /^\s{4}([a-z]{2}):\s*\{\s*$/;
const SECTION_END = /^\s{4}\},?\s*$/;
const KEY_LINE = /^(\s+)"([^"]+)"\s*:/;
const ROOT_KEY_LINE = /^\s{4}"([^"]+)"\s*:/;
const TRANSLATIONS_START_RE = /^const\s+translations\s*:/;

let translationsStartLine = -1;
for (let i = 0; i < lines.length; i++) {
    if (TRANSLATIONS_START_RE.test(lines[i])) {
        translationsStartLine = i;
        break;
    }
}

if (translationsStartLine === -1) {
    console.error("Could not find 'const translations: ...' declaration");
    process.exit(1);
}

let translationsEndLine = -1;
for (let i = translationsStartLine + 1; i < lines.length; i++) {
    if (/^\s*};\s*$/.test(lines[i])) {
        translationsEndLine = i;
        break;
    }
}

if (translationsEndLine === -1) {
    console.error("Could not find closing `};` of translations");
    process.exit(1);
}

let inSection = null;
const seenKeysBySection = {};
const sectionCloseLines = {};
const sectionsInOrder = [];
const duplicateLinesToRemove = new Set();

for (let i = translationsStartLine; i <= translationsEndLine; i++) {
    const line = lines[i];

    if (!inSection) {
        const match = line.match(SECTION_START);
        if (match) {
            inSection = match[1];
            seenKeysBySection[inSection] = new Set();
            sectionsInOrder.push(inSection);
        }
        continue;
    }

    if (SECTION_END.test(line)) {
        sectionCloseLines[inSection] = i;
        inSection = null;
        continue;
    }

    const keyMatch = line.match(KEY_LINE);
    if (keyMatch) {
        const key = keyMatch[2];
        if (seenKeysBySection[inSection].has(key)) {
            duplicateLinesToRemove.add(i);
        } else {
            seenKeysBySection[inSection].add(key);
        }
    }
}

const orphanGroups = [];
let lastClosedSection = null;
let currentOrphans = null;

for (let i = translationsStartLine; i <= translationsEndLine; i++) {
    const line = lines[i];
    const sectionStart = line.match(SECTION_START);

    if (sectionStart) {
        if (currentOrphans && currentOrphans.lines.length > 0) {
            currentOrphans.targetSection = lastClosedSection || sectionStart[1];
            orphanGroups.push(currentOrphans);
        }
        currentOrphans = null;
        continue;
    }

    if (SECTION_END.test(line)) {
        for (const [section, closeLine] of Object.entries(sectionCloseLines)) {
            if (closeLine === i) {
                lastClosedSection = section;
                break;
            }
        }
        currentOrphans = { targetSection: null, lines: [] };
        continue;
    }

    if (currentOrphans !== null) {
        const orphanMatch = line.match(ROOT_KEY_LINE);
        if (orphanMatch) {
            currentOrphans.lines.push({ lineIdx: i, content: line });
        }
    }
}

if (currentOrphans && currentOrphans.lines.length > 0) {
    currentOrphans.targetSection = lastClosedSection;
    orphanGroups.push(currentOrphans);
}

const orphanLinesToRemove = new Set();
const injectionsBySection = {};

for (const group of orphanGroups) {
    if (!group.targetSection) continue;

    const target = group.targetSection;
    injectionsBySection[target] = injectionsBySection[target] || [];

    for (const entry of group.lines) {
        orphanLinesToRemove.add(entry.lineIdx);

        const reindented = entry.content.replace(/^\s{4}/, '        ');
        const keyMatch = reindented.match(KEY_LINE);

        if (keyMatch) {
            const key = keyMatch[2];
            if (seenKeysBySection[target].has(key)) {
                continue;
            }
            seenKeysBySection[target].add(key);
        }

        injectionsBySection[target].push(reindented);
    }
}

const closeLineToSection = Object.fromEntries(
    Object.entries(sectionCloseLines).map(([section, line]) => [line, section])
);

const outLines = [];
let removed = 0;
let injected = 0;

for (let i = 0; i < lines.length; i++) {
    if (duplicateLinesToRemove.has(i) || orphanLinesToRemove.has(i)) {
        removed++;
        continue;
    }

    const closingSection = closeLineToSection[i];
    if (closingSection && injectionsBySection[closingSection]) {
        for (const line of injectionsBySection[closingSection]) {
            outLines.push(line);
            injected++;
        }
    }

    outLines.push(lines[i]);
}

fs.writeFileSync(FILE, outLines.join('\n'), 'utf8');

console.log(`==> Removed ${removed} duplicate/orphan lines.`);
console.log(`==> Injected ${injected} relocated keys into correct sections.`);
console.log('==> Keys per section after fix:');
for (const section of sectionsInOrder) {
    console.log(`    ${section}: ${seenKeysBySection[section].size}`);
}

