import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string;
  height?: string;
}

export function Skeleton({ className, variant = 'rectangular', width, height }: SkeletonProps) {
  const base = 'skeleton';

  const variants: Record<string, string> = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
    card: 'rounded-xl aspect-[2/3]',
  };

  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className={twMerge(base, variants[variant], className)}
      style={{ width, height }}
    />
  );
}

export function MediaCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[180px] sm:w-[200px] space-y-2">
      <Skeleton variant="card" className="aspect-[2/3]" />
      <Skeleton variant="text" className="w-3/4" />
      <Skeleton variant="text" className="w-1/2 h-3" />
    </div>
  );
}

export function CarouselSkeleton() {
  return (
    <div className="py-6">
      <Skeleton variant="text" className="w-48 h-6 mb-4" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative min-h-[75vh] flex items-end overflow-hidden">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24 space-y-4">
        <Skeleton variant="text" className="w-20 h-6" />
        <Skeleton variant="text" className="w-96 h-12" />
        <Skeleton variant="text" className="w-[500px] h-16" />
        <div className="flex gap-4">
          <Skeleton className="w-32 h-12 rounded-lg" />
          <Skeleton className="w-32 h-12 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
