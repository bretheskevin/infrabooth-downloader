import { useEffect, useRef } from 'react';
import { subscribeSpectrum } from '@/lib/spectrumBus';
import { createLoopState, renderVisualizerFrame, type VisualizerFrameOptions } from '../utils/renderFrame';

export default function VisualizerCanvas(props: VisualizerFrameOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef(props);

  useEffect(() => {
    optionsRef.current = props;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const loop = createLoopState();
    let raf = 0;
    const tick = (now: number) => {
      renderVisualizerFrame(canvas, ctx, loop, optionsRef.current, now);
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const handleVisibility = () => (document.hidden ? stop() : start());
    const unsubscribe = subscribeSpectrum((bands) => {
      loop.target = bands;
      loop.lastFrameAt = performance.now();
    });

    document.addEventListener('visibilitychange', handleVisibility);
    if (!document.hidden) start();

    return () => {
      stop();
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}
