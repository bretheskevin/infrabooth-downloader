# Player Widescreen Transition Bug

## Root Cause
`PlayerContainer` returns `null` when `isWidescreen` is true (line 54 of PlayerContainer.tsx).
This unmounts the component, which triggers the `usePlayerEvents` cleanup effect, calling
`_destroyAudioEngine()` → `audioEngine.destroy()` — which destroys the HLS slot and resets state to 'idle'.

When `PlayerRail` (in AppLayout's widescreen branch) tries to render, the audio engine is already destroyed.

## Key Issue
`usePlayerEvents` (audio engine init/destroy lifecycle + MediaSession) and `useKeyboardShortcuts`
are ONLY called inside `PlayerContainer`. When it returns null, React still runs
the cleanup of those hooks, destroying the audio engine.

## Fix Pattern
Hooks that manage the audio engine lifecycle (`usePlayerEvents`, `useKeyboardShortcuts`) must be
lifted to a component that never unmounts during layout transitions — either a dedicated
`<PlayerHooksProvider>` that always renders, or moved into `App.tsx` / a persistent wrapper.
The visual rendering (ExpandedBar/MiniPill vs PlayerRail) stays conditional on layout mode.
