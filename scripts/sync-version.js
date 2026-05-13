#!/usr/bin/env node
'use strict';

// Single-source-of-truth version sync. Reads package.json#version and writes
// the same value into every other file that pins the app version. Intended to
// be wired into the `npm version` lifecycle so a single `npm version X.Y.Z`
// command updates everything in one commit.
//
// Idempotent: re-running with no version change is a no-op.

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const sourcePkg = path.join(repoRoot, 'package.json');
const version = JSON.parse(fs.readFileSync(sourcePkg, 'utf8')).version;

if (!/^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`sync-version: invalid version "${version}" in package.json`);
  process.exit(1);
}

const targets = [
  'CloudronManifest.json',
  'packaging/cloudron/package.json'
];

let changed = 0;
for (const rel of targets) {
  const file = path.join(repoRoot, rel);
  const text = fs.readFileSync(file, 'utf8');
  const json = JSON.parse(text);
  if (json.version === version) {
    console.log(`  = ${rel} already at ${version}`);
    continue;
  }
  json.version = version;
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(`  ${rel} -> ${version}`);
  changed++;
}

const changelog = fs.readFileSync(path.join(repoRoot, 'CHANGELOG.md'), 'utf8');
if (!changelog.includes(`## [${version}]`)) {
  console.warn(
    `\nCHANGELOG.md has no [${version}] section. Rename [Unreleased] -> ` +
    `[${version}] - <YYYY-MM-DD> before pushing.`
  );
} else {
  // Extract the [version] section from CHANGELOG.md and write it to ./CHANGELOG,
  // which the manifest's `changelog` field references via file://CHANGELOG. This
  // is the per-version snippet that Cloudron shows in the app store catalog and
  // the dashboard update prompt.
  const lines = changelog.split('\n');
  const startIdx = lines.findIndex((l) => l.startsWith(`## [${version}]`));
  const slice = [`[${version}]`];
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## [')) break;
    slice.push(lines[i]);
  }
  // Trim leading/trailing blank lines.
  while (slice.length > 1 && slice[1].trim() === '') slice.splice(1, 1);
  while (slice[slice.length - 1].trim() === '') slice.pop();
  const body = slice.join('\n') + '\n';
  const target = path.join(repoRoot, 'CHANGELOG');
  const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (existing !== body) {
    fs.writeFileSync(target, body);
    console.log(`  CHANGELOG <- CHANGELOG.md [${version}]`);
    changed++;
  } else {
    console.log(`  = CHANGELOG already in sync with CHANGELOG.md [${version}]`);
  }
}

console.log(`\nsync-version: ${changed} file(s) updated to ${version}.`);
