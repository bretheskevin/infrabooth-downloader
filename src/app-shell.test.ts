import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

describe('Story 1.3: App Shell Layout', () => {
  describe('Task 1: Tauri Window Configuration (AC #1)', () => {
    const getTauriConfig = () => {
      return JSON.parse(
        readFileSync(join(PROJECT_ROOT, 'src-tauri/tauri.conf.json'), 'utf-8')
      );
    };

    it('should have default window width of 600 pixels (UX-7)', () => {
      const config = getTauriConfig();
      expect(config.app.windows[0].width).toBe(600);
    });

    it('should have default window height of 700 pixels (UX-7)', () => {
      const config = getTauriConfig();
      expect(config.app.windows[0].height).toBe(700);
    });

    it('should have minimum window width of 400 pixels (UX-6)', () => {
      const config = getTauriConfig();
      expect(config.app.windows[0].minWidth).toBe(400);
    });

    it('should have minimum window height of 500 pixels (UX-6)', () => {
      const config = getTauriConfig();
      expect(config.app.windows[0].minHeight).toBe(500);
    });

    it('should have window centered on launch', () => {
      const config = getTauriConfig();
      expect(config.app.windows[0].center).toBe(true);
    });

    it('should have window title "InfraBooth Downloader"', () => {
      const config = getTauriConfig();
      expect(config.app.windows[0].title).toBe('InfraBooth Downloader');
    });

    it('should have resizable window', () => {
      const config = getTauriConfig();
      expect(config.app.windows[0].resizable).toBe(true);
    });
  });

  describe('Task 2: AppLayout Component (AC #2, #3)', () => {
    it('should have AppLayout.tsx file', () => {
      expect(existsSync(join(PROJECT_ROOT, 'src/components/layout/AppLayout.tsx'))).toBe(true);
    });

    it('should export AppLayout as named export', () => {
      const content = readFileSync(
        join(PROJECT_ROOT, 'src/components/layout/AppLayout.tsx'),
        'utf-8'
      );
      expect(content).toMatch(/export\s+(function|const)\s+AppLayout/);
    });

    it('should use semantic main element', () => {
      const content = readFileSync(
        join(PROJECT_ROOT, 'src/components/layout/AppLayout.tsx'),
        'utf-8'
      );
      expect(content).toContain('<main');
    });

    it('should use bg-background for theme support', () => {
      const content = readFileSync(
        join(PROJECT_ROOT, 'src/components/layout/AppLayout.tsx'),
        'utf-8'
      );
      expect(content).toContain('bg-background');
    });

    it('should use min-h-screen for full height', () => {
      const content = readFileSync(
        join(PROJECT_ROOT, 'src/components/layout/AppLayout.tsx'),
        'utf-8'
      );
      expect(content).toContain('min-h-screen');
    });
  });

  describe('Task 3: Header Component (AC #2, #3)', () => {
    it('should have Header.tsx file', () => {
      expect(existsSync(join(PROJECT_ROOT, 'src/components/layout/Header.tsx'))).toBe(true);
    });

    it('should export Header as named export', () => {
      const content = readFileSync(
        join(PROJECT_ROOT, 'src/components/layout/Header.tsx'),
        'utf-8'
      );
      expect(content).toMatch(/export\s+(function|const)\s+Header/);
    });

    it('should use semantic header element', () => {
      const content = readFileSync(
        join(PROJECT_ROOT, 'src/components/layout/Header.tsx'),
        'utf-8'
      );
      expect(content).toContain('<header');
    });

    it('should display app title', () => {
      const content = readFileSync(
        join(PROJECT_ROOT, 'src/components/layout/Header.tsx'),
        'utf-8'
      );
      expect(content).toContain('InfraBooth Downloader');
    });

    it('should have border-b for visual separation', () => {
      const content = readFileSync(
        join(PROJECT_ROOT, 'src/components/layout/Header.tsx'),
        'utf-8'
      );
      expect(content).toContain('border-b');
    });
  });

  describe('Task 4: App.tsx Integration (AC #2)', () => {
    it('should import AppLayout in App.tsx', () => {
      const content = readFileSync(join(PROJECT_ROOT, 'src/App.tsx'), 'utf-8');
      expect(content).toContain('AppLayout');
    });

    it('should use AppLayout component in App.tsx', () => {
      const content = readFileSync(join(PROJECT_ROOT, 'src/App.tsx'), 'utf-8');
      expect(content).toMatch(/<AppLayout[\s>]/);
    });
  });

  describe('Task 5: Layout Directory Structure (AC #3)', () => {
    it('should have layout directory', () => {
      expect(existsSync(join(PROJECT_ROOT, 'src/components/layout'))).toBe(true);
    });
  });
});
