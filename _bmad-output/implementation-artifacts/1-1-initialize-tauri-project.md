# Story 1.1: Initialize Tauri Project with React + TypeScript

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **a properly initialized Tauri 2.0 project with React and TypeScript**,
so that **I have a working foundation to build the application**.

## Acceptance Criteria

1. **Given** no existing project structure
   **When** the initialization commands are run
   **Then** a new Tauri project is created with:
   - React frontend with TypeScript
   - Vite as the build tool
   - Bundle identifier: `com.infrabooth.downloader`
   - Project compiles without errors

2. **Given** the project is initialized
   **When** running `npm run tauri dev`
   **Then** a window launches with the default React template

3. **Given** the project structure exists
   **When** examining the directory layout
   **Then** the structure matches the Architecture specification:
   - `/src` — React frontend code
   - `/src-tauri` — Rust backend code
   - `vite.config.ts` — Vite configuration
   - `tsconfig.json` — TypeScript configuration with strict mode

4. **Given** TypeScript is configured
   **When** examining `tsconfig.json`
   **Then** strict mode is enabled (`"strict": true`)

## Tasks / Subtasks

- [ ] Task 1: Initialize Tauri project (AC: #1)
  - [ ] 1.1 Run `npm create tauri-app@latest` with prompts:
    - Project name: `infrabooth-downloader`
    - Bundle identifier: `com.infrabooth.downloader`
    - Frontend language: TypeScript
    - Package manager: npm
    - UI template: React
    - Flavor: TypeScript
  - [ ] 1.2 Verify `package.json` created with correct dependencies
  - [ ] 1.3 Verify `src-tauri/tauri.conf.json` has correct bundle identifier
  - [ ] 1.4 Verify `src-tauri/Cargo.toml` references correct project name

- [ ] Task 2: Verify TypeScript strict mode (AC: #4)
  - [ ] 2.1 Confirm `tsconfig.json` has `"strict": true`
  - [ ] 2.2 If not, add strict mode configuration

- [ ] Task 3: Verify development server (AC: #2)
  - [ ] 3.1 Run `npm install` to install dependencies
  - [ ] 3.2 Run `npm run tauri dev`
  - [ ] 3.3 Verify window opens with React template
  - [ ] 3.4 Verify no TypeScript or Rust compilation errors

- [ ] Task 4: Validate project structure (AC: #3)
  - [ ] 4.1 Verify `/src/` directory exists with React files
  - [ ] 4.2 Verify `/src-tauri/` directory exists with Rust files
  - [ ] 4.3 Verify `vite.config.ts` exists
  - [ ] 4.4 Verify `tsconfig.json` exists

## Dev Notes

### Critical Architecture Constraints

**Tauri Version:** MUST use Tauri 2.0 — do NOT use Tauri 1.x patterns
- [Source: project-context.md#Technology Stack & Versions]

**TypeScript:** Strict mode is mandatory
- No `any` types allowed
- Use `interface` for object shapes, `type` for unions/intersections
- [Source: project-context.md#Language-Specific Rules]

**Bundle Identifier:** `com.infrabooth.downloader`
- [Source: architecture/starter-template-evaluation.md#Initialization Commands]

### Initialization Commands Reference

```bash
# Create Tauri project (interactive prompts)
npm create tauri-app@latest

# Prompts to answer:
# - Project name: infrabooth-downloader
# - Bundle identifier: com.infrabooth.downloader
# - Frontend language: TypeScript
# - Package manager: npm
# - UI template: React
# - Flavor: TypeScript

cd infrabooth-downloader
npm install
npm run tauri dev
```
[Source: architecture/starter-template-evaluation.md#Initialization Commands]

### Expected Tauri Configuration

`src-tauri/tauri.conf.json` should contain:
```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  }
}
```
[Source: architecture/starter-template-evaluation.md#Tauri Configuration]

### Window Size Requirements (for future reference)

Per UX specification, the app window should be configured with:
- **Default size:** 600×700 pixels (UX-7)
- **Minimum size:** 400×500 pixels (UX-6)

Note: Window sizing is NOT part of this story but will be implemented in Story 1.3 (App Shell Layout).
[Source: ux-design-specification.md#Window Resize Strategy]

### Project Structure Notes

**Target directory structure after initialization:**
```
infrabooth-downloader/
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── index.html
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
└── src-tauri/
    ├── Cargo.toml
    ├── Cargo.lock
    ├── tauri.conf.json
    ├── build.rs
    ├── icons/
    └── src/
        ├── lib.rs
        └── main.rs
```
[Source: architecture/project-structure-boundaries.md#Complete Project Directory Structure]

### What This Story Does NOT Include

This is a **foundational story**. The following are handled in subsequent stories:
- **Story 1.2:** Tailwind CSS + Shadcn/ui configuration
- **Story 1.3:** App shell layout with window sizing
- **Story 1.4:** Zustand store structure
- **Story 1.5:** react-i18next configuration

Do NOT add these dependencies or configurations in this story.

### Anti-Patterns to Avoid

- Do NOT use default exports — use named exports
  [Source: project-context.md#Anti-Patterns to Avoid]
- Do NOT use Tauri 1.x patterns — this is Tauri 2.0
  [Source: project-context.md#Anti-Patterns to Avoid]
- Do NOT add extra dependencies beyond what `create-tauri-app` provides
  [Source: This story scope]

### Testing the Result

After completing all tasks:
1. `npm run tauri dev` should launch without errors
2. A window should appear with the default React template
3. Hot module replacement (HMR) should work for frontend changes
4. Rust backend should compile without warnings

### References

- [Source: architecture/starter-template-evaluation.md] — Full initialization guide
- [Source: architecture/core-architectural-decisions.md] — Stack decisions
- [Source: architecture/project-structure-boundaries.md] — Directory structure
- [Source: project-context.md] — Critical implementation rules
- [Source: ux-design-specification.md#Window Resize Strategy] — Future window sizing

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

