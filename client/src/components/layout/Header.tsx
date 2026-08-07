import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search, User, LogOut, Heart, LayoutDashboard, Settings, SlidersHorizontal, Film, Tv, Zap, Sparkles, Bell, ListMusic, MessageSquare, Download } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { FilterPopover } from '../search/FilterPopover';
import { SearchFilters } from '../../types';
import { paramsToFilters, filtersToSearchParams } from '../../utils/filters';
import { notificationApi } from '../../services/api';
import { useI18n } from '../../i18n/LanguageProvider';
import { useSupport } from '../providers/SupportProvider';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

const NAV_LINKS = [
  { to: '/', label: 'nav.home' },
  { to: '/movies', label: 'nav.movies' },
  { to: '/tv-shows', label: 'nav.tv' },
  { to: '/anime', label: 'nav.anime' },
];

const CATEGORIES = [
  { to: '/movies', label: 'nav.movies', icon: Film },
  { to: '/tv-shows', label: 'nav.tv', icon: Tv },
  { to: '/trending', label: 'nav.newPopular', icon: Zap },
  { to: '/anime', label: 'nav.anime', icon: Sparkles },
];

const USER_MENU_ITEMS = [
  { to: '/profile', icon: User, label: 'header.profile' },
  { to: '/watchlist', icon: Heart, label: 'header.myList' },
  { to: '/settings', icon: Settings, label: 'header.settings' },
];

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useI18n();
  const { openSupport } = useSupport();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [installable, setInstallable] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isCategoryActive = (cat: { to: string }) => location.pathname === cat.to;

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: async () => {
      const res = await notificationApi.getList(1);
      return (res.data.data as { unread?: number }).unread ?? 0;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const unreadCount = unreadData ?? 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const onInstall = (e: Event) => setInstallable((e as CustomEvent).detail?.available ?? false);
    window.addEventListener('pwa-install', onInstall as any);
    return () => window.removeEventListener('pwa-install', onInstall as any);
  }, []);

  const handleInstall = () => {
    if ((window as any).watchinInstall?.()) {
      setInstallable(false);
    }
  };

  const currentFilters = paramsToFilters(new URLSearchParams(location.search));
  const activeFilterCount =
    (currentFilters.type?.length || 0) +
    (currentFilters.genre?.length || 0) +
    (currentFilters.country?.length || 0) +
    (currentFilters.language?.length || 0) +
    (currentFilters.quality?.length || 0) +
    (currentFilters.yearFrom ? 1 : 0) +
    (currentFilters.yearTo ? 1 : 0) +
    (currentFilters.ratingFrom ? 1 : 0) +
    (currentFilters.sortBy ? 1 : 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchExpanded(false);
      setSearchQuery('');
    }
  };

  const handleApplyFilters = useCallback((filters: SearchFilters) => {
    const params = new URLSearchParams();
    const sp = filtersToSearchParams(filters);
    Object.entries(sp).forEach(([k, v]) => params.set(k, v));
    const qs = params.toString();
    navigate(`/search${qs ? `?${qs}` : ''}`);
  }, [navigate]);

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-dark-950/70 backdrop-blur-xl"
    >
      <nav className="mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center gap-3 transition-all duration-300 max-w-full" style={{ justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="p-1.5 rounded-lg bg-primary-600">
            <svg className="h-6 w-6 text-white" viewBox="0 0 32 32" fill="none">
              <path d="M6 4L26 16L6 28V4Z" fill="currentColor"/>
              <path d="M7 8L20 16L7 24V8Z" fill="white" fillOpacity="0.3"/>
              <rect x="10" y="14" width="12" height="4" rx="1" fill="currentColor" transform="rotate(-15 10 14)"/>
            </svg>
          </div>
          <span className="text-xl font-black text-white tracking-tight hidden sm:inline">Watch In</span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-1 ml-6">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? 'text-white bg-white/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}>
              {t(link.label)}
            </Link>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search + Actions */}
        <div className="flex items-center gap-1.5">
          {/* Desktop Search */}
          <div className="relative hidden md:block">
            <form onSubmit={handleSearch} className={`block transition-all duration-300 ease-out ${searchExpanded ? 'w-80' : 'w-56'}`}>
              <div className="group relative">
                <div className="absolute -inset-px rounded-full bg-gradient-to-r from-white/10 via-white/5 to-white/10 transition-all duration-300 group-focus-within:from-primary-500/60 group-focus-within:via-primary-400/30 group-focus-within:to-transparent group-focus-within:shadow-[0_0_28px_rgba(124,58,237,0.25)]" />
                <div className="relative flex items-center rounded-full bg-dark-950/70 backdrop-blur-xl px-3.5 py-2">
                  <Search className="h-4 w-4 shrink-0 text-white/40 transition-all duration-300 group-focus-within:text-primary-400 group-focus-within:scale-110" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchExpanded(true)}
                    onBlur={() => setTimeout(() => setSearchExpanded(false), 150)}
