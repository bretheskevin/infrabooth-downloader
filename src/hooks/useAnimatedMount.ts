import { useEffect, useRef, useState } from 'react';

export function useAnimatedMount(isOpen: boolean, animationMs: number) {
  const wasOpen = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true;
      setMounted(true);
      setClosing(false);
    } else if (wasOpen.current) {
      wasOpen.current = false;
      setClosing(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, animationMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, animationMs]);

  return { mounted, closing };
}
