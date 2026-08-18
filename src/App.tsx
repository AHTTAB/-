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
  CheckCircle,
  Lock,
  Shield,
  Upload,
  PenTool
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import React, { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { ReceiptPrint } from './components/ReceiptPrint';
import { auth, db, createNewUserAccount } from './firebase';
import { 
  UserProfile, 
  Subscriber, 
  IrrigationSession, 
  Expense, 
  Transfer, 
  UserRole,
  OtherIncome 
} from './types';
import { 
  SUBSCRIPTION_FEE, 
  IRRIGATION_RATE, 
  WORKER_WAGE_PER_HOUR, 
  ASSOCIATION_SIGNATURE_URL,
  formatCurrency, 
  formatDate,
  loadSettings,
  saveSettings,
  INCOME_CATEGORIES
} from './constants';
import { LOGO_BASE64 } from './logoData';

function SafePrintImage({ 
  src, 
  alt, 
  className, 
  fallbackText 
}: { 
  src?: string, 
  alt: string, 
  className?: string, 
  fallbackText?: string 
}) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src || !src.trim()) {
      setLoadedSrc(null);
      return;
    }

    const cleanSrc = src.trim();
    if (cleanSrc.startsWith('data:image/')) {
      setLoadedSrc(cleanSrc);
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = cleanSrc;
    img.onload = () => {
      if (isMounted) setLoadedSrc(cleanSrc);
    };
    img.onerror = () => {
      if (isMounted) setLoadedSrc(null);
    };

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (!loadedSrc) {
    return <span className="text-[10px] text-stone-400 font-medium text-center block select-none px-1 py-0.5">{fallbackText || alt}</span>;
  }

  return (
    <img 
      src={loadedSrc} 
      alt={alt} 
      className={className} 
    />
  );
}

