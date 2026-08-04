import { forwardRef, ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'glass' | 'outline' | 'ghost' | 'white' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  shine?: boolean;
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'btn-primary',
  glass: 'btn-glass',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  white: 'btn-white',
  danger: 'btn bg-red-600 text-white hover:bg-red-500 hover:-translate-y-0.5 active:scale-[0.98] shadow-[0_8px_24px_rgba(220,38,38,0.3)]',
};

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-4 py-2 text-xs rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-[15px] rounded-xl',
  icon: 'h-11 w-11 p-0 rounded-full',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, shine, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={twMerge(
        variants[variant],
        sizes[size],
        shine && variant === 'primary' && 'btn-shine',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
