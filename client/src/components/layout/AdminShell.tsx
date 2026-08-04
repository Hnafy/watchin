import { ArrowLeft, Loader2 } from 'lucide-react';

interface AdminShellProps {
  title: string;
  children: React.ReactNode;
  breadcrumbs?: { label: string; onClick?: () => void }[];
  actions?: React.ReactNode;
  loading?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  backTo?: string;
  onBack?: () => void;
}

const maxWidths = {
  sm: 'max-w-3xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  full: 'max-w-7xl',
};

export function AdminShell({
  title, children, breadcrumbs, actions, loading,
  maxWidth = 'full', backTo, onBack,
}: AdminShellProps) {
  return (
    <div className="min-h-screen bg-dark-950">
      <div className={`mx-auto ${maxWidths[maxWidth]} px-4 sm:px-6 lg:px-8 py-6 md:py-8`}>
        {/* Header row */}
        <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button onClick={onBack} className="p-2 rounded-lg hover:bg-dark-800 transition-colors shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0">
              {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-2 text-sm text-dark-400 mb-1">
                  {breadcrumbs.map((cr, i) => (
                    <span key={i} className="flex items-center gap-2">
                      {i > 0 && <span className="text-dark-600 select-none">/</span>}
                      {cr.onClick ? (
                        <button onClick={cr.onClick} className="hover:text-white transition-colors truncate max-w-[200px]">
                          {cr.label}
                        </button>
                      ) : (
                        <span className="text-white font-semibold truncate max-w-[240px]">{cr.label}</span>
                      )}
                    </span>
                  ))}
                </nav>
              )}
              <h1 className="text-2xl md:text-3xl font-bold truncate">{title}</h1>
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-3 shrink-0">
              {actions}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-dark-400" />
          </div>
        ) : children}
      </div>
    </div>
  );
}
