import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

describe('raycast shared code', () => {
  it('matches the desktop app sources (run npm run sync:raycast if this fails)', () => {
    const script = path.resolve(__dirname, '../../../scripts/sync-raycast-shared.mjs');
    const result = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });
});
