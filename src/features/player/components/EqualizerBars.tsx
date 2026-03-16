import { cn } from '@/lib/utils';

interface EqualizerBarsProps {
  className?: string;
}

export function EqualizerBars({ className }: EqualizerBarsProps) {
  return (
    <div className={cn('flex items-center justify-center gap-[2px]', className)} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-primary origin-bottom"
          style={{
            height: '10px',
            animation: `equalizer-bar 0.8s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
