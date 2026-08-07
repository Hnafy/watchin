import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

export function AuthShell({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070b12] px-4 py-12">
      {/* Cinematic background — matches the site-wide dark gradient aesthetic */}
      <div className="pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-40 -left-24 h-[460px] w-[460px] rounded-full bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.18),transparent_60%)] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[460px] w-[460px] rounded-full bg-[radial-gradient(ellipse_at_bottom_right,rgba(229,9,20,0.16),transparent_60%)] blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(15,23,42,0.6)_0%,transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-[0_8px_30px_rgba(124,58,237,0.25)]">
            <Play className="h-5 w-5 fill-white text-white" />
          </div>
          <span className="font-display text-2xl font-black tracking-tight text-white">Watchin</span>
        </div>

        <div className="relative w-full rounded-3xl border border-white/10 bg-dark-900/60 p-8 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:p-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          {children}
        </div>

        <div className="mt-6 text-center">{footer}</div>
      </motion.div>
    </div>
  );
}
