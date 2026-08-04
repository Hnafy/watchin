import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  ring?: boolean;
  className?: string;
}

const sizes: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-3xl',
};

export function Avatar({ src, name, size = 'md', ring = false, className }: AvatarProps) {
  const initial = name?.trim()?.[0]?.toUpperCase() || '?';

  return (
    <motion.div
      whileHover={ring ? { scale: 1.05 } : undefined}
      className={twMerge('relative shrink-0', className)}
    >
      {ring && (
        <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary-500 via-primary-700 to-dark-800 opacity-70 blur-[6px]" />
      )}
      {src ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          className={twMerge(
            'relative rounded-full object-cover border border-white/10',
            sizes[size],
            ring && 'border-2 border-dark-950'
          )}
        />
      ) : (
        <span
          className={twMerge(
            'relative inline-flex items-center justify-center rounded-full bg-gradient-to-br from-primary-600 via-primary-700 to-dark-800 text-white font-bold border border-white/10',
            sizes[size],
            ring && 'border-2 border-dark-950'
          )}
        >
          {initial}
        </span>
      )}
    </motion.div>
  );
}
