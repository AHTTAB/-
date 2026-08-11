import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  onSnapshot, 
  query, 
  setDoc, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  getDocFromServer, 
  Timestamp,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Users, 
  Droplets, 
  Receipt, 
  Wallet, 
  BarChart3, 
  LogOut, 
  Plus, 
  Printer, 
  XCircle, 
  Send, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  ArrowRightLeft, 
  UserCircle, 
  Menu, 
  X, 
  ChevronRight, 
  CreditCard, 
  History, 
  Settings, 
  AlertCircle,
  CheckCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import React, { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { auth, db } from './firebase';
import { 
  UserProfile, 
  Subscriber, 
  IrrigationSession, 
  Expense, 
  Transfer, 
  UserRole 
} from './types';
import { 
  SUBSCRIPTION_FEE, 
  IRRIGATION_RATE, 
  WORKER_WAGE_PER_HOUR, 
  formatCurrency, 
  formatDate,
  loadSettings,
  saveSettings
} from './constants';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const ReceiptPrint = React.forwardRef<HTMLDivElement, { data: any, type: 'subscription' | 'irrigation' }>(({ data, type }, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans border-2 border-emerald-700 rounded-xl m-4 max-w-md mx-auto" dir="rtl">
      <div className="text-center border-b-2 border-emerald-600 pb-4 mb-4 flex flex-col items-center">
        <img src="/logo.jpg" alt="لوجو الجمعية" className="w-20 h-20 object-contain mb-2 rounded-full border border-emerald-500 shadow-xs" />
        <h1 className="text-xl font-black text-stone-900">جمعية تيفاوت للتنمية والتعاون</h1>
        <p className="text-sm font-bold text-emerald-800">دوار العامرية - مياه السقي</p>
        <span className="inline-block mt-2 px-4 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 font-extrabold text-sm rounded-full">
          وصل {type === 'subscription' ? 'اشتراك' : 'سقي'}
        </span>
      </div>
      
      <div className="space-y-3 text-sm">
        <div className="flex justify-between border-b border-stone-100 pb-1">
          <span className="font-bold text-stone-600">رقم الوصل:</span>
          <span className="font-mono font-bold text-stone-900">{data.receiptNumber || data.id?.slice(-6).toUpperCase()}</span>
        </div>
        <div className="flex justify-between border-b border-stone-100 pb-1">
          <span className="font-bold text-stone-600">تاريخ الوصل:</span>
          <span>{formatDate(data.date || data.subscriptionDate)}</span>
        </div>
        <div className="flex justify-between border-b border-stone-100 pb-1">
          <span className="font-bold text-stone-600">اسم المشترك:</span>
          <span className="font-bold text-stone-900">{data.name || data.subscriberName}</span>
        </div>
        
        {type === 'irrigation' && (
          <>
            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="font-bold text-stone-600">عدد الساعات:</span>
              <span className="font-bold text-stone-900">{data.hours} ساعة</span>
            </div>
            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="font-bold text-stone-600">ثمن الساعة:</span>
              <span>{formatCurrency(IRRIGATION_RATE)}</span>
            </div>
          </>
        )}
        
        <div className="flex justify-between border-t-2 border-emerald-600 pt-3 mt-4 text-base">
          <span className="font-black text-stone-900">المبلغ الإجمالي المؤدى:</span>
          <span className="text-xl font-black text-emerald-700">{formatCurrency(data.totalAmount || data.subscriptionFeePaid)}</span>
        </div>
      </div>
      
      <div className="mt-8 flex justify-between items-end pt-4 border-t border-stone-200">
        <div className="text-center">
          <p className="text-xs font-bold text-stone-600 mb-2">توقيع المكلف / أمين المال</p>
          <div className="w-28 h-16 border border-dashed border-stone-300 rounded-lg"></div>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-stone-600 mb-2">خاتم الجمعية</p>
          <div className="w-20 h-20 rounded-full border border-dashed border-stone-300 flex items-center justify-center">
            <span className="text-[9px] text-stone-400">خاتم الجمعية</span>
          </div>
        </div>
      </div>
      
      <div className="mt-6 text-center text-[11px] text-stone-400 border-t border-stone-100 pt-2 font-medium">
        جمعية تيفاوت للتنمية والتعاون - دوار العامرية © {new Date().getFullYear()}
      </div>
    </div>
  );
});

ReceiptPrint.displayName = 'ReceiptPrint';

