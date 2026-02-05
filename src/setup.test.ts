import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

describe('Project Structure (AC #3)', () => {
  it('should have src directory with React files', () => {
    expect(existsSync(join(PROJECT_ROOT, 'src/App.tsx'))).toBe(true);
    expect(existsSync(join(PROJECT_ROOT, 'src/main.tsx'))).toBe(true);
    expect(existsSync(join(PROJECT_ROOT, 'src/vite-env.d.ts'))).toBe(true);
  });

  it('should have src-tauri directory with Rust files', () => {
    expect(existsSync(join(PROJECT_ROOT, 'src-tauri/src/lib.rs'))).toBe(true);
    expect(existsSync(join(PROJECT_ROOT, 'src-tauri/src/main.rs'))).toBe(true);
    expect(existsSync(join(PROJECT_ROOT, 'src-tauri/Cargo.toml'))).toBe(true);
  });

  it('should have vite.config.ts', () => {
    expect(existsSync(join(PROJECT_ROOT, 'vite.config.ts'))).toBe(true);
  });

  it('should have tsconfig.json', () => {
    expect(existsSync(join(PROJECT_ROOT, 'tsconfig.json'))).toBe(true);
  });
});

describe('Tauri Configuration (AC #1)', () => {
  it('should have correct bundle identifier', () => {
    const tauriConfig = JSON.parse(
      readFileSync(join(PROJECT_ROOT, 'src-tauri/tauri.conf.json'), 'utf-8')
    );
    expect(tauriConfig.identifier).toBe('com.infrabooth.downloader');
  });

  it('should have correct product name', () => {
    const tauriConfig = JSON.parse(
      readFileSync(join(PROJECT_ROOT, 'src-tauri/tauri.conf.json'), 'utf-8')
    );
    expect(tauriConfig.productName).toBe('InfraBooth Downloader');
  });

  it('should have correct dev URL', () => {
    const tauriConfig = JSON.parse(
      readFileSync(join(PROJECT_ROOT, 'src-tauri/tauri.conf.json'), 'utf-8')
    );
    expect(tauriConfig.build.devUrl).toBe('http://localhost:5173');
  });
});

describe('TypeScript Configuration (AC #4)', () => {
  it('should have strict mode enabled', () => {
    const tsConfigContent = readFileSync(join(PROJECT_ROOT, 'tsconfig.json'), 'utf-8');
    expect(tsConfigContent).toContain('"strict": true');
  });
});
