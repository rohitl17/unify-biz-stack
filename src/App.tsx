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
import { onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { db } from './lib/firebase';
import { orgQuery } from './lib/firestoreWithOrg';
import { runSeed } from './lib/seed';
import { motion, AnimatePresence } from 'motion/react';

type Module = 'overview' | 'sales' | 'support' | 'marketing' | 'success';

function AppContent() {
  const { user, profile, loading, authError, login, logout } = useAuth();
  const [activeModule, setActiveModule] = useState<Module>('overview');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile?.orgId) return;
    const orgId = profile.orgId;
    const unsubs = [
      onSnapshot(orgQuery('tasks', orgId, where('assignedTo', '==', user.uid), limit(10)),
        (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}),
      onSnapshot(orgQuery('leads', orgId, orderBy('createdAt', 'desc')),
        (snap) => setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}),
      onSnapshot(orgQuery('tickets', orgId, orderBy('createdAt', 'desc'), limit(5)),
        (snap) => setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}),
      onSnapshot(orgQuery('customers', orgId),
        (snap) => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}),
      onSnapshot(orgQuery('campaigns', orgId, orderBy('startDate', 'asc')),
        (snap) => setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}),
      onSnapshot(orgQuery('marketingEngagement', orgId),
        (snap) => setEngagements(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}),
    ];
    return () => unsubs.forEach(u => u());
  }, [user, profile?.orgId]);

  // Derived stats for overview dashboard
  const pipelineValue = leads
    .filter(l => l.stage !== 'closed_lost' && l.status !== 'lost')
    .reduce((sum, l) => sum + (Number(l.value) || 0), 0);
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(l => ['qualified', 'contacted'].includes(l.status) || l.stage === 'closed_won').length;
  const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;
  const wonLeads = leads.filter(l => l.stage === 'closed_won').length;
  const winRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  const avgHealthScore = customers.length > 0
    ? Math.round(customers.reduce((sum, c) => sum + (Number(c.healthScore) || 0), 0) / customers.length)
    : 0;
  const atRiskCount = customers.filter(c => (Number(c.healthScore) || 0) < 60).length;

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const nextCampaign = campaigns.find(c => c.startDate && new Date(c.startDate) > new Date());

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const toMs = (t: any) => t?.toDate ? t.toDate().getTime() : new Date(t).getTime();
  const thisMonthEng = engagements.filter(e => toMs(e.timestamp) >= thisMonthStart).length;
  const lastMonthEng = engagements.filter(e => { const ms = toMs(e.timestamp); return ms >= lastMonthStart && ms < thisMonthStart; }).length;
  const engagementDelta = lastMonthEng > 0 ? Math.round(((thisMonthEng - lastMonthEng) / lastMonthEng) * 100) : null;

  const formatCurrency = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n}`;

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

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
          {import.meta.env.DEV && (
            <div className="space-y-1">
              <button
                onClick={async () => {
                  if (!user) return;
                  setSeeding(true);
                  setSeedMessage(null);
                  try {
                    const msg = await runSeed(user.uid, profile?.orgId || '');
                    setSeedMessage('✓ ' + msg);
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    console.error('[Seed] Failed:', err);
                    setSeedMessage('✗ ' + msg);
                  } finally {
                    setSeeding(false);
                  }
                }}
                disabled={seeding}
                className="w-full mt-3 flex items-center gap-3 px-3 py-2 rounded-lg text-bento-muted hover:text-accent-marketing hover:bg-accent-marketing/5 transition-colors font-bold text-xs disabled:opacity-50"
              >
                <span className="text-base leading-none shrink-0">{seeding ? '⏳' : '🌱'}</span>
                <span className="hidden lg:block truncate">{seeding ? 'Seeding…' : 'Seed Demo Data'}</span>
              </button>
              {seedMessage && (
                <p className={`hidden lg:block text-[10px] font-bold px-3 leading-tight break-words ${seedMessage.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                  {seedMessage}
                </p>
              )}
            </div>
          )}
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
                        <div className="stat-large">{formatCurrency(pipelineValue)}</div>
                      </div>
                      <div className="flex-1 flex flex-col justify-center gap-4">
                        <div className="space-y-1">
                          <div className="text-[11px] text-bento-muted font-bold">LEAD CONVERSION ({conversionRate}%)</div>
                          <div className="h-3 bg-bento-bg rounded-full overflow-hidden">
                            <div className="h-full bg-accent-sales transition-all duration-700" style={{ width: `${conversionRate}%` }} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] text-bento-muted font-bold">WIN RATE ({winRate}%)</div>
                          <div className="h-3 bg-bento-bg rounded-full overflow-hidden">
                            <div className="h-full bg-accent-sales opacity-60 transition-all duration-700" style={{ width: `${winRate}%` }} />
                          </div>
                        </div>
                        <button onClick={() => setActiveModule('sales')} className="text-[11px] text-accent-sales font-bold hover:underline self-start mt-1">
                          {totalLeads} leads total →
                        </button>
                      </div>
                    </section>

                    {/* MARKETING REACH */}
                    <section className="dashboard-card col-span-1">
                      <span className="pill pill-marketing uppercase">Marketing</span>
                      <div className="card-title mt-2">Engagements</div>
                      <div className="stat-large">{engagements.length.toLocaleString()}</div>
                      {engagementDelta !== null ? (
                        <div className={`text-[11px] font-bold tracking-tight ${engagementDelta >= 0 ? 'text-accent-cs' : 'text-red-400'}`}>
                          {engagementDelta >= 0 ? '+' : ''}{engagementDelta}% vs last mo
                        </div>
                      ) : (
                        <div className="text-[11px] text-bento-muted font-bold">No prior month data</div>
                      )}
                    </section>

                    {/* SUPPORT LIST */}
                    <section className="dashboard-card col-span-1 lg:row-span-3">
                      <span className="pill pill-support uppercase">Support</span>
                      <div className="card-title mt-2">Live Tickets</div>
                      <div className="flex-1 mt-3 space-y-4 overflow-hidden">
                        {tickets.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-6 text-bento-muted">
                            <CheckCircleIcon className="w-6 h-6 mb-1 opacity-20" />
                            <p className="text-xs font-bold italic">No open tickets</p>
                          </div>
                        ) : tickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            onClick={() => { setSelectedCustomerName(ticket.customerId); setActiveModule('success'); }}
                            className="pb-3 border-b border-gray-50 last:border-0 border-dashed cursor-pointer group/item"
                          >
                            <div className="text-[13px] font-bold group-hover/item:text-accent-support transition-colors">{ticket.subject}</div>
                            <div className="text-[11px] text-bento-muted font-medium">{ticket.customerId} • {timeAgo(ticket.createdAt)}</div>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setActiveModule('support')} className="text-[12px] text-accent-support text-center font-bold hover:underline mt-4">
                        View all tickets →
                      </button>
                    </section>

                    {/* CS HEALTH */}
                    <section className="dashboard-card col-span-1 lg:row-span-2 items-center justify-center gap-2">
                      <span className="pill pill-cs uppercase self-start">Success</span>
                      <div className="card-title self-start">Avg Health Score</div>
                      <div className={`w-24 h-24 border-[8px] rounded-full flex items-center justify-center font-extrabold text-2xl my-4 ${
                        avgHealthScore >= 75 ? 'border-accent-cs' : avgHealthScore >= 50 ? 'border-amber-400' : 'border-red-400'
                      }`}>
                        {customers.length > 0 ? avgHealthScore : '—'}
                      </div>
                      <div className="text-center text-[11px] text-bento-muted font-bold">
                        {atRiskCount > 0 ? `Retention Risk: ${atRiskCount} account${atRiskCount !== 1 ? 's' : ''}` : 'All accounts healthy'}
                      </div>
                    </section>

                    {/* ACTION ITEMS */}
                    <section className="dashboard-card col-span-1 md:col-span-2 lg:row-span-2">
                      <div className="card-title">Unified Action Queue</div>
                      <div className="flex-1 flex flex-col justify-center gap-3 mt-4">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => { if (task.relatedTo) setSelectedCustomerName(task.relatedTo); setActiveModule('success'); }}
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
                      <div className="text-3xl font-bold my-1">{String(activeCampaigns.length).padStart(2, '0')}</div>
                      <div className="text-[11px] text-bento-muted font-bold">
                        {nextCampaign ? `Next: ${nextCampaign.name}` : 'No upcoming campaigns'}
                      </div>
                    </section>
                  </div>
                )}
                {activeModule === 'sales' && !selectedCustomerName && (
                  <Sales onSelectCustomer={(name) => { setSelectedCustomerName(name); }} campaigns={campaigns} />
                )}
                {activeModule === 'support' && !selectedCustomerName && <Support />}
                {activeModule === 'marketing' && !selectedCustomerName && <Marketing leads={leads} />}
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

