import { useState, useEffect, type ReactNode } from 'react';
import { commands } from '@/bindings';
import { useArtistProfileStore } from '../store';

const LINKIFY_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(https?:\/\/soundcloud\.com\/([\w][\w-]*[\w]|[\w])(?=[^\w/-]|$))|(@[\w][\w-]*[\w]|@[\w])/g;

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

export function linkifyDescription(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(LINKIFY_REGEX)) {
    const index = match.index!;
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    const [full, email, , scUrlUsername] = match;
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
    } else if (scUrlUsername && scUrlUsername.length >= 3) {
      parts.push(<MentionLink key={index} username={scUrlUsername} />);
    } else if (scUrlUsername) {
      parts.push(
        <a
          key={index}
          href={`https://soundcloud.com/${scUrlUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="underline hover:text-foreground"
        >
          soundcloud.com/{scUrlUsername}
        </a>,
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
