import { useRef, useState, useEffect, useCallback, ReactNode } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import { Media } from '../../types';
import { MediaCard } from './MediaCard';
import { SectionHeading } from '../ui/SectionHeading';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface MediaCarouselProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: ReactNode;
  action?: { label: string; onClick: () => void };
  items: Media[];
  onItemClick?: (media: Media) => void;
  onPlay?: (media: Media) => void;
  onAddToList?: (media: Media) => void;
  onLike?: (media: Media) => void;
  variant?: 'default' | 'wide' | 'compact' | 'banner';
  /** map of media.id -> 0..100 watch progress */
  progress?: Record<string, number>;
  /** map of media.id -> reason string */
  reasons?: Record<string, string>;
  className?: string;
}

export function MediaCarousel({
  title,
  subtitle,
  eyebrow,
  icon,
  action,
  items,
  onItemClick,
  onPlay,
  onAddToList,
  onLike,
  variant = 'default',
  progress,
  reasons,
  className,
}: MediaCarouselProps) {
  const ref = useRef<HTMLDivElement>(null);
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

   // ------- Scroll state handling -------
   const checkScroll = useCallback(() => {
     const el = ref.current;
     if (!el) return;
     const { scrollLeft, scrollWidth, clientWidth } = el;
     setCanScrollLeft(scrollLeft > 8);
     setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);
   }, []);

   useEffect(() => {
     const el = ref.current;
     if (!el) return;
     checkScroll();
     const ro = new ResizeObserver(checkScroll);
     ro.observe(el);
     el.addEventListener('scroll', checkScroll, { passive: true });
     return () => {
       ro.disconnect();
       el.removeEventListener('scroll', checkScroll);
     };
   }, [items, checkScroll]);

  const scroll = (dir: 'left' | 'right') => {
    const el = ref.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(':scope > * > *:first-child');
    const fallback = variant === 'wide' || variant === 'banner' ? 320 : variant === 'compact' ? 145 : 190;
    const amount = (card ? card.offsetWidth : fallback) + 16;
    el.scrollBy({ left: dir === 'left' ? -amount * 2 : amount * 2, behavior: 'smooth' });
  };

  // ------- Card entry animation (once) -------
  const controls = useAnimation();
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { once: true, margin: '-50px' });
  useEffect(() => {
    if (inView) {
      controls.start('visible');
    }
  }, [inView, controls]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  if (!items?.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`relative group/section ml-[calc(50%-48vw)] mr-[calc(50%-48vw)] py-6 ${className ?? ''}`}
    >
      <div className="px-5 sm:px-8 lg:px-12 mb-4 flex items-end justify-between gap-4">
        <SectionHeading title={title} subtitle={subtitle} eyebrow={eyebrow} icon={icon} className="mb-0 px-0 sm:px-0 lg:px-0" />
        <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity duration-300">
          <button
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-all hover:border-white/30 hover:bg-white/10 ${canScrollLeft ? '' : 'opacity-40 pointer-events-none'}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-all hover:border-white/30 hover:bg-white/10 ${canScrollRight ? '' : 'opacity-40 pointer-events-none'}`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative group/row">
        {/* Edge fades */}
        <div className={`absolute left-0 top-0 bottom-0 w-14 z-20 pointer-events-none transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-dark-950 via-dark-950/85 to-transparent" />
        </div>
        <div className={`absolute right-0 top-0 bottom-0 w-14 z-20 pointer-events-none transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-gradient-to-l from-dark-950 via-dark-950/85 to-transparent" />
        </div>

        <div
          ref={ref}
           className="overflow-x-auto scrollbar-hide scroll-smooth"
        >
          {/* Card container with staggered animation */}
          <motion.div
            ref={containerRef as any}
            className="flex gap-4 px-6 sm:px-10 lg:px-14 pb-3"
            variants={{ visible: { transition: { staggerChildren: 0.06 } }, hidden: {} }}
            initial="hidden"
            animate={controls}
          >
            {items.map((media: Media, i: number) => (
              <motion.div key={media.id} variants={cardVariants} className="relative flex-shrink-0">
                <MediaCard
                  media={media}
                  index={i}
                  variant={variant}
                  progress={progress?.[media.id]}
                  reason={reasons?.[media.id]}
                  onClick={() => onItemClick?.(media)}
                  onPlay={() => onPlay?.(media)}
                  onAddToList={() => onAddToList?.(media)}
                  onLike={() => onLike?.(media)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {action && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={action.onClick}
            className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-6 py-2.5 text-sm font-semibold text-dark-200 transition-all hover:border-white/30 hover:bg-white/[0.1] hover:text-white"
          >
            {action.label}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </button>
        </div>
      )}
    </motion.section>
  );
}
