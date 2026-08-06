import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface SettingCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  index?: number;
}

export function SettingCard({ icon: Icon, title, description, children, index = 0 }: SettingCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm"
    >
      <header className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/15 text-primary-400">
          <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          {description && <p className="text-xs text-dark-400">{description}</p>}
        </div>
      </header>
      <div className="divide-y divide-white/[0.04]">{children}</div>
    </motion.section>
  );
}
