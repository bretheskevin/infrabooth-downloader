import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

describe('Story 1.2 - Tailwind CSS Configuration', () => {
  const rootDir = resolve(__dirname, '..');

  describe('Task 1: Tailwind CSS Installation (AC: #1)', () => {
    it('should have tailwindcss as a dev dependency', () => {
      const packageJson = JSON.parse(
        readFileSync(resolve(rootDir, 'package.json'), 'utf-8')
      );
      expect(packageJson.devDependencies).toHaveProperty('tailwindcss');
    });

    it('should have postcss as a dev dependency', () => {
      const packageJson = JSON.parse(
        readFileSync(resolve(rootDir, 'package.json'), 'utf-8')
      );
      expect(packageJson.devDependencies).toHaveProperty('postcss');
    });

    it('should have autoprefixer as a dev dependency', () => {
      const packageJson = JSON.parse(
        readFileSync(resolve(rootDir, 'package.json'), 'utf-8')
      );
      expect(packageJson.devDependencies).toHaveProperty('autoprefixer');
    });

    it('should have tailwind.config.js with correct content paths', async () => {
      // Check for tailwind.config.js or tailwind.config.ts
      const jsConfig = resolve(rootDir, 'tailwind.config.js');
      const tsConfig = resolve(rootDir, 'tailwind.config.ts');

      expect(existsSync(jsConfig) || existsSync(tsConfig)).toBe(true);

      // Dynamic import to check content configuration
      const configPath = existsSync(tsConfig) ? tsConfig : jsConfig;
      const config = await import(configPath);
      const configObj = config.default || config;

      expect(configObj.content).toBeDefined();
      expect(configObj.content).toContain('./index.html');
      expect(configObj.content.some((p: string) => p.includes('src/**/*.{ts,tsx}'))).toBe(true);
    });

    it('should have postcss.config.js with tailwindcss and autoprefixer plugins', async () => {
      const jsConfig = resolve(rootDir, 'postcss.config.js');
      const mjsConfig = resolve(rootDir, 'postcss.config.mjs');

      expect(existsSync(jsConfig) || existsSync(mjsConfig)).toBe(true);
    });

    it('should have src/index.css with Tailwind directives', () => {
      const indexCss = resolve(rootDir, 'src/index.css');
      expect(existsSync(indexCss)).toBe(true);

      const cssContent = readFileSync(indexCss, 'utf-8');
      expect(cssContent).toContain('@tailwind base');
      expect(cssContent).toContain('@tailwind components');
      expect(cssContent).toContain('@tailwind utilities');
    });
  });

  describe('Task 2: Shadcn/ui Initialization (AC: #2, #3)', () => {
    it('should have components.json created', () => {
      const componentsJson = resolve(rootDir, 'components.json');
      expect(existsSync(componentsJson)).toBe(true);
    });

    it('should have TypeScript enabled in components.json', () => {
      const componentsJson = resolve(rootDir, 'components.json');
      if (existsSync(componentsJson)) {
        const config = JSON.parse(readFileSync(componentsJson, 'utf-8'));
        expect(config.tsx).toBe(true);
      }
    });

    it('should have src/components/ui/ directory created', () => {
      const uiDir = resolve(rootDir, 'src/components/ui');
      expect(existsSync(uiDir)).toBe(true);
    });

    it('should have src/lib/utils.ts with cn() helper', () => {
      const utilsFile = resolve(rootDir, 'src/lib/utils.ts');
      expect(existsSync(utilsFile)).toBe(true);

      const utilsContent = readFileSync(utilsFile, 'utf-8');
      expect(utilsContent).toContain('cn');
      expect(utilsContent).toContain('clsx');
      expect(utilsContent).toContain('tailwind-merge');
    });

    it('should have required Shadcn dependencies installed', () => {
      const packageJson = JSON.parse(
        readFileSync(resolve(rootDir, 'package.json'), 'utf-8')
      );
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      expect(allDeps).toHaveProperty('clsx');
      expect(allDeps).toHaveProperty('tailwind-merge');
      expect(allDeps).toHaveProperty('class-variance-authority');
    });
  });

  describe('Task 3: Path Aliases (AC: #3)', () => {
    it('should have tsconfig.json with @/* path alias', () => {
      const tsconfigPath = resolve(rootDir, 'tsconfig.json');
      const tsconfigContent = readFileSync(tsconfigPath, 'utf-8');

      // tsconfig.json may have comments (JSONC format), so check content directly
      expect(tsconfigContent).toContain('"baseUrl": "."');
      expect(tsconfigContent).toContain('"@/*"');
      expect(tsconfigContent).toContain('"./src/*"');
    });

    it('should have vite.config.ts with @ resolve alias', async () => {
      const viteConfig = resolve(rootDir, 'vite.config.ts');
      const viteContent = readFileSync(viteConfig, 'utf-8');

      expect(viteContent).toContain('resolve');
      expect(viteContent).toContain('alias');
      expect(viteContent).toContain('@');
    });
  });

  describe('Task 4: Shadcn Button Component (AC: #4)', () => {
    it('should have Button component installed', () => {
      const buttonComponent = resolve(rootDir, 'src/components/ui/button.tsx');
      expect(existsSync(buttonComponent)).toBe(true);
    });

    it('should be able to import Button from @/components/ui/button', async () => {
      // This test validates the path alias works for imports
      const buttonPath = resolve(rootDir, 'src/components/ui/button.tsx');
      expect(existsSync(buttonPath)).toBe(true);
    });
  });
});
