import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { buildLatestManifest } from '../generate-latest-json.mjs';

test('uses the actual Windows setup filename when building updater URLs', () => {
  const manifest = buildLatestManifest({
    version: '1.20.0',
    repoSlug: 'bretheskevin/infrabooth-downloader',
    pubDate: '2026-04-16T08:33:13Z',
    files: [
      'InfraBooth_Downloader_1.20.0_Apple_Silicon.app.tar.gz',
      'InfraBooth_Downloader_1.20.0_Apple_Silicon.app.tar.gz.sig',
      'InfraBooth_Downloader_1.20.0_Intel.app.tar.gz',
      'InfraBooth_Downloader_1.20.0_Intel.app.tar.gz.sig',
      'InfraBooth.Downloader_1.20.0_x64-setup.exe',
      'InfraBooth.Downloader_1.20.0_x64-setup.exe.sig',
    ],
    signatures: {
      'InfraBooth_Downloader_1.20.0_Apple_Silicon.app.tar.gz.sig': 'arm-sig',
      'InfraBooth_Downloader_1.20.0_Intel.app.tar.gz.sig': 'intel-sig',
      'InfraBooth.Downloader_1.20.0_x64-setup.exe.sig': 'windows-sig',
    },
  });

  assert.equal(
    manifest.platforms['windows-x86_64'].url,
    'https://github.com/bretheskevin/infrabooth-downloader/releases/download/v1.20.0/InfraBooth.Downloader_1.20.0_x64-setup.exe',
  );
  assert.equal(manifest.platforms['windows-x86_64'].signature, 'windows-sig');
});

test('prints a latest.json payload for the release directory', () => {
  const releaseDir = mkdtempSync(path.join(tmpdir(), 'latest-json-'));

  try {
    writeFileSync(path.join(releaseDir, 'InfraBooth_Downloader_1.20.0_Apple_Silicon.app.tar.gz'), '');
    writeFileSync(path.join(releaseDir, 'InfraBooth_Downloader_1.20.0_Apple_Silicon.app.tar.gz.sig'), 'arm-sig');
    writeFileSync(path.join(releaseDir, 'InfraBooth_Downloader_1.20.0_Intel.app.tar.gz'), '');
    writeFileSync(path.join(releaseDir, 'InfraBooth_Downloader_1.20.0_Intel.app.tar.gz.sig'), 'intel-sig');
    writeFileSync(path.join(releaseDir, 'InfraBooth.Downloader_1.20.0_x64-setup.exe'), '');
    writeFileSync(path.join(releaseDir, 'InfraBooth.Downloader_1.20.0_x64-setup.exe.sig'), 'windows-sig');

    const result = spawnSync(
      process.execPath,
      [
        'scripts/generate-latest-json.mjs',
        '--version',
        '1.20.0',
        '--repo',
        'bretheskevin/infrabooth-downloader',
        '--release-dir',
        releaseDir,
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );

    assert.equal(result.status, 0, result.stderr);

    const manifest = JSON.parse(result.stdout);

    assert.equal(
      manifest.platforms['windows-x86_64'].url,
      'https://github.com/bretheskevin/infrabooth-downloader/releases/download/v1.20.0/InfraBooth.Downloader_1.20.0_x64-setup.exe',
    );
    assert.equal(manifest.platforms['windows-x86_64'].signature, 'windows-sig');
  } finally {
    rmSync(releaseDir, { recursive: true, force: true });
  }
});
