import { createContext, useContext, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  theme: 'dark';
  resolvedTheme: 'dark';
  setTheme: (theme: 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'dark', resolvedTheme: 'dark', setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}
