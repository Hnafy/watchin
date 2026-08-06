import { ReactNode } from 'react';

interface SettingsRowProps {
  title: string;
  description?: string;
  control: ReactNode;
}

export function SettingsRow({ title, description, control }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-dark-400">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center">{control}</div>
    </div>
  );
}
