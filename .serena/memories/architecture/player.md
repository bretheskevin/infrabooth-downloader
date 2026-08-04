# Audio Player Architecture

## Audio Engine (`src/features/player/audio-engine.ts`)
- Dual-slot design: activeSlot + standbySlot for gapless crossfade
- HLS.js integration for SoundCloud HLS streams
- State machine: idle → loading → playing → paused → ended
- Crossfade: volume ramps via requestAnimationFrame, configurable duration
- HLS config: optimized buffer settings, retry policies

### API (audioEngine object)
load, play, pause, stop, seek, setVolume, getPosition, getState, isFullyBuffered
preloadNext, startCrossfade, settleCrossfade, cancelCrossfade, isCrossfading
setCallbacks (onStateChange, onProgress, onEnded, onError, onFullyBuffered, onCrossfadeComplete)

## Player Store (Zustand, sliced)
- `playbackSlice` — current track, playing state, progress, duration. `resume()` refreshes an expired stream URL (via `resolveWithCache`) and reloads at the current position; skips the refresh when the URL is still cached or `audioEngine.isFullyBuffered()`
- `queueSlice` — play queue management. Queue entries are `QueueItem` (= `PlaybackItem` + stable `uid`, from `store/queueItem.ts` `withUid`/`withUids`); `uid` is the React key and dnd-kit drag identity, so duplicate tracks in the queue reorder/remove correctly
- `shuffleSlice` — shuffle mode
- `autoplaySlice` — autoplay/continuous play
- `uiSlice` — expanded bar, mini pill visibility

## Components
- PlayerContainer — main player wrapper
- ExpandedBar — full player controls (visible when track loaded)
- MiniPill — minimized player indicator
- Waveform — waveform visualization
- SeekBar — track seek control
- TransportControls — play/pause/skip
- VolumeControl — volume slider
- QueuePanel + QueuePanelItem — play queue display
- ScrollingText — marquee for long track titles; shared at `@/components/ScrollingText` (moved out of the player feature, also reused by the remote mobile app)
- EqualizerBars — animated equalizer visualization
- PlayOverlay — play button overlay on track artwork

## Hooks
- usePlayerEvents — binds audio engine callbacks to store
- useKeyboardShortcuts — keyboard controls (space, arrows, etc.)
- usePlayContext — provides play context for track lists; `playTrack(index)` always rebuilds the queue from the tracklist via `buildPlaybackQueue` (no longer skips to an existing queue entry)
- useWaveform — waveform data fetching
- useIsExpandedBarVisible, useIsMiniPillVisible — visibility logic

## Playback URL Resolution
- `resolvePlaybackUrl` command in Rust → resolves HLS/progressive stream URL
- URL cache (`url-cache.ts`) — caches resolved URLs on frontend
- Autoplay logic (`utils/autoplay.ts`, `utils/buildPlaybackQueue.ts`)
