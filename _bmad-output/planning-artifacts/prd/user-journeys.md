# User Journeys

## Journey 1: Marcus - The Frustrated Subscriber (Happy Path)

**Who:** Marcus, 28, pays €9.99/month for SoundCloud Go+. He's got 12 playlists he's curated over years - underground electronic, obscure remixes, stuff that's not on Spotify.

**Opening Scene:** Marcus is packing for a camping trip. No cell service for 3 days. He opens SoundCloud mobile, realizes offline mode is clunky, limited, and tied to the app. He can't just drop the files into his old MP3 player or his car's USB. He's been paying for Go+ for 2 years. Where's *his* music?

**Rising Action:**
1. Googles "download soundcloud playlist" → sketchy web tools that max out at 128kbps and can't handle Go+ tracks
2. Finds InfraBooth Downloader → downloads, installs
3. Clicks "Sign in with SoundCloud" → browser popup, authorizes
4. Pastes his 47-track playlist URL → picks his Music folder → hits Download

**Climax:** Progress bar fills. Check marks appear next to each track. 47/47 complete. He opens the folder - every file has artwork embedded, proper artist/title tags.

**Resolution:** Marcus drags the folder to his MP3 player. His music. His way. No app required.

## Journey 2: Marcus - The Interrupted Download (Edge Case)

**Opening Scene:** Marcus pastes his 47-track playlist. Download starts. Around track 19, things slow down. SoundCloud is throttling.

**Rising Action:**
1. Progress bar shows "Track 19 of 47" but speed drops
2. App shows subtle "Rate limited - waiting..." status (Fibonacci backoff kicks in)
3. Two tracks fail completely - geo-blocked in his region
4. Warning icon appears next to those tracks: "Unavailable in your region"

**Climax:** Download completes. 45/47 successful. 2 show warning icons with clear "Geo-blocked" labels - not mystery failures.

**Resolution:** Marcus knows exactly what happened. No guessing. He got what was available, and understands why 2 tracks didn't make it. He's not frustrated at the app - he's frustrated at the restriction, which is the right target.

## Journey 3: Sarah - OAuth Trust Moment (First-Time User)

**Who:** Sarah, 34, found InfraBooth Downloader via Reddit. She's skeptical of "download tools."

**Opening Scene:** Sarah downloads the app. Sees clean UI. Wonders "is this going to steal my password?"

**Rising Action:**
1. Clicks "Sign in with SoundCloud"
2. Browser opens - she sees it's *actual SoundCloud's* login page, not some fake form
3. SoundCloud asks "Allow InfraBooth Downloader to access your account?"
4. She clicks Authorize - browser closes, app shows "Signed in as sarah_music"

**Climax:** Realizes she never typed her password into the app itself. OAuth did its job.

**Resolution:** Trust established. She pastes her first playlist URL.

## Journey 4: Invalid URL Error

**Who:** Marcus again, this time pastes his profile URL instead of a playlist

**Scene:** Pastes `soundcloud.com/marcus-beats` (profile, not playlist/track)

**Response:** App shows clear error: "This URL doesn't point to a track or playlist. Please paste a track or playlist URL."

**Resolution:** Marcus copies the right URL. No confusion.

## Journey Requirements Summary

| Journey | Reveals Requirements For |
|---------|-------------------------|
| Marcus - Success | Core download flow, progress UI, metadata embedding, track URL support |
| Marcus - Interrupted | Rate limit handling (Fibonacci backoff), geo-block messaging, partial success states, warning icons |
| Sarah - OAuth | Browser popup flow, trust signals, signed-in state display |
| Invalid URL | URL validation, clear error messaging for non-track/playlist URLs |
