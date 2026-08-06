import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
  icon?: ReactNode;
  count?: number;
  eyebrow?: string;
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  action,
  icon,
  count,
  eyebrow,
  className,
}: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={twMerge('flex items-end justify-between gap-4 mb-5 px-5 sm:px-8 lg:px-12', className)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <motion.span
          initial={{ scaleY: 0, opacity: 0 }}
          whileInView={{ scaleY: 1, opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ originY: 0 }}
          className="h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary-400 to-primary-600"
          aria-hidden="true"
        />
        {icon && (
          <span className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600/15 text-primary-400 border border-primary-500/20">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-500 mb-0.5">
              {eyebrow}
            </p>
          )}
          <h2 className="text-lg font-bold uppercase tracking-widest text-white whitespace-nowrap overflow-hidden text-ellipsis">
            {title}
            {count !== undefined && count > 0 && (
              <span className="ml-2 align-middle text-sm font-semibold text-dark-400">{count}</span>
            )}
          </h2>
        </div>
        {subtitle && <span className="hidden lg:block text-sm text-dark-400 truncate">{subtitle}</span>}
      </div>
      {action && (
        <motion.button
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.96 }}
          onClick={action.onClick}
          className="group flex items-center gap-1.5 text-sm font-semibold text-dark-300 hover:text-white whitespace-nowrap shrink-0 transition-colors"
        >
          {action.label}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </motion.button>
      )}
    </motion.div>
  );
}
