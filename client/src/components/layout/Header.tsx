import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search, User, LogOut, Heart, LayoutDashboard, Settings, SlidersHorizontal, Film, Tv, Zap, Sparkles, Bell, ListMusic } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { FilterPopover } from '../search/FilterPopover';
import { SearchFilters } from '../../types';
import { paramsToFilters, filtersToSearchParams } from '../../utils/filters';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/movies', label: 'Movies' },
  { to: '/tv-shows', label: 'TV Shows' },
  { to: '/trending', label: 'Trending' },
  { to: '/anime', label: 'Anime' },
  { to: '/about', label: 'About' },
];

const CATEGORIES = [
  { to: '/movies', label: 'Movies', icon: Film },
  { to: '/tv-shows', label: 'TV Shows', icon: Tv },
  { to: '/trending', label: 'Trending', icon: Zap },
  { to: '/anime', label: 'Anime', icon: Sparkles },
];

const MOBILE_NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
];

const USER_MENU_ITEMS = [
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/watchlist', icon: Heart, label: 'Watchlist' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentFilters = paramsToFilters(new URLSearchParams(location.search));
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isCategoryActive = (cat: { to: string }) => location.pathname === cat.to;

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
    if (location.pathname === '/search') {
      navigate(`/search${qs ? `?${qs}` : ''}`, { replace: true });
    } else {
      navigate(`/search${qs ? `?${qs}` : ''}`);
    }
  }, [navigate, location.pathname]);

  const isSearchPage = location.pathname === '/search';
  const hasFilterSpecific = !!(currentFilters.type?.length || currentFilters.genre?.length ||
    currentFilters.country?.length || currentFilters.language?.length ||
    currentFilters.quality?.length || currentFilters.yearFrom ||
    currentFilters.yearTo || currentFilters.ratingFrom || currentFilters.sortBy);
  const filtersActive = filtersOpen || (isSearchPage && hasFilterSpecific);

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
              {link.label}
            </Link>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search + Actions */}
        <div className="flex items-center gap-1.5">
          {/* Filter button + popover wrapper */}
          <div className="relative">
            <div className="hidden md:block">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-300 ${
                  filtersActive
                    ? 'bg-primary-600/15 text-primary-300 border-primary-700/30'
                    : 'bg-dark-800/80 text-dark-300 border-dark-600 hover:text-white hover:border-dark-500'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden xl:inline">Filters</span>
              </motion.button>
            </div>

            <FilterPopover
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              onApply={handleApplyFilters}
              filters={currentFilters}
            />
          </div>

          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="hidden md:block relative">
            <div className={`flex items-center transition-all duration-300 ${searchExpanded ? 'w-72' : 'w-52'}`}>
              <div className="relative flex-1 group">
                <Search className="left-3 absolute top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-primary-400 transition-colors" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchExpanded(true)}
                  onBlur={() => setTimeout(() => setSearchExpanded(false), 150)}
                  placeholder="Search for movies, TV shows, actors..."
                  className="pl-9 pr-8 w-full py-2 rounded-xl bg-dark-800/80 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary-500/40 focus:bg-dark-800 transition-all border border-white/5 focus:border-primary-500/30"
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')}
                    className="right-2 absolute top-1/2 -translate-y-1/2 p-0.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </form>

            {/* Watchlist */}
            <Link to="/watchlist" className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-colors hidden sm:block">
              <Heart className="h-5 w-5" />
            </Link>

            {/* Playlists */}
            <Link to="/playlists" className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-colors hidden sm:block">
              <ListMusic className="h-5 w-5" />
            </Link>

            {/* Notifications */}
            <Link to="/notifications" className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-colors hidden sm:block relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center">
                3
              </span>
            </Link>

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
                        { to: '/profile', icon: User, label: 'Profile' },
                        { to: '/watchlist', icon: Heart, label: 'Watchlist' },
                        { to: '/settings', icon: Settings, label: 'Settings' },
                        ...(user.role === 'ADMIN' || user.role === 'MODERATOR'
                          ? [{ to: '/admin', icon: LayoutDashboard, label: 'Admin' }]
                          : []),
                      ].map((item) => (
                        <Link key={item.to} to={item.to}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-300 hover:text-white hover:bg-dark-800 transition-colors"
                          onClick={() => setUserMenuOpen(false)}>
                          <item.icon className="h-4 w-4" /> {item.label}
                        </Link>
                      ))}
                      <hr className="border-dark-700 my-1" />
                      <button onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </>
                  ) : (
                    <div className="p-3 space-y-2">
                      <Link to="/login" className="block px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors" onClick={() => setUserMenuOpen(false)}>
                        Sign In
                      </Link>
                      <Link to="/register" className="block px-4 py-2.5 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg font-medium text-center transition-colors" onClick={() => setUserMenuOpen(false)}>
                        Sign Up
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
              <form onSubmit={handleSearch} className="relative mb-4">
                <Search className="left-3 absolute top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for movies, TV shows, actors..."
                  className="pl-10 pr-4 w-full py-2.5 rounded-xl bg-dark-800/80 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary-500/40 border border-white/5 focus:border-primary-500/30" />
              </form>
               <div className="mb-4">
                 <button
                   onClick={() => { setFiltersOpen(true); setMenuOpen(false); }}
                   className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-lg transition-colors ${
                     filtersActive
                       ? 'bg-primary-600/15 text-primary-300'
                       : 'text-white/60 hover:text-white hover:bg-white/5'
                   }`}
                 >
                   <SlidersHorizontal className="h-4 w-4" />
                   Filters
                 </button>
               </div>
               <div className="mb-4">
                 <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-dark-500">Categories</p>
                 {CATEGORIES.map((cat) => (
                   <Link
                     key={cat.to}
                     to={cat.to}
                     onClick={() => setMenuOpen(false)}
                     className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isCategoryActive(cat) ? 'bg-white/[0.06] font-semibold text-white' : 'text-dark-200 hover:bg-white/[0.04] hover:text-white'}`}
                   >
                     <cat.icon className="h-4 w-4" /> {cat.label}
                   </Link>
                 ))}
               </div>
               {MOBILE_NAV_LINKS.map((link) => (
                 <Link key={link.to} to={link.to}
                   className="block px-4 py-2.5 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                   onClick={() => setMenuOpen(false)}>
                   {link.label}
                 </Link>
               ))}
              {isAuthenticated ? (
                <>
                  <Link to="/settings" className="block px-4 py-2.5 text-white/60 hover:text-white hover:bg-white/5 rounded-lg" onClick={() => setMenuOpen(false)}>
                    Settings
                  </Link>
                  {user?.role === 'ADMIN' && (
                    <Link to="/admin" className="block px-4 py-2.5 text-white/60 hover:text-white hover:bg-white/5 rounded-lg" onClick={() => setMenuOpen(false)}>
                      Admin
                    </Link>
                  )}
                  <button onClick={() => { logout(); setMenuOpen(false); }}
                    className="block w-full text-left px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block px-4 py-2.5 text-white/60 hover:text-white hover:bg-white/5 rounded-lg" onClick={() => setMenuOpen(false)}>
                    Sign In
                  </Link>
                  <Link to="/register" className="block px-4 py-2.5 bg-primary-600 text-white text-center rounded-lg font-medium" onClick={() => setMenuOpen(false)}>
                    Sign Up
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
