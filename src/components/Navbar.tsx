import { useState } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth, loginWithGoogle } from '../lib/firebase';
import { LogIn, LogOut, BookOpen, ShoppingBag, LayoutDashboard, Loader2, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../lib/ThemeContext';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const isAdmin = user?.email === 'nitinkumar14668@gmail.com';

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
    } catch (err) {
      toast.error("Failed to logout");
    }
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
      toast.success("Welcome back!");
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        toast.error("Login failed. Check browser settings.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white font-sans">
              Nitin<span className="text-blue-600">StudyHub</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {user && (
              <Link
                to="/purchases"
                className={`flex items-center gap-2 text-sm font-bold transition-all ${
                  location.pathname === '/purchases' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">My Purchases</span>
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                className={`flex items-center gap-2 text-sm font-bold transition-all ${
                  location.pathname === '/admin' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-2" />

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[100px]">{user.displayName}</p>
                </div>
                <img
                  src={user.photoURL || ''}
                  alt={user.displayName || ''}
                  className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-800"
                />
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                disabled={isLoggingIn}
                onClick={handleLogin}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {isLoggingIn ? 'Connecting...' : 'Login'}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
