# SoundCloud API v2 — Stream / Feed Endpoints

> **Source**: Reverse-engineered from [soundcloud-fetch](https://github.com/patrickkfkan/soundcloud-fetch) (TypeScript), [soundcloud.py](https://github.com/7x11x13/soundcloud.py) (Python), and community gists. This is an undocumented internal API — it may change without notice.

## Base Configuration

```
Base URL:    https://api-v2.soundcloud.com
Auth header: Authorization: OAuth <access_token>
```

### Required Headers

| Header          | Value                                                              |
| --------------- | ------------------------------------------------------------------ |
| `Authorization` | `OAuth <access_token>`                                             |
| `Origin`        | `https://soundcloud.com`                                           |
| `Referer`       | `https://soundcloud.com/`                                          |
| `User-Agent`    | Any standard browser UA string                                     |

---

## Endpoint: `GET /stream`

Returns the authenticated user's feed — new uploads and reposts from followed artists.

### Query Parameters

| Parameter             | Type    | Required | Default                                  | Description                                       |
| --------------------- | ------- | -------- | ---------------------------------------- | ------------------------------------------------- |
| `client_id`           | string  | Yes      | —                                        | 32-char alphanumeric app identifier                |
| `app_version`         | string  | Yes      | —                                        | SoundCloud web app version (e.g. `1770022942`)     |
| `linked_partitioning` | integer | Yes      | —                                        | Must be `1` to get paginated `next_href` response  |
| `limit`               | integer | No       | ~20                                      | Items per page (max 50)                            |
| `activityTypes`       | string  | No       | `TrackPost,TrackRepost,PlaylistPost`      | Comma-separated activity type filter (see below)   |
| `promoted_playlist`   | string  | No       | `true`                                   | Include promoted playlists                         |
| `app_locale`          | string  | No       | `en`                                     | Locale code (`en`, `fr`, `de`, etc.)               |

### `activityTypes` Filter Values

| Value          | Matches                               |
| -------------- | ------------------------------------- |
| `TrackPost`    | New tracks uploaded by followed users |
| `TrackRepost`  | Tracks reposted by followed users     |
| `PlaylistPost` | New playlists/albums + their reposts  |

> **Note**: There is no separate `PlaylistRepost` filter. Playlist/album reposts appear to be included under `PlaylistPost` or returned regardless of filter.

### Example Request

```http
GET /stream?client_id=abc123&app_version=1770022942&linked_partitioning=1&limit=20&activityTypes=TrackPost,TrackRepost,PlaylistPost&promoted_playlist=true HTTP/1.1
Host: api-v2.soundcloud.com
Authorization: OAuth eyJ...
Origin: https://soundcloud.com
Referer: https://soundcloud.com/
```

---

## Response Format

All responses use a paginated collection envelope:

```json
{
  "collection": [ /* stream items */ ],
  "next_href": "https://api-v2.soundcloud.com/stream?offset=MTcxMjM0NTY3OA&limit=20",
  "future_href": "https://api-v2.soundcloud.com/stream?..."
}
```

### Pagination

- **Cursor-based** via `next_href`. Never construct offset URLs manually.
- `next_href` is `null` when there are no more results.
- `next_href` **omits `client_id`** — you must append it yourself.
- `future_href` points to items newer than the current page (for polling).

---

## Stream Item Types

Each item in `collection` has a `type` field that determines its structure.

| `type` value        | Semantic meaning    | Nested data key | How to identify           |
| ------------------- | ------------------- | --------------- | ------------------------- |
| `"track"`           | New track           | `track`         | Has `track`, no `reposted` |
| `"track-repost"`    | Reposted track      | `track`         | Has `track` + `reposted`  |
| `"playlist"`        | New playlist/album  | `playlist`      | Has `playlist`, no `reposted` |
| `"playlist-repost"` | Reposted playlist/album | `playlist`  | Has `playlist` + `reposted` |

### Distinguishing Albums from Playlists

When `type` is `"playlist"` or `"playlist-repost"`, check the nested playlist object:

| Field                | Value        | Meaning      |
| -------------------- | ------------ | ------------ |
| `playlist.is_album`  | `true`       | **Album** (or EP/single/compilation) |
| `playlist.is_album`  | `false`      | Regular **playlist** |
| `playlist.set_type`  | `"album"`    | Full album   |
| `playlist.set_type`  | `"ep"`       | EP           |
| `playlist.set_type`  | `"single"`   | Single       |
| `playlist.set_type`  | `"compilation"` | Compilation |
| `playlist.set_type`  | `null`       | Regular playlist |

---

## Full Response Examples

### 1. New Track (`type: "track"`)

```json
{
  "type": "track",
  "created_at": "2024-06-15T14:30:00.000Z",
  "uuid": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "caption": null,
  "user": {
    "id": 12345,
    "kind": "user",
    "username": "ArtistName",
    "permalink": "artistname",
    "permalink_url": "https://soundcloud.com/artistname",
    "avatar_url": "https://i1.sndcdn.com/avatars-000123456789-abcdef-t500x500.jpg",
    "verified": true,
    "city": "Berlin",
    "country_code": "DE",
    "followers_count": 50000,
    "followings_count": 200,
    "track_count": 45,
    "playlist_count": 8
  },
  "track": {
    "id": 1234567890,
    "kind": "track",
    "urn": "soundcloud:tracks:1234567890",
    "title": "New Song Title",
    "description": "My latest release",
    "genre": "Electronic",
    "tag_list": "electronic ambient \"deep house\"",
    "label_name": "Label Records",
    "license": "all-rights-reserved",
    "caption": null,

    "created_at": "2024-06-15T14:30:00.000Z",
    "last_modified": "2024-06-15T14:35:00.000Z",
    "display_date": "2024-06-15T14:30:00.000Z",
    "release_date": "2024-06-15",

    "permalink": "new-song-title",
    "permalink_url": "https://soundcloud.com/artistname/new-song-title",
    "uri": "https://api.soundcloud.com/tracks/1234567890",
    "artwork_url": "https://i1.sndcdn.com/artworks-000987654321-abcdef-t500x500.jpg",
    "waveform_url": "https://wave.sndcdn.com/abcdef123456.json",

    "duration": 225118,
    "full_duration": 225118,
    "playback_count": 15000,
    "likes_count": 500,
    "reposts_count": 100,
    "comment_count": 25,
    "download_count": 0,

    "public": true,
    "streamable": true,
    "downloadable": false,
    "has_downloads_left": false,
    "commentable": true,

    "state": "finished",
    "access": "playable",
    "policy": "ALLOW",
    "monetization_model": "NOT_APPLICABLE",
    "sharing": "public",
    "embeddable_by": "all",
    "secret_token": null,

    "purchase_title": null,
    "purchase_url": null,

    "user_id": 12345,
    "station_urn": "soundcloud:system-playlists:track-stations:1234567890",
    "track_format": "single-track",
    "track_authorization": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW8iOiJGUiIsInN1YiI6IiIsInJpZCI6ImFiY2RlZiIsImlhdCI6MTcxODQ1NjIwMH0.xxxxx",

    "user": {
      "id": 12345,
      "kind": "user",
      "username": "ArtistName",
      "permalink": "artistname",
      "permalink_url": "https://soundcloud.com/artistname",
      "avatar_url": "https://i1.sndcdn.com/avatars-000123456789-abcdef-t500x500.jpg",
      "verified": true
    },

    "media": {
      "transcodings": [
        {
          "url": "https://api-v2.soundcloud.com/media/soundcloud:tracks:1234567890/abcdef-1234/stream/hls",
          "preset": "mp3_1_0",
          "duration": 225118,
          "snipped": false,
          "format": {
            "protocol": "hls",
            "mime_type": "audio/mpeg"
          },
          "quality": "sq"
        },
        {
          "url": "https://api-v2.soundcloud.com/media/soundcloud:tracks:1234567890/abcdef-5678/stream/progressive",
          "preset": "mp3_1_0",
          "duration": 225118,
          "snipped": false,
          "format": {
            "protocol": "progressive",
            "mime_type": "audio/mpeg"
          },
          "quality": "sq"
        },
        {
          "url": "https://api-v2.soundcloud.com/media/soundcloud:tracks:1234567890/abcdef-9012/stream/hls",
          "preset": "opus_0_0",
          "duration": 225118,
          "snipped": false,
          "format": {
            "protocol": "hls",
            "mime_type": "audio/ogg; codecs=\"opus\""
          },
          "quality": "sq"
        }
      ]
    },

    "publisher_metadata": {
      "id": 1234567890,
      "urn": "soundcloud:tracks:1234567890",
      "artist": "Artist Name",
      "album_title": "Album Title",
      "contains_music": true,
      "upc_or_ean": "0123456789012",
      "isrc": "USXX12345678",
      "explicit": false,
      "p_line": "2024 Label Records",
      "p_line_for_display": "℗ 2024 Label Records",
      "c_line": "2024 Label Records",
      "c_line_for_display": "© 2024 Label Records",
      "writer_composer": "John Doe",
      "release_title": "New Song Title",
      "publisher": "Publishing Co"
    },

    "visuals": {
      "urn": "soundcloud:tracks:1234567890:visuals",
      "enabled": true,
      "visuals": [
        {
          "urn": "soundcloud:visuals:abc123",
          "entry_time": 0,
          "visual_url": "https://i1.sndcdn.com/visuals-000987654321-abcdef-original.jpg"
        }
      ]
    }
  }
}
```

### 2. Track Repost (`type: "track-repost"`)

Same structure as new track, but with `type: "track-repost"` and an additional `reposted` object. The `user` at the top level is the **reposter**, not the track author.

```json
{
  "type": "track-repost",
  "created_at": "2024-06-16T09:00:00.000Z",
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "caption": null,
  "user": {
    "id": 99999,
    "kind": "user",
    "username": "ReposterUser",
    "permalink": "reposteruser",
    "permalink_url": "https://soundcloud.com/reposteruser",
    "avatar_url": "https://i1.sndcdn.com/avatars-000999999-xyz-t500x500.jpg",
    "verified": false
  },
  "reposted": {
    "target_urn": "soundcloud:tracks:1234567890",
    "user_urn": "soundcloud:users:99999",
    "caption": null
  },
  "track": {
    "id": 1234567890,
    "kind": "track",
    "title": "New Song Title",
    "user": {
      "id": 12345,
      "username": "OriginalArtist"
    }
  }
}
```

> The `track` object is the same full track structure as in example 1 (truncated here for brevity).

### 3. New Playlist (`type: "playlist"`, `is_album: false`)

```json
{
  "type": "playlist",
  "created_at": "2024-06-17T12:00:00.000Z",
  "uuid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "caption": null,
  "user": {
    "id": 12345,
    "kind": "user",
    "username": "ArtistName",
    "permalink": "artistname",
    "permalink_url": "https://soundcloud.com/artistname",
    "avatar_url": "https://i1.sndcdn.com/avatars-000123456789-abcdef-t500x500.jpg",
    "verified": true
  },
  "playlist": {
    "id": 286853773,
    "kind": "playlist",
    "urn": "soundcloud:playlists:286853773",
    "is_album": false,
    "set_type": null,

    "title": "Summer Vibes Mix",
    "description": "A curated selection of summer tracks",
    "genre": "Electronic",
    "tag_list": "summer vibes mix",
    "label_name": null,
    "license": "all-rights-reserved",

    "created_at": "2024-06-17T12:00:00.000Z",
    "last_modified": "2024-06-17T12:05:00.000Z",
    "published_at": "2024-06-17T12:00:00.000Z",
    "display_date": "2024-06-17T12:00:00.000Z",
    "release_date": null,

    "permalink": "summer-vibes-mix",
    "permalink_url": "https://soundcloud.com/artistname/sets/summer-vibes-mix",
    "uri": "https://api.soundcloud.com/playlists/286853773",
    "artwork_url": "https://i1.sndcdn.com/artworks-000111222333-aabbcc-t500x500.jpg",

    "duration": 3600000,
    "track_count": 12,
    "likes_count": 200,
    "reposts_count": 50,

    "public": true,
    "sharing": "public",
    "embeddable_by": "all",
    "secret_token": null,
    "managed_by_feeds": false,

    "user_id": 12345,
    "user": {
      "id": 12345,
      "kind": "user",
      "username": "ArtistName",
      "permalink": "artistname",
      "permalink_url": "https://soundcloud.com/artistname",
      "avatar_url": "https://i1.sndcdn.com/avatars-000123456789-abcdef-t500x500.jpg",
      "verified": true
    },

    "tracks": [
      {
        "id": 1111111111,
        "kind": "track",
        "title": "Track 1",
        "duration": 300000,
        "artwork_url": "https://i1.sndcdn.com/artworks-aaa-t500x500.jpg",
        "user": { "id": 12345, "username": "ArtistName" },
        "media": { "transcodings": [ /* ... */ ] },
        "track_authorization": "eyJ..."
      },
      {
        "id": 2222222222,
        "kind": "track",
        "title": "Track 2",
        "duration": 240000
      }
    ]
  }
}
```

> **Note on `tracks` array**: The playlist may return full track objects or "mini" track objects (just `id`, `kind`, and a few fields). When tracks are mini objects, you need to fetch the full track via `GET /tracks/{id}` or batch via `GET /tracks?ids=1,2,3`.

### 4. New Album (`type: "playlist"`, `is_album: true`)

```json
{
  "type": "playlist",
  "created_at": "2024-06-18T08:00:00.000Z",
  "uuid": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "caption": null,
  "user": {
    "id": 12345,
    "kind": "user",
    "username": "ArtistName",
    "permalink": "artistname",
    "permalink_url": "https://soundcloud.com/artistname",
    "avatar_url": "https://i1.sndcdn.com/avatars-000123456789-abcdef-t500x500.jpg",
    "verified": true
  },
  "playlist": {
    "id": 398765432,
    "kind": "playlist",
    "urn": "soundcloud:playlists:398765432",
    "is_album": true,
    "set_type": "album",

    "title": "Midnight Sessions",
    "description": "My debut album",
    "genre": "Ambient",
    "tag_list": "ambient album \"midnight sessions\"",
    "label_name": "Label Records",
    "license": "all-rights-reserved",

    "created_at": "2024-06-18T08:00:00.000Z",
    "last_modified": "2024-06-18T08:10:00.000Z",
    "published_at": "2024-06-18T08:00:00.000Z",
    "display_date": "2024-06-18T08:00:00.000Z",
    "release_date": "2024-06-18",

    "permalink": "midnight-sessions",
    "permalink_url": "https://soundcloud.com/artistname/sets/midnight-sessions",
    "uri": "https://api.soundcloud.com/playlists/398765432",
    "artwork_url": "https://i1.sndcdn.com/artworks-000444555666-ddeeff-t500x500.jpg",

    "duration": 2700000,
    "track_count": 8,
    "likes_count": 1500,
    "reposts_count": 300,

    "public": true,
    "sharing": "public",
    "embeddable_by": "all",
    "secret_token": null,
    "managed_by_feeds": false,

    "user_id": 12345,
    "user": {
      "id": 12345,
      "kind": "user",
      "username": "ArtistName",
      "permalink": "artistname",
      "permalink_url": "https://soundcloud.com/artistname",
      "avatar_url": "https://i1.sndcdn.com/avatars-000123456789-abcdef-t500x500.jpg",
      "verified": true
    },

    "tracks": [
      {
        "id": 3333333333,
        "kind": "track",
        "title": "01 - Opening",
        "duration": 180000,
        "artwork_url": "https://i1.sndcdn.com/artworks-000444555666-ddeeff-t500x500.jpg",
        "user": { "id": 12345, "username": "ArtistName" },
        "media": { "transcodings": [ /* ... */ ] },
        "track_authorization": "eyJ...",
        "publisher_metadata": {
          "artist": "ArtistName",
          "album_title": "Midnight Sessions",
          "isrc": "USXX12400001"
        }
      }
    ]
  }
}
```

### 5. Playlist Repost (`type: "playlist-repost"`, `is_album: false`)

```json
{
  "type": "playlist-repost",
  "created_at": "2024-06-19T16:00:00.000Z",
  "uuid": "d4e5f6a7-b8c9-0123-def0-234567890123",
  "caption": null,
  "user": {
    "id": 88888,
    "kind": "user",
    "username": "CuratorDJ",
    "permalink": "curatordj",
    "permalink_url": "https://soundcloud.com/curatordj",
    "avatar_url": "https://i1.sndcdn.com/avatars-000888888-uvw-t500x500.jpg",
    "verified": false
  },
  "reposted": {
    "target_urn": "soundcloud:playlists:286853773",
    "user_urn": "soundcloud:users:88888",
    "caption": null
  },
  "playlist": {
    "id": 286853773,
    "kind": "playlist",
    "is_album": false,
    "set_type": null,
    "title": "Summer Vibes Mix",
    "track_count": 12,
    "user": {
      "id": 12345,
      "username": "OriginalCreator"
    }
  }
}
```

### 6. Album Repost (`type: "playlist-repost"`, `is_album: true`)

```json
{
  "type": "playlist-repost",
  "created_at": "2024-06-20T10:00:00.000Z",
  "uuid": "e5f6a7b8-c9d0-1234-ef01-345678901234",
  "caption": null,
  "user": {
    "id": 77777,
    "kind": "user",
    "username": "MusicBlogger",
    "permalink": "musicblogger",
    "permalink_url": "https://soundcloud.com/musicblogger",
    "avatar_url": "https://i1.sndcdn.com/avatars-000777777-rst-t500x500.jpg",
    "verified": true
  },
  "reposted": {
    "target_urn": "soundcloud:playlists:398765432",
    "user_urn": "soundcloud:users:77777",
    "caption": null
  },
  "playlist": {
    "id": 398765432,
    "kind": "playlist",
    "is_album": true,
    "set_type": "album",
    "title": "Midnight Sessions",
    "track_count": 8,
    "user": {
      "id": 12345,
      "username": "OriginalArtist"
    }
  }
}
```

---

## Type Detection Logic

Based on how community libraries parse stream items:

```
for each item in collection:
    match item.type:
        "track"           → New Track
        "track-repost"    → Track Repost     (has `reposted` object)
        "playlist"        → check item.playlist.is_album:
                              true  → New Album
                              false → New Playlist
        "playlist-repost" → check item.playlist.is_album:
                              true  → Album Repost  (has `reposted` object)
                              false → Playlist Repost (has `reposted` object)
```

Alternatively (structural detection, as used by soundcloud.py):

| Has `track` key | Has `playlist` key | Has `reposted` key | `is_album` | Result           |
| --------------- | ------------------ | ------------------- | ---------- | ---------------- |
| Yes             | No                 | No                  | —          | New Track        |
| Yes             | No                 | Yes                 | —          | Track Repost     |
| No              | Yes                | No                  | `false`    | New Playlist     |
| No              | Yes                | No                  | `true`     | New Album        |
| No              | Yes                | Yes                 | `false`    | Playlist Repost  |
| No              | Yes                | Yes                 | `true`     | Album Repost     |

---

## Other Related Endpoints

| Endpoint                            | Method | Auth | Description                              |
| ----------------------------------- | ------ | ---- | ---------------------------------------- |
| `/stream/users/{user_id}`           | GET    | Yes  | Specific user's uploads + reposts        |
| `/stream/users/{user_id}/reposts`   | GET    | Yes  | Specific user's reposts only             |
| `/stream/notifications`             | GET    | Yes  | Stream notifications                     |
| `/me/activities/tracks`             | GET    | Yes  | Auth'd user's track activity             |
| `/me/play-history/tracks`           | GET    | Yes  | Recently played tracks                   |
| `/users/{id}/tracks`                | GET    | No   | All tracks by a user (public)            |
| `/users/{id}/albums`                | GET    | No   | All albums by a user (public)            |
| `/users/{id}/playlists/liked_and_owned` | GET | No  | User's liked + owned playlists (public) |

All collection endpoints accept the same `client_id`, `limit`, `linked_partitioning=1` parameters and return the same `{ collection, next_href }` envelope.

---

## `set_type` Reference

| `set_type` value | `is_album` | Meaning     |
| ---------------- | ---------- | ----------- |
| `null`           | `false`    | Playlist    |
| `"album"`        | `true`     | Album       |
| `"ep"`           | `true`     | EP          |
| `"single"`       | `true`     | Single      |
| `"compilation"`  | `true`     | Compilation |

---

## Track `access` / `policy` Reference

| `access` value | `policy` value | Meaning                                    |
| -------------- | -------------- | ------------------------------------------ |
| `"playable"`   | `"ALLOW"`      | Full track, freely streamable              |
| `"preview"`    | `"MONETIZE"`   | Snippet only (Go+ content, `snipped: true`)|
| `"blocked"`    | `"BLOCK"`      | Metadata visible, not playable             |
