import React, { useEffect, useState, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  onSnapshot, 
  query, 
  setDoc, 
  orderBy, 
  addDoc, 
  updateDoc, 
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
  PenTool,
  QrCode,
  Smartphone,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useReactToPrint } from 'react-to-print';
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
import { ReceiptPrint, SafePrintImage } from './components/ReceiptPrint';
import { ReportPrint } from './components/ReportPrint';
import { 
  printViaRawBT, 
  formatIrrigationRawBT, 
  formatSubscriptionRawBT, 
  formatReportRawBT 
} from './utils/rawbtPrinter';

// Signature Pad Modal
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
        ctx.strokeStyle = '#006699';
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
      ctx.strokeStyle = '#006699';
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-sky-100 space-y-4 text-right" dir="rtl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500">ارسم توقيعك بيدك أو باللمس في المربع أسفله:</p>

        <div className="border-2 border-dashed border-sky-400 rounded-2xl p-2 bg-sky-50/50 touch-none flex justify-center">
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
            className="bg-white rounded-xl shadow-xs cursor-crosshair border border-slate-200"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            مسح
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={!hasDrawn}
              onClick={handleConfirm}
              className="px-5 py-2 bg-[#0088cc] hover:bg-[#0077b6] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors shadow-sm"
            >
              اعتماد التوقيع
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Error Handling Enum
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: any, op: OperationType, path: string) {
  console.error(`Firestore error during ${op} on ${path}:`, error);
}