function SignaturePadModal({
  isOpen,
  onClose,
  onSave,
  title = 'رسم التوقيع باليد'
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  title?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#065f46';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      setHasDrawn(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#065f46';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    setHasDrawn(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4 text-right" dir="rtl">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="text-lg font-bold text-stone-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-full text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-500">ارسم توقيعك بيدك أو باللمس في المربع أسفله:</p>

        <div className="border-2 border-dashed border-emerald-300 rounded-2xl p-2 bg-stone-50 touch-none flex justify-center">
          <canvas
            ref={canvasRef}
            width={340}
            height={150}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="bg-white rounded-xl shadow-xs cursor-crosshair border border-stone-200"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors"
          >
            مسح
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={!hasDrawn}
              onClick={handleConfirm}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors shadow-xs"
            >
              اعتماد التوقيع
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div ref={ref} className="p-4 bg-white text-black font-sans w-full max-w-4xl mx-auto border border-stone-200 print:w-full print:max-w-none print:p-2" dir="rtl">
      {/* Report Header */}
      <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <img 
            src={LOGO_BASE64} 
            alt="لوجو الجمعية" 
            className="w-16 h-16 object-contain rounded-full border border-emerald-500 shadow-xs" 
          />
          <div>
            <h1 className="text-lg font-black text-stone-900">جمعية تيفاوت للتنمية والتعاون</h1>
            <p className="text-xs font-bold text-emerald-800">دوار العامرية - مياه السقي</p>
            <p className="text-[10px] text-stone-500 mt-0.5">تقرير مالي وتفصيلي للمداخيل والمصاريف</p>
          </div>
        </div>
        <div className="text-left bg-stone-50 p-2 rounded-lg border border-stone-200 text-[10px] text-stone-700 space-y-0.5">
          <p className="font-bold text-xs text-emerald-800">التقرير المالي</p>
          <p><span className="font-bold">تاريخ الاستخراج:</span> {new Date().toLocaleDateString('ar-MA')}</p>
          <p><span className="font-bold">الفترة:</span> {startDate ? formatDate(startDate) : 'البداية'} إلى {endDate ? formatDate(endDate) : 'الحالي'}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-center">
        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-[10px] font-bold text-emerald-800">مداخيل السقي</p>
          <p className="text-sm font-black text-emerald-900">{formatCurrency(netIrrigation)}</p>
        </div>
        <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-[10px] font-bold text-blue-800">أجور العمال</p>
          <p className="text-sm font-black text-blue-900">{formatCurrency(totalWorkerWagesConfirmed)}</p>
        </div>
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-[10px] font-bold text-red-800">إجمالي المصاريف</p>
          <p className="text-sm font-black text-red-900">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="p-2 bg-stone-100 border border-stone-300 rounded-lg">
          <p className="text-[10px] font-bold text-stone-800">الرصيد المتبقي</p>
          <p className={`text-sm font-black ${netBalance >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>{formatCurrency(netBalance)}</p>
        </div>
      </div>

      {/* Details Sections */}
      <div className="space-y-4 text-xs">
        {/* Income Section */}
        <div className="border border-stone-200 rounded-lg overflow-hidden">
          <div className="bg-emerald-700 text-white px-3 py-1.5 font-bold flex justify-between text-xs">
            <span>المداخيل</span>
            <span>المبلغ (درهم)</span>
          </div>
          <div className="p-3 space-y-1">
            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span>مداخيل ساعات السقي الصافية</span>
              <span className="font-bold">{formatCurrency(netIrrigation)}</span>
            </div>
            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span>مداخيل الاشتراكات</span>
              <span className="font-bold">{formatCurrency(totalSubscriptions)}</span>
            </div>
            <div className="flex justify-between font-black text-emerald-800 pt-1 text-sm">
              <span>مجموع المداخيل:</span>
              <span>{formatCurrency(totalIncome)}</span>
            </div>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="border border-stone-200 rounded-lg overflow-hidden">
          <div className="bg-red-700 text-white px-3 py-1.5 font-bold flex justify-between text-xs">
            <span>المصاريف</span>
            <span>المبلغ (درهم)</span>
          </div>
          <div className="p-3 space-y-1">
            {totalWorkerWagesConfirmed > 0 && (
              <div className="flex justify-between border-b border-stone-100 pb-1 bg-red-50/50 px-1 py-0.5 rounded text-[11px]">
                <span>أجور عمال السقي المؤداة والمؤكدة</span>
                <span className="font-bold text-red-700">{formatCurrency(totalWorkerWagesConfirmed)}</span>
              </div>
            )}
            {expensesList.map(e => (
              <div key={e.id} className="flex justify-between border-b border-stone-100 pb-1 px-1 text-[11px]">
                <span>{e.description} ({formatDate(e.date)})</span>
                <span className="font-semibold">{formatCurrency(e.amount)}</span>
              </div>
            ))}
            {expensesList.length === 0 && totalWorkerWagesConfirmed === 0 && (
              <p className="text-stone-400 italic text-center py-1">لا توجد مصاريف خلال هذه الفترة</p>
            )}
            <div className="flex justify-between font-black text-red-800 pt-1 text-sm border-t border-stone-200">
              <span>مجموع المصاريف:</span>
              <span>{formatCurrency(totalExpenses)}</span>
            </div>
          </div>
        </div>

        {/* Final Result */}
        <div className="p-3 bg-stone-100 border-2 border-stone-300 rounded-lg flex justify-between items-center text-sm font-black">
          <span>النتيجة المالية النهائية:</span>
          <span className={netBalance >= 0 ? 'text-emerald-700' : 'text-red-700'}>{formatCurrency(netBalance)}</span>
        </div>
      </div>

      {/* Signatures & Stamp */}
      <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t-2 border-stone-200 text-center text-xs">
        <div>
          <p className="font-bold text-stone-800 mb-1">توقيع أمين المال</p>
          <div className="w-24 h-12 border border-dashed border-stone-300 rounded-lg mx-auto"></div>
        </div>
        <div>
          <p className="font-bold text-stone-800 mb-1">خاتم وتوقيع الجمعية</p>
          <div className="w-16 h-16 rounded-full border border-dashed border-stone-300 mx-auto flex items-center justify-center text-[10px] text-stone-300">
            خاتم الجمعية
          </div>
        </div>
      </div>

      <div className="mt-4 text-center text-[10px] text-stone-400 border-t border-stone-100 pt-2">
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
          // If primary owner email, auto-create admin profile
          if (firebaseUser.email?.toLowerCase() === 'amriahassan@gmail.com') {
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: 'amin',
              displayName: firebaseUser.displayName || 'أمين المال (المسؤول)',
              balance: 0,
              allowedTabs: ['dashboard', 'subscribers', 'irrigation', 'expenses', 'reports', 'transfers', 'activity']
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);
          } else {
            // Account was deleted by admin or not authorized
            await signOut(auth);
            setUser(null);
            setProfile(null);
            setAuthError('عذراً، هذا الحساب غير مصرح له أو تم إلغاؤه من طرف الإدارة.');
          }
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
    if (!user) return;

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
      const updatedUsers = snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
      setUsers(updatedUsers);
      const myProfile = updatedUsers.find(u => u.uid === user.uid);
      if (myProfile) {
        setProfile(prev => {
          if (!prev) return myProfile;
          if (
            prev.uid === myProfile.uid &&
            prev.displayName === myProfile.displayName &&
            prev.role === myProfile.role &&
            prev.balance === myProfile.balance &&
            JSON.stringify(prev.allowedTabs) === JSON.stringify(myProfile.allowedTabs)
          ) {
            return prev;
          }
          return myProfile;
        });
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    return () => {
      unsubSubscribers();
      unsubSessions();
      unsubExpenses();
      unsubTransfers();
      unsubUsers();
    };
  }, [user?.uid]);

  const isTabAllowed = (tabId: string) => {
    if (!profile) return false;
    if (profile.role === 'amin') return true;
    if (tabId === 'settings') return false;
    if (!profile.allowedTabs || profile.allowedTabs.length === 0) return true;
    return profile.allowedTabs.includes(tabId);
  };

  useEffect(() => {
    if (profile && !isTabAllowed(activeTab)) {
      const allTabs = ['dashboard', 'subscribers', 'irrigation', 'expenses', 'reports', 'transfers', 'activity'];
      const firstAllowed = allTabs.find(t => isTabAllowed(t)) || 'dashboard';
      if (firstAllowed !== activeTab) {
        setActiveTab(firstAllowed);
      }
    }
  }, [profile?.role, JSON.stringify(profile?.allowedTabs), activeTab]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setAuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else {
        setAuthError('حدث خطأ أثناء تسجيل الدخول. يرجى التأكد من البيانات المخزنة.');
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
          <img 
            src={LOGO_BASE64} 
            alt="لوجو الجمعية" 
            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover shadow-md border-2 border-emerald-600" 
          />
          <h1 className="text-2xl font-black text-stone-900 mb-1">جمعية تيفاوت للتنمية والتعاون</h1>
          <p className="text-emerald-700 font-bold mb-2">دوار العامرية</p>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold mb-6">
            <Lock className="w-3.5 h-3.5" />
            <span>تطبيق خاص وسري لتسيير مياه السقي</span>
          </div>
          
          {authError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100 font-medium">
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
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-200 cursor-pointer"
            >
              تسجيل الدخول
            </button>
          </form>

          <p className="text-xs text-stone-400 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
            ملاحظة: التسجيل مقفل. يتم إضافة وتفعيل الحسابات حصراً عن طريق إدارة الجمعية من قسم الإعدادات.
          </p>

          <div className="mt-6 pt-4 border-t border-stone-100">
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
              <img 
                src={LOGO_BASE64} 
                alt="لوجو الجمعية" 
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-600 shadow-xs shrink-0" 
              />
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
            {isTabAllowed('dashboard') && (
              <SidebarItem 
                active={activeTab === 'dashboard'} 
                onClick={() => {setActiveTab('dashboard'); setIsSidebarOpen(false);}}
                icon={<LayoutDashboard className="w-5 h-5" />}
                label="لوحة التحكم"
              />
            )}
            {isTabAllowed('subscribers') && (
              <SidebarItem 
                active={activeTab === 'subscribers'} 
                onClick={() => {setActiveTab('subscribers'); setIsSidebarOpen(false);}}
                icon={<Users className="w-5 h-5" />}
                label="المشتركين"
              />
            )}
            {isTabAllowed('irrigation') && (
              <SidebarItem 
                active={activeTab === 'irrigation'} 
                onClick={() => {setActiveTab('irrigation'); setIsSidebarOpen(false);}}
                icon={<Droplets className="w-5 h-5" />}
                label="حصص السقي"
              />
            )}
            {isTabAllowed('expenses') && (
              <SidebarItem 
                active={activeTab === 'expenses'} 
                onClick={() => {setActiveTab('expenses'); setIsSidebarOpen(false);}}
                icon={<CreditCard className="w-5 h-5" />}
                label="المصاريف"
              />
            )}
            {isTabAllowed('reports') && (
              <SidebarItem 
                active={activeTab === 'reports'} 
                onClick={() => {setActiveTab('reports'); setIsSidebarOpen(false);}}
                icon={<BarChart3 className="w-5 h-5" />}
                label="التقارير"
              />
            )}
            {isTabAllowed('transfers') && (
              <SidebarItem 
                active={activeTab === 'transfers'} 
                onClick={() => {setActiveTab('transfers'); setIsSidebarOpen(false);}}
                icon={<ArrowRightLeft className="w-5 h-5" />}
                label="تحويل الرصيد"
              />
            )}
            {isTabAllowed('activity') && (
              <SidebarItem 
                active={activeTab === 'activity'} 
                onClick={() => {setActiveTab('activity'); setIsSidebarOpen(false);}}
                icon={<History className="w-5 h-5" />}
                label="سجل العمليات"
              />
            )}
            {isTabAllowed('balance') && (
              <SidebarItem 
                active={activeTab === 'balance'} 
                onClick={() => {setActiveTab('balance'); setIsSidebarOpen(false);}}
                icon={<Wallet className="w-5 h-5" />}
                label="الرصيد"
              />
            )}
            {isTabAllowed('financial') && (
              <SidebarItem 
                active={activeTab === 'financial'} 
                onClick={() => {setActiveTab('financial'); setIsSidebarOpen(false);}}
                icon={<BarChart3 className="w-5 h-5" />}
                label="التدبير المالي"
              />
            )}
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
            <img 
              src={LOGO_BASE64} 
              alt="لوجو الجمعية" 
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-600 shadow-xs shrink-0" 
            />
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
            {isTabAllowed('dashboard') && activeTab === 'dashboard' && <div key="dashboard"><DashboardView subscribers={subscribers} sessions={sessions} expenses={expenses} profile={profile} users={users} /></div>}
            {isTabAllowed('subscribers') && activeTab === 'subscribers' && <div key="subscribers"><SubscribersView subscribers={subscribers} profile={profile} /></div>}
            {isTabAllowed('irrigation') && activeTab === 'irrigation' && <div key="irrigation"><IrrigationView subscribers={subscribers} sessions={sessions} profile={profile} showConfirm={showConfirm} users={users} /></div>}
            {isTabAllowed('expenses') && activeTab === 'expenses' && <div key="expenses"><ExpensesView expenses={expenses} profile={profile} users={users} /></div>}
            {isTabAllowed('reports') && activeTab === 'reports' && <div key="reports"><ReportsView sessions={sessions} expenses={expenses} transfers={transfers} subscribers={subscribers} /></div>}
            {isTabAllowed('transfers') && activeTab === 'transfers' && <div key="transfers"><TransfersView users={users} transfers={transfers} profile={profile} /></div>}
            {isTabAllowed('activity') && activeTab === 'activity' && <div key="activity"><ActivityLogView users={users} subscribers={subscribers} sessions={sessions} expenses={expenses} transfers={transfers} /></div>}
            {isTabAllowed('balance') && activeTab === 'balance' && <div key="balance"><AssociationBalanceView users={users} sessions={sessions} expenses={expenses} subscribers={subscribers} /></div>}
            {isTabAllowed('financial') && activeTab === 'financial' && <div key="financial"><FinancialManagementView sessions={sessions} expenses={expenses} subscribers={subscribers} profile={profile} /></div>}
            {profile.role === 'amin' && activeTab === 'settings' && <div key="settings"><SettingsView users={users} profile={profile} showConfirm={showConfirm} /></div>}
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

function DashboardView({ subscribers, sessions, expenses, profile, users }: { subscribers: Subscriber[], sessions: IrrigationSession[], expenses: Expense[], profile: UserProfile, users: UserProfile[] }) {
  const totalSubscribers = subscribers.length;
  const totalHours = sessions.filter(s => s.status === 'paid').reduce((acc, s) => acc + s.hours, 0);
  const totalRevenue = sessions.filter(s => s.status === 'paid').reduce((acc, s) => acc + s.totalAmount, 0) + (subscribers.length * SUBSCRIPTION_FEE);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const associationBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);

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
        <StatCard icon={<Wallet className="text-emerald-600" />} label="رصيد الجمعية" value={formatCurrency(associationBalance)} color="bg-emerald-100" />
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

function SubscribersView({ subscribers, profile, users }: { subscribers: Subscriber[], profile: UserProfile, users?: UserProfile[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const receiptNum = `SUB-${Date.now().toString().slice(-6)}`;
      const newSub = {
        name: name.trim(),
        phone: phone.trim(),
        nationalId: nationalId.trim(),
        subscriptionDate: new Date().toISOString(),
        subscriptionFeePaid: SUBSCRIPTION_FEE,
        balance: 0,
        receiptNumber: receiptNum
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
      
      const collectorUser = users?.find(u => u.uid === profile.uid) || profile;
      setSelectedSubscriber({ 
        id: docRef.id, 
        ...newSub, 
        collectorName: profile.displayName,
        collectorSignatureUrl: collectorUser.signatureUrl
      } as any);
      setTimeout(() => handlePrint(), 400);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'subscribers');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubscriber || !name.trim()) return;
    try {
      await updateDoc(doc(db, 'subscribers', selectedSubscriber.id), {
        name: name.trim(),
        phone: phone.trim(),
        nationalId: nationalId.trim()
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

  const filtered = subscribers.filter(s => 
    s.name.includes(search) || 
    s.phone?.includes(search) || 
    s.nationalId?.includes(search) || 
    s.receiptNumber?.includes(search)
  );
  
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
            placeholder="بحث بالاسم، الهاتف، أو رقم الوصل..." 
            className="w-full pr-12 pl-4 py-3 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => {
              setName('');
              setPhone('');
              setNationalId('');
              setIsAdding(true);
            }}
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
          >
            <Plus className="w-5 h-5" />
            إضافة مشترك جديد
          </button>
          <button 
            onClick={() => downloadCSV(subscribers, [
              { header: 'رقم الوصل', accessor: (s) => s.receiptNumber || `SUB-${s.id.slice(-6).toUpperCase()}` },
              { header: 'الاسم', accessor: (s) => s.name },
              { header: 'رقم البطاقة الوطنية', accessor: (s) => s.nationalId || '-' },
              { header: 'الهاتف', accessor: (s) => s.phone || '-' },
              { header: 'تاريخ الاشتراك', accessor: (s) => formatDate(s.subscriptionDate) },
              { header: 'واجب الاشتراك', accessor: (s) => s.subscriptionFeePaid }
            ], 'المشتركون')}
            className="bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-3 px-6 rounded-2xl transition-all flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            تصدير CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-4 font-bold text-stone-600">رقم الوصل</th>
                <th className="px-6 py-4 font-bold text-stone-600">الاسم</th>
                <th className="px-6 py-4 font-bold text-stone-600">رقم البطاقة الوطنية</th>
                <th className="px-6 py-4 font-bold text-stone-600">الهاتف</th>
                <th className="px-6 py-4 font-bold text-stone-600">تاريخ الاشتراك</th>
                <th className="px-6 py-4 font-bold text-stone-600">واجب الاشتراك</th>
                <th className="px-6 py-4 font-bold text-stone-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map(sub => {
                const subReceiptNo = sub.receiptNumber || `SUB-${sub.id.slice(-6).toUpperCase()}`;
                return (
                  <tr key={sub.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-emerald-900">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100 inline-block">
                        {subReceiptNo}
                      </span>
                    </td>
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
                        onClick={() => {
                          const collectorUser = users?.find(u => u.uid === (sub.createdBy || profile.uid)) || profile;
                          setSelectedSubscriber({ 
                            ...sub, 
                            receiptNumber: subReceiptNo, 
                            collectorName: collectorUser.displayName || profile.displayName,
                            collectorSignatureUrl: collectorUser.signatureUrl
                          } as any); 
                          setTimeout(() => handlePrint(), 100);
                        }}
                        className="p-2 text-stone-400 hover:text-emerald-600 transition-colors"
                        title="طباعة الوصل"
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm('هل أنت متأكد من حذف هذا المشترك؟ سيتم خصم رسوم الاشتراك من رصيد المسجل.')) {
                            try {
                              await deleteDoc(doc(db, 'subscribers', sub.id));
                              if (sub.createdBy) {
                                const userRef = doc(db, 'users', sub.createdBy);
                                const userDoc = await getDoc(userRef);
                                if (userDoc.exists()) {
                                  await updateDoc(userRef, {
                                    balance: (userDoc.data().balance || 0) - sub.subscriptionFeePaid
                                  });
                                }
                              }
                            } catch (err) {
                              handleFirestoreError(err, OperationType.DELETE, 'subscribers');
                            }
                          }
                        }}
                        className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-stone-400">لا يوجد مشتركين بهذا البحث</td>
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
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-stone-900">إضافة مشترك جديد</h3>
              <button 
                onClick={() => setIsAdding(false)} 
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">اسم المشترك الكامل *</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  placeholder="مثال: محمد بن علي"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">رقم البطاقة الوطنية (CIN)</label>
                <input 
                  type="text" 
                  placeholder="مثال: AB123456"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">رقم الهاتف</label>
                <input 
                  type="tel" 
                  placeholder="مثال: 0661234567"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-1">
                <div className="flex justify-between text-sm font-bold text-emerald-900">
                  <span>واجب الاشتراك المستحق:</span>
                  <span>{formatCurrency(SUBSCRIPTION_FEE)}</span>
                </div>
                <p className="text-xs text-emerald-700">سيتم إصدار وصل رقمي آلي إضافة إلى تحويل المبلغ لصندوق الجمعية.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  {isSubmitting ? 'جاري الإضافة...' : 'إضافة وطباعة الوصل'}
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

function IrrigationView({ subscribers, sessions, profile, showConfirm, users }: { subscribers: Subscriber[], sessions: IrrigationSession[], profile: UserProfile, showConfirm: (title: string, message: string, onConfirm: () => void) => void, users?: UserProfile[] }) {
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
      
      setSelectedSession({ 
        id: docRef.id, 
        ...newSession, 
        collectorName: profile.displayName,
        collectorSignatureUrl: (users?.find(u => u.uid === profile.uid) || profile).signatureUrl
      } as any);
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
                <th className="px-6 py-4 font-bold text-stone-600">رقم الوصل</th>
                <th className="px-6 py-4 font-bold text-stone-600">المشترك</th>
                <th className="px-6 py-4 font-bold text-stone-600">المكلف بالمستحقات</th>
                <th className="px-6 py-4 font-bold text-stone-600">التاريخ</th>
                <th className="px-6 py-4 font-bold text-stone-600">الساعات</th>
                <th className="px-6 py-4 font-bold text-stone-600">المبلغ</th>
                <th className="px-6 py-4 font-bold text-stone-600">الحالة</th>
                <th className="px-6 py-4 font-bold text-stone-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sessions.map(session => {
                const collectorName = users?.find(u => u.uid === session.collectedBy)?.displayName || profile.displayName;
                const irrReceiptNo = session.receiptNumber || `IRR-${session.id.slice(-6).toUpperCase()}`;
                return (
                  <tr key={session.id} className={`hover:bg-stone-50 transition-colors ${session.status === 'cancelled' ? 'opacity-50 grayscale' : ''}`}>
                    <td className="px-6 py-4 font-mono font-bold text-xs text-emerald-900">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100 inline-block">
                        {irrReceiptNo}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-stone-900">{session.subscriberName}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-emerald-800">{collectorName}</td>
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
                        onClick={() => {
                          const collectorUser = users?.find(u => u.uid === session.collectedBy) || profile;
                          setSelectedSession({ 
                            ...session, 
                            collectorName, 
                            collectorSignatureUrl: collectorUser.signatureUrl 
                          } as any); 
                          setTimeout(() => handlePrint(), 100);
                        }}
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
                      onClick={async () => {
                        if (confirm('هل أنت متأكد من حذف هذه العملية؟ سيتم خصم المبلغ من رصيد المكلف.')) {
                          try {
                            await deleteDoc(doc(db, 'sessions', session.id));
                            const collectorRef = doc(db, 'users', session.collectedBy);
                            const collectorDoc = await getDoc(collectorRef);
                            if (collectorDoc.exists()) {
                               await updateDoc(collectorRef, {
                                 balance: (collectorDoc.data().balance || 0) - session.totalAmount
                               });
                            }
                          } catch (err) {
                            handleFirestoreError(err, OperationType.DELETE, 'sessions');
                          }
                        }
                      }}
                      className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
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

function ExpensesView({ expenses, profile, users }: { expenses: Expense[], profile: UserProfile, users?: UserProfile[] }) {
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
                <th className="px-6 py-4 font-bold text-stone-600">المضيف</th>
                <th className="px-6 py-4 font-bold text-stone-600">التاريخ</th>
                <th className="px-6 py-4 font-bold text-stone-600">المبلغ</th>
                <th className="px-6 py-4 font-bold text-stone-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {expenses.map(expense => {
                const adderName = users?.find(u => u.uid === expense.addedBy || u.uid === expense.createdBy)?.displayName || profile.displayName;
                return (
                  <tr key={expense.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-stone-900">{expense.description}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-stone-700">{adderName}</td>
                    <td className="px-6 py-4 text-stone-500 text-sm">{formatDate(expense.date)}</td>
                    <td className="px-6 py-4 font-bold text-red-600">{formatCurrency(expense.amount)}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={async () => {
                          if (confirm('هل أنت متأكد من حذف هذه المصاريف؟ سيتم إضافة المبلغ لرصيد المستخدم.')) {
                            try {
                              await deleteDoc(doc(db, 'expenses', expense.id));
                              const userRef = doc(db, 'users', expense.addedBy);
                              const userDoc = await getDoc(userRef);
                              if (userDoc.exists()) {
                                 await updateDoc(userRef, {
                                   balance: (userDoc.data().balance || 0) + expense.amount
                                 });
                              }
                            } catch (err) {
                              handleFirestoreError(err, OperationType.DELETE, 'expenses');
                            }
                          }
                        }}
                        className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-stone-400">لا توجد مصاريف مسجلة</td>
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


const ALL_APP_SECTIONS = [
  { id: 'dashboard', name: 'لوحة التحكم', description: 'الإحصائيات العامة والرصيد' },
  { id: 'subscribers', name: 'إدارة المشتركين', description: 'إضافة وتعديل بيانات المشتركين' },
  { id: 'irrigation', name: 'حصص السقي', description: 'استيفاء حصص السقي وطباعة الوصل' },
  { id: 'expenses', name: 'المصاريف', description: 'تسجيل مصاريف وتكاليف الجمعية' },
  { id: 'reports', name: 'التقارير المالية', description: 'متابعة المداخيل والحسابات' },
  { id: 'transfers', name: 'تحويل الرصيد', description: 'إرسال وتحويل المبالغ بين الأعضاء' },
  { id: 'activity', name: 'سجل العمليات', description: 'تتبع كافة أنشطة وعمليات التطبيق' },
  { id: 'balance', name: 'الرصيد', description: 'رصيد الجمعية المالي' },
  { id: 'financial', name: 'التدبير المالي', description: 'مجموع المداخيل والمصاريف' },
];

const UserRowItem: React.FC<{ user: UserProfile, currentUser?: UserProfile, isAmin?: boolean, showConfirm?: (title: string, message: string, onConfirm: () => void) => void }> = ({ user, currentUser, isAmin = true, showConfirm }) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [role, setRole] = useState<UserRole>(user.role || 'mukallaf');
  const [balance, setBalance] = useState(user.balance || 0);
  const [signatureUrl, setSignatureUrl] = useState(user.signatureUrl || '');
  const [allowedTabs, setAllowedTabs] = useState<string[]>(user.allowedTabs || ['dashboard', 'subscribers', 'irrigation', 'expenses', 'reports', 'transfers', 'activity']);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSigPadOpen, setIsSigPadOpen] = useState(false);

  const isSelf = currentUser?.uid === user.uid;
  const canEditProfile = isAmin || isSelf;
  const canEditRoleAndTabs = isAmin;

  useEffect(() => {
    setDisplayName(user.displayName || '');
    setRole(user.role || 'mukallaf');
    setBalance(user.balance || 0);
    setSignatureUrl(user.signatureUrl || '');
    setAllowedTabs(user.allowedTabs || ['dashboard', 'subscribers', 'irrigation', 'expenses', 'reports', 'transfers', 'activity']);
  }, [user.uid, user.displayName, user.role, user.balance, user.signatureUrl, JSON.stringify(user.allowedTabs)]);

  const toggleTab = (tabId: string) => {
    if (!canEditRoleAndTabs) return;
    setAllowedTabs(prev => 
      prev.includes(tabId) ? prev.filter(t => t !== tabId) : [...prev, tabId]
    );
  };

  const selectAll = () => {
    if (!canEditRoleAndTabs) return;
    setAllowedTabs(['dashboard', 'subscribers', 'irrigation', 'expenses', 'reports', 'transfers', 'activity']);
  };

  const deselectAll = () => {
    if (!canEditRoleAndTabs) return;
    setAllowedTabs([]);
  };

  const handleUpdate = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        role: role,
        balance: balance,
        signatureUrl: signatureUrl.trim(),
        allowedTabs: role === 'amin' ? ['dashboard', 'subscribers', 'irrigation', 'expenses', 'reports', 'transfers', 'activity'] : allowedTabs
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
    <div className="bg-stone-50/90 p-6 rounded-2xl border border-stone-200 space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">الاسم الكامل في التطبيق</label>
            <input 
              type="text" 
              disabled={!canEditProfile}
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)}
              className="px-3 py-2 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900 w-full disabled:bg-stone-100"
              placeholder="اسم المستخدم"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">البريد الإلكتروني</label>
            <input 
              disabled
              type="text" 
              value={user.email} 
              className="px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl font-mono text-xs text-stone-500 w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">الرصيد الحالي</label>
            <input 
              type="number" 
              disabled={!canEditRoleAndTabs}
              value={balance} 
              onChange={(e) => setBalance(Number(e.target.value))}
              className="px-3 py-2 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-600 w-full disabled:bg-stone-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">صورة التوقيع (للطباعة في الوصل)</label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                disabled={!canEditProfile}
                value={signatureUrl} 
                onChange={(e) => setSignatureUrl(e.target.value)}
                className="px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono text-xs dir-ltr text-stone-800 w-full disabled:bg-stone-100"
                placeholder="رابط أو اختر صورة"
              />
              {canEditProfile && (
                <>
                  <label className="cursor-pointer px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 shrink-0 flex items-center gap-1 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    <span>رفع</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setSignatureUrl(event.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden" 
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSigPadOpen(true)}
                    className="px-2.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl border border-stone-200 shrink-0 flex items-center gap-1 transition-colors"
                  >
                    <PenTool className="w-3.5 h-3.5 text-stone-700" />
                    <span>رسم</span>
                  </button>
                </>
              )}
              {signatureUrl && (
                <img 
                  src={signatureUrl} 
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  alt="توقيع" 
                  className="w-9 h-9 object-contain border border-stone-300 rounded-xl bg-white shrink-0 p-0.5 shadow-2xs" 
                />
              )}
            </div>
          </div>
        </div>

        <SignaturePadModal
          isOpen={isSigPadOpen}
          onClose={() => setIsSigPadOpen(false)}
          onSave={(dataUrl) => setSignatureUrl(dataUrl)}
          title={`رسم توقيع ${displayName || user.email}`}
        />

        <div className="flex items-center gap-2 shrink-0">
          {canEditProfile && (
            <button 
              onClick={handleUpdate}
              disabled={saving}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shrink-0 ${
                savedSuccess 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer'
              }`}
            >
              {saving ? 'جاري الحفظ...' : savedSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  تم الحفظ
                </>
              ) : (
                'حفظ التوقيع والبيانات'
              )}
            </button>
          )}

          {isAmin && !isSelf && user.email?.toLowerCase() !== 'amriahassan@gmail.com' && (
            <button
              type="button"
              onClick={() => {
                if (showConfirm) {
                  showConfirm(
                    'حذف الحساب',
                    `هل أنت تأكد من حذف المستخدم "${displayName || user.email}" بشكل نهائي؟ لن يستطيع هذا المستخدم تسجيل الدخول للتطبيق بعد ذلك.`,
                    async () => {
                      try {
                        await deleteDoc(doc(db, 'users', user.uid));
                      } catch (err) {
                        console.error('Failed to delete user:', err);
                        alert('حدث خطأ أثناء حذف الحساب.');
                      }
                    }
                  );
                }
              }}
              className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-bold rounded-xl border border-red-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="حذف هذا المستخدم"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>حذف</span>
            </button>
          )}
        </div>
      </div>

      {/* Section Permissions Selector */}
      <div className="pt-3 border-t border-stone-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-stone-500" />
            الأقسام المسموح بظهورها لهذا المستخدم في القائمة:
          </span>
          {role !== 'amin' && canEditRoleAndTabs && (
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={selectAll} 
                className="text-[11px] font-bold text-emerald-700 hover:underline"
              >
                تحديد الكل
              </button>
              <span className="text-stone-300">|</span>
              <button 
                type="button" 
                onClick={deselectAll} 
                className="text-[11px] font-bold text-stone-500 hover:underline"
              >
                إلغاء الكل
              </button>
            </div>
          )}
        </div>

        {role === 'amin' ? (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
            أمين المال يمتلك صلاحيات شاملة لكافة أقسام التطبيق والإعدادات.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {ALL_APP_SECTIONS.map(section => {
              const isChecked = allowedTabs.includes(section.id);
              return (
                <button
                  key={section.id}
                  type="button"
                  disabled={!canEditRoleAndTabs}
                  onClick={() => toggleTab(section.id)}
                  className={`p-2.5 rounded-xl border text-right transition-all flex items-center gap-2 ${
                    isChecked
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs'
                      : 'bg-white border-stone-200 text-stone-400 font-medium hover:border-stone-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                    isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-300 bg-stone-50'
                  }`}>
                    {isChecked && <CheckCircle className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs truncate">{section.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function UserManagementView({ users, profile, showConfirm }: { users: UserProfile[], profile?: UserProfile, showConfirm?: (title: string, message: string, onConfirm: () => void) => void }) {
  const isAmin = profile?.role === 'amin';
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('mukallaf');
  const [newSignatureUrl, setNewSignatureUrl] = useState('');
  const [newAllowedTabs, setNewAllowedTabs] = useState<string[]>(['dashboard', 'subscribers', 'irrigation', 'expenses', 'reports', 'transfers', 'activity']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [isAddSigPadOpen, setIsAddSigPadOpen] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');

    if (!newEmail.trim() || !newPassword || !newDisplayName.trim()) {
      setAddError('يرجى ملء جميع الحقول المطلوبة (الاسم الكامل، البريد الإلكتروني، وكلمة المرور)');
      return;
    }

    if (newPassword.length < 6) {
      setAddError('كلمة المرور يجب أن تتكون من 6 أحرف على الأقل');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create account in Firebase Auth using secondary app instance
      const newUser = await createNewUserAccount(newEmail.trim(), newPassword);

      // 2. Write profile to Firestore
      const newProfile: UserProfile = {
        uid: newUser.uid,
        email: newEmail.trim().toLowerCase(),
        displayName: newDisplayName.trim(),
        role: newRole,
        signatureUrl: newSignatureUrl.trim(),
        allowedTabs: newRole === 'amin' 
          ? ['dashboard', 'subscribers', 'irrigation', 'expenses', 'reports', 'transfers', 'activity'] 
          : newAllowedTabs,
        balance: 0
      };

      await setDoc(doc(db, 'users', newUser.uid), newProfile);

      setAddSuccess(`تمت إضافة المستخدم "${newDisplayName.trim()}" بنجاح!`);
      setNewEmail('');
      setNewPassword('');
      setNewDisplayName('');
      setNewRole('mukallaf');
      setNewSignatureUrl('');
      setNewAllowedTabs(['dashboard', 'subscribers', 'irrigation', 'expenses', 'reports', 'transfers', 'activity']);
      
      setTimeout(() => {
        setIsAddModalOpen(false);
        setAddSuccess('');
      }, 1500);
    } catch (error: any) {
      console.error('Error creating user account:', error);
      if (error.code === 'auth/email-already-in-use') {
        setAddError('هذا البريد الإلكتروني مستخدم بالفعل لمستخدم آخر.');
      } else if (error.code === 'auth/invalid-email') {
        setAddError('البريد الإلكتروني غير صحيح.');
      } else if (error.code === 'auth/weak-password') {
        setAddError('كلمة المرور ضعيفة جداً (6 أحرف على الأقل).');
      } else {
        setAddError('حدث خطأ أثناء إنشاء الحساب. يرجى التأكد من البيانات.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
        <div>
          <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            إدارة المستخدمين والأقسام والصلاحيات والتواقيع
            <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">إدارة الحسابات</span>
          </h3>
          <p className="text-sm text-stone-500 mt-1">يمكنك إضافة أعضاء ومكلفين جدد، إلغاء أوتحكم في الحسابات، وتحديد صلاحيات كل مستخدم بالدقة.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700 shrink-0">
            إجمالي المستخدمين: {users.length}
          </div>
          {isAmin && (
            <button
              onClick={() => {
                setAddError('');
                setAddSuccess('');
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition-all shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مستخدم جديد</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {users.map(u => (
          <UserRowItem key={u.uid} user={u} currentUser={profile} isAmin={isAmin} showConfirm={showConfirm} />
        ))}
        {users.length === 0 && (
          <p className="p-8 text-center text-stone-400 bg-stone-50 rounded-2xl border border-stone-200">لا يوجد مستخدمون مسجلون بعد</p>
        )}
      </div>

      {/* Modal for adding new user */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto text-right" dir="rtl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-emerald-600" />
                إضافة مستخدم جديد للحساب السرّي
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold mb-4">
                {addError}
              </div>
            )}

            {addSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{addSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">الاسم الكامل للمستخدم *</label>
                <input 
                  type="text" 
                  required
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold"
                  placeholder="مثال: محمد العباسي"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">البريد الإلكتروني *</label>
                  <input 
                    type="email" 
                    required
                    dir="ltr"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-mono"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">كلمة المرور *</label>
                  <input 
                    type="password" 
                    required
                    dir="ltr"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-mono"
                    placeholder="•••••••• (6 أحرف على الأقل)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">الصفة / الدور في الجمعية</label>
                <select 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-xs font-bold text-stone-800"
                >
                  <option value="mukallaf">مكلف بالتحصيل والسقي</option>
                  <option value="rais">رئيس الجمعية (الاطلاع والمراقبة)</option>
                  <option value="amin">أمين المال (المسؤول الإداري والمالي)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">توقيع المستخدم (اختياري)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={newSignatureUrl}
                    onChange={(e) => setNewSignatureUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-xs dir-ltr"
                    placeholder="رابط التوقيع أو اختر صورة"
                  />
                  <label className="cursor-pointer px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 shrink-0 flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    <span>رفع</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) setNewSignatureUrl(ev.target.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden" 
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddSigPadOpen(true)}
                    className="px-2.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl border border-stone-200 shrink-0 flex items-center gap-1"
                  >
                    <PenTool className="w-3.5 h-3.5 text-stone-700" />
                    <span>رسم</span>
                  </button>
                </div>
              </div>

              {/* Signature Modal inside add form */}
              <SignaturePadModal
                isOpen={isAddSigPadOpen}
                onClose={() => setIsAddSigPadOpen(false)}
                onSave={(dataUrl) => setNewSignatureUrl(dataUrl)}
                title={`رسم توقيع ${newDisplayName || 'المستخدم الجديد'}`}
              />

              {/* Section Permissions Selection */}
              {newRole !== 'amin' && (
                <div className="pt-2 border-t border-stone-100">
                  <label className="block text-xs font-bold text-stone-700 mb-2">الأقسام المسموح له بفتحها:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_APP_SECTIONS.map(s => {
                      const isChecked = newAllowedTabs.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setNewAllowedTabs(prev => 
                              prev.includes(s.id) ? prev.filter(t => t !== s.id) : [...prev, s.id]
                            );
                          }}
                          className={`p-2 rounded-xl border text-right text-xs transition-all flex items-center gap-2 ${
                            isChecked ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-white border-stone-200 text-stone-400'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-300'
                          }`}>
                            {isChecked && <CheckCircle className="w-3 h-3" />}
                          </div>
                          <span className="truncate">{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'جاري الإنشاء...' : 'حفظ وإنشاء الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2 text-xs text-stone-600">
        <p className="font-bold text-stone-800 text-sm mb-1">دليل الأدوار والصلاحيات والتوقيع:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-white rounded-xl border border-stone-200">
            <span className="font-bold text-emerald-800 block mb-1">أمين المال (المسؤول)</span>
            المسؤول المالي والإداري عن الجمعية، يمتلك الوصول لكافة الأقسام وإمكانية تحديد أسماء وصلاحيات ورابط توقيع الأعضاء وإضافة أو حذف الحسابات.
          </div>
          <div className="p-3 bg-white rounded-xl border border-stone-200">
            <span className="font-bold text-blue-800 block mb-1">رئيس الجمعية</span>
            يطلع على العمليات والتقارير في الأقسام المحددة له من طرف أمين المال.
          </div>
          <div className="p-3 bg-white rounded-xl border border-stone-200">
            <span className="font-bold text-stone-800 block mb-1">مكلف بالتحصيل والسقي</span>
            يستوفي أجور السقي والاشتراكات وينفذ العمليات في الأقسام المتاحة له فقط.
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ActivityLogView({ users, subscribers, sessions, expenses, transfers }: { users: UserProfile[], subscribers: Subscriber[], sessions: IrrigationSession[], expenses: Expense[], transfers: Transfer[] }) {
  const activities = [
    ...subscribers.map(s => ({ ...s, type: 'مشترك جديد', details: `${s.name} (${s.receiptNumber || `SUB-${s.id.slice(-6).toUpperCase()}`})`, date: s.subscriptionDate })),
    ...sessions.map(s => ({ ...s, type: 'عملية سقي', details: `${s.subscriberName} - ${s.hours} ساعة (${s.receiptNumber || `IRR-${s.id.slice(-6).toUpperCase()}`})`, date: s.date })),
    ...expenses.map(e => ({ ...e, type: 'مصاريف', details: `${e.description} (${formatCurrency(e.amount)})`, date: e.date })),
    ...transfers.map(t => ({ ...t, type: 'تحويل رصيد', details: `مبلغ ${formatCurrency(t.amount)}`, date: t.date })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
      <h3 className="text-xl font-bold text-stone-900 mb-6">سجل العمليات</h3>
      <div className="space-y-4">
        {activities.map((a: any, i) => {
          const user = users.find(u => u.uid === a.createdBy);
          return (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-stone-900">{a.type}</p>
                  <span className="text-xs font-semibold text-stone-600 bg-stone-200/60 px-2.5 py-0.5 rounded-lg">{a.details}</span>
                </div>
                <p className="text-xs text-stone-400 mt-1">{formatDate(a.date)}</p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 self-start sm:self-auto">
                بواسطة: {user?.displayName || 'مستخدم غير معروف'}
              </span>
            </div>
          );
        })}
        {activities.length === 0 && <p className="text-center text-stone-400 py-12">لا توجد عمليات مسجلة</p>}
      </div>
    </motion.div>
  );
}

function AssociationBalanceView({ users, sessions, expenses, subscribers }: { users: UserProfile[], sessions: IrrigationSession[], expenses: Expense[], subscribers: Subscriber[] }) {
  const totalBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);
  const totalIncome = sessions.filter(s => s.status === 'paid').reduce((acc, s) => acc + s.totalAmount, 0) + subscribers.reduce((acc, s) => acc + s.subscriptionFeePaid, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-6">
      <h2 className="text-2xl font-bold text-stone-900">رصيد الجمعية</h2>
      <div className="bg-emerald-600 text-white p-8 rounded-3xl shadow-lg">
        <p className="text-emerald-100 font-bold mb-2">الرصيد الكلي للجمعية (مجموع أرصدة المستخدمين)</p>
        <p className="text-5xl font-black">{formatCurrency(totalBalance)}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 p-6 rounded-3xl">
           <p className="text-emerald-800 font-bold">إجمالي المداخيل المسجلة</p>
           <p className="text-3xl font-black text-emerald-900">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-red-50 p-6 rounded-3xl">
           <p className="text-red-800 font-bold">إجمالي المصاريف المسجلة</p>
           <p className="text-3xl font-black text-red-900">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      {/* تفاصيل أرصدة كل مستخدم */}
      <div className="pt-4 border-t border-stone-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <span>أرصدة المستخدمين</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {users.length} مستخدم
            </span>
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(u => (
            <div key={u.uid} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                  {u.displayName ? u.displayName.charAt(0) : (u.email ? u.email.charAt(0).toUpperCase() : '?')}
                </div>
                <div>
                  <p className="font-bold text-sm text-stone-900">{u.displayName || 'بدون اسم'}</p>
                  <p className="text-xs text-stone-500">{u.role === 'rais' ? 'رئيس' : u.role === 'amin' ? 'أمين مال' : 'مكلف بالتحصيل'}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-[11px] text-stone-400 font-bold">الرصيد</p>
                <p className="font-black text-base text-emerald-700">{formatCurrency(u.balance || 0)}</p>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-center text-stone-400 py-6 col-span-full">لا يوجد مستخدمون مسجلون</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function FinancialManagementView({ sessions, expenses, subscribers, profile }: { sessions: IrrigationSession[], expenses: Expense[], subscribers: Subscriber[], profile: UserProfile }) {
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [isEditing, setIsEditing] = useState<OtherIncome | null>(null);
  const [otherIncomes, setOtherIncomes] = useState<OtherIncome[]>([]);

  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(collection(db, 'otherIncomes'), (snapshot) => {
      setOtherIncomes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OtherIncome)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'otherIncomes'));
    return () => unsub();
  }, [profile.uid]);

  const handleDelete = async (income: OtherIncome) => {
    if(!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
        await deleteDoc(doc(db, 'otherIncomes', income.id));
        const userRef = doc(db, 'users', income.receiverUid);
        const userDoc = await getDoc(userRef);
        if(userDoc.exists()) {
             const userData = userDoc.data() as UserProfile;
             await updateDoc(userRef, { balance: userData.balance - income.amount });
        }
    } catch(err) {
        console.error(err);
        alert('خطأ أثناء الحذف');
    }
  }

  const totalOtherIncome = otherIncomes.reduce((acc, i) => acc + i.amount, 0);
  const totalIncome = sessions.filter(s => s.status === 'paid').reduce((acc, s) => acc + s.totalAmount, 0) + subscribers.reduce((acc, s) => acc + s.subscriptionFeePaid, 0) + totalOtherIncome;
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-stone-200">
                <h3 className="font-bold text-lg text-emerald-800 mb-4">مجموع المداخيل</h3>
                <p className="text-3xl font-black mb-4">{formatCurrency(totalIncome)}</p>
                <button 
                  onClick={() => setIsAddingIncome(true)}
                  className="text-xs bg-emerald-600 text-white font-bold py-2 px-4 rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  إضافة مداخيل أخرى
                </button>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-stone-200">
                <h3 className="font-bold text-lg text-red-800 mb-4">مجموع المصاريف</h3>
                <p className="text-3xl font-black">{formatCurrency(totalExpenses)}</p>
            </div>
        </div>

        {isAddingIncome && (
          <AddOtherIncomeModal isOpen={isAddingIncome} onClose={() => setIsAddingIncome(false)} profile={profile} />
        )}
        {isEditing && (
          <AddOtherIncomeModal isOpen={!!isEditing} onClose={() => setIsEditing(null)} profile={profile} income={isEditing} />
        )}
        
        <div className="bg-white p-6 rounded-3xl border border-stone-200">
           <h3 className="font-bold text-lg text-stone-800 mb-4">قائمة المداخيل الإضافية</h3>
           <div className="space-y-2">
             {otherIncomes.map(income => (
               <div key={income.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                 <div>
                   <p className="font-bold text-stone-900">{income.description}</p>
                   <p className="text-xs text-stone-500">{income.category} - {income.payerName} - {formatDate(income.date)}</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <p className="font-black text-emerald-700">{formatCurrency(income.amount)}</p>
                    <button onClick={() => setIsEditing(income)} className="p-1 hover:bg-stone-200 rounded"><PenTool className="w-4 h-4 text-stone-600"/></button>
                    <button onClick={() => handleDelete(income)} className="p-1 hover:bg-red-100 rounded text-red-600"><Trash2 className="w-4 h-4"/></button>
                 </div>
               </div>
             ))}
             {otherIncomes.length === 0 && <p className="text-stone-400 text-center py-4">لا توجد مداخيل إضافية</p>}
           </div>
        </div>
      </motion.div>
  );
}

function AddOtherIncomeModal({ isOpen, onClose, profile, income }: { isOpen: boolean, onClose: () => void, profile: UserProfile, income?: OtherIncome }) {
  const [description, setDescription] = useState(income?.description || '');
  const [categories, setCategories] = useState(INCOME_CATEGORIES);
  const [category, setCategory] = useState(income?.category || INCOME_CATEGORIES[0]);
  const [amount, setAmount] = useState(income?.amount || 0);
  const [payerName, setPayerName] = useState(income?.payerName || '');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCat, setNewCat] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (income) {
          // Update
          const oldAmount = income.amount;
          await updateDoc(doc(db, 'otherIncomes', income.id), {
            description, category, amount, payerName
          });
          const userRef = doc(db, 'users', profile.uid);
          await updateDoc(userRef, { balance: profile.balance - oldAmount + amount });
      } else {
          // Create
          await addDoc(collection(db, 'otherIncomes'), {
            description, category, amount, date: new Date().toISOString(), payerName,
            receiverUid: profile.uid, createdBy: profile.uid
          });
          await updateDoc(doc(db, 'users', profile.uid), { balance: profile.balance + amount });
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('خطأ أثناء الحفظ');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8" dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">{income ? 'تعديل الدخل' : 'إضافة دخل إضافي'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <input type="text" placeholder="الوصف" required className="w-full p-3 border rounded-xl" value={description} onChange={e => setDescription(e.target.value)} />
          <div className="flex gap-2">
            <select className="flex-1 p-3 border rounded-xl" value={category} onChange={e => setCategory(e.target.value)}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" onClick={() => setIsAddingCat(!isAddingCat)} className="px-4 py-3 bg-stone-100 rounded-xl font-bold text-stone-600 hover:bg-stone-200">+</button>
          </div>
          {isAddingCat && (
            <div className="flex gap-2">
              <input type="text" placeholder="تصنيف جديد" className="flex-1 p-3 border rounded-xl" onChange={e => setNewCat(e.target.value)} />
              <button type="button" onClick={() => { if(newCat) { setCategories([...categories, newCat]); setCategory(newCat); setIsAddingCat(false); setNewCat(''); }}} className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold">حفظ</button>
            </div>
          )}
          <input type="number" placeholder="المبلغ" required className="w-full p-3 border rounded-xl" value={amount} onChange={e => setAmount(Number(e.target.value))} />
          <input type="text" placeholder="اسم الدافع" required className="w-full p-3 border rounded-xl" value={payerName} onChange={e => setPayerName(e.target.value)} />
          <button className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl">{income ? 'حفظ التعديلات' : 'إضافة'}</button>
        </form>
      </motion.div>
    </div>
  );
}

function SettingsView({ users, profile, showConfirm }: { users: UserProfile[], profile?: UserProfile, showConfirm?: (title: string, message: string, onConfirm: () => void) => void }) {
  const [subFee, setSubFee] = useState(SUBSCRIPTION_FEE);
  const [irrRate, setIrrRate] = useState(IRRIGATION_RATE);
  const [workerWage, setWorkerWage] = useState(WORKER_WAGE_PER_HOUR);
  const [assocSignature, setAssocSignature] = useState(ASSOCIATION_SIGNATURE_URL);
  const [saving, setSaving] = useState(false);
  const [isSigPadOpen, setIsSigPadOpen] = useState(false);

  useEffect(() => {
    setSubFee(SUBSCRIPTION_FEE);
    setIrrRate(IRRIGATION_RATE);
    setWorkerWage(WORKER_WAGE_PER_HOUR);
    setAssocSignature(ASSOCIATION_SIGNATURE_URL);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await saveSettings(subFee, irrRate, workerWage, assocSignature.trim());
    setSaving(false);
    alert('تم حفظ الإعدادات بنجاح');
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6 max-w-lg">
        <h3 className="text-xl font-bold text-stone-900">إعدادات الجمعية والتوقيع الرسمية</h3>
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
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2">توقيع / خاتم الجمعية الرسمية (للطباعة في الوصل)</label>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl dir-ltr font-mono text-xs" 
              placeholder="رابط أو اختر صورة الخاتم"
              value={assocSignature} 
              onChange={(e) => setAssocSignature(e.target.value)} 
            />
            <label className="cursor-pointer px-3 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 shrink-0 flex items-center gap-1 transition-colors">
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>رفع</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        setAssocSignature(event.target.result as string);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden" 
              />
            </label>
            <button
              type="button"
              onClick={() => setIsSigPadOpen(true)}
              className="px-3 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl border border-stone-200 shrink-0 flex items-center gap-1 transition-colors"
            >
              <PenTool className="w-4 h-4 text-stone-700" />
              <span>رسم</span>
            </button>
          </div>
          {assocSignature && (
            <div className="mt-2 p-2 bg-stone-50 border border-stone-200 rounded-xl flex items-center gap-3">
              <img 
                src={assocSignature} 
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                alt="خاتم الجمعية" 
                className="h-12 w-12 object-contain border border-stone-300 rounded p-1 bg-white" 
              />
              <span className="text-xs text-stone-500 font-medium">معاينة خاتم/توقيع الجمعية الرسمية</span>
            </div>
          )}
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </motion.div>

      <SignaturePadModal
        isOpen={isSigPadOpen}
        onClose={() => setIsSigPadOpen(false)}
        onSave={(dataUrl) => setAssocSignature(dataUrl)}
        title="رسم خاتم / توقيع الجمعية"
      />
      <UserManagementView users={users} profile={profile} showConfirm={showConfirm} />
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



