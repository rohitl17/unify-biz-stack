import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import Sales from './components/Sales';
import Support from './components/Support';
import Marketing from './components/Marketing';
import CustomerSuccess from './components/CustomerSuccess';
import CustomerDetail from './components/CustomerDetail';
import { 
  Building2, 
  BarChart2, 
  MessageSquare, 
  TrendingUp, 
  ShieldCheck, 
  LogOut,
  LayoutDashboard,
  Bell,
  Search,
  ChevronRight,
  Clock as ClockIcon,
  CheckCircle2 as CheckCircleIcon,
  Plus as PlusIcon
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { db } from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

type Module = 'overview' | 'sales' | 'support' | 'marketing' | 'success';

function AppContent() {
  const { user, profile, loading, authError, login, logout } = useAuth();
  const [activeModule, setActiveModule] = useState<Module>('overview');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'tasks'), where('assignedTo', '==', user.uid), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, () => {
       // Silent fail for demo
    });
    return () => unsub();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bento-bg">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-bento-text border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col md:flex-row">
        <div className="flex-1 p-8 md:p-24 flex flex-col justify-center space-y-8 text-bento-text">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-extrabold tracking-tighter uppercase font-sans">UNIFY.</div>
          </div>
          <div className="space-y-4 max-w-xl">
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tighter">
              One Engine. <br/><span className="text-accent-sales">Unified Growth.</span>
            </h1>
            <p className="text-xl text-bento-muted leading-relaxed font-medium">
              Nexus unifies Sales, Support, Marketing, and Success into a single mission control. Build better customer relationships through data-driven alignment.
            </p>
          </div>
          <button
            onClick={login}
            className="flex items-center justify-center gap-3 bg-bento-text text-white px-8 py-5 rounded-2xl hover:opacity-90 transition-all text-lg font-bold shadow-xl w-full md:w-fit"
          >
            Get Started with Google
            <ChevronRight className="w-5 h-5" />
          </button>
          {authError && (
            <p className="text-red-500 text-sm font-medium bg-red-50 border border-red-200 rounded-xl px-4 py-3 max-w-xl break-words">
              {authError}
            </p>
          )}
        </div>
        <div className="flex-1 bg-bento-bg p-8 hidden md:flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-sales/10 to-accent-marketing/10" />
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative bg-white p-8 rounded-[16px] shadow-2xl border border-bento-border max-w-md w-full"
          >
             <div className="flex items-center justify-between mb-8">
               <div className="flex gap-2">
                 <div className="w-3 h-3 rounded-full bg-red-400" />
                 <div className="w-3 h-3 rounded-full bg-yellow-400" />
                 <div className="w-3 h-3 rounded-full bg-green-400" />
               </div>
               <div className="text-[10px] font-bold text-bento-muted uppercase tracking-widest">Analytics Dashboard</div>
             </div>
             <div className="space-y-6">
                <div className="h-4 bg-gray-100 rounded-full w-3/4" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-24 bg-blue-50 rounded-[16px] flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-accent-sales" />
                  </div>
                  <div className="h-24 bg-emerald-50 rounded-[16px] flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-accent-cs" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-100 rounded-full w-full" />
                  <div className="h-3 bg-gray-100 rounded-full w-5/6" />
                </div>
             </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales Pipeline', icon: TrendingUp },
    { id: 'marketing', label: 'Marketing Hub', icon: BarChart2 },
    { id: 'success', label: 'Customer Success', icon: ShieldCheck },
    { id: 'support', label: 'Support Inbox', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-bento-bg flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 lg:w-[240px] bg-white border-r border-bento-border flex flex-col h-screen shrink-0 p-6 gap-8">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-extrabold tracking-tighter text-bento-text uppercase">UNIFY.</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveModule(item.id as Module);
                setSelectedCustomerName(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeModule === item.id 
                  ? 'bg-gray-50 text-bento-text font-semibold' 
                  : 'text-bento-muted hover:text-bento-text font-medium'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block text-[14px]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-bento-border">
          <div className="flex items-center gap-3">
            <img 
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              alt="Avatar" 
              className="w-10 h-10 rounded-xl bg-gray-100 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="hidden lg:block overflow-hidden">
              <p className="text-[13px] font-bold text-bento-text truncate">{profile?.name || user.displayName}</p>
              <p className="text-[11px] font-medium text-bento-muted uppercase truncate">{profile?.role || 'Member'}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full mt-4 flex items-center gap-3 px-3 py-2 rounded-lg text-bento-muted hover:text-red-500 hover:bg-red-50 transition-colors font-bold text-xs"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:block">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 h-full overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {activeModule === 'overview' && (
                  <div className="bento-grid">
                    {/* SALES CARD */}
                    <section className="dashboard-card col-span-1 md:col-span-2 lg:row-span-2 justify-between">
                      <div>
                        <span className="pill pill-sales uppercase">Sales</span>
                        <div className="card-title mt-3">Revenue Pipeline</div>
                        <div className="stat-large">$428,500</div>
                      </div>
                      <div className="flex-1 flex flex-col justify-center gap-4">
                        <div className="space-y-1">
                          <div className="text-[11px] text-bento-muted font-bold">LEAD CONVERSION (82%)</div>
                          <div className="h-3 bg-bento-bg rounded-full overflow-hidden">
                            <div className="h-full bg-accent-sales w-[82%]" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] text-bento-muted font-bold">WIN RATE (45%)</div>
                          <div className="h-3 bg-bento-bg rounded-full overflow-hidden">
                            <div className="h-full bg-accent-sales opacity-60 w-[45%]" />
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* MARKETING REACH */}
                    <section className="dashboard-card col-span-1">
                      <span className="pill pill-marketing uppercase">Marketing</span>
                      <div className="card-title mt-2">Reach</div>
                      <div className="stat-large">1.2M</div>
                      <div className="text-[11px] text-accent-cs font-bold tracking-tight">+12.4% vs last mo</div>
                    </section>

                    {/* SUPPORT LIST */}
                    <section className="dashboard-card col-span-1 lg:row-span-3">
                      <span className="pill pill-support uppercase">Support</span>
                      <div className="card-title mt-2">Live Tickets</div>
                      <div className="flex-1 mt-3 space-y-4 overflow-hidden">
                        {[
                          { name: 'Integration Error', desc: 'Acme Corp • 2m ago', customer: 'Acme Corp' },
                          { name: 'Billing Inquiry', desc: 'Globex • 15m ago', customer: 'Globex' },
                          { name: 'New Seat Request', desc: 'Stark Ind • 1h ago', customer: 'Stark Ind' },
                          { name: 'UI Bug Report', desc: 'Wayne Ent • 3h ago', customer: 'Wayne Ent' },
                          { name: 'Password Reset', desc: 'Umbrella • 4h ago', customer: 'Umbrella Corp' },
                        ].map((item, i) => (
                           <div 
                            key={i} 
                            onClick={() => { setSelectedCustomerName(item.customer); setActiveModule('success'); }}
                            className="pb-3 border-b border-gray-50 last:border-0 border-dashed cursor-pointer group/item"
                           >
                              <div className="text-[13px] font-bold group-hover/item:text-accent-support transition-colors">{item.name}</div>
                              <div className="text-[11px] text-bento-muted font-medium">{item.desc}</div>
                           </div>
                        ))}
                      </div>
                      <button onClick={() => setActiveModule('support')} className="text-[12px] text-accent-support text-center font-bold hover:underline mt-4">
                        View all 24 tickets
                      </button>
                    </section>

                    {/* CS HEALTH */}
                    <section className="dashboard-card col-span-1 lg:row-span-2 items-center justify-center gap-2">
                       <span className="pill pill-cs uppercase self-start">Success</span>
                       <div className="card-title self-start">Avg Health Score</div>
                       <div className="w-24 h-24 border-[8px] border-accent-cs rounded-full flex items-center justify-center font-extrabold text-2xl my-4">
                         88
                       </div>
                       <div className="text-center text-[11px] text-bento-muted font-bold">Retention Risk: 2 accounts</div>
                    </section>

                    {/* ACTION ITEMS */}
                    <section className="dashboard-card col-span-1 md:col-span-2 lg:row-span-2">
                       <div className="card-title">Unified Action Queue</div>
                       <div className="flex-1 flex flex-col justify-center gap-3 mt-4">
                         {tasks.map((task) => (
                           <div 
                            key={task.id} 
                            onClick={() => { if(task.relatedTo) setSelectedCustomerName(task.relatedTo); setActiveModule('success'); }}
                            className="flex items-center gap-3 cursor-pointer group/item p-2 hover:bg-gray-50 rounded-xl transition-all"
                           >
                              <div className={`w-2 h-2 rounded-full shrink-0 ${
                                task.priority === 'high' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                                task.priority === 'medium' ? 'bg-amber-400' : 'bg-accent-cs'
                              }`} />
                              <div className="flex-1">
                                <div className="text-[13px] font-bold text-bento-text group-hover/item:text-accent-sales transition-colors">{task.title}</div>
                                <div className="text-[10px] text-bento-muted font-bold uppercase tracking-widest">{task.category} • {task.relatedTo || 'General'}</div>
                              </div>
                              <div className="text-[10px] font-black text-bento-muted">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}</div>
                           </div>
                         ))}
                         {tasks.length === 0 && (
                           <div className="flex flex-col items-center justify-center py-8 text-bento-muted bg-bento-bg/30 rounded-2xl border border-dashed border-bento-border">
                              <CheckCircleIcon className="w-8 h-8 mb-2 opacity-20" />
                              <p className="text-sm font-bold italic">All caught up!</p>
                           </div>
                         )}
                       </div>
                    </section>

                    {/* ACTIVE CAMPAIGNS */}
                    <section className="dashboard-card col-span-1">
                      <div className="card-title">Active Campaigns</div>
                      <div className="text-3xl font-bold my-1">08</div>
                      <div className="text-[11px] text-bento-muted font-bold">Next: Webinar Tuesday</div>
                    </section>
                  </div>
                )}
                {activeModule === 'sales' && !selectedCustomerName && (
                  <Sales onSelectCustomer={(name) => { setSelectedCustomerName(name); }} />
                )}
                {activeModule === 'support' && !selectedCustomerName && <Support />}
                {activeModule === 'marketing' && !selectedCustomerName && <Marketing />}
                {activeModule === 'success' && !selectedCustomerName && (
                  <CustomerSuccess onSelectCustomer={(name) => { setSelectedCustomerName(name); }} />
                )}
                {selectedCustomerName && (
                  <CustomerDetail 
                    customerName={selectedCustomerName} 
                    onBack={() => setSelectedCustomerName(null)} 
                  />
                )}
              </motion.div>
            </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

