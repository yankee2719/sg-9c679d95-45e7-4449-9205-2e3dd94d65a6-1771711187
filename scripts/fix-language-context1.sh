#!/usr/bin/env bash
# Fix i18n keys in src/contexts/LanguageContext.tsx:
#   1. Remove duplicate keys within the same language section (keeps first).
#   2. Relocate "orphan" keys that sit between a section close `    },` and
#      the next section open `    xx: {` — these are misplaced keys that
#      belong inside the previous section. Move them INSIDE the previous
#      section (before its closing brace).
#
# The file structure is:
#   const translations: Record<Language, Record<string, string>> = {
#       it: { "key": "value", ... },
#       en: { "key": "value", ... },
#       fr: { "key": "value", ... },
#       es: { "key": "value", ... },
#   };
#
# Orphan keys between the end of `it` and the start of `en` must logically
# belong to `it` (the developer forgot to move them inside).
#
# Usage: bash scripts/fix-language-context.sh [src-directory]

set -euo pipefail

ROOT="${1:-src}"
FILE="$ROOT/contexts/LanguageContext.tsx"

if [ ! -f "$FILE" ]; then
    echo "Error: $FILE not found"
    exit 1
fi

if ! command -v node >/dev/null 2>&1; then
    echo "Error: node is required"
    exit 1
fi

cp "$FILE" "${FILE}.backup-$(date +%s)"
export FILE_PATH="$FILE"

node - <<'NODE_EOF'
const fs = require('fs');
const filePath = process.env.FILE_PATH;
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

const SECTION_START = /^    ([a-z]{2}): \{\s*$/;
const SECTION_END = /^    \},?\s*$/;
const KEY_LINE = /^(\s+)"([^"]+)"\s*:/;
const ROOT_KEY_LINE = /^    "([^"]+)"\s*:/; // 4-space indent = orphan at root

// First pass: dedupe within sections AND collect orphan keys.
// Orphan = a key line at 4-space indent that appears between a section close
// and the next section open (or before the closing `};` of translations).

// Parse structure
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

// Find the closing `};` of translations (first `};` after translationsStartLine).
let translationsEndLine = -1;
for (let i = translationsStartLine + 1; i < lines.length; i++) {
    if (/^};\s*$/.test(lines[i]) || /^\};\s*$/.test(lines[i])) {
        translationsEndLine = i;
        break;
    }
}
if (translationsEndLine === -1) {
    console.error("Could not find closing `};` of translations");
    process.exit(1);
}

// Within translations scope, walk sections
let inSection = null;
const seenKeysBySection = {};
// For each section, track the line index of its closing `    },` so we can
// inject orphan keys before it.
const sectionCloseLines = {};
const sectionsInOrder = [];

let sectionStartLine = -1;

// Pass 1: identify sections and their close-lines, detect duplicates
const duplicateLinesToRemove = new Set();

for (let i = translationsStartLine; i <= translationsEndLine; i++) {
    const line = lines[i];

    if (!inSection) {
        const m = line.match(SECTION_START);
        if (m) {
            inSection = m[1];
            sectionStartLine = i;
            seenKeysBySection[inSection] = new Set();
            sectionsInOrder.push(inSection);
            continue;
        }
        continue;
    }

    // In a section: check for close or key
    if (SECTION_END.test(line)) {
        sectionCloseLines[inSection] = i;
        inSection = null;
        continue;
    }

    const km = line.match(KEY_LINE);
    if (km) {
        const key = km[2];
        if (seenKeysBySection[inSection].has(key)) {
            duplicateLinesToRemove.add(i);
        } else {
            seenKeysBySection[inSection].add(key);
        }
    }
}

// Pass 2: find orphan key lines between sections (or between last section
// and translationsEndLine). Orphans are lines matching ROOT_KEY_LINE that
// fall *outside* any section but *inside* translations scope.

// Build a map: which section each orphan group belongs to (the PREVIOUS
// section). Orphans before the FIRST section = belong to first section.

