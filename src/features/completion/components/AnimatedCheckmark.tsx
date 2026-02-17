import { cn } from '@/lib/utils';

interface AnimatedCheckmarkProps {
  className?: string;
  size?: number;
}

export function AnimatedCheckmark({
  className,
  size = 48,
}: AnimatedCheckmarkProps) {
  return (
    <svg
      className={cn('text-success', className)}
      width={size}
      height={size}
      viewBox="0 0 52 52"
      aria-hidden="true"
    >
      <circle
        className="motion-safe:animate-[checkmark-circle_0.4s_ease-out_forwards]"
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        style={{
          strokeDasharray: 166,
          strokeDashoffset: 166,
        }}
      />
      <path
        className="motion-safe:animate-[checkmark-check_0.3s_ease-out_0.4s_forwards]"
        d="M14.1 27.2l7.1 7.2 16.7-16.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 48,
          strokeDashoffset: 48,
        }}
      />
    </svg>
  );
}
