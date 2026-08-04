import { forwardRef, HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants: Record<string, string> = {
      default: 'bg-dark-800 text-dark-300 border border-dark-700',
      primary: 'bg-primary-900/30 text-primary-300 border border-primary-700/30',
      success: 'bg-green-900/30 text-green-300 border border-green-700/30',
      warning: 'bg-red-900/30 text-red-300 border border-red-700/30',
      danger: 'bg-red-900/30 text-red-300 border border-red-700/30',
      outline: 'border border-dark-600 bg-transparent text-dark-300',
    };
    return <span ref={ref} className={twMerge('badge', variants[variant], className)} {...props}>{children}</span>;
  }
);
Badge.displayName = 'Badge';
