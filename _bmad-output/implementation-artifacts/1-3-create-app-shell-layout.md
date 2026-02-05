# Story 1.3: Create App Shell Layout

Status: ready-for-dev

## Story

As a **user**,
I want **to see a clean, professional app interface when I launch the application**,
so that **I feel confident using the tool**.

## Acceptance Criteria

1. **Given** the app is launched
   **When** the window opens
   **Then** the window has a default size of 600×700 pixels (UX-7)
   **And** the window has a minimum size of 400×500 pixels (UX-6)
   **And** the window cannot be resized smaller than the minimum

2. **Given** the app window is displayed
   **When** the user views the interface
   **Then** a header area is visible at the top
   **And** a main content area is visible below the header
   **And** the layout uses proper spacing rhythm (8px multiples per UX spec)
   **And** the UI displays without requiring an internet connection (FR27)

3. **Given** the app shell is rendered
   **When** inspecting the component structure
   **Then** the layout uses Shadcn/ui components where appropriate
   **And** Tailwind classes are used for styling
   **And** the layout is accessible with proper semantic HTML

4. **Given** the window is resized
   **When** the height changes
   **Then** the layout adapts appropriately
   **And** no horizontal scrollbar appears
   **And** the minimum size constraint is enforced

## Tasks / Subtasks

- [ ] Task 1: Configure Tauri window settings (AC: #1)
  - [ ] 1.1 Edit `src-tauri/tauri.conf.json` to set window properties:
    ```json
    {
      "app": {
        "windows": [
          {
            "title": "InfraBooth Downloader",
            "width": 600,
            "height": 700,
            "minWidth": 400,
            "minHeight": 500,
            "resizable": true,
            "center": true
          }
        ]
      }
    }
    ```
  - [ ] 1.2 Verify window launches at correct size
  - [ ] 1.3 Verify minimum size constraint works

- [ ] Task 2: Create AppLayout component (AC: #2, #3)
  - [ ] 2.1 Create `src/components/layout/AppLayout.tsx`:
    ```typescript
    export function AppLayout({ children }: { children: React.ReactNode }) {
      return (
        <div className="flex flex-col min-h-screen bg-background">
          <Header />
          <main className="flex-1 p-4">
            {children}
          </main>
        </div>
      );
    }
    ```
  - [ ] 2.2 Use semantic HTML elements (`<header>`, `<main>`)
  - [ ] 2.3 Apply 8px spacing rhythm using Tailwind (p-2 = 8px, p-4 = 16px)

- [ ] Task 3: Create Header component (AC: #2, #3)
  - [ ] 3.1 Create `src/components/layout/Header.tsx`:
    ```typescript
    export function Header() {
      return (
        <header className="flex items-center justify-between px-4 py-3 border-b">
          <h1 className="text-lg font-semibold">InfraBooth Downloader</h1>
          {/* UserBadge will go here in Epic 2 */}
        </header>
      );
    }
    ```
  - [ ] 3.2 Style header with border-bottom for visual separation
  - [ ] 3.3 Reserve space for future UserBadge component (right side)

- [ ] Task 4: Update App.tsx to use layout (AC: #2)
  - [ ] 4.1 Import and wrap content with AppLayout
  - [ ] 4.2 Add placeholder content for main area
  - [ ] 4.3 Ensure layout renders without network dependency (FR27)

- [ ] Task 5: Verify responsive behavior (AC: #4)
  - [ ] 5.1 Test window at minimum size (400×500)
  - [ ] 5.2 Test window at default size (600×700)
  - [ ] 5.3 Test window at larger sizes
  - [ ] 5.4 Verify no horizontal scrollbar at any size
  - [ ] 5.5 Verify content adapts to height changes

## Dev Notes

### Window Configuration (Tauri 2.0)

**CRITICAL:** Use Tauri 2.0 configuration format. The window config location differs from Tauri 1.x.

```json
// src-tauri/tauri.conf.json (Tauri 2.0 format)
{
  "app": {
    "windows": [
      {
        "title": "InfraBooth Downloader",
        "width": 600,
        "height": 700,
        "minWidth": 400,
        "minHeight": 500,
        "resizable": true,
        "center": true
      }
    ]
  }
}
```
[Source: ux-design-specification.md#Window Resize Strategy]

### Layout Structure from UX Spec

```
┌─────────────────────────────────────┐
│ Header Row                          │
│ Logo (left)      UserBadge (right)  │
├─────────────────────────────────────┤
│                                     │
│ Main Content Area                   │
│                                     │
│ - URL Input (future)                │
│ - Progress Section (future)         │
│                                     │
└─────────────────────────────────────┘
```
[Source: ux-design-specification.md#Layout Structure]

### Spacing System

**Base Unit:** 4px (Tailwind default)

| Tailwind Class | Pixels | Usage |
|----------------|--------|-------|
| p-1, m-1 | 4px | Tight spacing |
| p-2, m-2 | 8px | Standard rhythm |
| p-3, m-3 | 12px | Medium spacing |
| p-4, m-4 | 16px | Section padding |
| gap-2 | 8px | Flex/grid gaps |

**Rule:** Use 8px multiples for consistent visual rhythm.
[Source: ux-design-specification.md#Spacing & Layout Foundation]

### Typography from UX Spec

| Element | Tailwind Classes |
|---------|------------------|
| H1 (App title) | `text-lg font-semibold` (18px) |
| H2 | `text-base font-semibold` (16px) |
| Body | `text-sm` (14px) |
| Label | `text-xs font-medium` (12px) |

[Source: ux-design-specification.md#Typography System]

### Component File Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx    # Main layout wrapper
│   │   └── Header.tsx       # Header component
│   └── ui/                  # Shadcn components (from 1.2)
└── App.tsx                  # Uses AppLayout
```
[Source: architecture/project-structure-boundaries.md]

### Accessibility Requirements

- Use semantic HTML: `<header>`, `<main>`, `<nav>` (if needed)
- Ensure proper heading hierarchy (h1 for app title)
- WCAG AA contrast (4.5:1 minimum) — use Tailwind's default colors
- Visible focus rings on interactive elements
[Source: ux-design-specification.md#Accessibility]

### Background Color

Use Shadcn's CSS variable for background:
```tsx
<div className="bg-background">
```

This maps to `--background` CSS variable set by Shadcn init.
[Source: ux-design-specification.md#Neutral Palette]

### What This Story Does NOT Include

- UserBadge component (Epic 2: Authentication)
- URL Input field (Epic 3: URL Validation)
- Progress section (Epic 5: Progress)
- Settings button (Epic 8: Settings)

These are placeholders — create the structure, leave space for future components.

### Component Naming Convention

- Components: PascalCase (`AppLayout`, `Header`)
- Files: PascalCase.tsx (`AppLayout.tsx`, `Header.tsx`)
- Export: Named exports, not default
```typescript
// Correct
export function AppLayout() { }

// Incorrect
export default function AppLayout() { }
```
[Source: project-context.md#Component Naming]

### Testing the Result

After completing all tasks:
1. Window opens at 600×700 pixels
2. Window cannot be resized below 400×500
3. Header displays "InfraBooth Downloader"
4. Layout has proper visual hierarchy
5. No network requests on initial load
6. Layout adapts smoothly to window resize

### References

- [Source: ux-design-specification.md#Window Resize Strategy]
- [Source: ux-design-specification.md#Layout Structure]
- [Source: ux-design-specification.md#Spacing & Layout Foundation]
- [Source: ux-design-specification.md#Typography System]
- [Source: architecture/project-structure-boundaries.md]
- [Source: project-context.md#Component Naming]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