const orphanGroups = []; // { targetSection, lines: [{lineIdx, content}] }

let lastClosedSection = null;
let currentOrphans = null;

for (let i = translationsStartLine; i <= translationsEndLine; i++) {
    const line = lines[i];

    const secStart = line.match(SECTION_START);
    if (secStart) {
        // If we have accumulated orphans, attach them to PREVIOUS section
        if (currentOrphans && currentOrphans.lines.length > 0) {
            const target = lastClosedSection || secStart[1];
            currentOrphans.targetSection = target;
            orphanGroups.push(currentOrphans);
        }
        currentOrphans = null;
        continue;
    }

    if (SECTION_END.test(line)) {
        // Find what section this closes — we need to track. Use a small
        // state machine: the close line must correspond to the last-opened.
        // Since we already know sectionCloseLines, we can match by line.
        for (const sec of Object.keys(sectionCloseLines)) {
            if (sectionCloseLines[sec] === i) {
                lastClosedSection = sec;
                break;
            }
        }
        // Start a new orphan-collection phase
        currentOrphans = { targetSection: null, lines: [] };
        continue;
    }

    // Orphan key line: 4-space indent, inside translations, but outside any section
    if (currentOrphans !== null) {
        const om = line.match(ROOT_KEY_LINE);
        if (om) {
            currentOrphans.lines.push({ lineIdx: i, content: line });
        }
    }
}

// If there are trailing orphans after the last section close (before translations end),
// attach them to the last closed section.
if (currentOrphans && currentOrphans.lines.length > 0) {
    currentOrphans.targetSection = lastClosedSection;
    orphanGroups.push(currentOrphans);
}

// Build the output:
// - For each orphan line: remove it from its original position
// - Inject orphan contents (reformatted at 8-space indent) just BEFORE the
//   close of the target section.
// - Also skip lines flagged as duplicates.

const orphanLinesToRemove = new Set();
const injectionsBySection = {}; // sectionName -> [contentLine, ...]

for (const group of orphanGroups) {
    if (!group.targetSection) continue;
    const target = group.targetSection;
    injectionsBySection[target] = injectionsBySection[target] || [];
    for (const { lineIdx, content } of group.lines) {
        orphanLinesToRemove.add(lineIdx);
        // Re-indent from 4 spaces to 8 spaces
        const reindented = content.replace(/^    /, '        ');
        // Check if this key already exists in the target (post-dedupe)
        const km = reindented.match(KEY_LINE);
        if (km) {
            const key = km[2];
            if (seenKeysBySection[target].has(key)) {
                // Already exists in target section — drop this orphan
                continue;
            }
            seenKeysBySection[target].add(key);
        }
        injectionsBySection[target].push(reindented);
    }
}

// Compose output: walk lines, skip duplicates/orphans, inject before section close.
const outLines = [];
let removed = 0;
let injected = 0;

for (let i = 0; i < lines.length; i++) {
    if (duplicateLinesToRemove.has(i)) {
        removed++;
        continue;
    }
    if (orphanLinesToRemove.has(i)) {
        removed++;
        continue;
    }

    // If this is a section close line and we have injections, prepend them
    const closingSec = Object.keys(sectionCloseLines).find(
        (s) => sectionCloseLines[s] === i
    );
    if (closingSec && injectionsBySection[closingSec]) {
        for (const injection of injectionsBySection[closingSec]) {
            outLines.push(injection);
            injected++;
        }
    }

    outLines.push(lines[i]);
}

fs.writeFileSync(filePath, outLines.join('\n'));

console.log(`==> Removed ${removed} duplicate/orphan lines.`);
console.log(`==> Injected ${injected} relocated keys into correct sections.`);
console.log(`==> Keys per section after fix:`);
for (const sec of sectionsInOrder) {
    console.log(`    ${sec}: ${seenKeysBySection[sec].size}`);
}
NODE_EOF

