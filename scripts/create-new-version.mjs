#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const rootDir = resolve(import.meta.dirname, '..');

function exec(cmd) {
  return execSync(cmd, { cwd: rootDir, encoding: 'utf-8' }).trim();
}

function getLastTag() {
  try {
    return exec('git describe --tags --abbrev=0');
  } catch {
    return null;
  }
}

function getCommitsSinceTag(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  const log = exec(`git log ${range} --pretty=format:"%s"`);
  return log ? log.split('\n').filter(Boolean) : [];
}

function parseConventionalCommit(message) {
  const match = message.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/);
  if (!match) return null;
  return { type: match[1], scope: match[2], description: match[3] };
}

function categorizeCommits(commits) {
  const categories = {
    added: [],
    changed: [],
    fixed: [],
    removed: [],
  };

  const typeMap = {
    feat: 'added',
    fix: 'fixed',
    perf: 'changed',
    refactor: 'changed',
    docs: 'changed',
    style: 'changed',
  };

  for (const msg of commits) {
    const parsed = parseConventionalCommit(msg);
    if (!parsed) continue;

    // Skip ci/chore/test commits
    if (['ci', 'chore', 'test', 'build'].includes(parsed.type)) continue;

    const category = typeMap[parsed.type];
    if (category) {
      // Make description user-friendly (capitalize first letter)
      const desc = parsed.description.charAt(0).toUpperCase() + parsed.description.slice(1);
      categories[category].push(desc);
    }
  }

  return categories;
}

function generateChangelogEntry(version, categories) {
  const date = new Date().toISOString().split('T')[0];
  let entry = `## [${version}] - ${date}\n`;

  const sectionTitles = {
    added: 'Added',
    changed: 'Changed',
    fixed: 'Fixed',
    removed: 'Removed',
  };

  for (const [key, title] of Object.entries(sectionTitles)) {
    if (categories[key].length > 0) {
      entry += `\n### ${title}\n\n`;
      for (const item of categories[key]) {
        entry += `- ${item}\n`;
      }
    }
  }

  return entry;
}

function updateChangelog(newEntry) {
  const changelogPath = resolve(rootDir, 'CHANGELOG.md');
  const content = readFileSync(changelogPath, 'utf-8');

  // Insert after ## [Unreleased]
  const updatedContent = content.replace(
    /## \[Unreleased\]\n*/,
    `## [Unreleased]\n\n${newEntry}\n`
  );

  writeFileSync(changelogPath, updatedContent);
}

function updateVersion(version) {
  // Update package.json
  const pkgPath = resolve(rootDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  // Update tauri.conf.json
  const tauriPath = resolve(rootDir, 'src-tauri/tauri.conf.json');
  const tauri = JSON.parse(readFileSync(tauriPath, 'utf-8'));
  tauri.version = version;
  writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + '\n');

  // Update Cargo.toml
  const cargoPath = resolve(rootDir, 'src-tauri/Cargo.toml');
  let cargo = readFileSync(cargoPath, 'utf-8');
  cargo = cargo.replace(/^version = ".*"$/m, `version = "${version}"`);
  writeFileSync(cargoPath, cargo);
}

function bumpVersion(currentVersion, type) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

function getCurrentVersion() {
  const pkgPath = resolve(rootDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  return pkg.version;
}

// Main
const args = process.argv.slice(2);
const versionArg = args[0];

if (!versionArg || ['--help', '-h'].includes(versionArg)) {
  console.log(`
Usage: npm run create-new-version <version|patch|minor|major>

Examples:
  npm run create-new-version 1.2.0    # Set specific version
  npm run create-new-version patch    # Bump patch (1.0.1 -> 1.0.2)
  npm run create-new-version minor    # Bump minor (1.0.1 -> 1.1.0)
  npm run create-new-version major    # Bump major (1.0.1 -> 2.0.0)
`);
  process.exit(0);
}

// Determine new version
let newVersion;
const currentVersion = getCurrentVersion();

if (['patch', 'minor', 'major'].includes(versionArg)) {
  newVersion = bumpVersion(currentVersion, versionArg);
} else if (/^\d+\.\d+\.\d+$/.test(versionArg)) {
  newVersion = versionArg;
} else {
  console.error(`Invalid version: ${versionArg}`);
  process.exit(1);
}

console.log(`Creating version ${newVersion}...\n`);

// Get commits since last tag
const lastTag = getLastTag();
console.log(`Last tag: ${lastTag || '(none)'}`);

const commits = getCommitsSinceTag(lastTag);
console.log(`Found ${commits.length} commits since last tag\n`);

if (commits.length === 0) {
  console.error('No commits found since last tag. Nothing to release.');
  process.exit(1);
}

// Categorize commits
const categories = categorizeCommits(commits);
const hasChanges = Object.values(categories).some(arr => arr.length > 0);

if (!hasChanges) {
  console.log('No user-facing changes found (only ci/chore/test commits).');
  console.log('Add changelog entries manually or include feat/fix commits.\n');
}

// Generate changelog entry
const changelogEntry = generateChangelogEntry(newVersion, categories);
console.log('Generated changelog entry:');
console.log('─'.repeat(40));
console.log(changelogEntry);
console.log('─'.repeat(40));

// Update files
console.log('\nUpdating version in config files...');
updateVersion(newVersion);

console.log('Updating CHANGELOG.md...');
updateChangelog(changelogEntry);

// Update Cargo.lock
console.log('Updating Cargo.lock...');
exec('cargo check --manifest-path src-tauri/Cargo.toml 2>/dev/null || true');

// Git operations
console.log('\nStaging changes...');
exec('git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock CHANGELOG.md');

console.log('Creating commit...');
exec(`git commit -m "chore: release v${newVersion}"`);

console.log('Creating tag...');
exec(`git tag v${newVersion}`);

console.log(`
✅ Version ${newVersion} created!

Next steps:
  1. Review the changes: git show HEAD
  2. Push to trigger release: git push origin main --tags
`);
