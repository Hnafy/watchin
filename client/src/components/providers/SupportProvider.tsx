import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from 'react';
import { SupportModal } from '../ui/SupportModal';

interface OpenSupportOptions {
  subject?: string;
  message?: string;
  context?: string;
}

interface SupportContextType {
  openSupport: (options?: OpenSupportOptions) => void;
}

const SupportContext = createContext<SupportContextType>({
  openSupport: () => {},
});

export const useSupport = () => useContext(SupportContext);

export function SupportProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    subject?: string;
    message?: string;
    context?: string;
  }>({ open: false });

  const openSupport = useCallback((options: OpenSupportOptions = {}) => {
    const context = options.context
      ? `${options.context} — ${typeof window !== 'undefined' ? window.location.href : ''}`
      : undefined;
    setState({ open: true, subject: options.subject, message: options.message, context });
  }, []);

  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  const value = useMemo(() => ({ openSupport }), [openSupport]);

  return (
    <SupportContext.Provider value={value}>
      {children}
      <SupportModal
        open={state.open}
        onClose={close}
        defaultSubject={state.subject}
        defaultMessage={state.message}
        context={state.context}
      />
    </SupportContext.Provider>
  );
}
