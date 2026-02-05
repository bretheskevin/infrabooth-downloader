# Story 1.2: Configure Tailwind CSS & Shadcn/ui

Status: review

## Story

As a **developer**,
I want **Tailwind CSS and Shadcn/ui configured in the project**,
so that **I can build UI components with a consistent, professional design system**.

## Acceptance Criteria

1. **Given** the initialized Tauri project from Story 1.1
   **When** Tailwind CSS is installed and configured
   **Then** Tailwind utility classes work in React components
   **And** `tailwind.config.js` includes proper content paths for `/src/**/*.{ts,tsx}`
   **And** `postcss.config.js` is properly configured

2. **Given** Tailwind is configured
   **When** Shadcn/ui is initialized
   **Then** `components.json` is created with project settings
   **And** the `/src/components/ui/` directory is created
   **And** base Shadcn components can be added via `npx shadcn@latest add [component]`

3. **Given** Shadcn/ui is initialized
   **When** examining the configuration
   **Then** the style is set to "default" (or "new-york")
   **And** TypeScript is enabled
   **And** the components alias points to `@/components`

4. **Given** the styling system is configured
   **When** running `npm run tauri dev`
   **Then** the app compiles without CSS-related errors
   **And** Tailwind classes render correctly in the browser

## Tasks / Subtasks

- [x] Task 1: Install and configure Tailwind CSS (AC: #1)
  - [x] 1.1 Install dependencies: `npm install -D tailwindcss postcss autoprefixer`
  - [x] 1.2 Initialize Tailwind: `npx tailwindcss init -p`
  - [x] 1.3 Configure `tailwind.config.js` content paths:
    ```js
    content: ["./index.html", "./src/**/*.{ts,tsx}"]
    ```
  - [x] 1.4 Add Tailwind directives to `src/index.css`:
    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    ```
  - [x] 1.5 Verify Tailwind classes work in `App.tsx`

- [x] Task 2: Initialize Shadcn/ui (AC: #2, #3)
  - [x] 2.1 Run `npx shadcn@latest init`
  - [x] 2.2 Answer prompts:
    - Style: Default (or New York)
    - Base color: Slate
    - CSS variables: Yes
    - TypeScript: Yes
    - Components path: `@/components`
    - Utils path: `@/lib/utils`
  - [x] 2.3 Verify `components.json` created
  - [x] 2.4 Verify `src/components/ui/` directory created
  - [x] 2.5 Verify `src/lib/utils.ts` created with `cn()` helper

- [x] Task 3: Configure path aliases (AC: #3)
  - [x] 3.1 Update `tsconfig.json` with path aliases:
    ```json
    {
      "compilerOptions": {
        "baseUrl": ".",
        "paths": {
          "@/*": ["./src/*"]
        }
      }
    }
    ```
  - [x] 3.2 Update `vite.config.ts` with resolve alias:
    ```ts
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    }
    ```

- [x] Task 4: Verify configuration (AC: #4)
  - [x] 4.1 Add a test Shadcn component: `npx shadcn@latest add button`
  - [x] 4.2 Import and render Button in `App.tsx`
  - [x] 4.3 Run `npm run tauri dev`
  - [x] 4.4 Verify Button renders with correct styling
  - [x] 4.5 Remove test usage from `App.tsx` (keep component file)

## Dev Notes

### Design System Foundation

**From UX Specification:**
- Shadcn/ui chosen for clean, minimal, professional aesthetic
- Components are copy-paste (not dependency) — you own the code
- Tailwind enables rapid iteration with utility classes
[Source: ux-design-specification.md#Design System Choice]

### Color System to Configure

Configure these CSS variables in `src/index.css` (Shadcn will set defaults, customize later):

| Role | Hex | Purpose |
|------|-----|---------|
| Primary | #6366F1 | Brand anchor, CTA buttons |
| Success | #10B981 | Checkmarks, completion |
| Warning | #F59E0B | Rate limits, geo-blocks |
| Error | #F43F5E | Failures |
| Info | #0EA5E9 | Quality badges, hints |

[Source: ux-design-specification.md#Color System]

### Required Shadcn Components (for reference)

These will be added in later stories, but the foundation must support them:

| Component | Usage |
|-----------|-------|
| Button | Download, Sign in, Open Folder |
| Input | URL paste field |
| Card | Track list, playlist preview |
| Badge | Status labels |
| Progress | Download progress |
| Alert | Error states, warnings |

[Source: ux-design-specification.md#Component Strategy]

### Path Alias Configuration

The `@/` alias is required for Shadcn/ui imports to work:
```typescript
// This pattern must work after configuration:
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
```
[Source: architecture/project-structure-boundaries.md]

### File Structure After This Story

```
src/
├── components/
│   └── ui/           # Shadcn components go here
│       └── button.tsx  # Test component (Task 4)
├── lib/
│   └── utils.ts      # cn() helper from Shadcn
├── index.css         # Tailwind directives + CSS variables
└── ...
```
[Source: architecture/project-structure-boundaries.md]

### Critical Configuration Files

**tailwind.config.js:**
```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**postcss.config.js:**
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Shadcn MCP Server

