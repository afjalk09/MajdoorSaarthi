import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';
import { Menu, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = ({ children, showFooter = true }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isLanding = location.pathname === '/';
  const headerBg = scrolled || !isLanding
    ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-warm-200/50'
    : 'bg-transparent';

  const textColor = scrolled || !isLanding ? 'text-warm-900' : 'text-warm-800';

  const navLinks = isLanding
    ? [
        { label: 'Home', to: '/' },
        { label: 'About', to: '/#about' },
        { label: 'Services', to: '/#services' },
        { label: 'Contact', to: '/#contact' },
      ]
    : user
    ? [
        { label: 'Dashboard', to: '/dashboard' },
        ...(user.role === 'WORKER' ? [{ label: 'My Profile', to: '/worker/profile' }] : []),
        ...(user.role === 'EMPLOYER' ? [
          { label: 'Browse Workers', to: '/browse-workers' },
          { label: 'My Profile', to: '/employer/profile' },
        ] : []),
      ]
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBg}`}>
        <div className="section-container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-saffron-600 flex items-center justify-center">
                <span className="font-display text-lg font-extrabold text-white">M</span>
              </div>
              <span className={`font-display text-lg font-bold tracking-tight ${textColor} hidden sm:block`}>
                Majdoorsaarthi
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'text-saffron-600 bg-saffron-50'
                      : `${textColor} hover:text-saffron-600 hover:bg-warm-100`
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <NotificationBell />
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-earth-600 flex items-center justify-center text-white text-xs font-bold">
                      {user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className={`text-sm font-medium max-w-[120px] truncate ${textColor}`}>
                      {user.email}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-warm-600 hover:text-saffron-600">
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className={`${textColor} hover:text-saffron-600`}>
                      Login
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm">Register</Button>
                  </Link>
                </>
              )}

              {/* Mobile toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={`lg:hidden p-2 rounded-lg ${textColor} hover:bg-warm-100 transition-colors`}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-72 bg-white shadow-2xl z-50 lg:hidden overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <span className="font-display font-bold text-lg text-warm-900">Menu</span>
                  <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-warm-100">
                    <X size={20} />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        location.pathname === link.to
                          ? 'text-saffron-600 bg-saffron-50'
                          : 'text-warm-700 hover:text-saffron-600 hover:bg-warm-50'
                      }`}
                    >
                      {link.label}
                      <ChevronRight size={16} />
                    </Link>
                  ))}
                </nav>

                {user && (
                  <div className="mt-6 pt-6 border-t border-warm-200">
                    <div className="flex items-center gap-3 mb-4 px-4">
                      <div className="w-10 h-10 rounded-full bg-earth-600 flex items-center justify-center text-white text-sm font-bold">
                        {user.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-warm-900 truncate">{user.email}</p>
                        <p className="text-xs text-warm-500 capitalize">{user.role?.toLowerCase()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 pt-16">
        {children}
      </main>

      {/* Footer */}
      {showFooter && <SiteFooter />}
    </div>
  );
};

const SiteFooter = () => (
  <footer className="bg-warm-900 text-warm-200">
    <div className="section-container py-12 lg:py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
        {/* Brand */}
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-lg bg-saffron-600 flex items-center justify-center">
              <span className="font-display text-lg font-extrabold text-white">M</span>
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">Majdoorsaarthi</span>
          </div>
          <p className="text-warm-300 text-sm leading-relaxed mb-4 max-w-[38ch]">
            Find verified workers near you, or find your next day&rsquo;s work —
            matched by skill, distance and reliability.
          </p>
        </div>

        {/* Platform */}
        <div>
          <h4 className="font-display font-semibold text-white mb-4">Platform</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="text-warm-300 hover:text-saffron-300 transition-colors">Home</Link></li>
            <li><Link to="/#about" className="text-warm-300 hover:text-saffron-300 transition-colors">Why Majdoorsaarthi</Link></li>
            <li><Link to="/#services" className="text-warm-300 hover:text-saffron-300 transition-colors">Trades</Link></li>
            <li><Link to="/register" className="text-warm-300 hover:text-saffron-300 transition-colors">Create account</Link></li>
          </ul>
        </div>

        {/* For Users */}
        <div>
          <h4 className="font-display font-semibold text-white mb-4">For you</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/register" className="text-warm-300 hover:text-saffron-300 transition-colors">Find work</Link></li>
            <li><Link to="/register" className="text-warm-300 hover:text-saffron-300 transition-colors">Hire workers</Link></li>
            <li><Link to="/login" className="text-warm-300 hover:text-saffron-300 transition-colors">Sign in</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="font-display font-semibold text-white mb-4">Support</h4>
          <ul className="space-y-2 text-sm">
            <li><span className="text-warm-300">support@majdoorsaarthi.com</span></li>
            <li><span className="text-warm-300">Help center</span></li>
            <li><span className="text-warm-300">Community guidelines</span></li>
          </ul>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-warm-700/50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-warm-400 text-sm">
          &copy; {new Date().getFullYear()} Majdoorsaarthi. All rights reserved.
        </p>
        <div className="flex gap-6 text-sm">
          <span className="text-warm-400 hover:text-saffron-300 cursor-pointer transition-colors">Terms</span>
          <span className="text-warm-400 hover:text-saffron-300 cursor-pointer transition-colors">Privacy</span>
          <span className="text-warm-400 hover:text-saffron-300 cursor-pointer transition-colors">Cookies</span>
        </div>
      </div>
    </div>
  </footer>
);

export { SiteFooter };
export default Layout;
