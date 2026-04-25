import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Transaction, TransactionStatus } from '../types';
import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import { Download, Clock, CheckCircle2, XCircle, ShoppingBag, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface PurchasesProps {
  user: User | null;
}

export default function Purchases({ user }: PurchasesProps) {
  const [purchases, setPurchases] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const fetchPurchases = async () => {
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        setPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
        setLoading(false);
      };
      fetchPurchases();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="bg-white dark:bg-gray-900 transition-colors p-12 rounded-[3.5rem] border border-gray-100 dark:border-gray-800 shadow-xl inline-block max-w-md">
          <ShoppingBag className="w-16 h-16 text-gray-200 dark:text-gray-800 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Please login</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-8">You need to be logged in to view your purchases and downloads.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">My Purchases</h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">Tracks your orders and download your verified PDFs here.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800/50 h-40 rounded-[2.5rem] animate-pulse" />
          ))}
        </div>
      ) : purchases.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 transition-colors p-20 rounded-[3.5rem] text-center border border-gray-100 dark:border-gray-800 shadow-xl">
          <div className="bg-blue-50 dark:bg-blue-900/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">No purchases yet</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-8 max-w-md mx-auto">Explore our store and find the best notes for your preparation.</p>
          <Link to="/" className="inline-flex items-center gap-3 bg-gray-900 dark:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-gray-800 dark:hover:bg-blue-700 transition-all shadow-xl dark:shadow-none">
            Go to Store <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {purchases.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-xl relative overflow-hidden transition-colors"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Transaction #{p.id.slice(-6).toUpperCase()}</h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">
                    <Clock className="w-3 h-3" /> 
                    {p.createdAt?.toDate().toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${
                  p.status === TransactionStatus.APPROVED ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                  p.status === TransactionStatus.REJECTED ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                  p.status === TransactionStatus.VERIFYING ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                  'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700'
                }`}>
                  {p.status === TransactionStatus.VERIFYING ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : p.status === TransactionStatus.APPROVED ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : p.status === TransactionStatus.REJECTED ? (
                    <XCircle className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  {p.status}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-sm font-medium p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl transition-colors">
                  <span className="text-gray-500 dark:text-gray-400">Items ({p.items?.length || 1})</span>
                  <div className="text-right flex flex-col items-end gap-1">
                    {p.items ? (
                      p.items.map(item => (
                        <span key={item.id} className="text-gray-900 dark:text-white font-bold text-xs">{item.title}</span>
                      ))
                    ) : (
                      <span className="text-gray-900 dark:text-white font-bold text-xs">Note #{p.noteId?.slice(-6)}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm font-medium p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl transition-colors">
                  <span className="text-gray-500 dark:text-gray-400">Total Paid</span>
                  <span className="text-gray-900 dark:text-white font-bold">₹{p.amount}</span>
                </div>
                {p.status === TransactionStatus.APPROVED ? (
                   <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-2xl transition-colors">
                     <p className="text-green-700 dark:text-green-400 text-xs font-bold leading-relaxed">
                       Payment verified! Your notes are ready to download.
                     </p>
                   </div>
                ) : p.status === TransactionStatus.REJECTED ? (
                  <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl transition-colors">
                    <p className="text-red-700 dark:text-red-400 text-xs font-bold leading-relaxed">
                      Verification failed. Please contact support if this is a mistake.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl transition-colors">
                    <p className="text-blue-700 dark:text-blue-400 text-xs font-bold leading-relaxed">
                      Wait for admin to verify your payment screenshot.
                    </p>
                  </div>
                )}
              </div>

              {p.status === TransactionStatus.APPROVED && (
                <button
                  onClick={() => navigate(`/download/${p.id}`)}
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
                >
                  <Download className="w-6 h-6" /> Download PDF
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
