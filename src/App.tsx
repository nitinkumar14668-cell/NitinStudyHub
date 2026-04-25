import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { auth } from './lib/firebase';
import Home from './pages/Home';
import Download from './pages/Download';
import Admin from './pages/Admin';
import Purchases from './pages/Purchases';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { ThemeProvider } from './lib/ThemeContext';
import { CartProvider } from './lib/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-2xl font-sans font-medium text-gray-500"
        >
          NitinStudyHub
        </motion.div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300 flex flex-col">
            <Toaster position="top-center" />
            <Navbar user={user} />
            <main className="flex-grow">
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Home user={user} />} />
                  <Route path="/download/:transactionId" element={<Download user={user} />} />
                  <Route path="/admin" element={<Admin user={user} />} />
                  <Route path="/purchases" element={<Purchases user={user} />} />
                </Routes>
              </AnimatePresence>
            </main>
            <Footer />
          </div>
        </Router>
      </CartProvider>
    </ThemeProvider>
  );
}
