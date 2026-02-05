# Starter Template Evaluation

## Primary Technology Domain

Desktop Application (Tauri) based on project requirements for a cross-platform SoundCloud downloader.

## Starter Options Considered

| Option | Pros | Cons |
|--------|------|------|
| Official `create-tauri-app` | Official support, latest versions, clean base | Requires manual Tailwind/Shadcn setup |
| Community Tauri+Shadcn templates | Pre-configured stack | May lag Tauri 2.0 updates, unknown maintenance |

## Selected Approach: Official Tauri CLI + Manual Stack Configuration

**Rationale:**
- Official tooling ensures Tauri 2.0 compatibility
- Shadcn/ui is designed to be added to projects, not bundled
- Full control over dependency versions
- No inherited technical debt from community templates

**Initialization Commands:**

```bash
# Create Tauri project (interactive prompts)
npm create tauri-app@latest

# Prompts:
# - Project name: infrabooth-downloader
# - Bundle identifier: com.infrabooth.downloader
# - Frontend language: TypeScript
# - Package manager: npm (or pnpm/yarn/bun)
# - UI template: React
# - Flavor: TypeScript

cd infrabooth-downloader

# Add Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Initialize Shadcn/ui
npx shadcn@latest init
```

**Tauri Configuration (`src-tauri/tauri.conf.json`):**

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

## Architectural Decisions Provided by Starter

**Language & Runtime:**
- TypeScript with strict mode
- Rust for Tauri backend
- Node.js for build tooling

**Styling Solution:**
- Tailwind CSS (utility-first)
- Shadcn/ui components (copy-paste, customizable)
- CSS variables for theming

**Build Tooling:**
- Vite for frontend bundling
- Cargo for Rust compilation
- Tauri CLI for packaging

**Code Organization:**
- `/src` — React frontend code
- `/src-tauri` — Rust backend code
- `/src/components` — UI components (Shadcn)
- `/src/lib` — Utilities and helpers

**Development Experience:**
- Vite HMR for instant frontend updates
- Tauri dev mode with Rust hot-reload
- TypeScript type checking

**Note:** Project initialization should be the first implementation story.
