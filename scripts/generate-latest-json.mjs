import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function pickFirst(files, pattern) {
  return files.find((file) => pattern.test(file)) ?? '';
}

function buildAssetUrl(repoSlug, version, file) {
  return `https://github.com/${repoSlug}/releases/download/v${version}/${file}`;
}

export function buildLatestManifest({ version, repoSlug, pubDate, files, signatures }) {
  const armTar = pickFirst(files, /Apple_Silicon.*\.app\.tar\.gz$/);
  const intelTar = pickFirst(files, /Intel.*\.app\.tar\.gz$/);
  const windowsExe = pickFirst(files, /setup\.exe$/);

  return {
    version,
    notes: 'See release notes for details.',
    pub_date: pubDate,
    platforms: {
      'darwin-aarch64': {
        signature: signatures[`${armTar}.sig`] ?? '',
        url: buildAssetUrl(repoSlug, version, armTar),
      },
      'darwin-x86_64': {
        signature: signatures[`${intelTar}.sig`] ?? '',
        url: buildAssetUrl(repoSlug, version, intelTar),
      },
      'windows-x86_64': {
        signature: signatures[`${windowsExe}.sig`] ?? '',
        url: buildAssetUrl(repoSlug, version, windowsExe),
      },
    },
  };
}

export function readReleaseDirectory(releaseDir) {
  const files = readdirSync(releaseDir)
    .filter((file) => !file.startsWith('.'))
    .sort();

  const signatures = Object.fromEntries(
    files
      .filter((file) => file.endsWith('.sig'))
      .map((file) => [file, readFileSync(path.join(releaseDir, file), 'utf8').trim()]),
  );

  return { files, signatures };
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid arguments: ${argv.join(' ')}`);
    }

    parsed[key.slice(2)] = value;
  }

  if (!parsed.version || !parsed.repo || !parsed['release-dir']) {
    throw new Error('Usage: node scripts/generate-latest-json.mjs --version <version> --repo <owner/repo> --release-dir <dir>');
  }

  return {
    version: parsed.version,
    repoSlug: parsed.repo,
    releaseDir: parsed['release-dir'],
  };
}

function runCli() {
  const { version, repoSlug, releaseDir } = parseArgs(process.argv.slice(2));
  const { files, signatures } = readReleaseDirectory(releaseDir);

  const manifest = buildLatestManifest({
    version,
    repoSlug,
    pubDate: new Date().toISOString(),
    files,
    signatures,
  });

  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
