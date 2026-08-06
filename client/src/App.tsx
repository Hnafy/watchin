import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { ThemeProvider } from './components/providers/ThemeProvider';
import { LanguageProvider } from './i18n/LanguageProvider';
import { Header } from './components/layout/Header';
import { ScrollToTop } from './components/ui/ScrollToTop';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { MediaDetail } from './pages/MediaDetail';
import { Watch } from './pages/Watch';
import { Login } from './pages/Auth/Login';
import { Register } from './pages/Auth/Register';
import { Search } from './pages/Search';
import { Watchlist } from './pages/Watchlist';
import { Profile } from './pages/Profile';
import { ProfileFriends } from './pages/ProfileFriends';
import { Settings } from './pages/Settings';
import { HistoryPage } from './pages/History';
import { NotificationsPage } from './pages/Notifications';
import { AdminDashboard } from './pages/Admin/Dashboard';
import { AdminMediaForm } from './pages/Admin/MediaForm';
import { AdminMediaManager } from './pages/Admin/MediaManager';
import { SeriesForm } from './pages/Admin/SeriesForm';
import TMDBSearch from './pages/Admin/TMDBSearch';
import { ProtectedRoute, AdminRoute } from './components/auth/ProtectedRoute';

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 300_000, retry: 1, refetchOnWindowFocus: false } },
});

const pageVariants = {
  initial: { opacity: 0, y: 16, scale: 0.995, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -12, scale: 1.002, filter: 'blur(6px)' },
};

const pageTransition = {
  type: 'tween' as const,
  ease: [0.22, 1, 0.36, 1] as const,
  duration: 0.45,
};

function AmbientBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(124,58,237,0.10),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_100%_100%,rgba(56,189,248,0.05),transparent_60%)]" />
      <div className="absolute -left-40 top-1/3 h-[480px] w-[480px] rounded-full bg-primary-600/5 blur-[120px] animate-pulse" style={{ animationDuration: '9s' }} />
      <div className="absolute -right-40 bottom-1/4 h-[420px] w-[420px] rounded-full bg-sky-500/5 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
      <div
        className="absolute inset-0 opacity-[0.35] mix-blend-overlay"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 0.5px, transparent 0.5px)',
          backgroundSize: '3px 3px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
        }}
      />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        className="relative z-10 flex-1"
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/movies" element={<Home />} />
          <Route path="/tv-shows" element={<Home />} />
          <Route path="/trending" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/media/:slug" element={<MediaDetail />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile/:username/friends" element={<ProtectedRoute><ProfileFriends /></ProtectedRoute>} />
          <Route path="/profile/:username/following" element={<ProtectedRoute><ProfileFriends /></ProtectedRoute>} />
          <Route path="/profile/:username/followers" element={<ProtectedRoute><ProfileFriends /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          <Route path="/admin/media" element={<AdminRoute><AdminMediaManager /></AdminRoute>} />
          <Route path="/admin/media/new" element={<AdminRoute><AdminMediaForm /></AdminRoute>} />
          <Route path="/admin/media/:id/edit" element={<AdminRoute><AdminMediaForm /></AdminRoute>} />
          <Route path="/admin/tmdb-import" element={<AdminRoute><TMDBSearch /></AdminRoute>} />
          <Route path="/admin/series/new" element={<AdminRoute><SeriesForm /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function MiniFooter() {
  return (
    <footer className="mt-20 border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2.5 px-6 py-8 sm:px-10 lg:px-14">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700">
          <Play className="h-3.5 w-3.5 fill-white text-white" />
        </span>
        <span className="font-display text-base font-black tracking-tight text-white">
          Watch<span className="text-primary-500">in</span>
        </span>
        <span className="text-dark-500">© {new Date().getFullYear()} Watchin. All rights reserved.</span>
      </div>
    </footer>
  );
}

function AppShell() {
  const location = useLocation();
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="relative min-h-screen flex flex-col bg-dark-950 text-dark-50">
      <AmbientBackdrop />
      {!isAuthRoute && <Header />}
      <div className="pt-[72px]"><AnimatedRoutes /></div>
      {!isAuthRoute && <MiniFooter />}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <LanguageProvider>
          <BrowserRouter>
          <AppShell />
          <ScrollToTop />
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 3500,
              style: {
                background: 'rgba(17,17,20,0.92)',
                color: '#fafafa',
                borderRadius: '14px',
                padding: '12px 18px',
                fontSize: '14px',
                fontWeight: '500',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 16px 48px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
                backdropFilter: 'blur(16px)',
              },
              success: {
                iconTheme: { primary: '#10b981', secondary: '#052e22' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#3f0d0d' },
              },
            }}
            containerStyle={{ top: 88, bottom: 'auto' }}
          />
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
