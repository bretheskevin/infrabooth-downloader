import { useState, useEffect, type ReactNode } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { commands } from '@/bindings';
import { useArtistProfileStore } from '@/features/artist-profile/store';

const LINKIFY_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(https?:\/\/soundcloud\.com\/([\w][\w-]*[\w]|[\w])(?=[^\w/-]|$))|(https?:\/\/on\.soundcloud\.com\/[a-zA-Z0-9]+)|(https?:\/\/[^\s<>"{}|\\^`[\]]+[^\s<>"{}|\\^`[\].,;:!?)'\]])|(@[\w][\w-]*[\w]|@[\w])/g;

function isHttpUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

function handleOpenExternal(url: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isHttpUrl(url)) void open(url);
  };
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} onClick={handleOpenExternal(href)} className="underline hover:text-foreground">
      {children}
    </a>
  );
}

const MAX_CACHE_SIZE = 200;
const CONCURRENCY_LIMIT = 3;
const resolveCache = new Map<string, Promise<{ id: number; name: string } | null>>();
let activeResolves = 0;
const resolveQueue: Array<() => void> = [];

export function clearResolveCache() {
  resolveCache.clear();
  activeResolves = 0;
  resolveQueue.length = 0;
}

function resolveUsername(username: string): Promise<{ id: number; name: string } | null> {
  const cached = resolveCache.get(username);
  if (cached) return cached;

  if (resolveCache.size >= MAX_CACHE_SIZE) {
    const firstKey = resolveCache.keys().next().value;
    if (firstKey) resolveCache.delete(firstKey);
  }

  const promise = new Promise<{ id: number; name: string } | null>((resolve) => {
    const drainQueue = () => {
      const next = resolveQueue.shift();
      if (next) next();
    };

    const run = () => {
      activeResolves++;
      commands
        .resolveUser(username)
        .then((result) => {
          if (result.status === 'ok') {
            resolve({ id: result.data.id, name: result.data.username });
          } else {
            resolveCache.delete(username);
            resolve(null);
          }
        })
        .catch(() => {
          resolveCache.delete(username);
          resolve(null);
        })
        .finally(() => {
          activeResolves--;
          drainQueue();
        });
    };

    if (activeResolves < CONCURRENCY_LIMIT) {
      run();
    } else {
      resolveQueue.push(run);
    }
  });

  resolveCache.set(username, promise);
  return promise;
}

function MentionLink({ username }: { username: string }) {
  const openProfile = useArtistProfileStore((s) => s.openProfile);
  const [resolved, setResolved] = useState<{ id: number; name: string } | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolveUsername(username).then((result) => {
      if (cancelled) return;
      setResolved(result);
      setChecked(true);
    });
    return () => { cancelled = true; };
  }, [username]);

  if (!checked) {
    return <span className="opacity-50">@{username}</span>;
  }

  if (!resolved) {
    return <span>@{username}</span>;
  }

  const handleNavigate = () => {
    openProfile(resolved.id, resolved.name);
  };

  return (
    <a
      role="link"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        handleNavigate();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          handleNavigate();
        }
      }}
      className="underline hover:text-foreground cursor-pointer"
    >
      @{username}
    </a>
  );
}

function ShortLink({ url }: { url: string }) {
  const openProfile = useArtistProfileStore((s) => s.openProfile);
  const [resolving, setResolving] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResolving(true);
    commands.resolveSoundcloudLink(url).then((result) => {
      if (result.status === 'ok' && result.data.kind === 'user' && result.data.user_id && result.data.username) {
        openProfile(result.data.user_id, result.data.username);
      } else if (isHttpUrl(url)) {
        void open(url);
      }
    }).catch(() => {
      if (isHttpUrl(url)) void open(url);
    }).finally(() => {
      setResolving(false);
    });
  };

  return (
    <a
      href={url}
      onClick={handleClick}
      className={`underline hover:text-foreground ${resolving ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {url}
    </a>
  );
}

export function linkifyText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(LINKIFY_REGEX)) {
    const index = match.index!;
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    const [full, email, , scUrlUsername, scShortUrl, genericUrl] = match;
    if (email) {
      parts.push(
        <a
          key={index}
          href={`mailto:${email}`}
          onClick={(e) => e.stopPropagation()}
          className="underline hover:text-foreground"
        >
          {email}
        </a>,
      );
    } else if (scShortUrl) {
      parts.push(<ShortLink key={index} url={scShortUrl} />);
    } else if (genericUrl) {
      parts.push(<ExternalLink key={index} href={genericUrl}>{genericUrl}</ExternalLink>);
    } else if (scUrlUsername && scUrlUsername.length >= 3) {
      parts.push(<MentionLink key={index} username={scUrlUsername} />);
    } else if (scUrlUsername) {
      const scUrl = `https://soundcloud.com/${scUrlUsername}`;
      parts.push(
        <ExternalLink key={index} href={scUrl}>soundcloud.com/{scUrlUsername}</ExternalLink>,
      );
    } else {
      const username = full.slice(1);
      if (username.length >= 3) {
        parts.push(<MentionLink key={index} username={username} />);
      } else {
        parts.push(<span key={index}>{full}</span>);
      }
    }

    lastIndex = index + full.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
