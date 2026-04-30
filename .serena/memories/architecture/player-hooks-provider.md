## PlayerHooksProvider pattern

`PlayerHooksProvider` is a renderless component (returns null) mounted in `App.tsx` at the top level, outside `AppLayout`. It calls `usePlayerEvents()` and `useKeyboardShortcuts()` — hooks that must never unmount during the app lifecycle.

This was extracted from `PlayerContainer` because that component returns `null` when `isWidescreen` is true, causing React to unmount it. The unmount triggered `usePlayerEvents`'s cleanup which called `_destroyAudioEngine()`, killing playback when crossing the 1200px widescreen breakpoint.

Key invariant: `PlayerHooksProvider` must NEVER be conditionally rendered or placed inside any component that conditionally unmounts.
