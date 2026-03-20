import { useState, useEffect, useCallback, useRef } from 'react';

interface Subscriber {
  id: string;
  dismiss: () => void;
}

const subscribers = new Set<Subscriber>();

export function useMenuExclusivity(onDismiss: () => void) {
  const [menuId] = useState(() => crypto.randomUUID());
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const entry: Subscriber = { id: menuId, dismiss: () => onDismissRef.current() };
    subscribers.add(entry);
    return () => {
      subscribers.delete(entry);
    };
  }, [menuId]);

  const claim = useCallback(() => {
    subscribers.forEach((sub) => {
      if (sub.id !== menuId) sub.dismiss();
    });
  }, [menuId]);

  return claim;
}
