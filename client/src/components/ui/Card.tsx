import { forwardRef, HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'hover' }>(
  ({ className, variant = 'default', children, ...props }, ref) => (
    <div ref={ref} className={twMerge(variant === 'hover' ? 'card hover:shadow-lg transition-shadow' : 'card', className)} {...props}>{children}</div>
  )
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={twMerge('px-6 py-4 border-b border-dark-700', className)} {...props} />
);
CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={twMerge('px-6 py-4', className)} {...props} />
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={twMerge('px-6 py-4 border-t border-dark-700', className)} {...props} />
);
CardFooter.displayName = 'CardFooter';