const ReportPrint = React.forwardRef<HTMLDivElement, { 
  startDate: string, 
  endDate: string, 
  netIrrigation: number, 
  totalSubscriptions: number, 
  totalIncome: number, 
  totalWorkerWagesConfirmed: number,
  expensesList: Expense[], 
  totalExpenses: number, 
  netBalance: number 
}>(({ startDate, endDate, netIrrigation, totalSubscriptions, totalIncome, totalWorkerWagesConfirmed, expensesList, totalExpenses, netBalance }, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans max-w-4xl mx-auto border-2 border-stone-200" dir="rtl">
      {/* Report Header */}
      <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-6 mb-6">
        <div className="flex items-center gap-4">
          <img src="/logo.jpg" alt="لوجو الجمعية" className="w-20 h-20 object-contain rounded-full border border-emerald-500 shadow-xs" />
          <div>
            <h1 className="text-2xl font-black text-stone-900">جمعية تيفاوت للتنمية والتعاون</h1>
            <p className="text-base font-bold text-emerald-800">دوار العامرية - مياه السقي</p>
            <p className="text-xs text-stone-500 mt-1">تقرير مالي وتفصيلي للمداخيل والمصاريف</p>
          </div>
        </div>
        <div className="text-left bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
          <p className="font-bold text-sm text-emerald-800">التقرير المالي</p>
          <p><span className="font-bold">تاريخ الاستخراج:</span> {new Date().toLocaleDateString('ar-MA')}</p>
          <p><span className="font-bold">الفترة:</span> {startDate ? formatDate(startDate) : 'البداية'} إلى {endDate ? formatDate(endDate) : 'الحالي'}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8 text-center">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p className="text-xs font-bold text-emerald-800 mb-1">مداخيل السقي (الصافي)</p>
          <p className="text-lg font-black text-emerald-900">{formatCurrency(netIrrigation)}</p>
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs font-bold text-blue-800 mb-1">أجور العمال المؤداة</p>
          <p className="text-lg font-black text-blue-900">{formatCurrency(totalWorkerWagesConfirmed)}</p>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-xs font-bold text-red-800 mb-1">إجمالي المصاريف</p>
          <p className="text-lg font-black text-red-900">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="p-3 bg-stone-100 border border-stone-300 rounded-xl">
          <p className="text-xs font-bold text-stone-800 mb-1">الرصيد المتبقي</p>
          <p className={`text-lg font-black ${netBalance >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>{formatCurrency(netBalance)}</p>
        </div>
      </div>

      {/* Details Sections */}
      <div className="space-y-6 text-sm">
        {/* Income Section */}
        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <div className="bg-emerald-700 text-white px-4 py-2 font-bold flex justify-between">
            <span>المداخيل</span>
            <span>المبلغ (درهم)</span>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between border-b border-stone-100 pb-2">
              <span>مداخيل ساعات السقي الصافية</span>
              <span className="font-bold">{formatCurrency(netIrrigation)}</span>
            </div>
            <div className="flex justify-between border-b border-stone-100 pb-2">
              <span>مداخيل الاشتراكات</span>
              <span className="font-bold">{formatCurrency(totalSubscriptions)}</span>
            </div>
            <div className="flex justify-between font-black text-emerald-800 pt-2 text-base">
              <span>مجموع المداخيل:</span>
              <span>{formatCurrency(totalIncome)}</span>
            </div>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <div className="bg-red-700 text-white px-4 py-2 font-bold flex justify-between">
            <span>المصاريف</span>
            <span>المبلغ (درهم)</span>
          </div>
          <div className="p-4 space-y-2">
            {totalWorkerWagesConfirmed > 0 && (
              <div className="flex justify-between border-b border-stone-100 pb-2 bg-red-50/50 px-2 py-1 rounded">
                <span>أجور عمال السقي المؤداة والمؤكدة</span>
                <span className="font-bold text-red-700">{formatCurrency(totalWorkerWagesConfirmed)}</span>
              </div>
            )}
            {expensesList.map(e => (
              <div key={e.id} className="flex justify-between border-b border-stone-100 pb-2 px-2">
                <span>{e.description} ({formatDate(e.date)})</span>
                <span className="font-semibold">{formatCurrency(e.amount)}</span>
              </div>
            ))}
            {expensesList.length === 0 && totalWorkerWagesConfirmed === 0 && (
              <p className="text-stone-400 italic text-center py-2">لا توجد مصاريف خلال هذه الفترة</p>
            )}
            <div className="flex justify-between font-black text-red-800 pt-2 text-base border-t border-stone-200">
              <span>مجموع المصاريف:</span>
              <span>{formatCurrency(totalExpenses)}</span>
            </div>
          </div>
        </div>

        {/* Final Result */}
        <div className="p-4 bg-stone-100 border-2 border-stone-300 rounded-xl flex justify-between items-center text-lg font-black">
          <span>النتيجة المالية النهائية (الرصيد المتبقي):</span>
          <span className={netBalance >= 0 ? 'text-emerald-700' : 'text-red-700'}>{formatCurrency(netBalance)}</span>
        </div>
      </div>

      {/* Signatures & Stamp */}
      <div className="mt-12 grid grid-cols-2 gap-8 pt-6 border-t-2 border-stone-200 text-center">
        <div>
          <p className="font-bold text-sm text-stone-800 mb-2">توقيع أمين المال</p>
          <div className="w-40 h-20 border border-dashed border-stone-300 rounded-lg mx-auto"></div>
        </div>
        <div>
          <p className="font-bold text-sm text-stone-800 mb-2">خاتم وتوقيع الجمعية</p>
          <div className="w-24 h-24 rounded-full border border-dashed border-stone-300 mx-auto flex items-center justify-center text-xs text-stone-300">
            خاتم الجمعية
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-stone-400 border-t border-stone-100 pt-3">
        جمعية تيفاوت للتنمية والتعاون - دوار العامرية © {new Date().getFullYear()}
      </div>
    </div>
  );
});

ReportPrint.displayName = 'ReportPrint';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center"
      >
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-xl font-bold text-stone-900 mb-2">{title}</h3>
        <p className="text-stone-500 mb-8">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all"
          >
            تأكيد
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-3 rounded-xl transition-all"
          >
            إلغاء
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Utils ---
const downloadCSV = (data: any[], columns: { header: string, accessor: (row: any) => any }[], fileName: string) => {
  const csvRows = [];
  csvRows.push(columns.map(c => c.header).join(','));
  for (const row of data) {
    csvRows.push(columns.map(c => {
      const val = c.accessor(row);
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(','));
  }
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.csv`;
  link.click();
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Email Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Modal State
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };
  
  // Data States
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [sessions, setSessions] = useState<IrrigationSession[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);


  // Auth & Profile
  useEffect(() => {
    loadSettings();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          // Default to mukallaf for first user or handle role selection
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: firebaseUser.email === 'amriahassan@gmail.com' ? 'amin' : 'mukallaf',
            displayName: firebaseUser.displayName || 'مستخدم جديد',
            balance: 0
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Data Listeners
  useEffect(() => {
    if (!profile) return;

    const unsubSubscribers = onSnapshot(collection(db, 'subscribers'), (snapshot) => {
      setSubscribers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscriber)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'subscribers'));

    const unsubSessions = onSnapshot(query(collection(db, 'sessions'), orderBy('date', 'desc')), (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IrrigationSession)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sessions'));

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), orderBy('date', 'desc')), (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'expenses'));

    const unsubTransfers = onSnapshot(query(collection(db, 'transfers'), orderBy('date', 'desc')), (snapshot) => {
      setTransfers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transfer)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transfers'));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    return () => {
      unsubSubscribers();
      unsubSessions();
      unsubExpenses();
      unsubTransfers();
      unsubUsers();
    };
  }, [profile]);

  const handleLogin = async () => {
    try {
      setAuthError('');
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('حدث خطأ أثناء تسجيل الدخول بجوجل.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setAuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthError('البريد الإلكتروني مستخدم بالفعل');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل)');
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError('تسجيل الدخول بالبريد غير مفعل. يرجى تفعيله من لوحة تحكم Firebase.');
      } else {
        setAuthError('حدث خطأ. تأكد من تفعيل تسجيل الدخول بالبريد في إعدادات Firebase.');
      }
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 font-sans" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-stone-100"
        >
          <img src="/logo.jpg" alt="لوجو الجمعية" className="w-24 h-24 rounded-full mx-auto mb-4 object-cover shadow-md border-2 border-emerald-600" />
          <h1 className="text-2xl font-black text-stone-900 mb-1">جمعية تيفاوت للتنمية والتعاون</h1>
          <p className="text-emerald-700 font-bold mb-1">دوار العامرية</p>
          <p className="text-xs text-stone-500 mb-6">نظام تسيير مياه السقي</p>
          
          {authError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100">
              {authError}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4 text-right mb-6">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1">البريد الإلكتروني</label>
              <input 
                type="email" 
                required
                dir="ltr"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-left"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1">كلمة المرور</label>
              <input 
                type="password" 
                required
                dir="ltr"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-left"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-200"
            >
              {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="flex items-center justify-between text-sm mb-6">
            <span className="text-stone-500">
              {isSignUp ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟'}
            </span>
            <button 
              onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }}
              className="text-emerald-600 font-bold hover:underline"
            >
              {isSignUp ? 'تسجيل الدخول' : 'إنشاء حساب'}
            </button>
          </div>

          <div className="relative flex items-center py-2 mb-6">
            <div className="flex-grow border-t border-stone-200"></div>
            <span className="flex-shrink-0 mx-4 text-stone-400 text-sm">أو</span>
            <div className="flex-grow border-t border-stone-200"></div>
          </div>
          
          <button 
            onClick={handleLogin}
            className="w-full bg-white border-2 border-stone-200 hover:bg-stone-50 text-stone-700 font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-3"
          >
            <UserCircle className="w-6 h-6 text-stone-500" />
            المتابعة باستخدام جوجل
          </button>
          
          <div className="mt-8 pt-6 border-t border-stone-100">
            <p className="text-xs text-stone-400">جمعية تيفاوت للتنمية والتعاون - دوار العامرية © {new Date().getFullYear()}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex font-sans" dir="rtl">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-72 bg-white border-l border-stone-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="لوجو الجمعية" className="w-12 h-12 rounded-full object-cover border-2 border-emerald-600 shadow-xs shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm text-stone-900 leading-tight truncate">جمعية تيفاوت</span>
                <span className="text-xs font-semibold text-emerald-700 leading-tight">للتنمية والتعاون</span>
                <span className="text-[10px] text-stone-400 font-medium">دوار العامرية</span>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-stone-400 hover:text-stone-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
            <SidebarItem 
              active={activeTab === 'dashboard'} 
              onClick={() => {setActiveTab('dashboard'); setIsSidebarOpen(false);}}
              icon={<LayoutDashboard className="w-5 h-5" />}
              label="لوحة التحكم"
            />
            <SidebarItem 
              active={activeTab === 'subscribers'} 
              onClick={() => {setActiveTab('subscribers'); setIsSidebarOpen(false);}}
              icon={<Users className="w-5 h-5" />}
              label="المشتركين"
            />
            <SidebarItem 
              active={activeTab === 'irrigation'} 
              onClick={() => {setActiveTab('irrigation'); setIsSidebarOpen(false);}}
              icon={<Droplets className="w-5 h-5" />}
              label="حصص السقي"
            />
            <SidebarItem 
              active={activeTab === 'expenses'} 
              onClick={() => {setActiveTab('expenses'); setIsSidebarOpen(false);}}
              icon={<CreditCard className="w-5 h-5" />}
              label="المصاريف"
            />
            <SidebarItem 
              active={activeTab === 'reports'} 
              onClick={() => {setActiveTab('reports'); setIsSidebarOpen(false);}}
              icon={<BarChart3 className="w-5 h-5" />}
              label="التقارير"
            />
            <SidebarItem 
              active={activeTab === 'transfers'} 
              onClick={() => {setActiveTab('transfers'); setIsSidebarOpen(false);}}
              icon={<ArrowRightLeft className="w-5 h-5" />}
              label="تحويل الرصيد"
            />
            <SidebarItem 
              active={activeTab === 'activity'} 
              onClick={() => {setActiveTab('activity'); setIsSidebarOpen(false);}}
              icon={<History className="w-5 h-5" />}
              label="سجل العمليات"
            />
            {profile.role === 'amin' && (
              <SidebarItem 
                active={activeTab === 'settings'} 
                onClick={() => {setActiveTab('settings'); setIsSidebarOpen(false);}}
                icon={<Settings className="w-5 h-5" />}
                label="الإعدادات"
              />
            )}
          </nav>

          <div className="p-4 border-t border-stone-100">
            <div className="bg-stone-50 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-stone-200 overflow-hidden flex items-center justify-center">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-6 h-6 text-stone-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-stone-900 truncate">{profile.displayName}</p>
                  <p className="text-xs text-stone-500 uppercase tracking-wider">{profile.role === 'amin' ? 'أمين المال' : profile.role === 'rais' ? 'رئيس الجمعية' : 'مكلف بالتحصيل'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-stone-600">
                <span>الرصيد الحالي:</span>
                <span className="text-emerald-600 font-bold">{formatCurrency(profile.balance)}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-stone-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b border-stone-200 flex items-center justify-between px-6 shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-stone-600">
              <Menu className="w-6 h-6" />
            </button>
            <img src="/logo.jpg" alt="لوجو الجمعية" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-600 shadow-xs shrink-0" />
            <div className="flex flex-col">
              <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight flex items-center gap-2">
                جمعية تيفاوت للتنمية والتعاون
                <span className="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded-full border border-emerald-100 hidden sm:inline-block">دوار العامرية</span>
              </h2>
              <span className="text-xs text-stone-500 font-medium">
                {activeTab === 'dashboard' && 'لوحة التحكم'}
                {activeTab === 'subscribers' && 'إدارة المشتركين'}
                {activeTab === 'irrigation' && 'حصص السقي'}
                {activeTab === 'expenses' && 'المصاريف'}
                {activeTab === 'reports' && 'التقارير المالية'}
                {activeTab === 'transfers' && 'تحويل الرصيد'}
                {activeTab === 'activity' && 'سجل العمليات'}
                {activeTab === 'settings' && 'الإعدادات'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-stone-600">{new Date().toLocaleDateString('ar-MA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <div key="dashboard"><DashboardView subscribers={subscribers} sessions={sessions} expenses={expenses} profile={profile} /></div>}
            {activeTab === 'subscribers' && <div key="subscribers"><SubscribersView subscribers={subscribers} profile={profile} /></div>}
            {activeTab === 'irrigation' && <div key="irrigation"><IrrigationView subscribers={subscribers} sessions={sessions} profile={profile} showConfirm={showConfirm} /></div>}
            {activeTab === 'expenses' && <div key="expenses"><ExpensesView expenses={expenses} profile={profile} /></div>}
            {activeTab === 'reports' && <div key="reports"><ReportsView sessions={sessions} expenses={expenses} transfers={transfers} subscribers={subscribers} /></div>}
            {activeTab === 'transfers' && <div key="transfers"><TransfersView users={users} transfers={transfers} profile={profile} /></div>}
            {activeTab === 'activity' && <div key="activity"><ActivityLogView users={users} subscribers={subscribers} sessions={sessions} expenses={expenses} transfers={transfers} /></div>}
            {activeTab === 'settings' && <div key="settings"><SettingsView users={users} /></div>}
          </AnimatePresence>

          <ConfirmModal 
            isOpen={confirmModal.isOpen} 
            onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmModal.onConfirm}
            title={confirmModal.title}
            message={confirmModal.message}
          />
        </div>
      </main>
    </div>
  );
}

// --- Sub-Views ---

function SidebarItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all
        ${active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}
      `}
    >
      {icon}
      <span className="font-bold">{label}</span>
      {active && <ChevronRight className="w-4 h-4 mr-auto" />}
    </button>
  );
}

function DashboardView({ subscribers, sessions, expenses, profile }: { subscribers: Subscriber[], sessions: IrrigationSession[], expenses: Expense[], profile: UserProfile }) {
  const totalSubscribers = subscribers.length;
  const totalHours = sessions.filter(s => s.status === 'paid').reduce((acc, s) => acc + s.hours, 0);
  const totalRevenue = sessions.filter(s => s.status === 'paid').reduce((acc, s) => acc + s.totalAmount, 0) + (subscribers.length * SUBSCRIPTION_FEE);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Users className="text-blue-600" />} label="إجمالي المشتركين" value={totalSubscribers} color="bg-blue-50" />
        <StatCard icon={<Droplets className="text-emerald-600" />} label="إجمالي ساعات السقي" value={`${totalHours} ساعة`} color="bg-emerald-50" />
        <StatCard icon={<Wallet className="text-amber-600" />} label="إجمالي المداخيل" value={formatCurrency(totalRevenue)} color="bg-amber-50" />
        <StatCard icon={<XCircle className="text-red-600" />} label="إجمالي المصاريف" value={formatCurrency(totalExpenses)} color="bg-red-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
            <History className="w-5 h-5 text-stone-400" />
            آخر عمليات السقي
          </h3>
          <div className="space-y-4">
            {sessions.slice(0, 5).map(session => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                <div>
                  <p className="font-bold text-stone-900">{session.subscriberName}</p>
                  <p className="text-xs text-stone-500">{formatDate(session.date)}</p>
                </div>
                <div className="text-left">
                  <p className="font-bold text-emerald-600">{formatCurrency(session.totalAmount)}</p>
                  <p className="text-xs text-stone-500">{session.hours} ساعة</p>
                </div>
              </div>
            ))}
            {sessions.length === 0 && <p className="text-center text-stone-400 py-8">لا توجد عمليات سقي مسجلة</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-stone-400" />
            آخر المصاريف
          </h3>
          <div className="space-y-4">
            {expenses.slice(0, 5).map(expense => (
              <div key={expense.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                <div>
                  <p className="font-bold text-stone-900">{expense.description}</p>
                  <p className="text-xs text-stone-500">{formatDate(expense.date)}</p>
                </div>
                <div className="text-left">
                  <p className="font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                </div>
              </div>
            ))}
            {expenses.length === 0 && <p className="text-center text-stone-400 py-8">لا توجد مصاريف مسجلة</p>}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <h3 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-stone-400" />
          إحصائيات السقي السنوية
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={Array.from({ length: 12 }, (_, i) => {
              const monthData = sessions.filter(s => s.status === 'paid' && new Date(s.date).getMonth() === i);
              return {
                name: ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'][i],
                hours: monthData.reduce((acc, s) => acc + s.hours, 0)
              };
            })}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string | number, color: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex items-center gap-5">
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center shrink-0`}>
        {React.cloneElement(icon as React.ReactElement, { className: 'w-7 h-7' })}
      </div>
      <div>
        <p className="text-sm font-medium text-stone-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-stone-900">{value}</p>
      </div>
    </div>
  );
}

