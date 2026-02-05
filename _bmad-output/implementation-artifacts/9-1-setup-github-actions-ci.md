# Story 9.1: Set Up GitHub Actions CI Workflow

## Story Information

| Field | Value |
|-------|-------|
| **Story ID** | 9.1 |
| **Epic** | Epic 9: Application Updates & Distribution |
| **Status** | ready-for-dev |
| **Created** | 2026-02-05 |
| **Requirements** | ARCH-10 |

---

## Story Statement

**As a** developer,
**I want** automated CI checks on every push,
**So that** code quality is maintained and regressions are caught early.

---

## Acceptance Criteria (ARCH-10)

### AC1: Workflow Triggers

**Given** the GitHub repository
**When** code is pushed to any branch
**Then** a CI workflow runs automatically

**Given** a pull request is opened or updated
**When** targeting the main branch
**Then** the CI workflow runs automatically

### AC2: Required CI Steps

**Given** the CI workflow runs
**When** examining the steps
**Then** the following checks execute:
- Install dependencies (`npm ci`)
- TypeScript type checking (`tsc --noEmit`)
- Linting (ESLint)
- Rust formatting check (`cargo fmt --check`)
- Rust linting (`cargo clippy`)

### AC3: Success Criteria

**Given** all checks pass
**When** viewing the workflow result
**Then** the workflow shows green/success status

### AC4: Failure Criteria

**Given** any check fails
**When** viewing the workflow result
**Then** the workflow shows red/failure status
**And** the specific failing step is identifiable
**And** error details are visible in logs

### AC5: Workflow Configuration

**Given** the workflow file
**When** examining `.github/workflows/ci.yml`
**Then** the workflow is clearly structured
**And** caching is used for faster runs (node_modules, cargo)

---

## Tasks

### Task 1: Create GitHub Workflows Directory Structure

**Subtasks:**
- [ ] 1.1 Create `.github/` directory in project root
- [ ] 1.2 Create `.github/workflows/` subdirectory
- [ ] 1.3 Verify directory structure matches architecture spec

### Task 2: Implement CI Workflow File

**Subtasks:**
- [ ] 2.1 Create `.github/workflows/ci.yml` file
- [ ] 2.2 Configure workflow name and triggers (push, pull_request)
- [ ] 2.3 Define job with appropriate runner (ubuntu-latest)
- [ ] 2.4 Add checkout step
- [ ] 2.5 Add Node.js setup step with caching
- [ ] 2.6 Add Rust toolchain setup step with caching
- [ ] 2.7 Add npm ci step for dependency installation
- [ ] 2.8 Add TypeScript type-check step
- [ ] 2.9 Add ESLint step
- [ ] 2.10 Add cargo fmt --check step
- [ ] 2.11 Add cargo clippy step

### Task 3: Configure Dependency Caching

**Subtasks:**
- [ ] 3.1 Configure Node.js cache for node_modules (npm cache)
- [ ] 3.2 Configure Rust cache for ~/.cargo and target directory
- [ ] 3.3 Use appropriate cache keys with lockfile hashes
- [ ] 3.4 Verify cache hit/miss behavior

### Task 4: Validate Workflow

**Subtasks:**
- [ ] 4.1 Push workflow file to repository
- [ ] 4.2 Verify workflow runs on push
- [ ] 4.3 Verify all steps complete successfully
- [ ] 4.4 Test failure case (intentional lint error)
- [ ] 4.5 Verify error reporting in logs

### Task 5: Document CI Configuration

**Subtasks:**
- [ ] 5.1 Add inline comments to workflow file
- [ ] 5.2 Document any required secrets or environment variables
- [ ] 5.3 Update project README with CI badge (optional)

---

## Dev Notes

### Complete CI Workflow Example

Create the file `.github/workflows/ci.yml` with the following content:

```yaml
name: CI

on:
  push:
    branches:
      - main
      - 'feat/**'
      - 'fix/**'
      - 'chore/**'
  pull_request:
    branches:
      - main

env:
  CARGO_TERM_COLOR: always
  RUST_BACKTRACE: 1

jobs:
  ci:
    name: Lint, Type-check, and Validate
    runs-on: ubuntu-latest

    steps:
      # Checkout repository
      - name: Checkout repository
        uses: actions/checkout@v4

      # Setup Node.js with npm cache
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Setup Rust toolchain
      - name: Setup Rust toolchain
        uses: dtolnay/rust-action@stable
        with:
          components: rustfmt, clippy

      # Cache Cargo registry and build artifacts
      - name: Cache Cargo
        uses: actions/cache@v4
        with:
          path: |
            ~/.cargo/bin/
            ~/.cargo/registry/index/
            ~/.cargo/registry/cache/
            ~/.cargo/git/db/
            src-tauri/target/
          key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}
          restore-keys: |
            ${{ runner.os }}-cargo-

      # Install system dependencies for Tauri (Linux)
      - name: Install system dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

      # Install Node.js dependencies
      - name: Install dependencies
        run: npm ci

      # TypeScript type checking
      - name: TypeScript type-check
        run: npm run typecheck

      # ESLint
      - name: Lint (ESLint)
        run: npm run lint

      # Rust formatting check
      - name: Rust format check
        working-directory: src-tauri
        run: cargo fmt --all -- --check

      # Rust linting with Clippy
      - name: Rust lint (Clippy)
        working-directory: src-tauri
        run: cargo clippy --all-targets --all-features -- -D warnings
```

### Required package.json Scripts