placeholder={t('search.placeholder')}
                    className="w-full min-w-0 bg-transparent px-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
                  />
                  <span className="mx-1 h-4 w-px bg-white/10" />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setFiltersOpen((v) => !v)}
                    className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                      activeFilterCount > 0 || filtersOpen
                        ? 'bg-primary-600/20 text-primary-300'
                        : 'text-white/40 hover:text-white hover:bg-white/10'
                    }`}
                    title={t('search.filters')}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary-600 px-0.5 text-[8px] font-bold text-white ring-2 ring-dark-950">
                        {activeFilterCount > 9 ? '9+' : activeFilterCount}
                      </span>
                    )}
                  </motion.button>
                </div>
                <motion.span
                  initial={false}
                  animate={{ scaleX: searchExpanded ? 1 : 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="pointer-events-none absolute inset-x-6 -bottom-px h-px origin-left rounded-full bg-gradient-to-r from-primary-500 via-primary-400 to-transparent"
                />
              </div>
            </form>
            <FilterPopover
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              onApply={handleApplyFilters}
              filters={currentFilters}
            />
          </div>

            {/* Watchlist */}
            <Link to="/watchlist" className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-colors hidden sm:block">
              <Heart className="h-5 w-5" />
            </Link>

            {/* Contact Admin */}
            <button
              onClick={() => openSupport({ context: t('header.contactAdmin') })}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-colors hidden sm:block"
              title={t('header.contactAdmin')}
            >
              <MessageSquare className="h-5 w-5" />
            </button>

            {/* Notifications */}
            <Link to="/notifications" className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-colors hidden sm:block relative">
              <Bell className="h-5 w-5" />
              {isAuthenticated && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Install App (PWA) */}
            {installable && (
              <button
                onClick={handleInstall}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-primary-500/20 transition-colors hidden sm:block"
                title={t('header.installApp')}
              >
                <Download className="h-5 w-5" />
              </button>
            )}

            {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="p-1 rounded-lg hover:bg-white/8 transition-colors">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-8 w-8 rounded-full ring-2 ring-white/15" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center ring-2 ring-white/15">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="right-0 absolute mt-2 w-60 bg-dark-900 backdrop-blur-2xl rounded-xl border border-dark-700 shadow-2xl shadow-black/50 py-1.5 z-50"
                >
                  {user ? (
                    <>
                      <div className="px-4 py-3 border-b border-dark-700">
                        <p className="font-semibold text-sm text-white">{user.username}</p>
                        <p className="text-xs text-dark-400 truncate">{user.email}</p>
                      </div>
                      {[
                        { to: '/profile', icon: User, label: 'header.profile' },
                        { to: '/watchlist', icon: Heart, label: 'header.myList' },
                        { to: '/notifications', icon: Bell, label: 'header.notifications' },
                        { to: '/settings', icon: Settings, label: 'header.settings' },
                        ...(user.role === 'ADMIN' || user.role === 'MODERATOR'
                          ? [{ to: '/admin', icon: LayoutDashboard, label: 'header.admin' }]
                          : []),
                      ].map((item) => (
                        <Link key={item.to} to={item.to}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-300 hover:text-white hover:bg-dark-800 transition-colors"
                          onClick={() => setUserMenuOpen(false)}>
                          <item.icon className="h-4 w-4" /> {t(item.label)}
                        </Link>
                      ))}
                      <hr className="border-dark-700 my-1" />
                      <button onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                        <LogOut className="h-4 w-4" /> {t('header.signOut')}
                      </button>
                    </>
                  ) : (
                    <div className="p-3 space-y-2">
                      <Link to="/login" className="block px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors" onClick={() => setUserMenuOpen(false)}>
                        {t('header.signIn')}
                      </Link>
                      <Link to="/register" className="block px-4 py-2.5 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg font-medium text-center transition-colors" onClick={() => setUserMenuOpen(false)}>
                        {t('header.signUp')}
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors">
          <motion.div animate={{ rotate: menuOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </motion.div>
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-white/8 overflow-hidden bg-dark-950/98 backdrop-blur-xl"
          >
            <div className="p-4 space-y-1">
              <div className="relative mb-4">
                <form onSubmit={handleSearch}>
                  <div className="group relative">
                    <div className="absolute -inset-px rounded-full bg-gradient-to-r from-white/10 via-white/5 to-white/10 transition-colors duration-300 group-focus-within:from-primary-500/60 group-focus-within:via-primary-400/30 group-focus-within:to-transparent group-focus-within:shadow-[0_0_20px_rgba(124,58,237,0.18)]" />
                    <div className="relative flex items-center rounded-full bg-dark-950/70 backdrop-blur-xl px-3.5 py-2.5">
                      <Search className="h-4 w-4 shrink-0 text-white/40 transition-colors group-focus-within:text-primary-400" />
                      <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
placeholder={t('search.placeholder')}
                        className="w-full min-w-0 bg-transparent px-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none" />
                      <span className="mx-1 h-4 w-px bg-white/10" />
                      <button
                        type="button"
                        onClick={() => setFiltersOpen(true)}
                        className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                          activeFilterCount > 0 ? 'bg-primary-600/20 text-primary-300' : 'text-white/40 hover:text-white hover:bg-white/10'
                        }`}
                        title={t('search.filters')}
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        {activeFilterCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary-600 px-0.5 text-[8px] font-bold text-white ring-2 ring-dark-950">
                            {activeFilterCount > 9 ? '9+' : activeFilterCount}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
                <FilterPopover
                  open={filtersOpen}
                  onClose={() => setFiltersOpen(false)}
                  onApply={handleApplyFilters}
                  filters={currentFilters}
                />
              </div>
               <div className="mb-4">
                 <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-dark-500">{t('footer.categories')}</p>
                 {CATEGORIES.map((cat) => (
                   <Link
                     key={cat.to}
                     to={cat.to}
                     onClick={() => setMenuOpen(false)}
                     className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isCategoryActive(cat) ? 'bg-white/[0.06] font-semibold text-white' : 'text-dark-200 hover:bg-white/[0.04] hover:text-white'}`}
                   >
                     <cat.icon className="h-4 w-4" /> {t(cat.label)}
                   </Link>
                 ))}
</div>
               <div className="mb-2 px-4">
                  <LanguageSwitcher compact />
                </div>
                {installable && (
                  <button
                    onClick={() => { handleInstall(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Download className="h-4 w-4" /> {t('header.installApp')}
                  </button>
                )}
               {isAuthenticated ? (
                <>
                  <Link to="/settings" className="block px-4 py-2.5 text-white/60 hover:text-white hover:bg-white/5 rounded-lg" onClick={() => setMenuOpen(false)}>
                    {t('header.settings')}
                  </Link>
                  {user?.role === 'ADMIN' && (
                    <Link to="/admin" className="block px-4 py-2.5 text-white/60 hover:text-white hover:bg-white/5 rounded-lg" onClick={() => setMenuOpen(false)}>
                      {t('header.admin')}
                    </Link>
                  )}
                  <button onClick={() => { logout(); setMenuOpen(false); }}
                    className="block w-full text-left px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg">
                    {t('header.signOut')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block px-4 py-2.5 text-white/60 hover:text-white hover:bg-white/5 rounded-lg" onClick={() => setMenuOpen(false)}>
                    {t('header.signIn')}
                  </Link>
                  <Link to="/register" className="block px-4 py-2.5 bg-primary-600 text-white text-center rounded-lg font-medium" onClick={() => setMenuOpen(false)}>
                    {t('header.signUp')}
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
