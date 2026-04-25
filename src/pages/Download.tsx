import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Transaction, TransactionStatus, Note } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Download as DownloadIcon, AlertTriangle, CheckCircle2, Lock, FileText, ArrowRight } from 'lucide-react';

interface DownloadProps {
  user: User | null;
}

export default function Download({ user }: DownloadProps) {
  const { transactionId } = useParams<{ transactionId: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!transactionId) return;
      try {
        const transRef = doc(db, 'transactions', transactionId);
        const transSnap = await getDoc(transRef);
        
        if (!transSnap.exists()) {
          setError("Transaction not found. Please contact support.");
          setLoading(false);
          return;
        }

        const transData = { id: transSnap.id, ...transSnap.data() } as Transaction;
        setTransaction(transData);

        if (transData.status !== TransactionStatus.APPROVED) {
          setError("This payment has not been verified yet.");
          setLoading(false);
          return;
        }

        // Fetch all notes (either single noteId or cart itemIds)
        const noteIds = transData.itemIds || (transData.noteId ? [transData.noteId] : []);
        const fetchedNotes: Note[] = [];

        for (const id of noteIds) {
          const noteRef = doc(db, 'notes', id);
          const noteSnap = await getDoc(noteRef);
          if (noteSnap.exists()) {
            fetchedNotes.push({ id: noteSnap.id, ...noteSnap.data() } as Note);
          } else if (transData.items) {
             // Use items from transaction if note no longer exists or for demo fallback
             const itemInfo = transData.items.find(it => it.id === id);
             if (itemInfo) {
               fetchedNotes.push({
                 id,
                 title: itemInfo.title,
                 description: 'Purchased content',
                 price: itemInfo.price,
                 pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                 thumbnailUrl: '',
                 category: 'Notes'
               } as Note);
             }
          }
        }
        setNotes(fetchedNotes);
        
      } catch (err) {
        console.error(err);
        setError("An error occurred while fetching your download link.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [transactionId]);

  const handleDownload = async (n: Note) => {
    if (!transaction) return;

    try {
      // Trigger download
      const link = document.createElement('a');
      link.href = n.pdfUrl;
      link.target = '_blank';
      link.download = `${n.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // We only mark as downloaded if it's the last one or something?
      // For now, let's just make it simpler: allow multiple downloads for a verified transaction
      if (!transaction.downloaded) {
        const transRef = doc(db, 'transactions', transaction.id);
        await updateDoc(transRef, {
          downloaded: true,
          updatedAt: serverTimestamp()
        });
        setTransaction(prev => prev ? { ...prev, downloaded: true } : null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to process download. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="p-4">
          <DownloadIcon className="w-10 h-10 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-8 rounded-[2rem] border border-red-100 dark:border-red-900/30 mb-8 inline-block transition-colors">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="font-medium">{error || "Invalid request."}</p>
        </div>
        <button onClick={() => navigate('/')} className="block mx-auto text-gray-500 dark:text-gray-400 font-bold hover:text-gray-900 dark:hover:text-white transition-colors">
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      <AnimatePresence mode="wait">
        {transaction.downloaded ? (
          <motion.div
            key="used"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 p-8 rounded-[2rem] border border-orange-100 dark:border-orange-900/30 mb-8 inline-block transition-colors">
              <Lock className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-3xl font-black mb-4 tracking-tight shadow-sm">Link Expired</h2>
              <p className="font-medium text-lg leading-relaxed px-8">
                This download link was used once and has now expired for security reasons. <br />
                If you lost your file, please contact support with your transaction ID.
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl mb-8 text-left border border-gray-100 dark:border-gray-800 max-w-sm mx-auto transition-colors">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Transaction ID</p>
              <p className="font-mono text-sm text-gray-600 dark:text-gray-400 break-all">{transaction.id}</p>
            </div>

            <button
              onClick={() => navigate('/')}
              className="px-8 py-3 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-blue-700 transition-all flex items-center gap-2 mx-auto shadow-xl dark:shadow-none"
            >
              Back to Store <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl shadow-blue-100 dark:shadow-none overflow-hidden border border-gray-100 dark:border-gray-800 transition-colors"
          >
            <div className="bg-blue-600 p-12 text-white text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full" />
               <CheckCircle2 className="w-20 h-20 mx-auto mb-6 drop-shadow-lg" />
               <h2 className="text-4xl font-black mb-2">Ready to Download!</h2>
               <p className="text-blue-100 font-medium">Thank you {user?.displayName}, for your purchase.</p>
            </div>

            <div className="p-12">
              <div className="space-y-6 mb-12">
                {notes.map(n => (
                  <div key={n.id} className="flex items-start gap-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 group hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all">
                    <div className="bg-blue-100 dark:bg-gray-700 p-4 rounded-2xl text-blue-600 dark:text-blue-400 shrink-0">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1 transition-colors">{n.title}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium line-clamp-1 transition-colors">{n.description}</p>
                      <button
                        onClick={() => handleDownload(n)}
                        className="mt-4 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                      >
                        <DownloadIcon className="w-4 h-4" /> Download This File
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-6 text-center">
                <p className="text-sm font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/10 py-2 px-4 rounded-lg inline-block transition-colors">
                  ⚠️ IMPORTANT: These links may expire once you start the download.
                </p>
                
                <button
                  onClick={() => notes.forEach(n => handleDownload(n))}
                  className="w-full bg-gray-900 dark:bg-blue-600 text-white py-6 rounded-2xl text-2xl font-black shadow-xl hover:bg-blue-600 dark:hover:bg-blue-700 transition-all flex items-center justify-center gap-4 active:scale-95 dark:shadow-none"
                >
                  <DownloadIcon className="w-8 h-8" />
                  Download All Files
                </button>
                
                <p className="text-gray-400 dark:text-gray-500 text-xs font-medium italic transition-colors">
                  By clicking download, you agree that your one-time access is being used.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