**CRITICAL:** When adding components or checking available components, use the Shadcn MCP server tools:
- `mcp__shadcn__search_items_in_registries` — Search for components
- `mcp__shadcn__view_items_in_registries` — View component details
- `mcp__shadcn__get_add_command_for_items` — Get install commands

[Source: project-context.md#Shadcn/ui Requirement]

### Dependencies This Story Adds

```json
{
  "devDependencies": {
    "tailwindcss": "^3.x",
    "postcss": "^8.x",
    "autoprefixer": "^10.x"
  },
  "dependencies": {
    "class-variance-authority": "^0.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x"
  }
}
```

### Anti-Patterns to Avoid

- Do NOT use inline styles — use Tailwind utilities
- Do NOT customize Shadcn components in place — extend them
- Do NOT skip the path alias configuration — Shadcn imports require it
- Do NOT use default exports for components — use named exports

[Source: project-context.md#Anti-Patterns to Avoid]

### Testing the Result

After completing all tasks:
1. `npm run tauri dev` compiles without errors
2. Tailwind classes like `bg-blue-500` render correctly
3. Shadcn Button component renders with proper styling
4. Import `@/components/ui/button` works without errors

### References

- [Source: architecture/starter-template-evaluation.md#Styling Solution]
- [Source: ux-design-specification.md#Design System Choice]
- [Source: ux-design-specification.md#Color System]
- [Source: project-context.md#Shadcn/ui Requirement]
- [Source: architecture/project-structure-boundaries.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Tailwind v4 initially installed, downgraded to v3 to match story requirements (v3 patterns with tailwind.config.js)

### Completion Notes List

- **Task 1:** Installed Tailwind CSS v3.4.25, PostCSS v8.5.3, Autoprefixer v10.4.21. Created tailwind.config.js with darkMode and content paths. Created src/index.css with Tailwind directives. Shadcn init later extended these files with CSS variables and theme extensions.
- **Task 2:** Initialized Shadcn/ui with new-york style, neutral base color, CSS variables enabled, TypeScript enabled. Created components.json, src/lib/utils.ts with cn() helper. Installed clsx, tailwind-merge, class-variance-authority, tailwindcss-animate.
- **Task 3:** Added path aliases to tsconfig.json (baseUrl: ".", paths: {"@/*": ["./src/*"]}). Updated vite.config.ts with resolve.alias for @ path.
- **Task 4:** Added Button component via `npx shadcn@latest add button`. Verified import from @/components/ui/button works. Temporarily added Button to App.tsx to verify styling, then removed per story requirements.

### Tests Created

- `src/tailwind-config.test.ts` - Configuration verification tests (15 tests)
  - Task 1: Tailwind CSS dependencies, config files, CSS directives
  - Task 2: Shadcn components.json, ui directory, utils.ts, dependencies
  - Task 3: Path aliases in tsconfig.json and vite.config.ts
  - Task 4: Button component installation
- **Total: 25 tests (15 new + 10 existing), all passing**

### File List

**New Files:**
- `tailwind.config.js` - Tailwind CSS configuration with Shadcn theme extensions
- `postcss.config.js` - PostCSS configuration with tailwindcss and autoprefixer
- `components.json` - Shadcn/ui configuration
- `src/index.css` - Tailwind directives and CSS variables
- `src/lib/utils.ts` - cn() helper function for class merging
- `src/components/ui/button.tsx` - Shadcn Button component
- `src/tailwind-config.test.ts` - Configuration verification tests

**Modified Files:**
- `package.json` - Added tailwindcss, postcss, autoprefixer, clsx, tailwind-merge, class-variance-authority, tailwindcss-animate, lucide-react, @radix-ui/react-slot
- `package-lock.json` - Updated dependency lock
- `tsconfig.json` - Added baseUrl and paths for @ alias
- `vite.config.ts` - Added resolve.alias for @ path
- `src/main.tsx` - Added import for index.css
- `src/App.tsx` - Added Tailwind utility classes (p-4, text-2xl, font-bold, mb-4)

### Change Log

- 2026-02-05: Configured Tailwind CSS v3 with Shadcn/ui, path aliases, and Button component