Ensure the following scripts are defined in `package.json`:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix"
  }
}
```

### Caching Strategy

#### Node.js Caching

The `actions/setup-node@v4` action with `cache: 'npm'` automatically:
- Caches the global npm cache directory
- Uses `package-lock.json` hash as cache key
- Restores cache on subsequent runs

#### Cargo Caching

The Cargo cache configuration caches:
- `~/.cargo/bin/` - Installed binaries
- `~/.cargo/registry/index/` - Crate index
- `~/.cargo/registry/cache/` - Downloaded crates
- `~/.cargo/git/db/` - Git dependencies
- `src-tauri/target/` - Build artifacts

Cache key strategy:
- Primary key: `${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}`
- Restore key: `${{ runner.os }}-cargo-` (partial match fallback)

### System Dependencies

Tauri requires specific system libraries on Linux. The CI installs:
- `libwebkit2gtk-4.1-dev` - WebKit rendering engine (Tauri 2.0)
- `libappindicator3-dev` - System tray support
- `librsvg2-dev` - SVG rendering
- `patchelf` - ELF binary patching

### Rust Toolchain Components

The workflow installs these Rust components:
- `rustfmt` - Code formatting
- `clippy` - Linting

### ESLint Configuration

Ensure `.eslintrc.cjs` or `eslint.config.js` is configured for the project:

```javascript
// eslint.config.js (ESLint 9 flat config)
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react': react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
```

### TypeScript Configuration

Ensure `tsconfig.json` has strict mode enabled:

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | What to Do Instead |
|--------------|--------------|---------------------|
| Using `npm install` in CI | Modifies lock file, non-deterministic | Use `npm ci` for clean, reproducible installs |
| Skipping cache configuration | Slow CI runs (2-5 minutes wasted) | Always configure npm and Cargo caching |
| Running Clippy without `-D warnings` | Allows lint warnings to pass | Use `-D warnings` to fail on warnings |
| Not caching Cargo target directory | Extremely slow Rust compilation | Include `src-tauri/target/` in cache |
| Using `cargo check` instead of `cargo clippy` | Misses lint issues | Clippy includes check + additional lints |
| Running steps sequentially when parallel is possible | Slower overall CI time | Use job matrix or parallel steps where applicable |
| Not pinning action versions | Breaking changes may affect CI | Pin to major versions (e.g., `@v4`) |
| Installing Tauri CLI globally | Slower, version mismatch risk | Use `npx tauri` or local install |
| Skipping system dependency installation | Build fails on Linux | Always install webkit2gtk and dependencies |
| Using outdated Rust action | Missing features, potential bugs | Use `dtolnay/rust-action@stable` |

---

## Testing Checklist

### Pre-merge Validation

- [ ] Workflow file passes YAML lint validation
- [ ] Workflow triggers on push to main branch
- [ ] Workflow triggers on push to feature branches (`feat/**`)
- [ ] Workflow triggers on pull requests to main

### CI Step Validation

- [ ] `npm ci` completes without errors
- [ ] TypeScript type-check passes (`npm run typecheck`)
- [ ] ESLint passes with no errors (`npm run lint`)
- [ ] Rust format check passes (`cargo fmt --check`)
- [ ] Clippy passes with no warnings (`cargo clippy -- -D warnings`)

### Cache Validation

- [ ] First run populates cache (cache miss)
- [ ] Second run uses cache (cache hit)
- [ ] Verify cache restore reduces build time

### Failure Handling

- [ ] Introduce TypeScript error - verify workflow fails
- [ ] Introduce ESLint error - verify workflow fails
- [ ] Introduce Rust format issue - verify workflow fails
- [ ] Introduce Clippy warning - verify workflow fails
- [ ] Verify error messages are visible in GitHub Actions logs

### Branch Protection (Optional)

- [ ] Configure branch protection rules on main
- [ ] Require CI to pass before merge
- [ ] Test PR merge is blocked when CI fails

---

## Source References

### Architecture Documents

| Document | Section | Relevance |
|----------|---------|-----------|
| `_bmad-output/planning-artifacts/epics.md` | Epic 9, Story 9.1 | Story definition and acceptance criteria |
| `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` | `.github/workflows/` | Workflow file locations |
| `_bmad-output/project-context.md` | CI/CD Pipeline | Workflow rules and expectations |

### Requirement Traceability

| Requirement | Description | How This Story Addresses It |
|-------------|-------------|----------------------------|
| ARCH-10 | Set up GitHub Actions CI workflow (lint, type-check, test) | Implements complete CI workflow with all required checks |

### External References

| Resource | URL | Purpose |
|----------|-----|---------|
| GitHub Actions Documentation | https://docs.github.com/en/actions | Workflow syntax and features |
| actions/setup-node | https://github.com/actions/setup-node | Node.js setup with caching |
| actions/cache | https://github.com/actions/cache | Dependency caching |
| dtolnay/rust-action | https://github.com/dtolnay/rust-action | Rust toolchain setup |
| Tauri CI Guide | https://tauri.app/v2/guides/building/linux | Linux build dependencies |

---

## Definition of Done

- [ ] `.github/workflows/ci.yml` file created and committed
- [ ] Workflow runs successfully on push to any branch
- [ ] All CI steps pass: npm ci, typecheck, lint, cargo fmt, cargo clippy
- [ ] Caching is configured and working for both npm and Cargo
- [ ] Workflow failure clearly indicates which step failed
- [ ] Workflow file includes inline documentation comments
- [ ] PR can be merged when CI passes