function SubscribersView({ subscribers, profile }: { subscribers: Subscriber[], profile: UserProfile }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      const newSub = {
        name,
        phone,
        nationalId,
        subscriptionDate: new Date().toISOString(),
        subscriptionFeePaid: SUBSCRIPTION_FEE,
        balance: 0
      };
      const docRef = await addDoc(collection(db, 'subscribers'), { ...newSub, createdBy: profile.uid });
      
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        balance: (profile.balance || 0) + SUBSCRIPTION_FEE
      });

      setName('');
      setPhone('');
      setNationalId('');
      setIsAdding(false);
      
      setSelectedSubscriber({ id: docRef.id, ...newSub } as Subscriber);
      setTimeout(() => handlePrint(), 500);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'subscribers');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubscriber || !name) return;
    try {
      await updateDoc(doc(db, 'subscribers', selectedSubscriber.id), {
        name,
        phone,
        nationalId
      });
      setIsEditing(false);
      setSelectedSubscriber(null);
      setName('');
      setPhone('');
      setNationalId('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'subscribers');
    }
  };

  const startEdit = (sub: Subscriber) => {
    setSelectedSubscriber(sub);
    setName(sub.name);
    setPhone(sub.phone || '');
    setNationalId(sub.nationalId || '');
    setIsEditing(true);
  };

  const filtered = subscribers.filter(s => s.name.includes(search) || s.phone?.includes(search));
  
  const debtors = subscribers.filter(s => (s.subscriptionFeePaid < SUBSCRIPTION_FEE) || (s.balance && s.balance < 0));

  const sendReminder = (sub: Subscriber) => {
    alert(`تم إرسال تذكير للمشترك ${sub.name} عبر الهاتف ${sub.phone || 'بدون رقم'}`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {debtors.length > 0 && (
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
          <h2 className="text-lg font-bold text-red-900 mb-4">المشتركون المتأخرون في الدفع ({debtors.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {debtors.map(sub => (
              <div key={sub.id} className="bg-white p-4 rounded-xl border border-red-100 flex justify-between items-center">
                <div>
                  <p className="font-bold text-stone-900">{sub.name}</p>
                  <p className="text-sm text-red-600">الرصيد: {formatCurrency(sub.balance || 0)}</p>
                </div>
                <button 
                  onClick={() => sendReminder(sub)}
                  className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 px-4 rounded-xl transition-all"
                >
                  تذكير
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input 
            type="text" 
            placeholder="بحث عن مشترك..." 
            className="w-full pr-12 pl-4 py-3 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
        >
          <Plus className="w-5 h-5" />
          إضافة مشترك جديد
        </button>
        <button 
          onClick={() => downloadCSV(subscribers, [
            { header: 'الاسم', accessor: (s) => s.name },
            { header: 'الهاتف', accessor: (s) => s.phone },
            { header: 'تاريخ الاشتراك', accessor: (s) => formatDate(s.subscriptionDate) },
            { header: 'واجب الاشتراك', accessor: (s) => s.subscriptionFeePaid }
          ], 'المشتركون')}
          className="bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-3 px-6 rounded-2xl transition-all flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          تصدير CSV
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-4 font-bold text-stone-600">الاسم</th>
                <th className="px-6 py-4 font-bold text-stone-600">رقم البطاقة الوطنية</th>
                <th className="px-6 py-4 font-bold text-stone-600">الهاتف</th>
                <th className="px-6 py-4 font-bold text-stone-600">تاريخ الاشتراك</th>
                <th className="px-6 py-4 font-bold text-stone-600">واجب الاشتراك</th>
                <th className="px-6 py-4 font-bold text-stone-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map(sub => (
                <tr key={sub.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-stone-900">{sub.name}</td>
                  <td className="px-6 py-4 text-stone-600">{sub.nationalId || '-'}</td>
                  <td className="px-6 py-4 text-stone-600">{sub.phone || '-'}</td>
                  <td className="px-6 py-4 text-stone-500 text-sm">{formatDate(sub.subscriptionDate)}</td>
                  <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(sub.subscriptionFeePaid)}</td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <button 
                      onClick={() => startEdit(sub)}
                      className="p-2 text-stone-400 hover:text-blue-600 transition-colors"
                      title="تعديل"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => {setSelectedSubscriber(sub); setTimeout(() => handlePrint(), 100);}}
                      className="p-2 text-stone-400 hover:text-emerald-600 transition-colors"
                      title="طباعة الوصل"
                    >
                      <Printer className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف هذا المشترك؟')) {
                          deleteDoc(doc(db, 'subscribers', sub.id));
                        }
                      }}
                      className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-stone-400">لا يوجد مشتركين بهذا الاسم</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8"
          >
            <h3 className="text-2xl font-bold text-stone-900 mb-6">تعديل بيانات المشترك</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">اسم المشترك</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">رقم البطاقة الوطنية</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">رقم الهاتف</label>
                <input 
                  type="tel" 
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                  حفظ التعديلات
                </button>
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-3 rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Hidden Print Component */}
      <div className="hidden">
        {selectedSubscriber && <ReceiptPrint ref={printRef} data={selectedSubscriber} type="subscription" />}
      </div>
    </motion.div>
  );
}

function IrrigationView({ subscribers, sessions, profile, showConfirm }: { subscribers: Subscriber[], sessions: IrrigationSession[], profile: UserProfile, showConfirm: (title: string, message: string, onConfirm: () => void) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState('');
  const [hours, setHours] = useState(1);
  const [selectedSession, setSelectedSession] = useState<IrrigationSession | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId || hours <= 0) return;
    
    const sub = subscribers.find(s => s.id === selectedSubId);
    if (!sub) return;

    try {
      const totalAmount = hours * IRRIGATION_RATE;
      const workerWage = hours * WORKER_WAGE_PER_HOUR;
      
      const newSession = {
        subscriberId: sub.id,
        subscriberName: sub.name,
        hours,
        rate: IRRIGATION_RATE,
        totalAmount,
        workerWage,
        date: new Date().toISOString(),
        status: 'paid',
        collectedBy: profile.uid,
        receiptNumber: `IRR-${Date.now().toString().slice(-6)}`
      };
      
      const docRef = await addDoc(collection(db, 'sessions'), { ...newSession, createdBy: profile.uid });
      
      // Update collector balance
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        balance: (profile.balance || 0) + totalAmount
      });

      setHours(1);
      setSelectedSubId('');
      setIsAdding(false);
      
      setSelectedSession({ id: docRef.id, ...newSession } as IrrigationSession);
      setTimeout(() => handlePrint(), 500);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'sessions');
    }
  };

  const handleCancel = async (session: IrrigationSession) => {
    showConfirm('إلغاء الوصل', 'هل أنت متأكد من إلغاء هذا الوصل؟ سيتم خصم المبلغ من رصيد المكلف.', async () => {
      try {
        await updateDoc(doc(db, 'sessions', session.id), { status: 'cancelled' });
        
        // Deduct from collector balance
        const collectorRef = doc(db, 'users', session.collectedBy);
        const collectorDoc = await getDoc(collectorRef);
        if (collectorDoc.exists()) {
          await updateDoc(collectorRef, {
            balance: (collectorDoc.data().balance || 0) - session.totalAmount
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'sessions');
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-end">
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
        >
          <Plus className="w-5 h-5" />
          تسجيل حصة سقي جديدة
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-4 font-bold text-stone-600">المشترك</th>
                <th className="px-6 py-4 font-bold text-stone-600">التاريخ</th>
                <th className="px-6 py-4 font-bold text-stone-600">الساعات</th>
                <th className="px-6 py-4 font-bold text-stone-600">المبلغ</th>
                <th className="px-6 py-4 font-bold text-stone-600">الحالة</th>
                <th className="px-6 py-4 font-bold text-stone-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sessions.map(session => (
                <tr key={session.id} className={`hover:bg-stone-50 transition-colors ${session.status === 'cancelled' ? 'opacity-50 grayscale' : ''}`}>
                  <td className="px-6 py-4 font-bold text-stone-900">{session.subscriberName}</td>
                  <td className="px-6 py-4 text-stone-500 text-sm">{formatDate(session.date)}</td>
                  <td className="px-6 py-4 text-stone-600">{session.hours} ساعة</td>
                  <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(session.totalAmount)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${session.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {session.status === 'paid' ? 'مؤدى' : 'ملغى'}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <button 
                      onClick={() => {setSelectedSession(session); setTimeout(() => handlePrint(), 100);}}
                      className="p-2 text-stone-400 hover:text-emerald-600 transition-colors"
                      title="طباعة"
                    >
                      <Printer className="w-5 h-5" />
                    </button>
                    {session.status === 'paid' && (
                      <button 
                        onClick={() => handleCancel(session)}
                        className="p-2 text-stone-400 hover:text-amber-600 transition-colors"
                        title="إلغاء"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                    {session.status === 'paid' && !session.workerWagePaid && profile.role === 'amin' && (
                      <button 
                        onClick={() => updateDoc(doc(db, 'sessions', session.id), { workerWagePaid: true })}
                        className="p-2 text-stone-400 hover:text-blue-600 transition-colors"
                        title="تأكيد أداء أجرة العامل"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف هذه العملية؟')) {
                          deleteDoc(doc(db, 'sessions', session.id));
                        }
                      }}
                      className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-stone-400">لا توجد عمليات سقي مسجلة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8"
          >
            <h3 className="text-2xl font-bold text-stone-900 mb-6">تسجيل سقي جديد</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">اختر المشترك</label>
                <select 
                  required
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                >
                  <option value="">-- اختر مشترك --</option>
                  {subscribers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">عدد الساعات</label>
                <input 
                  required
                  type="number" 
                  min="0.5"
                  step="0.5"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                />
              </div>
              <div className="bg-stone-50 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-500">ثمن الساعة:</span>
                  <span className="font-bold">{formatCurrency(IRRIGATION_RATE)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-500">أجرة العامل ({hours} س):</span>
                  <span className="font-bold">{formatCurrency(hours * WORKER_WAGE_PER_HOUR)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                  <span className="text-emerald-700 font-bold">المجموع للأداء:</span>
                  <span className="text-emerald-700 font-bold text-xl">{formatCurrency(hours * IRRIGATION_RATE)}</span>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                  تأكيد الأداء والطباعة
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-3 rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Hidden Print Component */}
      <div className="hidden">
        {selectedSession && <ReceiptPrint ref={printRef} data={selectedSession} type="irrigation" />}
      </div>
    </motion.div>
  );
}

function ExpensesView({ expenses, profile }: { expenses: Expense[], profile: UserProfile }) {
  const [isAdding, setIsAdding] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount <= 0) return;
    try {
      await addDoc(collection(db, 'expenses'), {
        description,
        amount,
        date: new Date().toISOString(),
        addedBy: profile.uid,
        createdBy: profile.uid
      });
      
      // Expenses are usually paid from the association's central fund (Amin)
      // But if a Mukallaf pays, we might need to track that. 
      // For now, we just record the expense.
      
      setDescription('');
      setAmount(0);
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'expenses');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-end">
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-red-100"
        >
          <Plus className="w-5 h-5" />
          إضافة مصاريف
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-4 font-bold text-stone-600">الوصف</th>
                <th className="px-6 py-4 font-bold text-stone-600">التاريخ</th>
                <th className="px-6 py-4 font-bold text-stone-600">المبلغ</th>
                <th className="px-6 py-4 font-bold text-stone-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {expenses.map(expense => (
                <tr key={expense.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-stone-900">{expense.description}</td>
                  <td className="px-6 py-4 text-stone-500 text-sm">{formatDate(expense.date)}</td>
                  <td className="px-6 py-4 font-bold text-red-600">{formatCurrency(expense.amount)}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف هذه المصاريف؟')) {
                          deleteDoc(doc(db, 'expenses', expense.id));
                        }
                      }}
                      className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-stone-400">لا توجد مصاريف مسجلة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8"
          >
            <h3 className="text-2xl font-bold text-stone-900 mb-6">إضافة مصاريف جديدة</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">وصف المصاريف</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">المبلغ</label>
                <input 
                  required
                  type="number" 
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                  تأكيد الإضافة
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-3 rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function ReportsView({ sessions, expenses, transfers, subscribers }: { sessions: IrrigationSession[], expenses: Expense[], transfers: Transfer[], subscribers: Subscriber[] }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const reportPrintRef = useRef<HTMLDivElement>(null);

  const handlePrintReport = useReactToPrint({
    contentRef: reportPrintRef,
  });

  const filteredSessions = sessions.filter(s => {
    if (s.status !== 'paid') return false;
    const date = new Date(s.date);
    if (startDate && date < new Date(startDate)) return false;
    if (endDate && date > new Date(endDate)) return false;
    return true;
  });

  const filteredExpenses = expenses.filter(e => {
    const date = new Date(e.date);
    if (startDate && date < new Date(startDate)) return false;
    if (endDate && date > new Date(endDate)) return false;
    return true;
  });
  
  const filteredSubscriptions = subscribers.filter(s => {
    const date = new Date(s.subscriptionDate);
    if (startDate && date < new Date(startDate)) return false;
    if (endDate && date > new Date(endDate)) return false;
    return true;
  });

  const totalIrrigation = filteredSessions.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalWorkerWagesConfirmed = filteredSessions.reduce((acc, s) => acc + (s.workerWagePaid ? s.workerWage : 0), 0);
  const totalSubscriptions = filteredSubscriptions.reduce((acc, s) => acc + s.subscriptionFeePaid, 0);
  const netIrrigation = totalIrrigation - totalWorkerWagesConfirmed;
  const totalIncome = netIrrigation + totalSubscriptions;
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0) + totalWorkerWagesConfirmed;
  const netBalance = totalIncome - totalExpenses;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2">من تاريخ</label>
          <input 
            type="date" 
            className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2">إلى تاريخ</label>
          <input 
            type="date" 
            className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button 
          onClick={() => {setStartDate(''); setEndDate('');}}
          className="px-6 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded-xl transition-all"
        >
          إعادة تعيين
        </button>
        <button 
          onClick={() => handlePrintReport()}
          className="bg-stone-800 hover:bg-stone-900 text-white font-bold py-2 px-6 rounded-xl transition-all flex items-center gap-2 shadow-sm"
        >
          <Printer className="w-5 h-5" />
          طباعة التقرير
        </button>
        <button 
          onClick={() => downloadCSV([
            { label: 'مداخيل السقي (الصافي)', value: formatCurrency(netIrrigation) },
            { label: 'أجور العمال المؤداة', value: formatCurrency(totalWorkerWagesConfirmed) },
            { label: 'إجمالي المصاريف', value: formatCurrency(totalExpenses) },
            { label: 'الرصيد المتبقي', value: formatCurrency(netBalance) }
          ], [
            { header: 'البيان', accessor: (r) => r.label },
            { header: 'القيمة', accessor: (r) => r.value }
          ], 'تقرير-مالي')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl transition-all flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          تصدير التقرير
        </button>
      </div>

      {/* Hidden printable report */}
      <div className="hidden">
        <ReportPrint 
          ref={reportPrintRef} 
          startDate={startDate} 
          endDate={endDate} 
          netIrrigation={netIrrigation} 
          totalSubscriptions={totalSubscriptions} 
          totalIncome={totalIncome} 
          totalWorkerWagesConfirmed={totalWorkerWagesConfirmed} 
          expensesList={filteredExpenses} 
          totalExpenses={totalExpenses} 
          netBalance={netBalance} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
          <p className="text-emerald-700 font-medium mb-1">مداخيل السقي (الصافي)</p>
          <p className="text-2xl font-bold text-emerald-800">{formatCurrency(netIrrigation)}</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
          <p className="text-blue-700 font-medium mb-1">أجور العمال المؤداة</p>
          <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalWorkerWagesConfirmed)}</p>
        </div>
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
          <p className="text-red-700 font-medium mb-1">إجمالي المصاريف</p>
          <p className="text-2xl font-bold text-red-800">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className={`${netBalance >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'} p-6 rounded-3xl border`}>
          <p className={`${netBalance >= 0 ? 'text-blue-700' : 'text-amber-700'} font-medium mb-1`}>الرصيد المتبقي</p>
          <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-800' : 'text-amber-800'}`}>{formatCurrency(netBalance)}</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
        <h3 className="text-xl font-bold text-stone-900 mb-8 border-b border-stone-100 pb-4">تفاصيل التقرير المالي</h3>
        
        <div className="space-y-6">
          <section>
            <h4 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              المداخيل
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-stone-50">
                <span>مداخيل ساعات السقي الصافية</span>
                <span className="font-bold">{formatCurrency(netIrrigation)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-50">
                <span>مداخيل الاشتراكات</span>
                <span className="font-bold">{formatCurrency(totalSubscriptions)}</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-emerald-700">
                <span>إجمالي المداخيل</span>
                <span>{formatCurrency(totalIncome)}</span>
              </div>
            </div>
          </section>

          <section>
            <h4 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              المصاريف
            </h4>
            <div className="space-y-2">
              {filteredExpenses.map(e => (
                <div key={e.id} className="flex justify-between py-2 border-b border-stone-50 text-sm">
                  <span>{e.description}</span>
                  <span className="font-medium">{formatCurrency(e.amount)}</span>
                </div>
              ))}
              {filteredExpenses.length === 0 && <p className="text-stone-400 text-sm italic">لا توجد مصاريف في هذه الفترة</p>}
              <div className="flex justify-between py-2 font-bold text-red-700 pt-4">
                <span>إجمالي المصاريف</span>
                <span>{formatCurrency(totalExpenses)}</span>
              </div>
            </div>
          </section>

          <div className="mt-12 pt-6 border-t-2 border-stone-100 flex justify-between items-center">
            <span className="text-xl font-bold text-stone-900">النتيجة المالية النهائية:</span>
            <span className={`text-3xl font-black ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(netBalance)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


function UserRowItem({ user }: { user: UserProfile }) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [role, setRole] = useState<UserRole>(user.role || 'mukallaf');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setDisplayName(user.displayName || '');
    setRole(user.role || 'mukallaf');
  }, [user]);

  const handleUpdate = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        role: role
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update user profile:', err);
      alert('حدث خطأ أثناء تحديث بيانات المستخدم');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="hover:bg-stone-50/50 transition-colors">
      <td className="px-6 py-4">
        <input 
          type="text" 
          value={displayName} 
          onChange={(e) => setDisplayName(e.target.value)}
          className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900 w-full max-w-xs"
          placeholder="اسم المستخدم"
        />
      </td>
      <td className="px-6 py-4 text-right text-stone-600 font-mono text-sm">{user.email}</td>
      <td className="px-6 py-4">
        <select 
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-800"
        >
          <option value="amin">أمين المال (المسؤول الإداري والمالي)</option>
          <option value="rais">رئيس الجمعية (الاطلاع والمراقبة)</option>
          <option value="mukallaf">مكلف بالتحصيل والسقي</option>
        </select>
      </td>
      <td className="px-6 py-4 text-center">
        <button 
          onClick={handleUpdate}
          disabled={saving}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 mx-auto ${
            savedSuccess 
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
          }`}
        >
          {saving ? 'جاري الحفظ...' : savedSuccess ? (
            <>
              <CheckCircle className="w-4 h-4" />
              تم الحفظ
            </>
          ) : (
            'حفظ البيانات'
          )}
        </button>
      </td>
    </tr>
  );
}

function UserManagementView({ users }: { users: UserProfile[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
        <div>
          <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            إدارة المستخدمين والصلاحيات
            <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">إدارة أمين المال</span>
          </h3>
          <p className="text-sm text-stone-500 mt-1">يمكن لأمين المال تعديل أسماء المستخدمين وتحديد صفاتهم وصلاحياتهم في التطبيق.</p>
        </div>
        <div className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700">
          إجمالي المستخدمين: {users.length}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-stone-600">
              <th className="px-6 py-4 font-bold">الاسم الكامل في التطبيق</th>
              <th className="px-6 py-4 font-bold">البريد الإلكتروني</th>
              <th className="px-6 py-4 font-bold">الدور والصلاحية</th>
              <th className="px-6 py-4 font-bold text-center">التحديث</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map(u => (
              <UserRowItem key={u.uid} user={u} />
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-stone-400">لا يوجد مستخدمون مسجلون بعد</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2 text-xs text-stone-600">
        <p className="font-bold text-stone-800 text-sm mb-1">دليل الأدوار والصلاحيات:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-white rounded-xl border border-stone-200">
            <span className="font-bold text-emerald-800 block mb-1">أمين المال (المسؤول)</span>
            المسؤول المالي عن الجمعية، له الصلاحية الكاملة لإدارة الإعدادات والأسماء والأدوار وتأكيد أجور العمال والتحويلات.
          </div>
          <div className="p-3 bg-white rounded-xl border border-stone-200">
            <span className="font-bold text-blue-800 block mb-1">رئيس الجمعية</span>
            له صلاحية الاطلاع والمراقبة وتتبع العمليات واستخراج التقارير دون تعديل الإعدادات.
          </div>
          <div className="p-3 bg-white rounded-xl border border-stone-200">
            <span className="font-bold text-stone-800 block mb-1">مكلف بالتحصيل والسقي</span>
            مكلف بتسجيل المشتركين واستيفاء أجور حصص السقي وإدارة العمليات الميدانية.
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ActivityLogView({ users, subscribers, sessions, expenses, transfers }: { users: UserProfile[], subscribers: Subscriber[], sessions: IrrigationSession[], expenses: Expense[], transfers: Transfer[] }) {
  const activities = [
    ...subscribers.map(s => ({ ...s, type: 'مشترك جديد', date: s.subscriptionDate })),
    ...sessions.map(s => ({ ...s, type: 'عملية سقي', date: s.date })),
    ...expenses.map(e => ({ ...e, type: 'مصاريف', date: e.date })),
    ...transfers.map(t => ({ ...t, type: 'تحويل', date: t.date })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
      <h3 className="text-xl font-bold text-stone-900 mb-6">سجل العمليات</h3>
      <div className="space-y-4">
        {activities.map((a: any, i) => {
          const user = users.find(u => u.uid === a.createdBy);
          return (
            <div key={i} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
              <div>
                <p className="font-bold text-stone-900">{a.type}</p>
                <p className="text-xs text-stone-500">{formatDate(a.date)}</p>
              </div>
              <p className="text-sm font-medium text-stone-600">بواسطة: {user?.displayName || 'مستخدم غير معروف'}</p>
            </div>
          );
        })}
        {activities.length === 0 && <p className="text-center text-stone-400 py-12">لا توجد عمليات مسجلة</p>}
      </div>
    </motion.div>
  );
}

function SettingsView({ users }: { users: UserProfile[] }) {
  const [subFee, setSubFee] = useState(SUBSCRIPTION_FEE);
  const [irrRate, setIrrRate] = useState(IRRIGATION_RATE);
  const [workerWage, setWorkerWage] = useState(WORKER_WAGE_PER_HOUR);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await saveSettings(subFee, irrRate, workerWage);
    setSaving(false);
    alert('تم حفظ الإعدادات بنجاح');
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6 max-w-lg">
        <h3 className="text-xl font-bold text-stone-900">إعدادات الجمعية</h3>
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2">ثمن الاشتراك السنوي (درهم)</label>
          <input type="number" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl" value={subFee} onChange={(e) => setSubFee(Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2">ثمن سقي الساعة (درهم)</label>
          <input type="number" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl" value={irrRate} onChange={(e) => setIrrRate(Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2">أجرة العامل في الساعة (درهم)</label>
          <input type="number" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl" value={workerWage} onChange={(e) => setWorkerWage(Number(e.target.value))} />
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </motion.div>
      <UserManagementView users={users} />
    </div>
  );
}

function TransfersView({ users, transfers, profile }: { users: UserProfile[], transfers: Transfer[], profile: UserProfile }) {
  const [amount, setAmount] = useState(0);
  const [toUid, setToUid] = useState('');

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toUid || amount <= 0 || amount > profile.balance) return;

    try {
      // 1. Create transfer record
      await addDoc(collection(db, 'transfers'), {
        fromUid: profile.uid,
        toUid,
        amount,
        date: new Date().toISOString(),
        createdBy: profile.uid
      });

      // 2. Update sender balance
      await updateDoc(doc(db, 'users', profile.uid), {
        balance: profile.balance - amount
      });

      // 3. Update receiver balance
      const receiver = users.find(u => u.uid === toUid);
      if (receiver) {
        await updateDoc(doc(db, 'users', toUid), {
          balance: (receiver.balance || 0) + amount
        });
      }

      setAmount(0);
      setToUid('');
      alert('تم تحويل المبلغ بنجاح');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'transfers');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8"
    >
      <div className="lg:col-span-1">
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-xl font-bold text-stone-900 mb-6">تحويل رصيد جديد</h3>
          <form onSubmit={handleTransfer} className="space-y-6">
            <div className="bg-stone-50 p-4 rounded-2xl mb-4">
              <p className="text-xs text-stone-500 mb-1">رصيدك المتاح للتحويل:</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(profile.balance)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">تحويل إلى</label>
              <select 
                required
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                value={toUid}
                onChange={(e) => setToUid(e.target.value)}
              >
                <option value="">-- اختر مستلم --</option>
                {users.filter(u => u.uid !== profile.uid).map(u => (
                  <option key={u.uid} value={u.uid}>{u.displayName} ({u.role === 'amin' ? 'أمين المال' : 'مكلف'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">المبلغ المراد تحويله</label>
              <div className="relative">
                <input 
                  required
                  type="number" 
                  max={profile.balance}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-stone-400">درهم</span>
              </div>
            </div>

            <button 
              type="submit"
              disabled={amount <= 0 || amount > profile.balance}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-200 disabled:text-stone-400 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              تأكيد التحويل
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm h-full">
          <h3 className="text-xl font-bold text-stone-900 mb-6">سجل التحويلات</h3>
          <div className="space-y-4">
            {transfers.map(transfer => {
              const fromUser = users.find(u => u.uid === transfer.fromUid);
              const toUser = users.find(u => u.uid === transfer.toUid);
              const isSender = transfer.fromUid === profile.uid;

              return (
                <div key={transfer.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSender ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {isSender ? <ArrowRightLeft className="w-5 h-5 rotate-180" /> : <ArrowRightLeft className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-stone-900">
                        {isSender ? `إلى: ${toUser?.displayName}` : `من: ${fromUser?.displayName}`}
                      </p>
                      <p className="text-xs text-stone-500">{formatDate(transfer.date)}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={`font-bold text-lg ${isSender ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isSender ? '-' : '+'}{formatCurrency(transfer.amount)}
                    </p>
                  </div>
                </div>
              );
            })}
            {transfers.length === 0 && <p className="text-center text-stone-400 py-12">لا توجد تحويلات مسجلة</p>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}