// CSV Export Helper
function downloadCSV(data: any[], columns: { header: string, accessor: (row: any) => any }[], filename: string) {
  const csvRows = [];
  csvRows.push(columns.map(c => `"${c.header}"`).join(','));
  for (const row of data) {
    const values = columns.map(c => {
      const val = c.accessor(row);
      return `"${(val !== undefined && val !== null ? String(val) : '').replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  const csvString = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const ALL_APP_SECTIONS = [
  { id: 'dashboard', name: 'لوحة التحكم', description: 'الإحصائيات العامة والرصيد' },
  { id: 'subscribers', name: 'إدارة المشتركين', description: 'إضافة وتعديل بيانات المشتركين' },
  { id: 'irrigation', name: 'حصص السقي', description: 'استيفاء حصص السقي وطباعة الوصل' },
  { id: 'expenses', name: 'المصاريف', description: 'تسجيل مصاريف وتكاليف الجمعية' },
  { id: 'reports', name: 'التقارير المالية', description: 'متابعة المداخيل والحسابات' },
  { id: 'transfers', name: 'تحويل الرصيد', description: 'إرسال وتحويل المبالغ بين الأعضاء' },
  { id: 'activity', name: 'سجل العمليات', description: 'تتبع كافة أنشطة وعمليات التطبيق' },
  { id: 'balance', name: 'رصيد الجمعية', description: 'رصيد الجمعية المالي الشامل' },
  { id: 'financial', name: 'التدبير المالي', description: 'مجموع المداخيل والمصاريف الإضافية' },
];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data States
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [sessions, setSessions] = useState<IrrigationSession[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Dialog & Modal Confirm
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  useEffect(() => {
    loadSettings();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            const isDefaultAmin = currentUser.email?.toLowerCase() === 'amriahassan@gmail.com';
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'مستخدم جديد',
              email: currentUser.email || '',
              role: isDefaultAmin ? 'amin' : 'mukallaf',
              balance: 0,
              allowedTabs: ['dashboard', 'subscribers', 'irrigation', 'expenses', 'reports', 'transfers', 'activity', 'balance', 'financial']
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          } else {
            const data = userDoc.data() as UserProfile;
            if (currentUser.email?.toLowerCase() === 'amriahassan@gmail.com' && data.role !== 'amin') {
              data.role = 'amin';
              await updateDoc(userDocRef, { role: 'amin' });
            }
            setProfile(data);
          }
        } catch (e) {
          console.error("Error setting user profile:", e);
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
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    return () => {
      unsubSubscribers();
      unsubSessions();
      unsubExpenses();
      unsubTransfers();
      unsubUsers();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#cbe8f8] via-[#e2f3fc] to-[#d6effa] flex items-center justify-center font-sans" dir="rtl">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-sky-200 text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 border-4 border-sky-200 border-t-[#0088cc] rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-800 font-bold text-base">جاري تحميل منظومة مياه السقي...</p>
          <p className="text-xs text-slate-500">جمعية تيفاوت للتنمية والتعاون</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthScreen onLoginSuccess={() => setLoading(false)} />;
  }

  const isTabAllowed = (tabId: string) => {
    if (profile.role === 'amin') return true;
    if (tabId === 'settings') return false;
    if (!profile.allowedTabs || profile.allowedTabs.length === 0) return true;
    return profile.allowedTabs.includes(tabId);
  };

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'subscribers', label: 'المشتركون', icon: Users },
    { id: 'irrigation', label: 'حصص السقي', icon: Droplets },
    { id: 'expenses', label: 'المصاريف', icon: Receipt },
    { id: 'reports', label: 'التقارير', icon: BarChart3 },
    { id: 'transfers', label: 'التحويلات', icon: ArrowRightLeft },
    { id: 'activity', label: 'سجل العمليات', icon: History },
    { id: 'balance', label: 'رصيد الجمعية', icon: Wallet },
    { id: 'financial', label: 'التدبير المالي', icon: CreditCard },
  ].filter(item => isTabAllowed(item.id));

  if (profile.role === 'amin') {
    navItems.push({ id: 'settings', label: 'الإعدادات والمستخدمين', icon: Settings });
  }

  return (
    <div className="min-h-screen bg-[#f0f8fc] text-slate-800 flex flex-col font-sans" dir="rtl">
      {/* Top Header Banner matching Image 1 Color Palette */}
      <header className="bg-gradient-to-r from-[#105a8b] via-[#0077b6] to-[#0284c7] text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center p-1 border border-white/20">
                <img src={LOGO_BASE64} alt="شعار الجمعية" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="font-black text-sm md:text-base leading-tight tracking-wide">
                  جمعية تيفاوت للتنمية والتعاون
                </h1>
                <p className="text-[10px] text-sky-100 font-medium">منظومة تدبير مياه السقي</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* User Profile Badge */}
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/20">
              <div className="w-6 h-6 rounded-full bg-white text-[#0077b6] font-bold text-xs flex items-center justify-center shrink-0">
                {profile.displayName?.charAt(0) || '👤'}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold leading-tight">{profile.displayName || profile.email}</p>
                <p className="text-[10px] text-sky-200">
                  {profile.role === 'amin' ? 'أمين المال' : profile.role === 'rais' ? 'رئيس الجمعية' : 'مكلف بالتحصيل'}
                </p>
              </div>
            </div>

            <button
              onClick={() => signOut(auth)}
              className="p-2 bg-white/10 hover:bg-red-500/80 rounded-xl text-white transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar / Desktop Navigation */}
        <aside className={`
          fixed lg:static inset-y-0 right-0 z-50 lg:z-0
          w-72 lg:w-auto lg:col-span-3
          bg-white lg:bg-transparent shadow-2xl lg:shadow-none
          p-6 lg:p-0 flex flex-col justify-between
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          <div className="space-y-4">
            <div className="flex items-center justify-between lg:hidden pb-3 border-b border-slate-100">
              <h2 className="font-bold text-base text-slate-800">قائمة الأقسام</h2>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Quick Balance Widget */}
            <div className="bg-gradient-to-br from-[#006699] to-[#0088cc] text-white p-5 rounded-2xl shadow-md border border-sky-400/30">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-sky-100">رصيد حسابك المتاح</span>
                <Wallet className="w-4 h-4 text-sky-200" />
              </div>
              <p className="text-2xl font-black">{formatCurrency(profile.balance || 0)}</p>
              <p className="text-[10px] text-sky-200 mt-1">تحديث آني للمداخيل والمستحقات</p>
            </div>

            {/* Navigation Menu */}
            <nav className="bg-white p-3 rounded-2xl border border-sky-100 shadow-sm space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                      isActive
                        ? 'bg-[#0088cc] text-white shadow-sm shadow-sky-200'
                        : 'text-slate-600 hover:bg-sky-50 hover:text-[#0077b6]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 rotate-180" />}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 text-center text-[10px] text-slate-400">
            جمعية تيفاوت للتنمية والتعاون • منظومة مياه السقي
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-2xs"
          />
        )}

        {/* Content Area */}
        <main className="lg:col-span-9 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <div key="dashboard">
                <DashboardView 
                  subscribers={subscribers}
                  sessions={sessions}
                  expenses={expenses}
                  profile={profile}
                  users={users}
                  onNavigate={setActiveTab}
                />
              </div>
            )}

            {activeTab === 'subscribers' && (
              <div key="subscribers">
                <SubscribersView 
                  subscribers={subscribers} 
                  profile={profile}
                  users={users}
                  showConfirm={showConfirm}
                />
              </div>
            )}

            {activeTab === 'irrigation' && (
              <div key="irrigation">
                <IrrigationView 
                  sessions={sessions} 
                  subscribers={subscribers} 
                  profile={profile}
                  users={users}
                  showConfirm={showConfirm}
                />
              </div>
            )}

            {activeTab === 'expenses' && (
              <div key="expenses">
                <ExpensesView 
                  expenses={expenses} 
                  profile={profile}
                  users={users}
                />
              </div>
            )}

            {activeTab === 'reports' && (
              <div key="reports">
                <ReportsView 
                  sessions={sessions} 
                  expenses={expenses} 
                  transfers={transfers} 
                  subscribers={subscribers}
                />
              </div>
            )}

            {activeTab === 'transfers' && (
              <div key="transfers">
                <TransfersView 
                  users={users} 
                  transfers={transfers} 
                  profile={profile} 
                />
              </div>
            )}

            {activeTab === 'activity' && (
              <div key="activity">
                <ActivityLogView 
                  users={users} 
                  subscribers={subscribers} 
                  sessions={sessions} 
                  expenses={expenses} 
                  transfers={transfers} 
                />
              </div>
            )}

            {activeTab === 'balance' && (
              <div key="balance">
                <AssociationBalanceView 
                  users={users} 
                  sessions={sessions} 
                  expenses={expenses} 
                  subscribers={subscribers} 
                />
              </div>
            )}

            {activeTab === 'financial' && (
              <div key="financial">
                <FinancialManagementView 
                  sessions={sessions} 
                  expenses={expenses} 
                  subscribers={subscribers} 
                  profile={profile} 
                />
              </div>
            )}

            {activeTab === 'settings' && profile.role === 'amin' && (
              <div key="settings">
                <SettingsView 
                  users={users} 
                  profile={profile} 
                  showConfirm={showConfirm} 
                />
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-right space-y-4"
          >
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-black text-lg text-slate-900">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                تراجع
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                تأكيد الإجراء
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 1. Auth Screen (Matching Image 2 SYGEAS Theme)
// ==========================================
function AuthScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else {
        setError('تعذر تسجيل الدخول. يرجى التحقق من اتصالك بالإنترنت.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError('تعذر تسجيل الدخول بواسطة Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#cbe8f8] via-[#e2f3fc] to-[#d6effa] flex flex-col justify-between font-sans selection:bg-sky-200" dir="rtl">
      {/* Top Banner */}
      <header className="bg-gradient-to-r from-[#105a8b] via-[#0077b6] to-[#0284c7] text-white p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 p-1 flex items-center justify-center">
              <img src={LOGO_BASE64} alt="شعار" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-black text-lg md:text-xl">جمعية تيفاوت للتنمية والتعاون</h1>
              <p className="text-xs text-sky-100">منظومة تدبير مياه السقي - دوار العامرية</p>
            </div>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 bg-white/15 rounded-full text-xs font-bold border border-white/20">
            مياه السقي
          </span>
        </div>
      </header>

      {/* Main Card (Image 2 style) */}
      <div className="max-w-md w-full mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl border border-sky-100 p-8 space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 text-[#0088cc] flex items-center justify-center mx-auto border border-sky-100 shadow-inner">
              <Droplets className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">منطقة تسجيل الدخول</h2>
            <p className="text-xs text-slate-500">أدخل بيانات الاعتماد للمتابعة إلى لوحة التحكم واستخلاص السقي</p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">البريد الإلكتروني / الحساب</label>
              <input
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 bg-sky-50/40 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#0088cc] focus:bg-white outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور السرية</label>
              <input
                type="password"
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-sky-50/40 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#0088cc] focus:bg-white outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 bg-[#0088cc] hover:bg-[#0077b6] text-white font-black text-base rounded-xl transition-all shadow-md shadow-sky-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>تسجيل الدخول للنظام</span>
              )}
            </button>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] text-slate-400 font-bold absolute">أو الدخول عبر</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>تسجيل الدخول باستخدام Google</span>
          </button>
        </motion.div>
      </div>

      <footer className="text-center p-4 text-xs text-slate-500">
        جميع الحقوق محفوظة لجمعية تيفاوت للتنمية والتعاون © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

// ==========================================
// 2. Dashboard View
// ==========================================
function DashboardView({ 
  subscribers, 
  sessions, 
  expenses, 
  profile, 
  users, 
  onNavigate 
}: { 
  subscribers: Subscriber[]; 
  sessions: IrrigationSession[]; 
  expenses: Expense[]; 
  profile: UserProfile; 
  users: UserProfile[]; 
  onNavigate: (tab: string) => void;
}) {
  const activeSessions = sessions.filter(s => s.status === 'paid');
  const totalIrrigationIncome = activeSessions.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalSubscriptionsIncome = subscribers.reduce((acc, s) => acc + (s.subscriptionFeePaid || SUBSCRIPTION_FEE), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalAssociationBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);

  // Group last 7 days chart data
  const chartData = [
    { name: 'السبت', income: 450 },
    { name: 'الأحد', income: 600 },
    { name: 'الإثنين', income: 300 },
    { name: 'الثلاثاء', income: 750 },
    { name: 'الأربعاء', income: 900 },
    { name: 'الخميس', income: 400 },
    { name: 'الجمعة', income: 850 },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">الرصيد الكلي للجمعية</p>
            <p className="text-2xl font-black text-[#0088cc]">{formatCurrency(totalAssociationBalance)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-[#0088cc] flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">مداخيل السقي المستخلصة</p>
            <p className="text-2xl font-black text-slate-900">{formatCurrency(totalIrrigationIncome)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Droplets className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">المشتركون المسجلون</p>
            <p className="text-2xl font-black text-slate-900">{subscribers.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">إجمالي المصاريف</p>
            <p className="text-2xl font-black text-red-600">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Action POS Bar (Image 1 Style) */}
      <div className="bg-gradient-to-r from-[#105a8b] via-[#0077b6] to-[#0284c7] text-white p-6 rounded-3xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xl font-black">عمليات الاستخلاص الميداني والسقي</h3>
            <p className="text-xs text-sky-100">استخدم الأزرار السريعة لتسجيل عملية سقي أو طباعة إيصال فوري</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-white/20 rounded-full self-start sm:self-auto border border-white/20">
            ⚡ طباعة سريعة متصلة بـ RawBT
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            onClick={() => onNavigate('irrigation')}
            className="p-3 bg-white text-[#0077b6] hover:bg-sky-50 rounded-2xl font-black text-xs transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل سقي جديد</span>
          </button>

          <button
            onClick={() => onNavigate('subscribers')}
            className="p-3 bg-white/15 hover:bg-white/25 text-white rounded-2xl font-black text-xs transition-all border border-white/20 flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>إضافة مشترك جديد</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="p-3 bg-white/15 hover:bg-white/25 text-white rounded-2xl font-black text-xs transition-all border border-white/20 flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span>التقارير المالية</span>
          </button>
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div className="bg-white rounded-3xl border border-sky-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">آخر عمليات السقي المسجلة</h3>
            <p className="text-xs text-slate-500">سجل بآخر حصص السقي التي تم تحصيلها</p>
          </div>
          <button
            onClick={() => onNavigate('irrigation')}
            className="text-xs font-bold text-[#0088cc] hover:underline"
          >
            عرض الكل ({sessions.length})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-sky-50/60 text-slate-600 font-bold border-b border-slate-100">
                <th className="p-3">رقم الوصل</th>
                <th className="p-3">المشترك</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3">الساعات</th>
                <th className="p-3">المبلغ</th>
                <th className="p-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.slice(0, 5).map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-[#006699]">
                    {s.receiptNumber || `IRR-${s.id.slice(-6).toUpperCase()}`}
                  </td>
                  <td className="p-3 font-bold text-slate-900">{s.subscriberName}</td>
                  <td className="p-3 text-slate-500">{formatDate(s.date)}</td>
                  <td className="p-3 text-slate-700 font-medium">{s.hours} س</td>
                  <td className="p-3 font-bold text-[#0088cc]">{formatCurrency(s.totalAmount)}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      s.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {s.status === 'paid' ? 'مؤدى' : 'ملغى'}
                    </span>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">لا توجد عمليات سقي مسجلة بعد</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

// ==========================================
// 3. Subscribers View
// ==========================================
function SubscribersView({ 
  subscribers, 
  profile, 
  users, 
  showConfirm
}: { 
  subscribers: Subscriber[]; 
  profile: UserProfile; 
  users: UserProfile[]; 
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscriber | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [subFee, setSubFee] = useState(SUBSCRIPTION_FEE);
  const [selectedSubForPrint, setSelectedSubForPrint] = useState<Subscriber | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handleStandardPrint = useReactToPrint({
    contentRef: printRef,
  });

  const handleRawbtPrint = (sub: Subscriber) => {
    const collectorName = users?.find(u => u.uid === sub.createdBy)?.displayName || profile.displayName;
    const receiptText = formatSubscriptionRawBT(sub, collectorName);
    printViaRawBT(receiptText);
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingSub) {
        await updateDoc(doc(db, 'subscribers', editingSub.id), {
          name: name.trim(),
          phone: phone.trim(),
          nationalId: nationalId.trim(),
          subscriptionFeePaid: subFee
        });
        setEditingSub(null);
      } else {
        const receiptNo = `SUB-${Date.now().toString().slice(-6)}`;
        const docRef = await addDoc(collection(db, 'subscribers'), {
          name: name.trim(),
          phone: phone.trim(),
          nationalId: nationalId.trim(),
          subscriptionDate: new Date().toISOString(),
          subscriptionFeePaid: subFee,
          status: 'active',
          receiptNumber: receiptNo,
          createdBy: profile.uid
        });

        // Update collector balance
        const userRef = doc(db, 'users', profile.uid);
        await updateDoc(userRef, {
          balance: (profile.balance || 0) + subFee
        });

        // Open print modal
        const newSubObj: Subscriber = {
          id: docRef.id,
          name: name.trim(),
          phone: phone.trim(),
          nationalId: nationalId.trim(),
          subscriptionDate: new Date().toISOString(),
          subscriptionFeePaid: subFee,
          status: 'active',
          receiptNumber: receiptNo,
          createdBy: profile.uid
        };
        setSelectedSubForPrint(newSubObj);
      }

      setName('');
      setPhone('');
      setNationalId('');
      setSubFee(SUBSCRIPTION_FEE);
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, editingSub ? OperationType.UPDATE : OperationType.CREATE, 'subscribers');
    }
  };

  const filtered = subscribers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.nationalId && s.nationalId.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.phone && s.phone.includes(searchTerm))
  );

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو رقم البطاقة أو الهاتف..."
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#0088cc] outline-none shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingSub(null);
              setName('');
              setPhone('');
              setNationalId('');
              setSubFee(SUBSCRIPTION_FEE);
              setIsAdding(true);
            }}
            className="px-4 py-2.5 bg-[#0088cc] hover:bg-[#0077b6] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-sky-200 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مشترك جديد</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-sky-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-sky-50/70 border-b border-slate-100 text-slate-700 font-bold">
                <th className="p-4">رقم الوصل</th>
                <th className="p-4">اسم المشترك</th>
                <th className="p-4">رقم البطاقة</th>
                <th className="p-4">الهاتف</th>
                <th className="p-4">تاريخ الاشتراك</th>
                <th className="p-4">واجب الانخراط</th>
                <th className="p-4">الإجراءات والطباعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(sub => {
                const subReceiptNo = sub.receiptNumber || `SUB-${sub.id.slice(-6).toUpperCase()}`;
                return (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono font-bold text-[#006699]">
                      <span className="px-2 py-0.5 bg-sky-50 text-[#0077b6] rounded-md border border-sky-200">
                        {subReceiptNo}
                      </span>
                    </td>
                    <td className="p-4 font-black text-slate-900">{sub.name}</td>
                    <td className="p-4 font-mono font-semibold text-slate-600">{sub.nationalId || '—'}</td>
                    <td className="p-4 font-mono text-slate-600">{sub.phone || '—'}</td>
                    <td className="p-4 text-slate-500">{formatDate(sub.subscriptionDate)}</td>
                    <td className="p-4 font-black text-[#0088cc]">
                      {formatCurrency(sub.subscriptionFeePaid || SUBSCRIPTION_FEE)}
                    </td>
                    <td className="p-4 flex items-center gap-1.5">
                      {/* Sunmi RawBT Print Button */}
                      <button
                        onClick={() => handleRawbtPrint(sub)}
                        className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-[#0077b6] rounded-lg font-bold border border-sky-200 flex items-center gap-1"
                        title="طباعة حرارية عبر RawBT"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>RawBT</span>
                      </button>

                      {/* Standard Print */}
                      <button
                        onClick={() => {
                          setSelectedSubForPrint(sub);
                          setTimeout(() => handleStandardPrint(), 200);
                        }}
                        className="p-1.5 text-slate-400 hover:text-[#0088cc] rounded-lg"
                        title="طباعة PDF / A4"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => {
                          setEditingSub(sub);
                          setName(sub.name);
                          setPhone(sub.phone || '');
                          setNationalId(sub.nationalId || '');
                          setSubFee(sub.subscriptionFeePaid || SUBSCRIPTION_FEE);
                          setIsAdding(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                        title="تعديل"
                      >
                        <PenTool className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => {
                          showConfirm('حذف المشترك', `هل أنت متأكد من حذف المشترك "${sub.name}"؟`, async () => {
                            try {
                              await deleteDoc(doc(db, 'subscribers', sub.id));
                            } catch (err) {
                              handleFirestoreError(err, OperationType.DELETE, 'subscribers');
                            }
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">لا يوجد مشتركون مطابقون للبحث</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-right space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSub ? 'تعديل بيانات المشترك' : 'إضافة مشترك جديد'}
              </h3>
              <button onClick={() => setIsAdding(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddOrUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل للمشترك *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: لحسن العامري"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#0088cc] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم البطاقة الوطنية</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="مثال: PA123456"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#0088cc] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="06XXXXXXXX"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#0088cc] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ واجب الانخراط (درهم)</label>
                <input
                  type="number"
                  required
                  value={subFee}
                  onChange={(e) => setSubFee(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-[#0088cc] focus:ring-2 focus:ring-[#0088cc] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#0088cc] hover:bg-[#0077b6] text-white font-black text-xs rounded-xl shadow-md shadow-sky-200"
                >
                  {editingSub ? 'حفظ التعديلات' : 'تأكيد الإضافة'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Hidden Printable Receipt */}
      <div className="hidden">
        {selectedSubForPrint && (
          <ReceiptPrint ref={printRef} data={selectedSubForPrint} type="subscription" />
        )}
      </div>
    </motion.div>
  );
}

// ==========================================
// 4. Irrigation View (With Sunmi RawBT Instant Print)
// ==========================================
function IrrigationView({ 
  sessions, 
  subscribers, 
  profile, 
  users, 
  showConfirm 
}: { 
  sessions: IrrigationSession[]; 
  subscribers: Subscriber[]; 
  profile: UserProfile; 
  users: UserProfile[]; 
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState('');
  const [hours, setHours] = useState(1);
  const [selectedSession, setSelectedSession] = useState<IrrigationSession | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handleStandardPrint = useReactToPrint({
    contentRef: printRef,
  });

  const handleRawbtPrintSession = (session: IrrigationSession) => {
    const collectorName = users?.find(u => u.uid === session.collectedBy)?.displayName || profile.displayName;
    const receiptText = formatIrrigationRawBT(session, collectorName);
    printViaRawBT(receiptText);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId || hours <= 0) return;

    const sub = subscribers.find(s => s.id === selectedSubId);
    if (!sub) return;

    try {
      const totalAmount = hours * IRRIGATION_RATE;
      const workerWage = hours * WORKER_WAGE_PER_HOUR;
      const receiptNumber = `IRR-${Date.now().toString().slice(-6)}`;

      const newSession = {
        subscriberId: sub.id,
        subscriberName: sub.name,
        hours,
        rate: IRRIGATION_RATE,
        totalAmount,
        workerWage,
        date: new Date().toISOString(),
        status: 'paid' as const,
        collectedBy: profile.uid,
        receiptNumber
      };

      const docRef = await addDoc(collection(db, 'sessions'), { ...newSession, createdBy: profile.uid });

      // Update collector balance
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        balance: (profile.balance || 0) + totalAmount
      });

      const sessionObj: IrrigationSession = { id: docRef.id, ...newSession };
      setSelectedSession(sessionObj);

      // Auto trigger RawBT print on Sunmi device
      handleRawbtPrintSession(sessionObj);

      setHours(1);
      setSelectedSubId('');
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'sessions');
    }
  };

  const handleCancel = async (session: IrrigationSession) => {
    showConfirm('إلغاء الوصل', 'هل أنت متأكد من إلغاء هذا الوصل؟ سيتم خصم المبلغ من رصيد المكلف.', async () => {
      try {
        await updateDoc(doc(db, 'sessions', session.id), { status: 'cancelled' });
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
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsAdding(true)}
          className="bg-[#0088cc] hover:bg-[#0077b6] text-white font-black py-3 px-6 rounded-2xl transition-all shadow-md shadow-sky-200 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>تسجيل حصة سقي جديدة (استخلاص)</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-sky-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-sky-50/70 border-b border-slate-100 text-slate-700 font-bold">
                <th className="p-4">رقم الوصل</th>
                <th className="p-4">المشترك</th>
                <th className="p-4">المكلف بالمستحقات</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4">الساعات</th>
                <th className="p-4">المبلغ</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">الإجراءات والطباعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map(session => {
                const collectorName = users?.find(u => u.uid === session.collectedBy)?.displayName || profile.displayName;
                const irrReceiptNo = session.receiptNumber || `IRR-${session.id.slice(-6).toUpperCase()}`;
                return (
                  <tr key={session.id} className={`hover:bg-slate-50 ${session.status === 'cancelled' ? 'opacity-50 grayscale' : ''}`}>
                    <td className="p-4 font-mono font-bold text-[#006699]">
                      <span className="px-2 py-0.5 bg-sky-50 text-[#0077b6] rounded-md border border-sky-200">
                        {irrReceiptNo}
                      </span>
                    </td>
                    <td className="p-4 font-black text-slate-900">{session.subscriberName}</td>
                    <td className="p-4 font-bold text-sky-800">{collectorName}</td>
                    <td className="p-4 text-slate-500">{formatDate(session.date)}</td>
                    <td className="p-4 text-slate-700 font-medium">{session.hours} ساعة</td>
                    <td className="p-4 font-black text-[#0088cc]">{formatCurrency(session.totalAmount)}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        session.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {session.status === 'paid' ? 'مؤدى' : 'ملغى'}
                      </span>
                    </td>
                    <td className="p-4 flex items-center gap-1.5">
                      {/* Sunmi RawBT Print Button */}
                      <button
                        onClick={() => handleRawbtPrintSession(session)}
                        className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-[#0077b6] rounded-lg font-bold border border-sky-200 flex items-center gap-1"
                        title="طباعة إيصال في آلة Sunmi عبر RawBT"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>RawBT</span>
                      </button>

                      {/* Standard Print */}
                      <button
                        onClick={() => {
                          const collectorUser = users?.find(u => u.uid === session.collectedBy) || profile;
                          setSelectedSession({
                            ...session,
                            collectorName,
                            collectorSignatureUrl: collectorUser.signatureUrl
                          } as any);
                          setTimeout(() => handleStandardPrint(), 150);
                        }}
                        className="p-1.5 text-slate-400 hover:text-[#0088cc] rounded-lg"
                        title="معاينة وطباعة عادية"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {session.status === 'paid' && (
                        <button
                          onClick={() => handleCancel(session)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg"
                          title="إلغاء الوصل"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}

                      {session.status === 'paid' && !session.workerWagePaid && profile.role === 'amin' && (
                        <button
                          onClick={() => updateDoc(doc(db, 'sessions', session.id), { workerWagePaid: true })}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                          title="تأكيد أداء أجرة العامل"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          showConfirm('حذف الوصل', 'هل أنت متأكد من حذف هذه العملية نهائياً؟', async () => {
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
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">لا توجد عمليات سقي مسجلة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Session Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-right space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">تسجيل حصة سقي واستخلاص</h3>
              <button onClick={() => setIsAdding(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">اختر المشترك *</label>
                <select
                  required
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-sky-50/50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#0088cc] outline-none"
                >
                  <option value="">-- اختر مشتركاً --</option>
                  {subscribers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">عدد ساعات السقي</label>
                <input
                  type="number"
                  required
                  min="0.5"
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-sky-50/50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-[#0088cc] outline-none"
                />
              </div>

              <div className="bg-sky-50/70 p-4 rounded-2xl space-y-2 border border-sky-100 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>ثمن ساعة السقي:</span>
                  <span className="font-bold">{formatCurrency(IRRIGATION_RATE)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>أجرة العامل ({hours} س):</span>
                  <span className="font-bold">{formatCurrency(hours * WORKER_WAGE_PER_HOUR)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-sky-200 text-[#006699] font-black text-base">
                  <span>المجموع للأداء:</span>
                  <span>{formatCurrency(hours * IRRIGATION_RATE)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#0088cc] hover:bg-[#0077b6] text-white font-black text-xs rounded-xl shadow-md shadow-sky-200 flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>تأكيد الأداء والطباعة الفورية</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Hidden Print Container */}
      <div className="hidden">
        {selectedSession && <ReceiptPrint ref={printRef} data={selectedSession} type="irrigation" />}
      </div>
    </motion.div>
  );
}

// ==========================================
// 5. Expenses View
// ==========================================
function ExpensesView({ 
  expenses, 
  profile, 
  users 
}: { 
  expenses: Expense[]; 
  profile: UserProfile; 
  users?: UserProfile[]; 
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) return;

    try {
      await addDoc(collection(db, 'expenses'), {
        description: description.trim(),
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
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setIsAdding(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-black py-3 px-6 rounded-2xl transition-all shadow-md shadow-red-200 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة مصاريف جديدة</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-sky-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-red-50/70 border-b border-slate-100 text-red-900 font-bold">
                <th className="p-4">الوصف والبيان</th>
                <th className="p-4">المضيف / المسؤول</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4">المبلغ</th>
                <th className="p-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map(expense => {
                const adderName = users?.find(u => u.uid === expense.addedBy || u.uid === expense.createdBy)?.displayName || profile.displayName;
                return (
                  <tr key={expense.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">{expense.description}</td>
                    <td className="p-4 text-slate-600 font-medium">{adderName}</td>
                    <td className="p-4 text-slate-500">{formatDate(expense.date)}</td>
                    <td className="p-4 font-black text-red-600">{formatCurrency(expense.amount)}</td>
                    <td className="p-4">
                      <button
                        onClick={async () => {
                          if (confirm('هل أنت متأكد من حذف هذه المصاريف؟')) {
                            try {
                              await deleteDoc(doc(db, 'expenses', expense.id));
                            } catch (err) {
                              handleFirestoreError(err, OperationType.DELETE, 'expenses');
                            }
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">لا توجد مصاريف مسجلة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-right space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">إضافة مصاريف وتكاليف</h3>
              <button onClick={() => setIsAdding(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف المصاريف *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: شراء صمام مياه أو إصلاح أنبوب"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ (درهم) *</label>
                <input
                  type="number"
                  required
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-red-600 focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md shadow-red-200"
                >
                  تأكيد الإضافة
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// ==========================================
// 6. Reports View (With RawBT Report Summary)
// ==========================================
function ReportsView({ 
  sessions, 
  expenses, 
  transfers, 
  subscribers 
}: { 
  sessions: IrrigationSession[]; 
  expenses: Expense[]; 
  transfers: Transfer[]; 
  subscribers: Subscriber[]; 
}) {
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
  const totalSubscriptions = filteredSubscriptions.reduce((acc, s) => acc + (s.subscriptionFeePaid || SUBSCRIPTION_FEE), 0);
  const netIrrigation = totalIrrigation - totalWorkerWagesConfirmed;
  const totalIncome = netIrrigation + totalSubscriptions;
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0) + totalWorkerWagesConfirmed;
  const netBalance = totalIncome - totalExpenses;

  const handleRawbtReportPrint = () => {
    const reportText = formatReportRawBT(startDate, endDate, netIrrigation, totalSubscriptions, totalIncome, totalExpenses, netBalance);
    printViaRawBT(reportText);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      {/* Date Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-sky-100 shadow-sm flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">من تاريخ</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-[#0088cc]"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">إلى تاريخ</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-[#0088cc]"
          />
        </div>

        <button
          onClick={() => { setStartDate(''); setEndDate(''); }}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl"
        >
          إعادة ضبط
        </button>

        {/* RawBT Report Print */}
        <button
          onClick={handleRawbtReportPrint}
          className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-[#0077b6] text-xs font-bold rounded-xl border border-sky-200 flex items-center gap-1.5"
          title="طباعة تقرير حراري عبر RawBT"
        >
          <Smartphone className="w-4 h-4" />
          <span>تقرير RawBT (Sunmi)</span>
        </button>

        {/* Standard Print */}
        <button
          onClick={() => handlePrintReport()}
          className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b6] text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة تقرير كامل (A4)</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm">
          <p className="text-xs font-bold text-slate-500 mb-1">مداخيل السقي (الصافي)</p>
          <p className="text-xl font-black text-[#0088cc]">{formatCurrency(netIrrigation)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm">
          <p className="text-xs font-bold text-slate-500 mb-1">مداخيل الاشتراكات</p>
          <p className="text-xl font-black text-slate-800">{formatCurrency(totalSubscriptions)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm">
          <p className="text-xs font-bold text-slate-500 mb-1">إجمالي المصاريف والأجور</p>
          <p className="text-xl font-black text-red-600">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm">
          <p className="text-xs font-bold text-slate-500 mb-1">الرصيد الصافي المتبقي</p>
          <p className={`text-xl font-black ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(netBalance)}
          </p>
        </div>
      </div>

      {/* Hidden Printable Report */}
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
    </motion.div>
  );
}

// ==========================================
// 7. Transfers View
// ==========================================
function TransfersView({ 
  users, 
  transfers, 
  profile 
}: { 
  users: UserProfile[]; 
  transfers: Transfer[]; 
  profile: UserProfile; 
}) {
  const [amount, setAmount] = useState<number>(0);
  const [toUid, setToUid] = useState('');

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toUid || amount <= 0 || amount > (profile.balance || 0)) return;

    try {
      await addDoc(collection(db, 'transfers'), {
        fromUid: profile.uid,
        toUid,
        amount,
        date: new Date().toISOString(),
        createdBy: profile.uid
      });

      await updateDoc(doc(db, 'users', profile.uid), {
        balance: (profile.balance || 0) - amount
      });

      const receiver = users.find(u => u.uid === toUid);
      if (receiver) {
        await updateDoc(doc(db, 'users', toUid), {
          balance: (receiver.balance || 0) + amount
        });
      }

      setAmount(0);
      setToUid('');
      alert('تم تحويل المبلغ بنجاح!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'transfers');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm space-y-4">
        <h3 className="text-lg font-black text-slate-900">تحويل رصيد جديد</h3>
        <div className="bg-sky-50 p-4 rounded-2xl">
          <p className="text-xs text-slate-500 mb-1">رصيدك المتاح للتحويل:</p>
          <p className="text-2xl font-black text-[#0088cc]">{formatCurrency(profile.balance || 0)}</p>
        </div>

        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">تحويل إلى *</label>
            <select
              required
              value={toUid}
              onChange={(e) => setToUid(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#0088cc]"
            >
              <option value="">-- اختر المستلم --</option>
              {users.filter(u => u.uid !== profile.uid).map(u => (
                <option key={u.uid} value={u.uid}>{u.displayName} ({u.role === 'amin' ? 'أمين المال' : 'مكلف'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المراد تحويله (درهم) *</label>
            <input
              type="number"
              required
              max={profile.balance || 0}
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-[#0088cc] outline-none focus:ring-2 focus:ring-[#0088cc]"
            />
          </div>

          <button
            type="submit"
            disabled={amount <= 0 || amount > (profile.balance || 0)}
            className="w-full py-3 bg-[#0088cc] hover:bg-[#0077b6] text-white font-black text-xs rounded-xl shadow-md shadow-sky-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>تأكيد التحويل</span>
          </button>
        </form>
      </div>

      <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-sky-100 shadow-sm space-y-4">
        <h3 className="text-lg font-black text-slate-900">سجل التحويلات بين الأعضاء</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {transfers.map(t => {
            const fromUser = users.find(u => u.uid === t.fromUid);
            const toUser = users.find(u => u.uid === t.toUid);
            const isSender = t.fromUid === profile.uid;
            return (
              <div key={t.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSender ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900">
                      {isSender ? `تحويل إلى: ${toUser?.displayName || 'مستخدم'}` : `استلام من: ${fromUser?.displayName || 'مستخدم'}`}
                    </p>
                    <p className="text-[10px] text-slate-400">{formatDate(t.date)}</p>
                  </div>
                </div>
                <p className={`font-black text-sm ${isSender ? 'text-red-600' : 'text-emerald-600'}`}>
                  {isSender ? '-' : '+'}{formatCurrency(t.amount)}
                </p>
              </div>
            );
          })}
          {transfers.length === 0 && <p className="p-8 text-center text-slate-400 text-xs">لا توجد تحويلات مسجلة</p>}
        </div>
      </div>
    </motion.div>
  );
}

// ==========================================
// 8. Association Balance & Financial View
// ==========================================
function AssociationBalanceView({ 
  users, 
  sessions, 
  expenses, 
  subscribers 
}: { 
  users: UserProfile[]; 
  sessions: IrrigationSession[]; 
  expenses: Expense[]; 
  subscribers: Subscriber[]; 
}) {
  const totalBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);
  const totalIncome = sessions.filter(s => s.status === 'paid').reduce((acc, s) => acc + s.totalAmount, 0) + subscribers.reduce((acc, s) => acc + (s.subscriptionFeePaid || SUBSCRIPTION_FEE), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-gradient-to-r from-[#105a8b] via-[#0077b6] to-[#0284c7] text-white p-8 rounded-3xl shadow-lg">
        <p className="text-xs font-bold text-sky-100 mb-1">الرصيد الكلي للجمعية (مجموع أرصدة المستخدمين)</p>
        <p className="text-4xl font-black">{formatCurrency(totalBalance)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm">
          <p className="text-xs font-bold text-slate-500 mb-1">إجمالي المداخيل المسجلة</p>
          <p className="text-2xl font-black text-[#0088cc]">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm">
          <p className="text-xs font-bold text-slate-500 mb-1">إجمالي المصاريف المسجلة</p>
          <p className="text-2xl font-black text-red-600">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">تفاصيل أرصدة الأعضاء والمكلفين</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map(u => (
            <div key={u.uid} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-slate-900">{u.displayName || 'بدون اسم'}</p>
                <p className="text-[10px] text-slate-500">{u.role === 'amin' ? 'أمين المال' : u.role === 'rais' ? 'رئيس' : 'مكلف بالتحصيل'}</p>
              </div>
              <p className="font-black text-sm text-[#0088cc]">{formatCurrency(u.balance || 0)}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function FinancialManagementView({ 
  sessions, 
  expenses, 
  subscribers, 
  profile 
}: { 
  sessions: IrrigationSession[]; 
  expenses: Expense[]; 
  subscribers: Subscriber[]; 
  profile: UserProfile; 
}) {
  const [otherIncomes, setOtherIncomes] = useState<OtherIncome[]>([]);

  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(collection(db, 'otherIncomes'), (snapshot) => {
      setOtherIncomes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OtherIncome)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'otherIncomes'));
    return () => unsub();
  }, [profile.uid]);

  const totalOtherIncome = otherIncomes.reduce((acc, i) => acc + i.amount, 0);
  const totalIncome = sessions.filter(s => s.status === 'paid').reduce((acc, s) => acc + s.totalAmount, 0) + subscribers.reduce((acc, s) => acc + (s.subscriptionFeePaid || SUBSCRIPTION_FEE), 0) + totalOtherIncome;
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm">
          <h3 className="font-bold text-sm text-slate-700 mb-1">مجموع المداخيل</h3>
          <p className="text-3xl font-black text-[#0088cc]">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm">
          <h3 className="font-bold text-sm text-slate-700 mb-1">مجموع المصاريف</h3>
          <p className="text-3xl font-black text-red-600">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900">المداخيل الإضافية المسجلة</h3>
        <div className="space-y-2">
          {otherIncomes.map(i => (
            <div key={i.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
              <div>
                <p className="font-bold text-xs text-slate-900">{i.description}</p>
                <p className="text-[10px] text-slate-500">{i.category} • {i.payerName} • {formatDate(i.date)}</p>
              </div>
              <p className="font-black text-sm text-[#0088cc]">{formatCurrency(i.amount)}</p>
            </div>
          ))}
          {otherIncomes.length === 0 && <p className="text-slate-400 text-center py-6 text-xs">لا توجد مداخيل إضافية</p>}
        </div>
      </div>
    </motion.div>
  );
}

// ==========================================
// 9. Activity Log View
// ==========================================
function ActivityLogView({ 
  users, 
  subscribers, 
  sessions, 
  expenses, 
  transfers 
}: { 
  users: UserProfile[]; 
  subscribers: Subscriber[]; 
  sessions: IrrigationSession[]; 
  expenses: Expense[]; 
  transfers: Transfer[]; 
}) {
  const activities = [
    ...subscribers.map(s => ({ ...s, type: 'مشترك جديد', details: `${s.name} (${s.receiptNumber || `SUB-${s.id.slice(-6).toUpperCase()}`})`, date: s.subscriptionDate })),
    ...sessions.map(s => ({ ...s, type: 'عملية سقي', details: `${s.subscriberName} - ${s.hours} ساعة (${s.receiptNumber || `IRR-${s.id.slice(-6).toUpperCase()}`})`, date: s.date })),
    ...expenses.map(e => ({ ...e, type: 'مصاريف', details: `${e.description} (${formatCurrency(e.amount)})`, date: e.date })),
    ...transfers.map(t => ({ ...t, type: 'تحويل رصيد', details: `مبلغ ${formatCurrency(t.amount)}`, date: t.date })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm space-y-4">
      <h3 className="text-lg font-black text-slate-900">سجل العمليات والأنشطة</h3>
      <div className="space-y-3">
        {activities.map((a: any, i) => {
          const user = users.find(u => u.uid === a.createdBy);
          return (
            <div key={i} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-xs text-slate-900">{a.type}</p>
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-md">{a.details}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(a.date)}</p>
              </div>
              <span className="text-[11px] font-bold text-[#0077b6] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100 self-start sm:self-auto">
                بواسطة: {user?.displayName || 'مستخدم'}
              </span>
            </div>
          );
        })}
        {activities.length === 0 && <p className="text-center text-slate-400 py-8 text-xs">لا توجد أنشطة مسجلة</p>}
      </div>
    </motion.div>
  );
}

// ==========================================
// 10. Settings & User Management
// ==========================================
function SettingsView({ 
  users, 
  profile, 
  showConfirm 
}: { 
  users: UserProfile[]; 
  profile?: UserProfile; 
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}) {
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
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm space-y-4 max-w-xl">
        <h3 className="text-lg font-black text-slate-900">إعدادات التسعير وخاتم الجمعية</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الاشتراك السنوي (درهم)</label>
            <input
              type="number"
              value={subFee}
              onChange={(e) => setSubFee(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-[#0088cc] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ساعة السقي (درهم)</label>
            <input
              type="number"
              value={irrRate}
              onChange={(e) => setIrrRate(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-[#0088cc] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">أجرة العامل/س (درهم)</label>
            <input
              type="number"
              value={workerWage}
              onChange={(e) => setWorkerWage(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-800 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">خاتم / توقيع الجمعية (للطباعة في الوصل)</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              dir="ltr"
              value={assocSignature}
              onChange={(e) => setAssocSignature(e.target.value)}
              placeholder="رابط أو اختر صورة"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono outline-none"
            />
            <button
              type="button"
              onClick={() => setIsSigPadOpen(true)}
              className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-[#0077b6] text-xs font-bold rounded-xl border border-sky-200 shrink-0 flex items-center gap-1"
            >
              <PenTool className="w-4 h-4" />
              <span>رسم</span>
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-[#0088cc] hover:bg-[#0077b6] text-white font-black text-xs rounded-xl shadow-md shadow-sky-200 transition-all cursor-pointer"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
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

function UserManagementView({ 
  users, 
  profile, 
  showConfirm 
}: { 
  users: UserProfile[]; 
  profile?: UserProfile; 
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}) {
  const isAmin = profile?.role === 'amin';
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('mukallaf');
  const [newSignatureUrl, setNewSignatureUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');

    if (!newEmail.trim() || !newPassword || !newDisplayName.trim()) {
      setAddError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      const newUser = await createNewUserAccount(newEmail.trim(), newPassword);
      const newProfile: UserProfile = {
        uid: newUser.uid,
        email: newEmail.trim().toLowerCase(),
        displayName: newDisplayName.trim(),
        role: newRole,
        signatureUrl: newSignatureUrl.trim(),
        allowedTabs: newRole === 'amin' 
          ? ['dashboard', 'subscribers', 'irrigation', 'expenses', 'reports', 'transfers', 'activity', 'balance', 'financial'] 
          : ['dashboard', 'subscribers', 'irrigation', 'expenses', 'reports', 'transfers', 'activity', 'balance', 'financial'],
        balance: 0
      };

      await setDoc(doc(db, 'users', newUser.uid), newProfile);
      setAddSuccess(`تم إنشاء الحساب بنجاح للمستخدم "${newDisplayName}"`);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setAddSuccess('');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setAddError('تعذر إنشاء الحساب. قد يكون البريد الإلكتروني مسجلاً مسبقاً.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-black text-slate-900">إدارة الأعضاء والمكلفين</h3>
          <p className="text-xs text-slate-500">التحكم في أدوار وصلاحيات وتواقيع المكلفين</p>
        </div>
        {isAmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b6] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مستخدم جديد</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {users.map(u => (
          <div key={u.uid} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-xs text-slate-900">{u.displayName || 'بدون اسم'}</p>
              <p className="text-[10px] text-slate-500 font-mono">{u.email} • {u.role === 'amin' ? 'أمين المال' : u.role === 'rais' ? 'رئيس' : 'مكلف بالتحصيل'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0088cc] px-3 py-1 bg-sky-50 rounded-lg border border-sky-100">
                الرصيد: {formatCurrency(u.balance || 0)}
              </span>
              {isAmin && u.email?.toLowerCase() !== 'amriahassan@gmail.com' && (
                <button
                  onClick={() => {
                    showConfirm?.('حذف المستخدم', `هل أنت متأكد من حذف الحساب "${u.displayName || u.email}"؟`, async () => {
                      try {
                        await deleteDoc(doc(db, 'users', u.uid));
                      } catch (err) {
                        console.error(err);
                      }
                    });
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                  title="حذف الحساب"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-right space-y-4" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">إضافة مستخدم جديد</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            {addError && <p className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold">{addError}</p>}
            {addSuccess && <p className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold">{addSuccess}</p>}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور *</label>
                <input
                  type="password"
                  required
                  dir="ltr"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الدور والصلاحية</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="mukallaf">مكلف بالتحصيل والسقي</option>
                  <option value="rais">رئيس الجمعية</option>
                  <option value="amin">أمين المال</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#0088cc] hover:bg-[#0077b6] text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
