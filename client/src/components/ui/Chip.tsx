import { HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

type ChipTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'gold';

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
}

const tones: Record<ChipTone, string> = {
  default: 'border-white/10 bg-white/[0.04] text-dark-300',
  primary: 'border-primary-500/25 bg-primary-600/15 text-primary-400',
  success: 'border-green-500/25 bg-green-500/10 text-green-400',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
  danger: 'border-red-500/25 bg-red-500/10 text-red-400',
  gold: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300',
};

export function Chip({ className, tone = 'default', children, ...props }: ChipProps) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-all duration-300',
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
